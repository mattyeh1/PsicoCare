const { exec } = require('child_process');
const { Pool } = require('pg');

// Configurar conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Primero creamos la tabla de sesión
async function setupSessionTable() {
  const sessionTableSQL = `
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
    );
    
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `;

  try {
    console.log('Creando tabla de sesión en PostgreSQL...');
    await pool.query(sessionTableSQL);
    console.log('✅ Tabla de sesión creada o verificada correctamente');
  } catch (error) {
    console.error('❌ Error al crear tabla de sesión:', error);
    throw error;
  }
}

// Ejecutar drizzle-kit push para crear/actualizar las tablas del esquema
function runDrizzlePush() {
  return new Promise((resolve, reject) => {
    console.log('Ejecutando drizzle-kit push para actualizar la base de datos...');
    exec('npm run db:push', (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error al ejecutar drizzle-kit push: ${error.message}`);
        console.error(`Salida de error: ${stderr}`);
        reject(error);
        return;
      }
      
      console.log('✅ Base de datos actualizada correctamente');
      console.log(`Salida: ${stdout}`);
      resolve();
    });
  });
}

// Ejecutar ambas operaciones en secuencia
async function main() {
  try {
    await setupSessionTable();
    await runDrizzlePush();
    console.log('✅ Proceso de actualización de base de datos completado');
  } catch (error) {
    console.error('❌ Error durante la actualización de la base de datos:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar
main();