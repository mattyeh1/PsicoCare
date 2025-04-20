import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Configurar conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// SQL para crear la tabla de sesión
const sessionTableSQL = `
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
`;

async function createSessionTable() {
  try {
    console.log('Creando tabla de sesión en PostgreSQL...');
    await pool.query(sessionTableSQL);
    console.log('✅ Tabla de sesión creada o verificada correctamente');
  } catch (error) {
    console.error('❌ Error al crear tabla de sesión:', error);
  } finally {
    // Cerrar la conexión
    await pool.end();
  }
}

// Ejecutar la creación de la tabla
createSessionTable();