#!/usr/bin/env node
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de la conexión a PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

// Función para conectar a la base de datos
async function connect() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a PostgreSQL:', error);
    return false;
  }
}

// Función para crear la tabla de sesión
async function createSessionTable() {
  try {
    const sessionTableSQL = `
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `;
    
    await client.query(sessionTableSQL);
    console.log('✅ Tabla de sesión creada o verificada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al crear tabla de sesión:', error);
    return false;
  }
}

// Función para crear las tablas del esquema
async function createSchemaTables() {
  try {
    // Crear primero los tipos enum
    const enumSQL = `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
          CREATE TYPE user_type AS ENUM ('psychologist', 'patient');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
          CREATE TYPE appointment_status AS ENUM ('pending', 'approved', 'scheduled', 'completed', 'cancelled', 'missed', 'rejected');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
          CREATE TYPE message_type AS ENUM ('appointment_reminder', 'follow_up', 'welcome', 'cancellation', 'rescheduling', 'custom');
        END IF;
      END $$;
    `;
    
    // Intentar crear los tipos enum
    await client.query(enumSQL);
    console.log('✅ Tipos enum creados o verificados');
    
    // 1. Tabla de usuarios con campo user_type
    const usersTableSQL = `
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" VARCHAR(255) NOT NULL UNIQUE,
        "password" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "full_name" VARCHAR(255) NOT NULL,
        "specialty" VARCHAR(255),
        "bio" TEXT,
        "education" TEXT,
        "certifications" TEXT,
        "profile_image" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "account_status" VARCHAR(50) NOT NULL DEFAULT 'active',
        "last_login" TIMESTAMP,
        "timezone" VARCHAR(50) DEFAULT 'UTC',
        "language_preference" VARCHAR(10) DEFAULT 'es',
        "user_type" user_type NOT NULL DEFAULT 'psychologist',
        "unique_code" VARCHAR(4),
        "psychologist_id" INTEGER
      );
    `;
    
    // 2. Tabla de pacientes
    const patientsTableSQL = `
      CREATE TABLE IF NOT EXISTS "patients" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "psychologist_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "phone" VARCHAR(50),
        "notes" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "status" VARCHAR(50) NOT NULL DEFAULT 'active',
        "address" TEXT,
        "date_of_birth" VARCHAR(50),
        "emergency_contact" TEXT
      );
    `;
    
    // 3. Tabla de citas
    const appointmentsTableSQL = `
      CREATE TABLE IF NOT EXISTS "appointments" (
        "id" SERIAL PRIMARY KEY,
        "psychologist_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "patient_id" INTEGER NOT NULL REFERENCES "patients"("id"),
        "date" TIMESTAMP NOT NULL,
        "duration" INTEGER NOT NULL,
        "status" VARCHAR(50) NOT NULL CHECK ("status" IN ('scheduled', 'completed', 'cancelled', 'missed')),
        "notes" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "video_url" TEXT,
        "reminder_sent" BOOLEAN DEFAULT FALSE,
        "payment_status" VARCHAR(50) DEFAULT 'pending',
        "meeting_type" VARCHAR(50) DEFAULT 'video'
      );
    `;
    
    // 4. Tabla de disponibilidad
    const availabilityTableSQL = `
      CREATE TABLE IF NOT EXISTS "availability" (
        "id" SERIAL PRIMARY KEY,
        "psychologist_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "day_of_week" INTEGER NOT NULL,
        "start_time" VARCHAR(8) NOT NULL,
        "end_time" VARCHAR(8) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "is_recurring" BOOLEAN DEFAULT TRUE,
        "recurrence_end_date" VARCHAR(50),
        "is_available" BOOLEAN DEFAULT TRUE
      );
    `;
    
    // 5. Tabla de plantillas de mensajes
    const messageTemplatesTableSQL = `
      CREATE TABLE IF NOT EXISTS "message_templates" (
        "id" SERIAL PRIMARY KEY,
        "psychologist_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "type" VARCHAR(50) NOT NULL CHECK ("type" IN ('appointment_reminder', 'follow_up', 'welcome', 'cancellation', 'rescheduling', 'custom')),
        "title" VARCHAR(255) NOT NULL,
        "content" TEXT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "is_default" BOOLEAN DEFAULT FALSE,
        "language" VARCHAR(10) DEFAULT 'es'
      );
    `;
    
    // 6. Tabla de formularios de consentimiento
    const consentFormsTableSQL = `
      CREATE TABLE IF NOT EXISTS "consent_forms" (
        "id" SERIAL PRIMARY KEY,
        "psychologist_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "title" VARCHAR(255) NOT NULL,
        "content" TEXT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "version" VARCHAR(50) DEFAULT '1.0',
        "language" VARCHAR(10) DEFAULT 'es',
        "is_active" BOOLEAN DEFAULT TRUE
      );
    `;
    
    // 7. Tabla de consentimiento de pacientes
    const patientConsentsTableSQL = `
      CREATE TABLE IF NOT EXISTS "patient_consents" (
        "id" SERIAL PRIMARY KEY,
        "patient_id" INTEGER NOT NULL REFERENCES "patients"("id"),
        "consent_form_id" INTEGER NOT NULL REFERENCES "consent_forms"("id"),
        "signed_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "signature" TEXT NOT NULL,
        "form_version" VARCHAR(50) NOT NULL,
        "ip_address" VARCHAR(50),
        "is_valid" BOOLEAN DEFAULT TRUE,
        "expires_at" TIMESTAMP
      );
    `;
    
    // 8. Tabla de solicitudes de contacto
    const contactRequestsTableSQL = `
      CREATE TABLE IF NOT EXISTS "contact_requests" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "specialty" VARCHAR(255) NOT NULL,
        "message" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "status" VARCHAR(50) DEFAULT 'pending',
        "source" VARCHAR(50),
        "phone" VARCHAR(50),
        "assigned_to" INTEGER
      );
    `;
    
    // Ejecutar todas las consultas en secuencia
    await client.query(usersTableSQL);
    console.log('✅ Tabla users creada o verificada');
    
    await client.query(patientsTableSQL);
    console.log('✅ Tabla patients creada o verificada');
    
    await client.query(appointmentsTableSQL);
    console.log('✅ Tabla appointments creada o verificada');
    
    await client.query(availabilityTableSQL);
    console.log('✅ Tabla availability creada o verificada');
    
    await client.query(messageTemplatesTableSQL);
    console.log('✅ Tabla message_templates creada o verificada');
    
    await client.query(consentFormsTableSQL);
    console.log('✅ Tabla consent_forms creada o verificada');
    
    await client.query(patientConsentsTableSQL);
    console.log('✅ Tabla patient_consents creada o verificada');
    
    await client.query(contactRequestsTableSQL);
    console.log('✅ Tabla contact_requests creada o verificada');
    
    return true;
  } catch (error) {
    console.error('❌ Error al crear tablas del esquema:', error);
    return false;
  }
}

