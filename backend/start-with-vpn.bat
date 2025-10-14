@echo off
echo 🔧 Configuration pour accès distant avec Proton VPN...
echo.

echo 📡 Vérification de l'IP VPN...
curl -s https://api.ipify.org

echo.
echo 🌍 Si vous voyez une IP différente de votre IP locale, Proton VPN est actif!
echo 📱 Partagez cette URL: http://[VOTRE-IP-VPN]:3000
echo.

echo 🖥️  Démarrage du serveur...
node server.js