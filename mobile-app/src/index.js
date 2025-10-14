import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import { Toast } from '@capacitor/toast';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';

class MobileDenonciationApp {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3000';
        this.currentUser = null;
        this.token = null;
        this.isNative = Capacitor.isNativePlatform();
        
        this.init();
    }

    async init() {
        await this.setupCapacitor();
        this.setupEventListeners();
        this.checkAuthentication();
        this.loadInitialData();
    }

    async setupCapacitor() {
        // Cacher le splash screen
        try {
            await SplashScreen.hide();
        } catch (error) {
            console.log('Splash screen already hidden');
        }

        // Gérer le bouton retour Android
        if (this.isNative) {
            App.addListener('backButton', (data) => {
                if (!data.canGoBack) {
                    App.exitApp();
                }
            });
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.showPage(page);
                
                // Mettre à jour la navigation active
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Formulaires
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('report-form').addEventListener('submit', (e) => this.handleReport(e));

        // Gestion des fichiers
        document.getElementById('report-evidence').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('file-name').textContent = `Fichier: ${file.name}`;
            }
        });
    }

    async checkAuthentication() {
        if (this.isNative) {
            const { value } = await Preferences.get({ key: 'auth_token' });
            this.token = value;
        } else {
            this.token = localStorage.getItem('token');
        }

        if (this.token) {
            await this.validateToken();
        } else {
            this.showAuthModal();
        }
    }

    async validateToken() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/verify-token`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.hideAuthModal();
                this.updateProfile();
            } else {
                this.showAuthModal();
            }
        } catch (error) {
            this.showAuthModal();
        }
    }

    showAuthModal() {
        document.getElementById('auth-modal').style.display = 'flex';
    }

    hideAuthModal() {
        document.getElementById('auth-modal').style.display = 'none';
        document.getElementById('register-modal').style.display = 'none';
    }

    showLogin() {
        document.getElementById('register-modal').style.display = 'none';
        document.getElementById('auth-modal').style.display = 'flex';
    }

    showRegister() {
        document.getElementById('auth-modal').style.display = 'none';
        document.getElementById('register-modal').style.display = 'flex';
    }

    async handleLogin(e) {
        e.preventDefault();
        const phoneNumber = document.getElementById('login-phone').value;
        const code = document.getElementById('login-code').value;

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, code })
            });

            const result = await response.json();

            if (result.success) {
                this.token = result.token;
                this.currentUser = { username: result.username };
                
                if (this.isNative) {
                    await Preferences.set({ key: 'auth_token', value: this.token });
                } else {
                    localStorage.setItem('token', this.token);
                }

                this.hideAuthModal();
                this.updateProfile();
                this.showToast('Connexion réussie!');
            } else {
                this.showToast(result.error, 'error');
            }
        } catch (error) {
            this.showToast('Erreur de connexion', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const phoneNumber = document.getElementById('reg-phone').value;
        const username = document.getElementById('reg-username').value;

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, username })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Code envoyé! Vérifiez vos messages.');
                document.getElementById('login-phone').value = phoneNumber;
                this.showLogin();
            } else {
                this.showToast(result.error, 'error');
            }
        } catch (error) {
            this.showToast('Erreur d\'inscription', 'error');
        }
    }

    async handleReport(e) {
        e.preventDefault();
        
        if (!this.token) {
            this.showToast('Veuillez vous connecter', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('type', document.getElementById('report-type').value);
        formData.append('title', document.getElementById('report-title').value);
        formData.append('description', document.getElementById('report-description').value);
        formData.append('locationName', document.getElementById('report-location').value);
        
        const evidenceFile = document.getElementById('report-evidence').files[0];
        if (!evidenceFile) {
            this.showToast('Une preuve est obligatoire', 'error');
            return;
        }
        formData.append('evidence', evidenceFile);

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/posts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Signalement publié!');
                document.getElementById('report-form').reset();
                document.getElementById('file-name').textContent = '';
                this.showPage('home');
                this.loadPosts();
            } else {
                this.showToast(result.error, 'error');
            }
        } catch (error) {
            this.showToast('Erreur de publication', 'error');
        }
    }

    async getLocation() {
        try {
            const coordinates = await Geolocation.getCurrentPosition();
            const lat = coordinates.coords.latitude;
            const lng = coordinates.coords.longitude;
            
            document.getElementById('report-location').value = `Position: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            this.showToast('Position obtenue');
        } catch (error) {
            this.showToast('Impossible d\'obtenir la position', 'error');
        }
    }

    async takePhoto() {
        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: 'dataUrl'
            });

            // Convertir l'image en fichier pour l'upload
            const response = await fetch(image.dataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
            
            // Mettre à jour l'input file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            document.getElementById('report-evidence').files = dataTransfer.files;
            document.getElementById('file-name').textContent = 'Fichier: photo.jpg';
            
        } catch (error) {
            console.log('User cancelled photo taking');
        }
    }

    showPage(pageName) {
        // Cacher toutes les pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Afficher la page demandée
        document.getElementById(`${pageName}-page`).classList.add('active');

        // Charger les données si nécessaire
        switch (pageName) {
            case 'home':
                this.loadPosts();
                break;
            case 'map':
                this.loadMap();
                break;
            case 'profile':
                this.updateProfile();
                break;
        }
    }

    async loadPosts() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/posts`);
            const posts = await response.json();

            const container = document.getElementById('posts-container');
            container.innerHTML = '';

            if (posts.length === 0) {
                container.innerHTML = `
                    <div class="mobile-card" style="text-align: center; color: #666;">
                        <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <p>Aucun signalement pour le moment</p>
                    </div>
                `;
                return;
            }

            posts.forEach(post => {
                const postElement = this.createPostElement(post);
                container.appendChild(postElement);
            });

            // Mettre à jour les statistiques
            document.getElementById('total-posts').textContent = posts.length;

        } catch (error) {
            console.error('Erreur chargement posts:', error);
        }
    }

    createPostElement(post) {
        const div = document.createElement('div');
        div.className = 'post-item';
        
        div.innerHTML = `
            <div class="post-header">
                <span class="post-type" style="background: ${post.color}">${this.formatTypeName(post.type_name)}</span>
                <span style="color: #666; font-size: 0.9rem;">${new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="post-title">${post.title}</div>
            <p style="margin-bottom: 10px; color: #666;">${post.description.substring(0, 100)}...</p>
            <div class="post-meta">
                <span>par ${post.username}</span>
                <span><i class="fas fa-comments"></i> ${post.comment_count || 0}</span>
            </div>
        `;

        div.addEventListener('click', () => {
            this.showPostDetail(post);
        });

        return div;
    }

    showPostDetail(post) {
        // Implémenter la vue détaillée du post
        this.showToast(`Détails: ${post.title}`);
    }

    async loadMap() {
        // Implémenter la carte interactive
        const mapContainer = document.getElementById('map-container');
        mapContainer.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <i class="fas fa-map-marked-alt" style="font-size: 3rem; color: #e74c3c; margin-bottom: 10px;"></i>
                <h3>Carte Interactive</h3>
                <p style="color: #666; margin-bottom: 15px;">Visualisation des signalements en temps réel</p>
                <button class="mobile-btn mobile-btn-outline" onclick="app.refreshMap()">
                    <i class="fas fa-sync"></i> Actualiser
                </button>
            </div>
        `;
    }

    refreshMap() {
        this.showToast('Carte actualisée');
    }

    updateProfile() {
        if (this.currentUser) {
            document.getElementById('profile-username').textContent = this.currentUser.username;
            document.getElementById('profile-phone').textContent = this.currentUser.phoneNumber || '+243 ...';
            
            // Charger les statistiques utilisateur
            this.loadUserStats();
        }
    }

    async loadUserStats() {
        // Implémenter le chargement des stats utilisateur
        document.getElementById('user-posts').textContent = '0';
        document.getElementById('user-comments').textContent = '0';
    }

    async loadInitialData() {
        // Charger les données initiales
        this.loadPosts();
        
        // Simuler le nombre d'utilisateurs
        document.getElementById('total-users').textContent = '150+';
    }

    async logout() {
        this.token = null;
        this.currentUser = null;
        
        if (this.isNative) {
            await Preferences.remove({ key: 'auth_token' });
        } else {
            localStorage.removeItem('token');
        }
        
        this.showAuthModal();
        this.showToast('Déconnexion réussie');
    }

    async showToast(message, type = 'success') {
        if (this.isNative) {
            await Toast.show({
                text: message,
                duration: 'short'
            });
        } else {
            alert(message); // Fallback pour le web
        }
    }

    formatTypeName(type) {
        const names = {
            'corruption': 'Corruption',
            'viol': 'Viol',
            'vole': 'Vol',
            'arrestation_arbitraire': 'Arrestation',
            'agressions': 'Agressions',
            'enlevement': 'Enlèvement',
            'autres': 'Autres'
        };
        return names[type] || type;
    }
}

// Initialiser l'application
const app = new MobileDenonciationApp();

// Exposer l'application globalement pour les événements onclick
window.app = app;