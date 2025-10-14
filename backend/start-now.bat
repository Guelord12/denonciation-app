import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Démarrage de Dénonciation RDC...\n');

// Démarrer le serveur principal
console.log('1. 🖥️  Démarrage du serveur...');
const serverProcess = spawn('node', ['server.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Attendre un peu puis démarrer le moniteur
setTimeout(() => {
  console.log('\n2. 🔍 Démarrage de la surveillance des codes...');
  const monitorProcess = spawn('node', ['monitor-codes.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
}, 3000);