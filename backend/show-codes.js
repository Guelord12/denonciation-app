import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const codesDir = path.join(__dirname, 'verification-codes');

function showCodes() {
  console.log('🔍 RECHERCHE DES CODES DE VÉRIFICATION...');
  console.log(`📁 Dossier: ${codesDir}`);
  console.log('='.repeat(50));
  
  if (!fs.existsSync(codesDir)) {
    console.log('❌ Le dossier verification-codes n\'existe pas!');
    return;
  }

  const files = fs.readdirSync(codesDir)
    .filter(file => file.endsWith('.json'))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(codesDir, a));
      const statB = fs.statSync(path.join(codesDir, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    });

  if (files.length === 0) {
    console.log('📭 Aucun code de vérification trouvé.');
    console.log('💡 Inscrivez-vous d\'abord sur l\'application.');
    return;
  }

  console.log(`📋 ${files.length} code(s) trouvé(s):\n`);

  files.forEach((file, index) => {
    const filePath = path.join(codesDir, file);
    const codeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const fileStat = fs.statSync(filePath);
    
    console.log(`🎯 CODE ${index + 1}:`);
    console.log(`   📞 Numéro: ${codeData.phoneNumber}`);
    console.log(`   👤 Utilisateur: ${codeData.username}`);
    console.log(`   🔑 Code: ${codeData.code}`);
    console.log(`   ⏰ Créé: ${new Date(codeData.createdAt).toLocaleString()}`);
    console.log(`   📄 Fichier: ${file}`);
    console.log('   ──────────────────────────────');
  });
}

// Surveiller les nouveaux codes
function watchCodes() {
  console.log('👀 Surveillance des nouveaux codes... (Ctrl+C pour arrêter)\n');
  
  fs.watch(codesDir, (eventType, filename) => {
    if (eventType === 'rename' && filename.endsWith('.json')) {
      console.log('🆕 NOUVEAU CODE DÉTECTÉ!');
      setTimeout(() => {
        showCodes();
      }, 1000);
    }
  });
}

showCodes();
watchCodes();