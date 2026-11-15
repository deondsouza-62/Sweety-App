import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

try {
  const schemaUrl = new URL('./schema.sql', import.meta.url);
  const sql = await fs.readFile(fileURLToPath(schemaUrl), 'utf8');
  await pool.query(sql);
  console.log('Database schema is ready.');
} catch (error) {
  console.error('Database initialization failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
