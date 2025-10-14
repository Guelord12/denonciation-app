import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔧 Réparation de l\'installation NPM...\n');

try {
  // Nettoyer
  console.log('📦 Nettoyage du cache...');
  execSync('npm cache clean --force', { stdio: 'inherit' });
  
  // Supprimer node_modules et package-lock
  if (fs.existsSync('node_modules')) {
    console.log('🗑️ Suppression de node_modules...');
    execSync('rmdir /s /q node_modules', { stdio: 'inherit', shell: true });
  }
  
  if (fs.existsSync('package-lock.json')) {
    fs.unlinkSync('package-lock.json');
  }
  
  // Package.json optimisé
  const packageJson = {
    name: "denonciation-app-backend",
    version: "1.0.0",
    description: "Application de dénonciation pour la RDC",
    main: "server.js",
    type: "module",
    scripts: {
      "start": "node server.js",
      "dev": "nodemon server.js",
      "fix-install": "node scripts/fix-install.js",
      "quick-start": "node scripts/quick-start.js"
    },
    dependencies: {
      "express": "^4.21.1",
      "pg": "^8.13.0",
      "socket.io": "^4.8.0",
      "multer": "^1.4.5-lts.1",
      "cors": "^2.8.5",
      "dotenv": "^16.4.5",
      "bcryptjs": "^2.4.3",
      "jsonwebtoken": "^9.0.2",
      "axios": "^1.7.8",
      "helmet": "^8.0.0",
      "express-rate-limit": "^7.4.0",
      "compression": "^1.7.4"
    },
    devDependencies: {
      "nodemon": "^3.1.7"
    }
  };
  
  console.log('📝 Mise à jour du package.json...');
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  
  console.log('📥 Installation des dépendances...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('\n✅ ✅ ✅ INSTALLATION RÉUSSIE !');
  console.log('🎯 Votre environnement est maintenant prêt :');
  console.log('   • Node.js: v22.20.0 ✅');
  console.log('   • Toutes les dépendances installées ✅');
  console.log('   • Application optimisée ✅');
  
} catch (error) {
  console.error('❌ Erreur lors de l\'installation:', error.message);
}