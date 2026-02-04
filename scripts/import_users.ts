import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const csvPath = path.resolve(__dirname, '../users.csv');
const client = new Client({
  user: 'pokeedu',
  host: '127.0.0.1',
  database: 'poke_edu',
  password: 'rzoP3HCG',
  port: 5432,
});

async function importUsers() {
  await client.connect();
  await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');

  const data = fs.readFileSync(csvPath, 'utf8');
  const lines = data.trim().split('\n');

  for (const line of lines) {
    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').replace(/''/g, "'"));
    // Adapte les colonnes selon ta table users
    await client.query(
      'INSERT INTO users VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',
      values
    );
  }
  await client.end();
  console.log('Import terminé !');
}

importUsers().catch(console.error);
