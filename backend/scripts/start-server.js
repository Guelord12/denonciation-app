const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

class ServerStarter {
    constructor() {
        this.networkInfo = this.getNetworkInfo();
        this.start();
    }
    
    getNetworkInfo() {
        const interfaces = os.networkInterfaces();
        const results = [];
        
        for (const name of Object.keys(interfaces)) {
            for (const interface of interfaces[name]) {
                if (interface.family === 'IPv4' && !interface.internal) {
                    results.push({
                        interface: name,
                        address: interface.address
                    });
                }
            }
        }
        return results;
    }
    
    start() {
        console.log('🚀 Démarrage du serveur Dénonciation RDC...\n');
        
        // Afficher les informations réseau
        console.log('📡 ADRESSES DE CONNEXION:');
        console.log(`   Local: http://localhost:3000`);
        this.networkInfo.forEach(net => {
            console.log(`   ${net.interface}: http://${net.address}:3000`);
        });
        console.log('');
        
        console.log('🔗 LIENS DE PARTAGE:');
        console.log(`   Page de partage: http://localhost:3000/share/share.html`);
        console.log(`   Installation mobile: http://localhost:3000/share/mobile-install.html`);
        console.log('');
        
        console.log('📋 POUR INVITER DES TESTEURS:');
        console.log(`   1. Partagez une des URLs ci-dessus`);
        console.log(`   2. Les testeurs peuvent s'inscrire avec leur numéro`);
        console.log(`   3. Les codes SMS s'affichent ici et sont sauvegardés`);
        console.log(`   4. Sur mobile: Installation comme une vraie application`);
        console.log('');
        
        console.log('📁 DOSSIERS:');
        console.log(`   Codes de vérification: ./verification-codes/`);
        console.log(`   Preuves uploadées: ./uploads/`);
        console.log(`   Logs: ./verification-codes/logs/`);
        console.log('');
        
        console.log('✅ Le serveur est prêt pour les tests distants!');
        console.log('📧 Support: kayayaguelord8@gmail.com\n');
        
        // Démarrer le serveur
        exec('node server.js', (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Erreur: ${error}`);
                return;
            }
            console.log(stdout);
            if (stderr) console.error(stderr);
        });
    }
}

new ServerStarter();