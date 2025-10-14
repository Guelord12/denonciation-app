@echo off
title 🚀 Denonciation RDC - Serveur + Surveillance Codes

echo 🔧 Démarrage du serveur et surveillance des codes...
echo.

echo 🖥️  Terminal 1: Serveur principal
start cmd /k "cd /d C:\Users\user\denonciation-app\backend && node server.js"

timeout /t 3 /nobreak >nul

echo 🔍 Terminal 2: Surveillance des codes
start cmd /k "cd /d C:\Users\user\denonciation-app\backend && node show-codes.js"

echo.
echo ✅ Serveur démarré!
echo 🌍 Application: http://localhost:3000
echo 📱 Les codes s'afficheront automatiquement après inscription
echo.
pause