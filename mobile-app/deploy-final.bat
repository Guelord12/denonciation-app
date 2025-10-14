@echo off
echo 🚀 DÉPLOIEMENT FINAL - DÉNONCIATION RDC
echo.

echo 📊 Configuration avec IP: 192.168.160.90
echo.

echo 📱 Synchronisation avec Android...
npx cap sync

if %ERRORLEVEL% EQU 0 (
    echo ✅ Synchronisation réussie!
    echo.
    echo 🎯 Ouverture d'Android Studio...
    npx cap open android
) else (
    echo ❌ Erreur lors de la synchronisation
    pause
    exit
)

echo.
echo ✅ DÉPLOIEMENT TERMINÉ !
echo.
echo 📱 DANS ANDROID STUDIO:
echo 1. Attendez le chargement du projet
echo 2. Connectez téléphone USB
echo 3. Activez Débogage USB
echo 4. Cliquez sur Run (▶️)
echo.
echo 🌐 ASSUREZ-VOUS QUE:
echo • Serveur backend tourne sur 192.168.160.90:3000
echo • Téléphone sur même WiFi
echo • Firewall autorise port 3000
echo.
pause