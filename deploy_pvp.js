// Script Node.js pour déployer uniquement les fichiers PVP
import SftpClient from 'ssh2-sftp-client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    host: process.env.SFTP_HOST,
    port: parseInt(process.env.SFTP_PORT || '22'),
    username: process.env.SFTP_USER,
    password: process.env.SFTP_PASSWORD,
};

const remoteRoot = process.env.REMOTE_ROOT || '/';
const client = new SftpClient();

async function deployPvp() {
    console.log('🚀 Déploiement des fichiers PVP...');

    if (!config.host || !config.username || !config.password) {
        console.error('❌ ERREUR: Variables SFTP manquantes dans le fichier .env');
        return;
    }

    const filesToDeploy = [
        {
            local: path.join(__dirname, 'backend', 'install_pvp_tables.php'),
            remote: `${remoteRoot}${remoteRoot.endsWith('/') ? '' : '/'}backend/install_pvp_tables.php`
        },
        {
            local: path.join(__dirname, 'backend', 'test_pvp_status.php'),
            remote: `${remoteRoot}${remoteRoot.endsWith('/') ? '' : '/'}backend/test_pvp_status.php`
        },
        {
            local: path.join(__dirname, 'assets', 'test_pvp.html'),
            remote: `${remoteRoot}${remoteRoot.endsWith('/') ? '' : '/'}assets/test_pvp.html`
        },
        {
            local: path.join(__dirname, 'assets', 'install_pvp.html'),
            remote: `${remoteRoot}${remoteRoot.endsWith('/') ? '' : '/'}assets/install_pvp.html`
        }
    ];

    try {
        await client.connect(config);
        console.log(`✅ Connecté à ${config.host}`);

        for (const file of filesToDeploy) {
            try {
                console.log(`📤 Upload: ${path.basename(file.local)} → ${file.remote}`);
                await client.put(file.local, file.remote);
                console.log(`   ✓ OK`);
            } catch (err) {
                console.error(`   ✗ Erreur pour ${path.basename(file.local)}:`, err.message);
            }
        }

        console.log('\n✨ Déploiement PVP terminé !');
        console.log('\n🧪 Testez l\'installation :');
        console.log('   https://poke.sarlatc.com/backend/install_pvp_tables.php');
        console.log('   https://poke.sarlatc.com/assets/install_pvp.html');

    } catch (err) {
        console.error('❌ ECHEC:', err);
    } finally {
        client.end();
    }
}

deployPvp();
