#!/usr/bin/env node
const { exec } = require('child_process');
const readline = require('readline');

// Configura el proceso para que no espere por entrada del usuario
process.env.CI = 'true';

console.log('Pushing database schema...');

// Ejecuta drizzle-kit push con la opción --non-interactive
const child = exec('npx drizzle-kit push --non-interactive');

child.stdout.on('data', (data) => {
  console.log(data);
});

child.stderr.on('data', (data) => {
  console.error(data);
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('Database schema updated successfully!');
  } else {
    console.error(`Error pushing schema, exit code: ${code}`);
  }
});