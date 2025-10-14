const fs = require('fs');
const path = require('path');

class VerificationCodeManager {
    constructor() {
        this.codesDir = path.join(__dirname, 'verification-codes');
        this.logsDir = path.join(this.codesDir, 'logs');
        this.exportsDir = path.join(this.codesDir, 'exports');
        
        this.initDirs();
    }

    initDirs() {
        [this.codesDir, this.logsDir, this.exportsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    // Sauvegarder un code de vérification
    saveCode(phoneNumber, code, username) {
        const codeData = {
            phoneNumber,
            code,
            username,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
            isUsed: false
        };

        const filename = `${phoneNumber}_${Date.now()}.json`;
        const filepath = path.join(this.codesDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(codeData, null, 2));
        this.logCodeActivity(phoneNumber, 'SENT', code);
        
        return codeData;
    }

    // Vérifier un code
    verifyCode(phoneNumber, code) {
        const files = fs.readdirSync(this.codesDir);
        
        for (const file of files) {
            if (file.startsWith(phoneNumber) && file.endsWith('.json')) {
                const filepath = path.join(this.codesDir, file);
                const codeData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                
                if (codeData.code === code && 
                    new Date(codeData.expiresAt) > new Date() && 
                    !codeData.isUsed) {
                    
                    // Marquer comme utilisé
                    codeData.isUsed = true;
                    codeData.usedAt = new Date().toISOString();
                    fs.writeFileSync(filepath, JSON.stringify(codeData, null, 2));
                    
                    this.logCodeActivity(phoneNumber, 'VERIFIED', code);
                    return true;
                }
            }
        }
        
        this.logCodeActivity(phoneNumber, 'FAILED_VERIFICATION', code);
        return false;
    }

    // Journaliser l'activité des codes
    logCodeActivity(phoneNumber, action, code) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            phoneNumber,
            action,
            code,
            ip: require('os').hostname()
        };

        const logFile = `codes_${new Date().toISOString().split('T')[0]}.log`;
        const logPath = path.join(this.logsDir, logFile);

        fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    }

    // Exporter les codes (pour debug)
    exportCodes() {
        const files = fs.readdirSync(this.codesDir);
        const allCodes = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filepath = path.join(this.codesDir, file);
                return JSON.parse(fs.readFileSync(filepath, 'utf8'));
            });

        const exportFile = `codes_export_${Date.now()}.json`;
        const exportPath = path.join(this.exportsDir, exportFile);

        fs.writeFileSync(exportPath, JSON.stringify(allCodes, null, 2));
        return exportPath;
    }

    // Nettoyer les codes expirés
    cleanupExpiredCodes() {
        const files = fs.readdirSync(this.codesDir);
        const now = new Date();

        files.forEach(file => {
            if (file.endsWith('.json')) {
                const filepath = path.join(this.codesDir, file);
                const codeData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                
                if (new Date(codeData.expiresAt) < now) {
                    fs.unlinkSync(filepath);
                    this.logCodeActivity(codeData.phoneNumber, 'EXPIRED_CLEANUP', codeData.code);
                }
            }
        });
    }
}

module.exports = VerificationCodeManager;