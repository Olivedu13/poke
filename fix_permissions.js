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
const remoteRoot = process.env.REMOTE_ROOT || '/';

async function fixPermissions() {
    console.log('🔧 Correction des permissions des fichiers...');
    
    try {
        await client.connect(config);
        console.log(`✅ Connecté à ${config.host}`);

        // Liste des chemins à corriger
        const pathsToFix = [
            '/backend',
            '/backend/admin_seed.php',
            '/backend/auth.php',
            '/backend/battle_rewards.php',
            '/backend/collection.php',
            '/backend/combat_engine.php',
            '/backend/cors.php',
            '/backend/db_connect.php',
            '/backend/get_question.php',
            '/backend/install_db.php',
            '/backend/jwt_utils.php',
            '/backend/protected_setup.php',
            '/backend/questions_data.json',
            '/backend/seed_questions.php',
            '/backend/shop.php',
            '/backend/spin.php',
            '/backend/test_api.php',
            '/backend/update_config.php',
            '/index.html',
            '/assets'
        ];

        for (const path of pathsToFix) {
            const fullPath = remoteRoot === '/' ? path : `${remoteRoot}${path}`;
            try {
                const exists = await client.exists(fullPath);
                if (exists) {
                    // 0755 pour les dossiers (rwxr-xr-x)
                    // 0644 pour les fichiers (rw-r--r--)
                    const isDir = exists === 'd';
                    const permission = isDir ? 0o755 : 0o644;
                    
                    await client.chmod(fullPath, permission);
                    console.log(`✅ ${path}: ${permission.toString(8)}`);
                } else {
                    console.log(`⚠️  ${path}: n'existe pas`);
                }
            } catch (err) {
                console.log(`⚠️  ${path}: ${err.message}`);
            }
        }

        // Permissions spéciales pour les fichiers PHP sensibles
        const sensitiveFiles = [
            '/backend/db_connect.php',
            '/backend/jwt_utils.php'
        ];

        for (const file of sensitiveFiles) {
            const fullPath = remoteRoot === '/' ? file : `${remoteRoot}${file}`;
            try {
                const exists = await client.exists(fullPath);
                if (exists) {
                    await client.chmod(fullPath, 0o600);
                    console.log(`🔒 ${file}: 0600 (lecture seule propriétaire)`);
                }
            } catch (err) {
                console.log(`⚠️  ${file}: ${err.message}`);
            }
        }

        console.log('✨ Permissions corrigées !');
        
    } catch (err) {
        console.error('❌ ERREUR:', err.message);
    } finally {
        client.end();
    }
}

fixPermissions();
