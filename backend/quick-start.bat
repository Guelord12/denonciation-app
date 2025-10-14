@echo off
title Denonciation RDC - Installation Rapide
echo ===============================================
echo    APPLICATION DE DÉNONCIATION RDC
echo ===============================================
echo.

echo 🔧 Étape 1/4: Vérification de Node.js...
node --version
if errorlevel 1 (
    echo ❌ Node.js n'est pas installé!
    echo 📥 Téléchargez-le depuis: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js est installé
echo.

echo 🔧 Étape 2/4: Nettoyage de l'installation...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo 🔧 Étape 3/4: Installation des dépendances...
call fix-installation.bat

echo 🔧 Étape 4/4: Démarrage de l'application...
echo 🚀 Lancement du serveur...
node scripts/start-server.js