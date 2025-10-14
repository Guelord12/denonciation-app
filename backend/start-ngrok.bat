@echo off
echo 🚀 Démarrage de Ngrok pour l'accès distant...
echo.

echo 📡 Vérification de l'installation Ngrok...
ngrok --version
if errorlevel 1 (
    echo ❌ Ngrok n'est pas installé!
    echo 📥 Installation en cours...
    npm install -g ngrok
    echo 🔑 N'oubliez pas de configurer votre token: ngrok authtoken VOTRE_TOKEN
    pause
    exit
)

echo ✅ Ngrok est installé, démarrage...
echo 🌍 L'URL publique sera affichée ci-dessous:
echo 📱 Partagez cette URL avec vos testeurs!
echo.

ngrok http 3000