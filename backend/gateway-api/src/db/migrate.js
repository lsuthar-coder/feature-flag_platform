'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../../migrations');

  const files = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (rows.length > 0) {
        console.log(`Migration already applied: ${file}`);
        continue;
      }

      console.log(`Running migration: ${file}`);

      const sql = fs.readFileSync(
        path.join(migrationsDir, file),
        'utf8'
      );

      await client.query('BEGIN');

      try {
        await client.query(sql);

        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );

        await client.query('COMMIT');

        console.log(`Migration completed: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('All migrations completed.');
  } finally {
    await client.end();
  }
}

module.exports = runMigrations;