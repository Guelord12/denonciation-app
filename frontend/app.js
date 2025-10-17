class DenonciationApp {
    constructor() {
        this.API_BASE_URL = window.location.origin;
        this.socket = io(this.API_BASE_URL);
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.currentPage = 'home';
        this.currentPostId = null;
        this.currentCategory = 'all';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthentication();
        this.setupSocketListeners();
    }

    setupEventListeners() {
        // Navigation entre modals
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthModal('register');
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthModal('login');
        });

        // Formulaires d'authentification
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('request-reconnect').addEventListener('click', () => this.handleReconnect());

        // Navigation principale
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage(link.dataset.page);
            });
        });

        // Formulaire de signalement
        document.getElementById('report-form').addEventListener('submit', (e) => this.handleReport(e));
        document.getElementById('get-location').addEventListener('click', () => this.getCurrentLocation());

        // Détection fake news en temps réel
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

        // Analyse de preuve
        const evidenceInput = document.getElementById('report-evidence');
        if (evidenceInput) {
            evidenceInput.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.analyzeEvidence(e.target.files[0]);
                }
            });
        }

        // Déconnexion
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    }

    setupSocketListeners() {
        this.socket.on('newPost', (post) => {
            this.showNotification(`Nouveau signalement: ${post.title}`, 'info');
            if (this.currentPage === 'home') {
                this.loadPosts();
            }
        });

        this.socket.on('newComment', (comment) => {
            this.showNotification(`Nouveau commentaire sur un signalement`, 'info');
        });
    }

    async handleReconnect() {
        const phoneNumber = document.getElementById('login-phone').value;
        
        if (!phoneNumber) {
            this.showNotification('Veuillez d\'abord entrer votre numéro', 'error');
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
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Erreur de connexion', 'error');
        }
    }

    checkAuthentication() {
        if (this.token) {
            this.validateToken();
        } else {
            this.showAuthModal('login');
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
                this.showMainApp();
            } else {
                this.logout();
            }
        } catch (error) {
            this.logout();
        }
    }

    showAuthModal(modalType) {
        document.getElementById('login-modal').classList.remove('active');
        document.getElementById('register-modal').classList.remove('active');
        document.getElementById(`${modalType}-modal`).classList.add('active');
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
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Erreur de connexion', 'error');
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
                this.currentUser = { username: result.username };
                localStorage.setItem('token', this.token);
                this.showMainApp();
                this.showNotification('Connexion réussie!', 'success');
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Erreur de connexion', 'error');
        }
    }

    showCodeModal(code, username, phoneNumber, type = 'register') {
        const title = type === 'register' ? 'Inscription Réussie' : 'Nouveau Code de Reconnexion';
        const message = type === 'register' 
            ? 'Utilisez ce code pour vous connecter' 
            : 'Utilisez ce nouveau code pour vous reconnecter';
        
        document.getElementById('code-modal-title').textContent = title;
        document.getElementById('code-modal-message').textContent = message;
        document.getElementById('code-user-info').textContent = `Pour: ${username} (${phoneNumber})`;
        document.getElementById('code-value').textContent = code;
        
        const modal = document.getElementById('code-modal');
        modal.classList.add('active');
        
        // Gestionnaires d'événements
        document.getElementById('copy-code-btn').onclick = () => {
            navigator.clipboard.writeText(code).then(() => {
                this.showNotification('✅ Code copié dans le presse-papier!', 'success');
            });
        };
        
        document.getElementById('return-login-btn').onclick = () => {
            modal.classList.remove('active');
            this.showAuthModal('login');
            document.getElementById('login-phone').value = phoneNumber;
            document.getElementById('login-code').value = code;
            this.showNotification('✅ Code collé automatiquement!', 'success');
        };
        
        if (type === 'reconnect') {
            navigator.clipboard.writeText(code);
        }
    }

    showMainApp() {
        document.getElementById('login-modal').classList.remove('active');
        document.getElementById('register-modal').classList.remove('active');
        document.getElementById('code-modal').classList.remove('active');
        document.getElementById('main-app').classList.remove('hidden');
        
        document.getElementById('username-display').textContent = this.currentUser.username;
        document.getElementById('welcome-username').textContent = this.currentUser.username;
        
        this.showPage('home');
    }

    showPage(pageName) {
        this.currentPage = pageName;
        
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        document.getElementById(`${pageName}-page`).classList.add('active');

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === pageName) {
                link.classList.add('active');
            }
        });

        switch (pageName) {
            case 'home':
                this.loadCategories();
                this.loadPosts();
                break;
            case 'categories':
                this.loadAllCategories();
                break;
            case 'stats':
                this.loadIAStats();
                break;
        }
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/categories`);
            const categories = await response.json();
            
            const container = document.getElementById('category-filter');
            container.innerHTML = '';
            
            // Bouton "Tous"
            const allButton = document.createElement('button');
            allButton.className = `category-btn ${this.currentCategory === 'all' ? 'active' : ''}`;
            allButton.innerHTML = '<i class="fas fa-layer-group"></i> Tous';
            allButton.onclick = () => {
                this.currentCategory = 'all';
                document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
                allButton.classList.add('active');
                this.loadPosts();
            };
            container.appendChild(allButton);
            
            // Boutons par catégorie
            categories.forEach(category => {
                const button = document.createElement('button');
                button.className = `category-btn ${this.currentCategory === category.name ? 'active' : ''}`;
                button.innerHTML = `<i class="fas fa-${this.getCategoryIcon(category.name)}"></i> ${this.formatTypeName(category.name)} (${category.post_count})`;
                button.onclick = () => {
                    this.currentCategory = category.name;
                    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    this.loadPostsByCategory(category.name);
                };
                container.appendChild(button);
            });
        } catch (error) {
            console.error('Erreur chargement catégories:', error);
        }
    }

    async loadAllCategories() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/categories`);
            const categories = await response.json();
            
            const container = document.getElementById('categories-full-filter');
            container.innerHTML = '';
            
            categories.forEach(category => {
                const button = document.createElement('button');
                button.className = `category-btn`;
                button.innerHTML = `<i class="fas fa-${this.getCategoryIcon(category.name)}"></i> ${this.formatTypeName(category.name)} (${category.post_count})`;
                button.onclick = () => this.loadCategoryPosts(category.name);
                container.appendChild(button);
            });
        } catch (error) {
            console.error('Erreur chargement catégories:', error);
        }
    }

    async loadPosts() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/posts`);
            const posts = await response.json();
            this.renderPosts(posts, 'posts-container');
        } catch (error) {
            console.error('Erreur chargement posts:', error);
        }
    }

    async loadPostsByCategory(category) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/categories/${category}/posts`);
            const data = await response.json();
            this.renderPosts(data.posts, 'posts-container');
        } catch (error) {
            console.error('Erreur chargement posts par catégorie:', error);
        }
    }

    async loadCategoryPosts(category) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/categories/${category}/posts`);
            const data = await response.json();
            this.renderPosts(data.posts, 'category-posts-container');
        } catch (error) {
            console.error('Erreur chargement posts catégorie:', error);
        }
    }

    renderPosts(posts, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="post-card">
                    <div class="post-content">
                        <div class="post-title">Aucun signalement pour le moment</div>
                        <p>Soyez le premier à signaler une violation en RDC</p>
                    </div>
                </div>
            `;
            return;
        }

        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            container.appendChild(postElement);
        });
    }

    createPostElement(post) {
        const div = document.createElement('div');
        div.className = 'post-card';
        
        let aiAnalysisHTML = '';
        if (post.ai_analysis) {
            const confidence = post.ai_analysis.confidence || 0;
            const scoreClass = confidence > 70 ? 'score-high' : confidence > 40 ? 'score-medium' : 'score-low';
            aiAnalysisHTML = `
                <div class="ai-analysis-panel">
                    <h4><i class="fas fa-robot"></i> Analyse IA</h4>
                    <div>
                        <span class="ai-score ${scoreClass}">${Math.round(confidence * 100)}%</span>
                        <span>Confiance dans l'authenticité</span>
                    </div>
                    ${post.ai_analysis.detectedObjects && post.ai_analysis.detectedObjects.length > 0 ? `
                        <div style="margin-top: 10px;">
                            <strong>Éléments détectés:</strong> ${post.ai_analysis.detectedObjects.slice(0, 3).join(', ')}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        div.innerHTML = `
            ${post.evidence_url ? `
                <img src="${this.API_BASE_URL}${post.evidence_url}" alt="Preuve" class="post-image" 
                     style="cursor: pointer;" onclick="this.style.maxWidth = this.style.maxWidth ? '' : '100%'">
            ` : ''}
            <div class="post-content">
                <div class="post-title">${post.title}</div>
                <div class="post-meta">
                    <span class="post-type" style="background: ${post.color}">${this.formatTypeName(post.type_name)}</span>
                    <span>par ${post.username}</span>
                </div>
                <p>${post.description}</p>
                ${post.location_name ? `
                    <div class="post-location">
                        <i class="fas fa-map-marker-alt"></i> ${post.location_name}
                    </div>
                ` : ''}
                ${aiAnalysisHTML}
                <div class="post-date">
                    ${new Date(post.created_at).toLocaleDateString('fr-FR')}
                    <span style="margin-left: 1rem; color: #3498db;">
                        <i class="fas fa-comments"></i> ${post.comment_count || 0} commentaires
                    </span>
                </div>
            </div>
        `;

        return div;
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
            this.displayFakeAnalysis(result.analysis);
        } catch (error) {
            console.error('Erreur détection fake news:', error);
        }
    }

    displayFakeAnalysis(analysis) {
        const container = document.getElementById('fake-analysis-result');
        const panel = document.getElementById('ai-fake-detection');
        
        if (!analysis) {
            panel.style.display = 'none';
            return;
        }
        
        const scoreClass = analysis.fake_probability > 70 ? 'score-low' : 
                          analysis.fake_probability > 40 ? 'score-medium' : 'score-high';
        
        container.innerHTML = `
            <div>
                <span class="ai-score ${scoreClass}">${analysis.fake_probability}%</span>
                <span>Risque de fausse information</span>
            </div>
            <div style="margin-top: 10px;">
                <strong>Crédibilité:</strong> ${analysis.credibility_score}%
            </div>
            ${analysis.red_flags && analysis.red_flags.length > 0 ? `
                <div style="margin-top: 10px;">
                    <strong>Signaux d'alerte:</strong>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        ${analysis.red_flags.slice(0, 3).map(flag => `<li>${flag}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
        
        panel.style.display = 'block';
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
            this.displayEvidenceAnalysis(result.analysis);
        } catch (error) {
            console.error('Erreur analyse preuve:', error);
        }
    }

    displayEvidenceAnalysis(analysis) {
        const container = document.getElementById('evidence-analysis-result');
        const panel = document.getElementById('ai-evidence-analysis');
        
        if (!analysis) {
            panel.style.display = 'none';
            return;
        }
        
        const scoreClass = analysis.confidence > 70 ? 'score-high' : 
                          analysis.confidence > 40 ? 'score-medium' : 'score-low';
        
        container.innerHTML = `
            <div>
                <span class="ai-score ${scoreClass}">${Math.round((analysis.confidence || analysis.authenticity_score) * 100)}%</span>
                <span>Confiance dans l'authenticité</span>
            </div>
            ${analysis.detectedObjects && analysis.detectedObjects.length > 0 ? `
                <div style="margin-top: 10px;">
                    <strong>Éléments détectés:</strong> ${analysis.detectedObjects.slice(0, 5).join(', ')}
                </div>
            ` : ''}
            <div style="margin-top: 10px; font-size: 0.9rem; color: #666;">
                <i class="fas fa-info-circle"></i> ${analysis.aiVerification === 'ANALYSED' ? 'Analyse IA terminée' : 'Analyse en attente'}
            </div>
        `;
        
        panel.style.display = 'block';
    }

    async handleReport(e) {
        e.preventDefault();
        
        if (!this.token) {
            this.showNotification('Veuillez vous connecter', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('type', document.getElementById('report-type').value);
        formData.append('title', document.getElementById('report-title').value);
        formData.append('description', document.getElementById('report-description').value);
        formData.append('locationName', document.getElementById('report-location').value);
        
        const evidenceFile = document.getElementById('report-evidence').files[0];
        if (!evidenceFile) {
            this.showNotification('Une preuve est obligatoire', 'error');
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
                this.showNotification('Signalement publié avec analyse IA!', 'success');
                document.getElementById('report-form').reset();
                document.getElementById('ai-fake-detection').style.display = 'none';
                document.getElementById('ai-evidence-analysis').style.display = 'none';
                this.showPage('home');
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Erreur de publication', 'error');
        }
    }

    async loadIAStats() {
        // Implémentation des statistiques IA
        document.getElementById('ai-analyzed').textContent = '150+';
        document.getElementById('ai-authentic').textContent = '85%';
        document.getElementById('ai-risks').textContent = '23';
    }

    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    document.getElementById('report-location').value = `Position: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    this.showNotification('Position obtenue avec succès', 'success');
                },
                (error) => {
                    this.showNotification('Impossible d\'obtenir la position', 'error');
                }
            );
        } else {
            this.showNotification('Géolocalisation non supportée', 'error');
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
        document.getElementById('main-app').classList.add('hidden');
        this.showAuthModal('login');
        this.showNotification('Déconnexion réussie', 'info');
    }

    showNotification(message, type) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }

    getCategoryIcon(category) {
        const icons = {
            'corruption': 'money-bill-wave',
            'viol': 'female',
            'vole': 'gem',
            'arrestation_arbitraire': 'handcuffs',
            'agressions': 'user-injured',
            'enlevement': 'exclamation-triangle',
            'autres': 'ellipsis-h'
        };
        return icons[category] || 'folder';
    }

    formatTypeName(type) {
        const names = {
            'corruption': 'Corruption',
            'viol': 'Viol',
            'vole': 'Vol',
            'arrestation_arbitraire': 'Arrestation Arbitraire',
            'agressions': 'Agressions',
            'enlevement': 'Enlèvement',
            'autres': 'Autres'
        };
        return names[type] || type;
    }
}

// Initialisation de l'application
const app = new DenonciationApp();

// Fonction globale pour le chargement de la carte
function loadMapData() {
    app.loadMapData();
}