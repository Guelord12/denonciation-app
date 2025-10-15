@echo off
chcp 65001 >nul
echo.
echo =======================================================
echo 🚀 DÉPLOIEMENT MOBILE - DÉNONCIATION RDC
echo =======================================================
echo.

echo 📍 Répertoire courant: %CD%
echo.

echo 🔄 Vérification de la structure des dossiers...
if not exist "src\assets" (
    echo 📁 Création de la structure des dossiers...
    mkdir "src\assets" >nul 2>&1
    mkdir "src\assets\icons" >nul 2>&1
    mkdir "src\assets\screenshots" >nul 2>&1
    echo ✅ Dossiers assets créés
) else (
    echo ✅ Structure des dossiers vérifiée
)

echo.
echo 🔄 Vérification des dépendances...
call npm list @capacitor/core >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Capacitor non installé
    echo 📦 Installation des dépendances...
    call npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/app @capacitor/camera @capacitor/geolocation @capacitor/preferences @capacitor/toast @capacitor/splash-screen
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Erreur lors de l'installation des dépendances
        pause
        exit /b 1
    )
    echo ✅ Dépendances installées
) else (
    echo ✅ Dépendances vérifiées
)

echo.
echo 🔨 Construction de l'application web...
echo ⏳ Cette opération peut prendre quelques secondes...

call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  ATTENTION: Problème lors de la construction
    echo 🔧 Tentative de résolution automatique...
    
    echo 📁 Vérification de la configuration Webpack...
    if exist "webpack.config.js" (
        echo ✅ Webpack config trouvé
    ) else (
        echo ❌ Webpack config manquant
        echo 📝 Création de la configuration...
        call npm install --save-dev webpack webpack-cli webpack-dev-server html-webpack-plugin copy-webpack-plugin style-loader css-loader
    )
    
    echo 🔄 Nouvelle tentative de construction...
    call npm run build
    
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ❌ ERREUR: Échec de la construction après correction
        echo 🔍 Détails de l'erreur ci-dessus
        echo.
        echo 💡 SOLUTIONS:
        echo 1. Vérifiez que tous les fichiers source existent
        echo 2. Lancez "npm install" pour réinstaller les dépendances
        echo 3. Vérifiez la console pour les erreurs spécifiques
        echo.
        pause
        exit /b 1
    )
)

echo ✅ Construction réussie!
echo.

echo 📱 Synchronisation avec Capacitor...
echo 🔗 Configuration serveur: https://denonciation-app.onrender.com
npx cap sync

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Synchronisation réussie!
    echo.
    echo =======================================================
    echo 🎯 CONFIGURATION SERVEUR
    echo =======================================================
    echo 🌐 URL: https://denonciation-app.onrender.com
    echo 🗄️  Base de données: PostgreSQL Render.com
    echo 🔐 Authentification: Codes de vérification
    echo 📍 Géolocalisation: Activée
    echo 📷 Appareil photo: Activé
    echo =======================================================
    echo.
    
    echo 🎯 Ouverture d'Android Studio...
    timeout /t 3 /nobreak >nul
    npx cap open android
    
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Android Studio ouvert avec succès
    ) else (
        echo ⚠️  Android Studio non trouvé ou erreur d'ouverture
        echo 📁 Vous pouvez ouvrir manuellement: mobile-app\android
    )
    
    echo.
    echo =======================================================
    echo 📋 INSTRUCTIONS ANDROID STUDIO
    echo =======================================================
    echo 1. ⏳ Attendez le chargement complet du projet
    echo 2. 📱 Connectez votre téléphone via USB
    echo 3. 🔧 Activez le "Débogage USB" dans les options dev
    echo 4. 🎯 Sélectionnez votre appareil dans la barre d'outils
    echo 5. ▶️  Cliquez sur "Run" (bouton vert play)
    echo 6. ⏱️  Attendez l'installation sur le téléphone
    echo =======================================================
    echo.
    
) else (
    echo.
    echo ❌ ERREUR: Échec de la synchronisation
    echo 🔍 Vérifiez la configuration Capacitor
    echo 💡 Essayez: npx cap doctor
    echo.
)

echo 📊 STATISTIQUES DE DÉPLOIEMENT:
if exist "dist" (
    for /f "tokens=*" %%i in ('dir /s /b "dist\*.*" 2^>nul ^| find /c /v ""') do set FILE_COUNT=%%i
    echo • Fichiers construits: %FILE_COUNT%
) else (
    echo • Fichiers construits: 0 (dossier dist manquant)
)
echo • Dernier build: %DATE% %TIME%
echo • Serveur: denonciation-app.onrender.com
echo.

echo ✅ DÉPLOIEMENT TERMINÉ
echo.

pause