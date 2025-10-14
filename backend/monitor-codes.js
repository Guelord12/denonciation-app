import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const codesDir = path.join(__dirname, 'verification-codes');

function showCodes() {
  console.log('\n🔍 CODES DE VÉRIFICATION -', new Date().toLocaleString());
  console.log('='.repeat(60));
  
  if (!fs.existsSync(codesDir)) {
    console.log('❌ Dossier non trouvé:', codesDir);
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
    console.log('📭 Aucun code trouvé.');
    return;
  }

  console.log(`📋 ${files.length} code(s) trouvé(s):\n`);

  files.slice(0, 10).forEach((file, index) => {
    try {
      const filePath = path.join(codesDir, file);
      const codeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const fileStat = fs.statSync(filePath);
      const age = Math.round((Date.now() - fileStat.mtime.getTime()) / 1000 / 60);
      
      console.log(`🎯 ${index + 1}. ${codeData.phoneNumber}`);
      console.log(`   👤 ${codeData.username}`);
      console.log(`   🔑 ${codeData.code}`);
      console.log(`   ⏰ ${age} min | ${file}`);
      console.log('   ──────────────────────────────');
    } catch (error) {
      console.log(`❌ Erreur lecture: ${file}`);
    }
  });

  if (files.length > 10) {
    console.log(`... et ${files.length - 10} autres codes`);
  }
}

function startMonitoring() {
  console.log('👀 DÉMARRAGE DE LA SURVEILLANCE DES CODES...');
  console.log('📁 Dossier surveillé:', codesDir);
  console.log('💡 Les nouveaux codes s\'afficheront automatiquement');
  console.log('⏹️  Ctrl+C pour arrêter\n');

  showCodes();

  fs.watch(codesDir, (eventType, filename) => {
    if (eventType === 'rename' && filename && filename.endsWith('.json')) {
      console.log('\n🆕 📱 NOUVELLE INSCRIPTION DÉTECTÉE!');
      setTimeout(() => {
        showCodes();
      }, 500);
    }
  });
}

startMonitoring();