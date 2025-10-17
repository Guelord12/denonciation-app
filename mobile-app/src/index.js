import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import { Toast } from '@capacitor/toast';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';

class MobileDenonciationApp {
    constructor() {
        this.API_BASE_URL = 'https://denonciation-app.onrender.com';
        this.currentUser = null;
        this.token = null;
        this.isNative = Capacitor.isNativePlatform();
        this.currentCategory = null;
        this.currentCodeData = null;
        
        this.init();
    }

    async init() {
        await this.setupCapacitor();
        this.setupEventListeners();
        this.checkAuthentication();
        this.loadInitialData();
    }

    async setupCapacitor() {
        try {
            await SplashScreen.hide();
        } catch (error) {
            console.log('Splash screen already hidden');
        }

        if (this.isNative) {
            App.addListener('backButton', (data) => {
                if (!data.canGoBack) {
                    App.exitApp();
                }
            });
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.showPage(page);
                
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });

        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('report-form').addEventListener('submit', (e) => this.handleReport(e));
        document.getElementById('request-reconnect').addEventListener('click', () => this.handleReconnect());

        document.getElementById('report-evidence').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('file-name').textContent = `Fichier: ${file.name}`;
                this.analyzeEvidence(file);
            }
        });

        const titleInput = document.getElementById('report-title');
        const descInput = document.getElementById('report-description');
        
        if (titleInput && descInput) {
            let fakeDetectionTimeout;
            const performFakeDetection = () => {
                clearTimeout(fakeDetectionTimeout);
                fakeDetectionTimeout = setTimeout(() => {
                    if (titleInput.value.length > 10 || descInput.value.length > 50) {
                        this.performFakeNewsDetection(titleInput.value, descInput.value);
                    }
                }, 1000);
            };
            
            titleInput.addEventListener('input', performFakeDetection);
            descInput.addEventListener('input', performFakeDetection);
        }
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
        document.getElementById('code-modal').style.display = 'none';
    }

    showLogin() {
        document.getElementById('register-modal').style.display = 'none';
        document.getElementById('code-modal').style.display = 'none';
        document.getElementById('auth-modal').style.display = 'flex';
    }

    showRegister() {
        document.getElementById('auth-modal').style.display = 'none';
        document.getElementById('code-modal').style.display = 'none';
        document.getElementById('register-modal').style.display = 'flex';
    }

    async handleReconnect() {
        const phoneNumber = document.getElementById('login-phone').value;
        
        if (!phoneNumber) {
            this.showToast('Veuillez d\'abord entrer votre numéro');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/request-reconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber })
            });

            const result = await response.json();

            if (result.success) {
                this.showCodeModal(result.code, result.username, result.phoneNumber, 'reconnect');
            } else {
                this.showToast(result.error);
            }
        } catch (error) {
            this.showToast('Erreur de connexion');
        }
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
                this.currentUser = { 
                    username: result.username,
                    phoneNumber: phoneNumber 
                };
                
                if (this.isNative) {
                    await Preferences.set({ key: 'auth_token', value: this.token });
                } else {
                    localStorage.setItem('token', this.token);
                }

                this.hideAuthModal();
                this.updateProfile();
                this.showToast('Connexion réussie!');
            } else {
                this.showToast(result.error);
            }
        } catch (error) {
            this.showToast('Erreur de connexion');
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
                this.showCodeModal(result.code, result.username, result.phoneNumber, 'register');
            } else {
                this.showToast(result.error);
            }
        } catch (error) {
            this.showToast('Erreur d\'inscription');
        }
    }

    showCodeModal(code, username, phoneNumber, type = 'register') {
        this.currentCodeData = { code, username, phoneNumber, type };
        
        const title = type === 'register' ? 'Inscription Réussie' : 'Nouveau Code';
        const message = type === 'register' 
            ? 'Utilisez ce code pour vous connecter' 
            : 'Utilisez ce code pour vous reconnecter';
        
        document.getElementById('mobile-code-title').textContent = title;
        document.getElementById('mobile-code-message').textContent = message;
        document.getElementById('mobile-code-user').textContent = `Pour: ${username} (${phoneNumber})`;
        document.getElementById('mobile-code-value').textContent = code;
        
        document.getElementById('code-modal').style.display = 'flex';
        
        if (type === 'reconnect') {
            this.copyCode();
        }
    }

    async copyCode() {
        if (!this.currentCodeData) return;
        
        if (this.isNative) {
            await Toast.show({
                text: 'Code copié!',
                duration: 'short'
            });
        } else {
            navigator.clipboard.writeText(this.currentCodeData.code).then(() => {
                this.showToast('Code copié!');
            });
        }
    }

    returnToLogin() {
        if (!this.currentCodeData) return;
        
        document.getElementById('code-modal').style.display = 'none';
        this.showLogin();
        
        document.getElementById('login-phone').value = this.currentCodeData.phoneNumber;
        document.getElementById('login-code').value = this.currentCodeData.code;
        
        this.showToast('Code collé automatiquement!');
    }

    async handleReport(e) {
        e.preventDefault();
        
        if (!this.token) {
            this.showToast('Veuillez vous connecter');
            this.showAuthModal();
            return;
        }

        const formData = new FormData();
        formData.append('type', document.getElementById('report-type').value);
        formData.append('title', document.getElementById('report-title').value);
        formData.append('description', document.getElementById('report-description').value);
        formData.append('locationName', document.getElementById('report-location').value);
        
        const evidenceFile = document.getElementById('report-evidence').files[0];
        if (!evidenceFile) {
            this.showToast('Une preuve est obligatoire');
            return;
        }
        formData.append('evidence', evidenceFile);

        try {
            this.showToast('Publication en cours...');
            
            const response = await fetch(`${this.API_BASE_URL}/api/posts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Signalement publié avec IA!');
                document.getElementById('report-form').reset();
                document.getElementById('file-name').textContent = '';
                document.getElementById('ai-analysis-mobile').style.display = 'none';
                this.showPage('home');
                this.loadPosts();
            } else {
                this.showToast(result.error);
            }
        } catch (error) {
            this.showToast('Erreur de publication');
        }
    }

    async getLocation() {
        try {
            this.showToast('Localisation en cours...');
            
            const coordinates = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000
            });
            
            const lat = coordinates.coords.latitude;
            const lng = coordinates.coords.longitude;
            
            document.getElementById('report-location').value = `Position: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            this.showToast('Position obtenue');
        } catch (error) {
            this.showToast('Impossible d\'obtenir la position');
        }
    }

    async performFakeNewsDetection(title, description) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/ai/detect-fake`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    description: description,
                    evidenceType: 'text'
                })
            });
            
            const result = await response.json();
            this.displayMobileAnalysis(result.analysis, 'fake');
        } catch (error) {
            console.error('Erreur détection fake news:', error);
        }
    }

    async analyzeEvidence(file) {
        try {
            const formData = new FormData();
            formData.append('evidence', file);
            
            const response = await fetch(`${this.API_BASE_URL}/api/ai/analyze-evidence`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });
            
            const result = await response.json();
            this.displayMobileAnalysis(result.analysis, 'evidence');
        } catch (error) {
            console.error('Erreur analyse preuve:', error);
        }
    }

    displayMobileAnalysis(analysis, type) {
        const container = document.getElementById('mobile-analysis-result');
        const panel = document.getElementById('ai-analysis-mobile');
        
        if (!analysis) {
            panel.style.display = 'none';
            return;
        }
        
        let content = '';
        if (type === 'fake') {
            const score = analysis.fake_probability || 0;
            content = `
                <div style="font-size: 0.9rem;">
                    <div style="margin-bottom: 5px;">
                        <strong>Risque fake:</strong> ${score}%
                    </div>
                    <div>
                        <strong>Crédibilité:</strong> ${analysis.credibility_score}%
                    </div>
                </div>
            `;
        } else {
            const confidence = analysis.confidence || analysis.authenticity_score || 0;
            content = `
                <div style="font-size: 0.9rem;">
                    <div style="margin-bottom: 5px;">
                        <strong>Authenticité:</strong> ${Math.round(confidence * 100)}%
                    </div>
                    ${analysis.detectedObjects && analysis.detectedObjects.length > 0 ? `
                        <div>
                            <strong>Détecté:</strong> ${analysis.detectedObjects.slice(0, 2).join(', ')}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        container.innerHTML = content;
        panel.style.display = 'block';
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/categories`);
            const categories = await response.json();

            this.renderMobileCategories(categories, 'mobile-categories');
            this.renderMobileCategories(categories, 'all-categories');
        } catch (error) {
            console.error('Erreur chargement catégories:', error);
        }
    }

    renderMobileCategories(categories, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const categoryIcons = {
            'corruption': 'money-bill-wave',
            'viol': 'female',
            'vole': 'gem',
            'arrestation_arbitraire': 'handcuffs',
            'agressions': 'user-injured',
            'enlevement': 'exclamation-triangle',
            'autres': 'ellipsis-h'
        };

        container.innerHTML = categories.map(category => `
            <div class="category-card" onclick="app.loadCategoryPosts('${category.name}')">
                <i class="fas fa-${categoryIcons[category.name] || 'folder'}" style="font-size: 1.5rem; color: #e74c3c; margin-bottom: 8px;"></i>
                <div style="font-weight: bold; font-size: 0.9rem;">${this.formatCategoryName(category.name)}</div>
                <div style="color: #666; font-size: 0.8rem;">${category.post_count} signalements</div>
            </div>
        `).join('');
    }

    async loadCategoryPosts(category) {
        this.currentCategory = category;
        this.showPage('categories');
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/categories/${category}/posts`);
            const data = await response.json();
            
            const container = document.getElementById('category-posts-mobile');
            container.innerHTML = '';
            
            if (data.posts.length === 0) {
                container.innerHTML = `
                    <div class="mobile-card" style="text-align: center; color: #666;">
                        <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <p>Aucun signalement dans cette catégorie</p>
                    </div>
                `;
                return;
            }
            
            data.posts.forEach(post => {
                const postElement = this.createPostElement(post);
                container.appendChild(postElement);
            });
        } catch (error) {
            this.showToast('Erreur chargement catégorie');
        }
    }

    createPostElement(post) {
        const div = document.createElement('div');
        div.className = 'post-item';
        
        let aiHTML = '';
        if (post.ai_analysis) {
            const confidence = post.ai_analysis.confidence || 0;
            aiHTML = `
                <div class="ai-analysis-mobile">
                    <div style="font-size: 0.8rem;">
                        <i class="fas fa-robot"></i> IA: ${Math.round(confidence * 100)}% de confiance
                    </div>
                </div>
            `;
        }
        
        div.innerHTML = `
            <div class="post-header">
                <span class="post-type" style="background: ${post.color}">${this.formatCategoryName(post.type_name)}</span>
                <span style="color: #666; font-size: 0.9rem;">${new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="post-title">${post.title}</div>
            <p style="margin-bottom: 10px; color: #666;">${post.description.substring(0, 100)}...</p>
            ${aiHTML}
            <div class="post-meta">
                <span>par ${post.username}</span>
                <span><i class="fas fa-comments"></i> ${post.comment_count || 0}</span>
            </div>
        `;

        return div;
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

        } catch (error) {
            console.error('Erreur chargement posts:', error);
            this.showToast('Erreur chargement');
        }
    }

    showPage(pageName) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        document.getElementById(`${pageName}-page`).classList.add('active');

        switch (pageName) {
            case 'home':
                this.loadPosts();
                this.loadCategories();
                break;
            case 'categories':
                if (this.currentCategory) {
                    this.loadCategoryPosts(this.currentCategory);
                }
                break;
            case 'stats':
                this.loadIAStats();
                break;
        }
    }

    updateProfile() {
        if (this.currentUser) {
            document.getElementById('profile-username').textContent = this.currentUser.username;
            document.getElementById('profile-phone').textContent = this.currentUser.phoneNumber || '+243 ...';
        }
    }

    async loadIAStats() {
        document.getElementById('mobile-ai-analyzed').textContent = '150+';
        document.getElementById('mobile-ai-confidence').textContent = '85%';
    }

    async loadInitialData() {
        this.loadPosts();
        this.loadCategories();
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

    async showToast(message) {
        if (this.isNative) {
            await Toast.show({
                text: message,
                duration: 'short'
            });
        } else {
            console.log('TOAST:', message);
        }
    }

    formatCategoryName(category) {
        const names = {
            'corruption': 'Corruption',
            'viol': 'Viol',
            'vole': 'Vol',
            'arrestation_arbitraire': 'Arrestation',
            'agressions': 'Agressions',
            'enlevement': 'Enlèvement',
            'autres': 'Autres'
        };
        return names[category] || category;
    }
}

const app = new MobileDenonciationApp();
window.app = app;