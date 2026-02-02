import SftpClient from 'ssh2-sftp-client';
import dotenv from 'dotenv';

dotenv.config();

const config = {
    host: process.env.SFTP_HOST,
    port: parseInt(process.env.SFTP_PORT || '22'),
    username: process.env.SFTP_USER,
    password: process.env.SFTP_PASSWORD,
};

const client = new SftpClient();

async function verifyDeployment() {
    console.log('🔍 Vérification du déploiement...\n');
    
    try {
        await client.connect(config);
        
        // Vérifier la structure
        const rootFiles = await client.list('/');
        console.log('📁 Fichiers à la racine:');
        rootFiles.forEach(file => {
            const type = file.type === 'd' ? '📂' : '📄';
            const rights = file.rights ? file.rights.user + file.rights.group + file.rights.other : 'N/A';
            console.log(`  ${type} ${file.name.padEnd(30)} (${rights})`);
        });
        
        console.log('\n📁 Fichiers Backend:');
        const backendFiles = await client.list('/backend');
        backendFiles.slice(0, 15).forEach(file => {
            const type = file.type === 'd' ? '📂' : '📄';
            const rights = file.rights ? file.rights.user + file.rights.group + file.rights.other : 'N/A';
            console.log(`  ${type} ${file.name.padEnd(30)} (${rights})`);
        });
        
        // Vérifier assets
        console.log('\n📁 Dossier Assets:');
        const assetsExist = await client.exists('/assets');
        if (assetsExist) {
            const assetsFiles = await client.list('/assets');
            console.log(`  ✅ ${assetsFiles.length} fichiers trouvés`);
        } else {
            console.log('  ⚠️  Dossier assets non trouvé');
        }
        
        console.log('\n✨ Vérification terminée !');
        
    } catch (err) {
        console.error('❌ ERREUR:', err.message);
    } finally {
        client.end();
    }
}

verifyDeployment();
