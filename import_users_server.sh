#!/bin/bash
set -euo pipefail


# Réinitialiser le mot de passe de l'utilisateur PostgreSQL pokeedu
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'PSQL'
ALTER USER pokeedu WITH PASSWORD 'rzoP3HCG';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO pokeedu;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO pokeedu;
PSQL


# Importer le CSV dans la base poke_edu (désactivé car le fichier peut être manquant)
# sudo -u postgres psql -v ON_ERROR_STOP=1 <<PSQL
# \c poke_edu
# TRUNCATE TABLE users RESTART IDENTITY CASCADE;
# \COPY users FROM '$CSV' WITH (FORMAT csv, HEADER false, DELIMITER ',', QUOTE '"');
# SELECT 'IMPORT_OK', COUNT(*) FROM users;
# PSQL

echo "Terminé"
