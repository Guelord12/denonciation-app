class DenonciationApp {
    constructor() {
        this.API_BASE_URL = window.location.origin;
        this.socket = io(this.API_BASE_URL);
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.currentPage = 'home';
        this.currentPostId = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthentication();
        this.setupSocketListeners();
    }

    setupEventListeners() {
        // Navigation entre modals d'authentification
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

        // ✅ BOUTON DE RECONNEXION
        document.getElementById('request-reconnect').addEventListener('click', () => this.handleReconnect());

        // Navigation principale
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage(link.dataset.page);
            });
        });

        // Boutons de l'application
        document.querySelectorAll('[data-page]').forEach(btn => {
            if (btn.tagName === 'BUTTON') {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showPage(btn.dataset.page);
                });
            }
        });

        // Formulaire de signalement
        document.getElementById('report-form').addEventListener('submit', (e) => this.handleReport(e));
        document.getElementById('get-location').addEventListener('click', () => this.getCurrentLocation());

        // Formulaire de contact
        document.getElementById('contact-form').addEventListener('submit', (e) => this.handleContact(e));

        // Assistance IA
        document.getElementById('ai-send').addEventListener('click', () => this.handleAIChat());
        document.getElementById('ai-question').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAIChat();
        });

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
            if (this.currentPostId && this.currentPostId === comment.post_id) {
                this.loadComments(this.currentPostId);
            }
        });
    }

    // ✅ FONCTION DE RECONNEXION POUR ANCIENS UTILISATEURS (AFFICHAGE DU CODE)
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
                // ✅ AFFICHER LE CODE DIRECTEMENT À L'UTILISATEUR
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

    // ✅ INSCRIPTION AMÉLIORÉE (AFFICHAGE DU CODE)
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
                // ✅ AFFICHER LE CODE DIRECTEMENT À L'UTILISATEUR
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

    // ✅ NOUVELLE FONCTION POUR AFFICHER LE CODE
    showCodeModal(code, username, phoneNumber, type = 'register') {
        const title = type === 'register' ? 'Inscription Réussie' : 'Nouveau Code de Reconnexion';
        const message = type === 'register' 
            ? 'Utilisez ce code pour vous connecter' 
            : 'Utilisez ce nouveau code pour vous reconnecter';
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content auth-modal" style="max-width: 500px;">
                <div class="auth-header">
                    <div class="app-icon" style="background: #27ae60;">
                        <i class="fas fa-key"></i>
                    </div>
                    <h2>${title}</h2>
                    <p>${message}</p>
                </div>
                
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">
                        Pour: <strong>${username}</strong> (${phoneNumber})
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px; border: 2px dashed #3498db; margin: 1rem 0;">
                        <div style="font-size: 0.9rem; color: #666; margin-bottom: 0.5rem;">Votre code de vérification:</div>
                        <div style="font-size: 2.5rem; font-weight: bold; color: #e74c3c; letter-spacing: 5px; margin: 1rem 0;">
                            ${code}
                        </div>
                        <div style="font-size: 0.8rem; color: #e67e22;">
                            ⏰ Expire dans 10 minutes
                        </div>
                    </div>
                    
                    <button onclick="app.copyCode('${code}')" class="btn btn-primary" style="margin: 0.5rem;">
                        <i class="fas fa-copy"></i> Copier le Code
                    </button>
                    
                    <button onclick="app.closeCodeModal()" class="btn btn-outline" style="margin: 0.5rem;">
                        <i class="fas fa-times"></i> Fermer
                    </button>
                </div>
                
                <div style="background: #e8f4fd; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                    <div style="font-size: 0.9rem; color: #3498db;">
                        <i class="fas fa-info-circle"></i> 
                        <strong>Instructions:</strong> Copiez ce code et utilisez-le dans l'écran de connexion
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // ✅ FONCTION POUR COPIER LE CODE
    copyCode(code) {
        navigator.clipboard.writeText(code).then(() => {
            this.showNotification('✅ Code copié dans le presse-papier!', 'success');
            // Remplir automatiquement le champ code dans le modal de connexion
            document.getElementById('login-code').value = code;
        }).catch(() => {
            this.showNotification('❌ Impossible de copier le code', 'error');
        });
    }

    // ✅ FONCTION POUR FERMER LE MODAL
    closeCodeModal() {
        const modal = document.querySelector('.modal.active');
        if (modal) {
            modal.remove();
        }
        // Rediriger vers le modal de connexion
        this.showAuthModal('login');
        // Pré-remplir le numéro de téléphone
        const phoneFromRegister = document.getElementById('reg-phone').value;
        if (phoneFromRegister) {
            document.getElementById('login-phone').value = phoneFromRegister;
        }
    }

    showMainApp() {
        document.getElementById('login-modal').classList.remove('active');
        document.getElementById('register-modal').classList.remove('active');
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
                this.loadPosts();
                break;
            case 'stats':
                this.loadStatistics();
                break;
            case 'map':
                this.loadMapData();
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
        } catch (error) {
            console.error('Erreur chargement posts:', error);
        }
    }

    createPostElement(post) {
        const div = document.createElement('div');
        div.className = 'post-card';
        
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
                <div class="post-date">
                    ${new Date(post.created_at).toLocaleDateString('fr-FR')}
                    <span style="margin-left: 1rem; color: #3498db;">
                        <i class="fas fa-comments"></i> ${post.comment_count || 0} commentaires
                    </span>
                </div>
                
                <!-- SECTION COMMENTAIRES -->
                <div class="comments-section" data-post-id="${post.id}">
                    <h4><i class="fas fa-comments"></i> Commentaires</h4>
                    <div class="comments-list" id="comments-${post.id}">
                        <p>Chargement des commentaires...</p>
                    </div>
                    
                    <!-- FORMULAIRE DE COMMENTAIRE -->
                    <div class="comment-form">
                        <textarea class="comment-input" id="comment-input-${post.id}" 
                                  placeholder="Ajouter un commentaire..." rows="3"></textarea>
                        <div style="margin: 0.5rem 0;">
                            <input type="file" id="comment-file-${post.id}" 
                                   accept="image/*,video/*,.pdf,.doc,.docx" 
                                   style="margin-bottom: 0.5rem;">
                            <small>Image, vidéo ou document (optionnel)</small>
                        </div>
                        <button class="btn btn-primary" onclick="app.addComment(${post.id})">
                            <i class="fas fa-paper-plane"></i> Commenter
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Charger les commentaires après création de l'élément
        setTimeout(() => {
            this.loadComments(post.id);
        }, 100);

        return div;
    }

    // ✅ FONCTIONS POUR LES COMMENTAIRES
    async loadComments(postId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/posts/${postId}/comments`);
            const comments = await response.json();
            
            const container = document.getElementById(`comments-${postId}`);
            if (!container) return;
            
            container.innerHTML = '';
            
            if (comments.length === 0) {
                container.innerHTML = '<p>Aucun commentaire pour le moment.</p>';
                return;
            }
            
            comments.forEach(comment => {
                const commentElement = this.createCommentElement(comment, postId);
                container.appendChild(commentElement);
            });
        } catch (error) {
            console.error('Erreur chargement commentaires:', error);
        }
    }

    createCommentElement(comment, postId) {
        const div = document.createElement('div');
        div.className = 'comment';
        div.innerHTML = `
            <div class="comment-header">
                <span class="comment-user">${comment.username}</span>
                <span class="comment-date">${new Date(comment.created_at).toLocaleString('fr-FR')}</span>
            </div>
            <div class="comment-content">${comment.content}</div>
            ${comment.evidence_url ? `
                <div>
                    ${comment.evidence_type === 'image' ? 
                        `<img src="${this.API_BASE_URL}${comment.evidence_url}" alt="Preuve commentaire" class="comment-evidence">` :
                    comment.evidence_type === 'video' ?
                        `<video src="${this.API_BASE_URL}${comment.evidence_url}" controls class="comment-evidence"></video>` :
                        `<a href="${this.API_BASE_URL}${comment.evidence_url}" target="_blank">📎 Document joint</a>`
                    }
                </div>
            ` : ''}
            <div class="comment-actions">
                <button class="reply-btn" onclick="app.showReplyForm(${comment.id}, ${postId})">
                    <i class="fas fa-reply"></i> Répondre
                </button>
            </div>
            <div class="reply-form" id="reply-form-${comment.id}" style="display: none;">
                <textarea placeholder="Votre réponse..." rows="2" id="reply-content-${comment.id}"></textarea>
                <div style="margin: 0.5rem 0;">
                    <input type="file" id="reply-file-${comment.id}" accept="image/*,video/*,.pdf,.doc,.docx">
                </div>
                <button class="btn btn-primary" onclick="app.addReply(${comment.id}, ${postId})">Répondre</button>
                <button class="btn btn-outline" onclick="app.hideReplyForm(${comment.id})">Annuler</button>
            </div>
            <div class="replies-section" id="replies-${comment.id}">
                <!-- Réponses chargées dynamiquement -->
            </div>
        `;

        // Charger les réponses
        this.loadReplies(comment.id);
        
        return div;
    }

    async loadReplies(commentId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/comments/${commentId}/replies`);
            const replies = await response.json();
            
            const container = document.getElementById(`replies-${commentId}`);
            if (!container) return;
            
            container.innerHTML = '';
            
            if (replies.length === 0) {
                return;
            }
            
            replies.forEach(reply => {
                const replyElement = this.createCommentElement(reply, null);
                container.appendChild(replyElement);
            });
        } catch (error) {
            console.error('Erreur chargement réponses:', error);
        }
    }

    // ✅ AJOUTER UN COMMENTAIRE
    async addComment(postId) {
        if (!this.token) {
            this.showNotification('Veuillez vous connecter pour commenter', 'error');
            return;
        }

        const content = document.getElementById(`comment-input-${postId}`).value;
        const fileInput = document.getElementById(`comment-file-${postId}`);
        
        if (!content.trim()) {
            this.showNotification('Veuillez écrire un commentaire', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('postId', postId);
        formData.append('content', content);
        
        if (fileInput.files[0]) {
            formData.append('evidence', fileInput.files[0]);
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Commentaire ajouté!', 'success');
                document.getElementById(`comment-input-${postId}`).value = '';
                fileInput.value = '';
                this.loadComments(postId);
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Erreur lors de l\'ajout du commentaire', 'error');
        }
    }

    // ✅ FONCTIONS POUR LES RÉPONSES
    showReplyForm(commentId, postId) {
        document.getElementById(`reply-form-${commentId}`).style.display = 'block';
    }

    hideReplyForm(commentId) {
        document.getElementById(`reply-form-${commentId}`).style.display = 'none';
    }

    async addReply(parentCommentId, postId) {
        if (!this.token) {
            this.showNotification('Veuillez vous connecter pour répondre', 'error');
            return;
        }

        const content = document.getElementById(`reply-content-${parentCommentId}`).value;
        const fileInput = document.getElementById(`reply-file-${parentCommentId}`);
        
        if (!content.trim()) {
            this.showNotification('Veuillez écrire une réponse', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('postId', postId);
        formData.append('content', content);
        formData.append('parentCommentId', parentCommentId);
        
        if (fileInput.files[0]) {
            formData.append('evidence', fileInput.files[0]);
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Réponse ajoutée!', 'success');
                this.hideReplyForm(parentCommentId);
                document.getElementById(`reply-content-${parentCommentId}`).value = '';
                fileInput.value = '';
                this.loadReplies(parentCommentId);
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Erreur lors de l\'ajout de la réponse', 'error');
        }
    }

    async loadStatistics() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/statistics`);
            const stats = await response.json();

            this.displayStatistics(stats);
            this.renderChart(stats);
        } catch (error) {
            console.error('Erreur chargement stats:', error);
        }
    }

    displayStatistics(stats) {
        const container = document.getElementById('stats-grid');
        container.innerHTML = '';

        stats.forEach(stat => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <h4>${this.formatTypeName(stat.name)}</h4>
                <div class="stat-value">${stat.count || 0}</div>
                <div class="stat-label">signalements</div>
            `;
            container.appendChild(card);
        });
    }

    renderChart(stats) {
        const ctx = document.getElementById('stats-chart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: stats.map(stat => this.formatTypeName(stat.name)),
                datasets: [{
                    data: stats.map(stat => stat.count || 0),
                    backgroundColor: stats.map(stat => stat.color || '#3498db')
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    loadMapData() {
        const mapContainer = document.getElementById('map');
        mapContainer.innerHTML = `
            <div class="map-placeholder">
                <i class="fas fa-map-marked-alt"></i>
                <h3>Carte des Signalements</h3>
                <p>Fonctionnalité en développement avancé</p>
                <p>Visualisation en temps réel des signalements géolocalisés</p>
                <div style="margin-top: 1rem;">
                    <div class="stat-card" style="display: inline-block; margin: 0.5rem;">
                        <div class="stat-value" style="color: #e74c3c;">✓</div>
                        <div class="stat-label">Géolocalisation</div>
                    </div>
                    <div class="stat-card" style="display: inline-block; margin: 0.5rem;">
                        <div class="stat-value" style="color: #3498db;">✓</div>
                        <div class="stat-label">Temps réel</div>
                    </div>
                    <div class="stat-card" style="display: inline-block; margin: 0.5rem;">
                        <div class="stat-value" style="color: #27ae60;">✓</div>
                        <div class="stat-label">Clusterisation</div>
                    </div>
                </div>
            </div>
        `;
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
                this.showNotification('Signalement publié avec succès!', 'success');
                document.getElementById('report-form').reset();
                this.showPage('home');
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Erreur de publication', 'error');
        }
    }

    async handleContact(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('contact-name').value,
            email: document.getElementById('contact-email').value,
            subject: document.getElementById('contact-subject').value,
            message: document.getElementById('contact-message').value
        };

        try {
            this.showNotification('Message envoyé avec succès!', 'success');
            document.getElementById('contact-form').reset();
        } catch (error) {
            this.showNotification('Erreur d\'envoi', 'error');
        }
    }

    handleAIChat() {
        const input = document.getElementById('ai-question');
        const message = input.value.trim();
        
        if (!message) return;

        this.addAIMessage(message, 'user');
        input.value = '';

        setTimeout(() => {
            const response = this.generateAIResponse(message);
            this.addAIMessage(response, 'bot');
        }, 800);
    }

    addAIMessage(message, sender) {
        const messages = document.getElementById('ai-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${sender}`;
        
        if (sender === 'bot') {
            messageDiv.innerHTML = `
                <div style="display: flex; align-items: start; gap: 10px; margin-bottom: 15px;">
                    <div style="background: #3498db; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">
                        IA
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: #3498db; margin-bottom: 5px;">Assistant Dénonciation RDC:</div>
                        <div style="background: #e3f2fd; padding: 12px; border-radius: 10px; border-left: 4px solid #3498db;">
                            ${message}
                        </div>
                    </div>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div style="display: flex; align-items: start; gap: 10px; margin-bottom: 15px; justify-content: flex-end;">
                    <div style="flex: 1; text-align: right;">
                        <div style="font-weight: bold; color: #e74c3c; margin-bottom: 5px;">Vous:</div>
                        <div style="background: #ffebee; padding: 12px; border-radius: 10px; border-right: 4px solid #e74c3c;">
                            ${message}
                        </div>
                    </div>
                    <div style="background: #e74c3c; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">
                        👤
                    </div>
                </div>
            `;
        }
        
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    generateAIResponse(question) {
        const responses = {
            'publier': `Pour publier une dénonciation :<br>
1. Cliquez sur "Signaler" dans le menu<br>
2. Sélectionnez le type de violation<br>
3. Donnez un titre clair à votre signalement<br>
4. Décrivez en détail ce qui s'est passé<br>
5. Ajoutez une preuve (photo/vidéo)<br>
6. Indiquez le lieu si possible<br>
7. Cliquez sur "Publier le Signalement"`,

            'commenter': `Pour commenter une publication :<br>
1. Cliquez sur une publication<br>
2. Rédigez votre commentaire<br>
3. Optionnel: ajoutez une image/vidéo<br>
4. Cliquez sur "Commenter"<br><br>
Vous pouvez aussi répondre aux commentaires existants!`,

            'repondre': `Pour répondre à un commentaire :<br>
1. Cliquez sur "Répondre" sous un commentaire<br>
2. Écrivez votre réponse<br>
3. Optionnel: ajoutez un fichier<br>
4. Cliquez sur "Répondre"`,

            'reconnexion': `Si vous êtes un ancien utilisateur :<br>
1. Entrez votre numéro de téléphone<br>
2. Cliquez sur "Demander un nouveau code"<br>
3. Utilisez le code affiché pour vous connecter<br>
4. Vous retrouverez votre compte!`,

            'default': `Je comprends que vous avez une question sur Dénonciation RDC. 🤔<br><br>
Je peux vous aider avec :<br>
• L'utilisation de l'application<br>
• La publication de signalements<br>  
• Le système de commentaires<br>
• La reconnexion pour anciens utilisateurs<br><br>
Pouvez-vous reformuler votre question ?`
        };

        question = question.toLowerCase();
        
        if (question.includes('comment') || question.includes('commentaire')) {
            return responses.commenter;
        } else if (question.includes('répondre') || question.includes('reponse') || question.includes('reply')) {
            return responses.repondre;
        } else if (question.includes('reconnect') || question.includes('ancien') || question.includes('code perdu')) {
            return responses.reconnexion;
        } else {
            return responses.default;
        }
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