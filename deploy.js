
import SftpClient from 'ssh2-sftp-client';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    host: process.env.SFTP_HOST,
    port: parseInt(process.env.SFTP_PORT || '22'),
    username: process.env.SFTP_USER,
    password: process.env.SFTP_PASSWORD,
};

const client = new SftpClient();
const remoteRoot = process.env.REMOTE_ROOT || '/';

// Check for command line arguments
const args = process.argv.slice(2);
const backendOnly = args.includes('--backend-only') || args.includes('-b');

async function deploy() {
    console.log('🤖 INITIALISATION DU PROTOCOLE DE DÉPLOIEMENT...');
    if (backendOnly) {
        console.log('⚡ MODE BACKEND ONLY ACTIVÉ');
    }

    if (!config.host || !config.username || !config.password) {
        console.error('❌ ERREUR: Variables SFTP manquantes dans le fichier .env');
        return;
    }

    try {
        await client.connect(config);
        console.log(`✅ Connecté à ${config.host}.`);

        // 1. Build & Upload Frontend (Skipped if backendOnly)
        if (!backendOnly) {
            console.log('🔨 Construction de l\'application (Build React)...');
            await new Promise((resolve, reject) => {
                exec('npm run build', (err, stdout, stderr) => {
                    if (err) {
                        console.error('❌ Erreur de build:', stderr);
                        reject(err);
                    } else {
                        console.log(stdout);
                        resolve(true);
                    }
                });
            });
            console.log('✅ Build terminé.');

            const localDist = path.join(__dirname, 'dist');
            console.log(`🚀 Envoi du Frontend (de ${localDist} vers ${remoteRoot})...`);
            await client.uploadDir(localDist, remoteRoot);
        } else {
            console.log('⏭️  Build & Frontend upload ignorés.');
        }

        // 2. Upload Backend (Always happens)
        const localBackend = path.join(__dirname, 'backend');
        const remoteBackend = remoteRoot.endsWith('/') ? `${remoteRoot}backend` : `${remoteRoot}/backend`;
        
        console.log(`🚀 Envoi du Backend (de ${localBackend} vers ${remoteBackend})...`);
        
        // Ensure remote backend folder exists
        const exists = await client.exists(remoteBackend);
        if (!exists) {
            await client.mkdir(remoteBackend, true);
        }

        await client.uploadDir(localBackend, remoteBackend);

        console.log('✨ DÉPLOIEMENT TERMINÉ !');
        if (backendOnly) {
            console.log('🐘 API PHP mise à jour.');
        } else {
            console.log('👉 https://poke.sarlatc.com');
        }

    } catch (err) {
        console.error('❌ ECHEC DU DÉPLOIEMENT:', err);
    } finally {
        client.end();
    }
}

deploy();