// Crear usuario administrador para pruebas
async function createAdminUser() {
  try {
    // Comprobar si ya existe el usuario admin
    const checkUserSQL = `SELECT id FROM "users" WHERE username = 'admin' LIMIT 1`;
    const checkResult = await client.query(checkUserSQL);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Usuario admin ya existe, no es necesario crearlo');
      return true;
    }
    
    // Hash de contraseña 'admin123' (esto normalmente debería hacerse con bcrypt)
    // Este es el hash generado por la función de hashPassword en auth.ts
    const hashedPassword = '3c3272df222c7ad02c63e0f17a7dad9a5bd4d3c10fb1d4d9e7a38ff442887fd9a8f3f7c1b1b3c51a10ca3919e764abfc8b8f4ff0c5b88c8d82799d4e31f0dc37.c0536a5c6e3e4e9b';
    
    // Crear usuario admin
    const insertUserSQL = `
      INSERT INTO "users" (
        "username", "password", "email", "full_name", "specialty", 
        "bio", "account_status", "created_at", "updated_at", "language_preference", "user_type"
      ) 
      VALUES (
        'admin', $1, 'admin@example.com', 'Administrador', 'Psicología Clínica',
        'Usuario administrador para pruebas', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'es', 'psychologist'
      )
    `;
    
    await client.query(insertUserSQL, [hashedPassword]);
    console.log('✅ Usuario admin creado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al crear usuario admin:', error);
    return false;
  }
}

// Función principal para inicializar la base de datos
async function initDatabase() {
  try {
    console.log('🔄 Iniciando configuración de la base de datos...');
    
    // Conectar a la base de datos
    const connected = await connect();
    if (!connected) return;
    
    // Crear tabla de sesión
    const sessionTableCreated = await createSessionTable();
    if (!sessionTableCreated) return;
    
    // Crear tablas del esquema
    const schemaTablesCreated = await createSchemaTables();
    if (!schemaTablesCreated) return;
    
    // Crear usuario admin para pruebas
    await createAdminUser();
    
    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await client.end();
  }
}

// Iniciar proceso
initDatabase();