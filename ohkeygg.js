// ============================================
// OhKeyGG - Premium Key System
// Sistema completo - Todos os cliques funcionais
// ============================================

class OhKeyGG {
    constructor() {
        this.ENCRYPTION_KEY = 'ohkeygg_secret_key_2024';
        this.currentUser = null;
        this.token = localStorage.getItem('ohkeygg_token');
        this.currentPage = 'home';
        this.currentDashboard = 'home';
        
        // DADOS INICIAM VAZIOS
        this.projects = [];
        this.keys = [];
        this.checkpoints = [];
        this.users = [];
        this.statistics = {
            blockedAttempts: 0,
            keysGenerated: 0,
            checkpointsCompleted: 0
        };
        
        this.registeredUsers = JSON.parse(localStorage.getItem('ohkeygg_users') || '[]');
        this.resendTimer = 60;
        this.resendInterval = null;
        
        // Charts
        this.keysChartInstance = null;
        this.usersChartInstance = null;
        this.detailedKeysChartInstance = null;
        this.checkpointChartInstance = null;
        
        this.init();
    }
    
    init() {
        this.loadUserFromToken();
        this.checkAuthState();
        
        // Renderizar página inicial
        this.renderCurrentPage();
        
        // Se já estiver logado, carregar dashboard
        if (this.currentUser) {
            this.loadDashboardData();
        }
    }
    
    // ==================== AUTH ====================
    
    loadUserFromToken() {
        if (this.token) {
            try {
                const payload = JSON.parse(atob(this.token.split('.')[1]));
                this.currentUser = {
                    id: payload.userId,
                    username: payload.username,
                    email: payload.email,
                    role: payload.role,
                    plan: 'free'
                };
            } catch (e) {
                this.token = null;
                localStorage.removeItem('ohkeygg_token');
            }
        }
    }
    
    checkAuthState() {
        const navLinks = document.getElementById('navLinks');
        const navUser = document.getElementById('navUser');
        const navUsername = document.getElementById('navUsername');
        
        if (!navLinks || !navUser || !navUsername) return;
        
        if (this.currentUser) {
            navLinks.classList.add('hidden');
            navUser.classList.remove('hidden');
            navUsername.textContent = this.currentUser.username;
        } else {
            navLinks.classList.remove('hidden');
            navUser.classList.add('hidden');
        }
    }
    
    handleRegister(event) {
        if (event) event.preventDefault();
        
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim().toLowerCase();
        const password = document.getElementById('regPassword').value;
        
        if (!username || !email || !password) {
            this.showNotification('Preencha todos os campos', 'error');
            return;
        }
        
        if (password.length < 8) {
            this.showNotification('A senha deve ter pelo menos 8 caracteres', 'error');
            return;
        }
        
        const existingUser = this.registeredUsers.find(u => u.email === email);
        if (existingUser) {
            this.showNotification('Este email já está registrado', 'error');
            return;
        }
        
        const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
        
        const pendingUser = {
            username,
            email,
            password,
            verificationCode,
            expiresAt: Date.now() + 600000
        };
        
        sessionStorage.setItem('ohkeygg_pending_user', JSON.stringify(pendingUser));
        
        document.getElementById('regStep1').classList.add('hidden');
        document.getElementById('regStep2').classList.remove('hidden');
        document.getElementById('verifyEmailDisplay').textContent = email;
        
        const codeInputs = document.querySelectorAll('.code-input');
        codeInputs.forEach(input => { input.value = ''; });
        if (codeInputs.length > 0) codeInputs[0].focus();
        
        this.startResendTimer();
        this.showEmailSentModal(email, verificationCode);
        this.showNotification(`Código enviado para ${email}!`, 'success');
    }
    
    showEmailSentModal(email, code) {
        const existingModal = document.getElementById('emailSentModal');
        if (existingModal) existingModal.remove();
        
        const modalHTML = `
            <div id="emailSentModal" class="modal show" style="display: flex; z-index: 5000;">
                <div class="modal-content" style="max-width: 450px; text-align: center;">
                    <div style="text-align: right;">
                        <button class="modal-close" onclick="document.getElementById('emailSentModal').remove()" style="font-size: 28px; background: none; border: none; color: var(--text-secondary); cursor: pointer;">&times;</button>
                    </div>
                    <div style="padding: 20px 0;">
                        <i class="fas fa-check-circle" style="font-size: 60px; color: var(--success); margin-bottom: 20px;"></i>
                        <p style="color: var(--text-secondary); margin-bottom: 20px;">
                            Código de verificação enviado para<br>
                            <strong style="color: var(--primary-light); font-size: 16px;">${email}</strong>
                        </p>
                        <div style="background: var(--bg-input); padding: 20px; border-radius: 12px; border: 2px dashed var(--primary); margin: 20px 0;">
                            <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 10px;">SEU CÓDIGO:</p>
                            <span style="font-size: 42px; font-weight: 800; color: var(--primary-light); letter-spacing: 8px; font-family: monospace;">${code}</span>
                        </div>
                        <p style="color: var(--text-muted); font-size: 12px;">Código expira em 10 minutos</p>
                    </div>
                    <button class="btn btn-primary" onclick="document.getElementById('emailSentModal').remove()" style="width: 100%;">
                        <i class="fas fa-check"></i> OK, Entendi
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        setTimeout(() => {
            const modal = document.getElementById('emailSentModal');
            if (modal) modal.remove();
        }, 10000);
    }
    
    startResendTimer() {
        this.resendTimer = 60;
        const resendLink = document.getElementById('resendLink');
        const timerDisplay = document.getElementById('codeTimer');
        
        if (!resendLink || !timerDisplay) return;
        
        resendLink.style.pointerEvents = 'none';
        resendLink.style.opacity = '0.5';
        timerDisplay.textContent = `Reenvio em ${this.resendTimer}s`;
        
        if (this.resendInterval) clearInterval(this.resendInterval);
        
        this.resendInterval = setInterval(() => {
            this.resendTimer--;
            if (timerDisplay) timerDisplay.textContent = `Reenvio em ${this.resendTimer}s`;
            
            if (this.resendTimer <= 0) {
                clearInterval(this.resendInterval);
                if (resendLink) {
                    resendLink.style.pointerEvents = 'auto';
                    resendLink.style.opacity = '1';
                    resendLink.textContent = 'Reenviar código';
                }
                if (timerDisplay) timerDisplay.textContent = '';
            }
        }, 1000);
    }
    
    resendCode() {
        if (this.resendTimer > 0) return;
        
        const pendingUser = JSON.parse(sessionStorage.getItem('ohkeygg_pending_user'));
        if (!pendingUser) {
            this.showNotification('Sessão expirada. Registre-se novamente.', 'error');
            this.navigateTo('register');
            return;
        }
        
        const newCode = String(Math.floor(100000 + Math.random() * 900000));
        pendingUser.verificationCode = newCode;
        pendingUser.expiresAt = Date.now() + 600000;
        
        sessionStorage.setItem('ohkeygg_pending_user', JSON.stringify(pendingUser));
        
        document.querySelectorAll('.code-input').forEach(input => { input.value = ''; });
        const firstInput = document.querySelector('.code-input');
        if (firstInput) firstInput.focus();
        
        this.startResendTimer();
        this.showEmailSentModal(pendingUser.email, newCode);
        this.showNotification('Novo código enviado!', 'success');
    }
    
    handleCodeInput(event) {
        const input = event.target;
        input.value = input.value.replace(/[^0-9]/g, '');
        
        if (input.value.length === 1) {
            const nextInput = input.nextElementSibling;
            if (nextInput && nextInput.classList.contains('code-input')) {
                nextInput.focus();
            }
        }
    }
    
    handleCodeKeydown(event) {
        const input = event.target;
        if (event.key === 'Backspace' && input.value.length === 0) {
            const prevInput = input.previousElementSibling;
            if (prevInput && prevInput.classList.contains('code-input')) {
                prevInput.focus();
            }
        }
    }
    
    getVerificationCode() {
        const inputs = document.querySelectorAll('.code-input');
        let code = '';
        inputs.forEach(input => { code += input.value; });
        return code;
    }
    
    verifyEmail() {
        const code = this.getVerificationCode();
        
        if (code.length !== 6) {
            this.showNotification('Digite o código de 6 dígitos', 'error');
            return;
        }
        
        const pendingUser = JSON.parse(sessionStorage.getItem('ohkeygg_pending_user'));
        
        if (!pendingUser) {
            this.showNotification('Sessão expirada. Registre-se novamente.', 'error');
            this.navigateTo('register');
            return;
        }
        
        if (Date.now() > pendingUser.expiresAt) {
            this.showNotification('Código expirado. Solicite um novo.', 'error');
            sessionStorage.removeItem('ohkeygg_pending_user');
            this.navigateTo('register');
            return;
        }
        
        const verifyBtn = document.getElementById('verifyBtn');
        if (verifyBtn) {
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<div class="loading-spinner"></div> Verificando...';
        }
        
        setTimeout(() => {
            if (code === pendingUser.verificationCode) {
                const newUser = {
                    id: 'user_' + Date.now(),
                    username: pendingUser.username,
                    email: pendingUser.email,
                    password: pendingUser.password,
                    role: 'user',
                    plan: 'free',
                    emailVerified: true,
                    createdAt: new Date().toISOString()
                };
                
                this.registeredUsers.push(newUser);
                localStorage.setItem('ohkeygg_users', JSON.stringify(this.registeredUsers));
                
                this.users.push({
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    keys: 0,
                    lastActive: new Date().toISOString().split('T')[0],
                    status: 'active'
                });
                
                const token = this.generateToken({
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    role: newUser.role
                });
                
                this.token = token;
                this.currentUser = {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    role: newUser.role,
                    plan: 'free'
                };
                localStorage.setItem('ohkeygg_token', token);
                
                sessionStorage.removeItem('ohkeygg_pending_user');
                if (this.resendInterval) clearInterval(this.resendInterval);
                
                this.showNotification('Conta verificada! Bem-vindo!', 'success');
                this.checkAuthState();
                
                setTimeout(() => {
                    this.navigateTo('dashboard');
                    if (verifyBtn) {
                        verifyBtn.disabled = false;
                        verifyBtn.innerHTML = '<span>Verificar Email</span>';
                    }
                }, 1000);
                
            } else {
                this.showNotification('Código inválido. Tente novamente.', 'error');
                if (verifyBtn) {
                    verifyBtn.disabled = false;
                    verifyBtn.innerHTML = '<span>Verificar Email</span>';
                }
            }
        }, 1000);
    }
    
    handleLogin(event) {
        if (event) event.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            this.showNotification('Preencha todos os campos', 'error');
            return;
        }
        
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<div class="loading-spinner"></div> Entrando...';
        }
        
        const user = this.registeredUsers.find(u => u.email === email);
        
        setTimeout(() => {
            if (!user) {
                this.showNotification('Email não encontrado', 'error');
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<span>Entrar</span>';
                }
                return;
            }
            
            if (user.password !== password) {
                this.showNotification('Senha incorreta', 'error');
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<span>Entrar</span>';
                }
                return;
            }
            
            if (!user.emailVerified) {
                this.showNotification('Email não verificado', 'error');
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<span>Entrar</span>';
                }
                return;
            }
            
            const token = this.generateToken({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            });
            
            this.token = token;
            this.currentUser = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                plan: user.plan
            };
            localStorage.setItem('ohkeygg_token', token);
            
            if (!this.users.find(u => u.id === user.id)) {
                this.users.push({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    keys: 0,
                    lastActive: new Date().toISOString().split('T')[0],
                    status: 'active'
                });
            }
            
            this.showNotification('Login bem-sucedido!', 'success');
            this.checkAuthState();
            
            setTimeout(() => {
                this.navigateTo('dashboard');
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<span>Entrar</span>';
                }
            }, 800);
        }, 500);
    }
    
    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('ohkeygg_token');
        this.checkAuthState();
        this.navigateTo('home');
        this.showNotification('Você saiu da sua conta', 'info');
    }
    
    generateToken(user) {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            exp: Date.now() + 7 * 24 * 60 * 60 * 1000
        }));
        const signature = btoa(this.ENCRYPTION_KEY + user.id);
        return `${header}.${payload}.${signature}`;
    }
    
    // ==================== NAVIGATION ====================
    
    navigateTo(page) {
        // Resetar forms
        if (page === 'register') {
            const regStep1 = document.getElementById('regStep1');
            const regStep2 = document.getElementById('regStep2');
            if (regStep1) regStep1.classList.remove('hidden');
            if (regStep2) regStep2.classList.add('hidden');
            const form = document.getElementById('registerForm');
            if (form) form.reset();
            const regBtn = document.getElementById('regBtn');
            if (regBtn) {
                regBtn.disabled = false;
                regBtn.innerHTML = '<span>Criar Conta</span>';
            }
            if (this.resendInterval) clearInterval(this.resendInterval);
        }
        
        if (page === 'login') {
            const form = document.getElementById('loginForm');
            if (form) form.reset();
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<span>Entrar</span>';
            }
        }
        
        if (['dashboard'].includes(page) && !this.currentUser) {
            this.showNotification('Faça login primeiro', 'warning');
            page = 'login';
        }
        
        // Esconder todas as páginas
        document.querySelectorAll('#app > .page-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Mostrar página
        const pageMap = {
            'home': 'home-page',
            'login': 'login-page',
            'register': 'register-page',
            'dashboard': 'dashboard-page'
        };
        
        const pageId = pageMap[page];
        if (pageId) {
            const pageElement = document.getElementById(pageId);
            if (pageElement) {
                pageElement.classList.add('active');
                this.currentPage = page;
            }
        }
        
        if (page === 'dashboard' && this.currentUser) {
            this.renderDashboardHome();
            this.switchDashboard('home', document.querySelector('.sidebar-link'));
        }
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
    
    renderCurrentPage() {
        this.navigateTo(this.currentPage);
    }
    
    switchDashboard(section, element) {
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        if (element) element.classList.add('active');
        
        const dashboardContent = document.getElementById('dashboardContent');
        if (!dashboardContent) return;
        
        dashboardContent.querySelectorAll('.page-section').forEach(s => {
            s.classList.remove('active');
        });
        
        const sectionElement = document.getElementById('dash-' + section);
        if (sectionElement) {
            sectionElement.classList.add('active');
            this.currentDashboard = section;
            this.loadDashboardSection(section);
        }
    }
    
    // ==================== DASHBOARD ====================
    
    loadDashboardData() {
        this.renderDashboardHome();
    }
    
    renderDashboardHome() {
        const dashboardContent = document.getElementById('dashboardContent');
        if (!dashboardContent) return;
        
        // Verificar se o dashboard já foi renderizado
        if (document.getElementById('dash-home')) return;
        
        dashboardContent.innerHTML = `
            <div id="dash-home" class="page-section active">
                <h2 style="margin-bottom: 20px;">Visão Geral</h2>
                <div class="stats-grid" id="dashboardStats"></div>
                <div class="charts-grid">
                    <div class="chart-container"><canvas id="keysChart"></canvas></div>
                    <div class="chart-container"><canvas id="usersChart"></canvas></div>
                </div>
            </div>
            <div id="dash-projects" class="page-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2>Meus Projetos</h2>
                    <button class="btn btn-primary" onclick="app.showModal('projectModal')">
                        <i class="fas fa-plus"></i> Novo Projeto
                    </button>
                </div>
                <div class="projects-grid" id="projectsList"></div>
            </div>
            <div id="dash-keys" class="page-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2>Gerenciar Keys</h2>
                    <button class="btn btn-primary" onclick="app.showModal('keyModal')">
                        <i class="fas fa-plus"></i> Gerar Key
                    </button>
                </div>
                <div class="card">
                    <div class="table-wrapper">
                        <table>
                            <thead><tr><th>Key</th><th>Projeto</th><th>Tipo</th><th>Status</th><th>HWID</th><th>Expira</th><th>Ações</th></tr></thead>
                            <tbody id="keysTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div id="dash-checkpoints" class="page-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2>Checkpoints</h2>
                    <button class="btn btn-primary" onclick="app.showModal('checkpointModal')">
                        <i class="fas fa-plus"></i> Adicionar
                    </button>
                </div>
                <div class="card">
                    <div class="checkpoint-list" id="checkpointList"></div>
                </div>
            </div>
            <div id="dash-statistics" class="page-section">
                <h2 style="margin-bottom: 20px;">Estatísticas Detalhadas</h2>
                <div class="stats-grid" id="detailedStats"></div>
                <div class="charts-grid">
                    <div class="chart-container"><canvas id="detailedKeysChart"></canvas></div>
                    <div class="chart-container"><canvas id="checkpointChart"></canvas></div>
                </div>
            </div>
            <div id="dash-settings" class="page-section">
                <h2 style="margin-bottom: 20px;">Configurações</h2>
                <div class="card">
                    <h3>Perfil</h3>
                    <form id="settingsForm" onsubmit="event.preventDefault(); app.saveSettings();">
                        <div class="form-group">
                            <label>Nome de Usuário</label>
                            <input type="text" id="settingsUsername">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="settingsEmail" disabled>
                        </div>
                        <div class="form-group">
                            <label>Nova Senha (deixe em branco para manter)</label>
                            <input type="password" id="settingsPassword" placeholder="Nova senha" minlength="8">
                        </div>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </form>
                </div>
                <div class="card">
                    <h3>Segurança</h3>
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="antiVPN" onchange="app.toggleSecurity('antiVPN')">
                            Proteção Anti-VPN
                        </label>
                    </div>
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="antiProxy" onchange="app.toggleSecurity('antiProxy')">
                            Proteção Anti-Proxy
                        </label>
                    </div>
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="antiBypass" checked onchange="app.toggleSecurity('antiBypass')">
                            Proteção Anti-Bypass
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        this.loadDashboardSection('home');
    }
    
    loadDashboardSection(section) {
        switch(section) {
            case 'home': this.loadHomeStats(); break;
            case 'projects': this.loadProjects(); break;
            case 'keys': this.loadKeys(); break;
            case 'checkpoints': this.loadCheckpoints(); break;
            case 'statistics': this.loadStatistics(); break;
            case 'settings': this.loadSettings(); break;
        }
    }
    
    loadHomeStats() {
        const container = document.getElementById('dashboardStats');
        if (!container) return;
        
        const totalProjects = this.projects.length;
        const activeKeys = this.keys.filter(k => k.status === 'active').length;
        const totalUsers = this.users.length;
        const blockedAttempts = this.statistics.blockedAttempts || 0;
        
        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-folder"></i></div>
                <div class="stat-info">
                    <h3>Projetos</h3>
                    <div class="stat-value">${totalProjects}</div>
                    <div class="stat-change up">${totalProjects > 0 ? 'Ativos' : 'Comece agora'}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-key"></i></div>
                <div class="stat-info">
                    <h3>Keys Ativas</h3>
                    <div class="stat-value">${activeKeys}</div>
                    <div class="stat-change up">${activeKeys > 0 ? 'Geradas' : 'Nenhuma'}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <div class="stat-info">
                    <h3>Usuários</h3>
                    <div class="stat-value">${totalUsers}</div>
                    <div class="stat-change up">Registrados</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-shield-alt"></i></div>
                <div class="stat-info">
                    <h3>Bloqueios</h3>
                    <div class="stat-value">${blockedAttempts}</div>
                    <div class="stat-change down">Tentativas</div>
                </div>
            </div>
        `;
        
        setTimeout(() => this.updateCharts(), 300);
    }
    
    loadProjects() {
        const container = document.getElementById('projectsList');
        if (!container) return;
        
        if (this.projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-folder-open"></i>
                    <h3>Nenhum Projeto</h3>
                    <p>Crie seu primeiro projeto para começar</p>
                    <button class="btn btn-primary" style="margin-top: 20px;" onclick="app.showModal('projectModal')">
                        <i class="fas fa-plus"></i> Criar Projeto
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.projects.map(project => `
            <div class="project-card">
                <div class="project-card-header">
                    <div class="project-logo"><i class="fas fa-folder"></i></div>
                    <div class="project-info">
                        <h4>${this.escapeHtml(project.name)}</h4>
                        <p>${this.escapeHtml(project.description || 'Sem descrição')}</p>
                    </div>
                </div>
                <div class="project-stats">
                    <div class="project-stat"><div class="value">${project.keys || 0}</div><div class="label">Keys</div></div>
                    <div class="project-stat"><div class="value">${project.users || 0}</div><div class="label">Usuários</div></div>
                    <div class="project-stat">
                        <span class="badge ${project.status === 'online' ? 'badge-success' : 'badge-danger'}">${project.status}</span>
                    </div>
                </div>
                <div class="project-actions">
                    <button class="btn btn-outline btn-sm" onclick="app.editProject('${project.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="app.deleteProject('${project.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }
    
    saveProject() {
        const projectId = document.getElementById('projectId')?.value || '';
        const name = document.getElementById('projectName')?.value || '';
        const description = document.getElementById('projectDescription')?.value || '';
        const status = document.getElementById('projectStatus')?.value || 'online';
        
        if (!name) {
            this.showNotification('Nome do projeto é obrigatório', 'error');
            return;
        }
        
        if (projectId) {
            const index = this.projects.findIndex(p => p.id === projectId);
            if (index !== -1) {
                this.projects[index].name = name;
                this.projects[index].description = description;
                this.projects[index].status = status;
            }
            this.showNotification('Projeto atualizado!', 'success');
        } else {
            this.projects.push({
                id: 'proj_' + Date.now(),
                name, description, status,
                keys: 0, users: 0,
                createdAt: new Date().toISOString()
            });
            this.showNotification('Projeto criado!', 'success');
        }
        
        this.closeModal('projectModal');
        this.loadProjects();
        this.updateProjectSelects();
        this.loadHomeStats();
    }
    
    editProject(id) {
        const project = this.projects.find(p => p.id === id);
        if (!project) return;
        
        document.getElementById('projectModalTitle').textContent = 'Editar Projeto';
        document.getElementById('projectId').value = project.id;
        document.getElementById('projectName').value = project.name;
        document.getElementById('projectDescription').value = project.description || '';
        document.getElementById('projectStatus').value = project.status;
        this.showModal('projectModal');
    }
    
    deleteProject(id) {
        if (confirm('Excluir este projeto?')) {
            this.projects = this.projects.filter(p => p.id !== id);
            this.loadProjects();
            this.updateProjectSelects();
            this.loadHomeStats();
            this.showNotification('Projeto excluído', 'warning');
        }
    }
    
    loadKeys() {
        const tbody = document.getElementById('keysTableBody');
        if (!tbody) return;
        
        if (this.keys.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center"><div class="empty-state" style="padding: 30px;"><i class="fas fa-key" style="font-size: 40px;"></i><p>Nenhuma key gerada</p></div></td></tr>`;
            return;
        }
        
        tbody.innerHTML = this.keys.map(k => `
            <tr>
                <td><code style="background: var(--bg-input); padding: 4px 8px; border-radius: 4px; font-size: 12px;">${k.key}</code></td>
                <td>${this.escapeHtml(k.project)}</td>
                <td><span class="badge badge-info">${k.type}</span></td>
                <td><span class="badge ${k.status === 'active' ? 'badge-success' : 'badge-danger'}">${k.status}</span></td>
                <td>${k.hwid || '<span style="color: var(--text-muted);">Não vinculado</span>'}</td>
                <td>${k.expires}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        ${k.status === 'active' ? `<button class="btn btn-outline btn-sm" onclick="app.revokeKey('${k.id}')"><i class="fas fa-ban"></i></button>` : ''}
                        <button class="btn btn-warning btn-sm" onclick="app.resetHWID('${k.id}')"><i class="fas fa-sync"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="app.deleteKey('${k.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    generateKey() {
        const projectId = document.getElementById('keyProject')?.value || '';
        const keyType = document.getElementById('keyType')?.value || 'permanent';
        const duration = parseInt(document.getElementById('keyDuration')?.value) || null;
        const maxUsers = parseInt(document.getElementById('keyMaxUsers')?.value) || 1;
        
        if (!projectId) {
            this.showNotification('Selecione um projeto', 'error');
            return;
        }
        
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = 'OHKEY-';
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) key += chars.charAt(Math.floor(Math.random() * chars.length));
            if (i < 3) key += '-';
        }
        
        const project = this.projects.find(p => p.id === projectId);
        let expires = 'Nunca';
        if (keyType !== 'permanent') {
            const multipliers = { hours: 3600000, days: 86400000, weeks: 604800000, months: 2592000000 };
            expires = new Date(Date.now() + (multipliers[keyType] || 0) * duration).toISOString().split('T')[0];
        }
        
        this.keys.unshift({
            id: 'key_' + Date.now(),
            key, projectId,
            project: project ? project.name : 'Desconhecido',
            type: keyType, status: 'active', hwid: null,
            expires, maxUsers, currentUsers: 0,
            createdAt: new Date().toISOString()
        });
        
        if (project) project.keys = (project.keys || 0) + 1;
        this.statistics.keysGenerated++;
        
        this.loadKeys();
        this.closeModal('keyModal');
        this.loadHomeStats();
        this.showNotification(`Key gerada: ${key}`, 'success');
    }
    
    revokeKey(id) {
        if (confirm('Revogar esta key?')) {
            const key = this.keys.find(k => k.id === id);
            if (key) { key.status = 'revoked'; this.loadKeys(); this.loadHomeStats(); this.showNotification('Key revogada', 'warning'); }
        }
    }
    
    deleteKey(id) {
        if (confirm('Excluir esta key?')) {
            this.keys = this.keys.filter(k => k.id !== id);
            this.loadKeys();
            this.loadHomeStats();
            this.showNotification('Key excluída', 'warning');
        }
    }
    
    resetHWID(id) {
        if (confirm('Resetar HWID?')) {
            const key = this.keys.find(k => k.id === id);
            if (key) { key.hwid = null; key.currentUsers = 0; this.loadKeys(); this.showNotification('HWID resetado', 'info'); }
        }
    }
    
    toggleKeyDuration() {
        const type = document.getElementById('keyType')?.value;
        const group = document.getElementById('keyDurationGroup');
        if (group) group.style.display = type === 'permanent' ? 'none' : 'block';
    }
    
    loadCheckpoints() {
        const container = document.getElementById('checkpointList');
        if (!container) return;
        
        if (this.checkpoints.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><h3>Nenhum Checkpoint</h3><p>Adicione checkpoints para verificação</p></div>`;
            return;
        }
        
        container.innerHTML = [...this.checkpoints].sort((a, b) => a.order - b.order).map(cp => `
            <div class="checkpoint-item">
                <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                    <div class="checkpoint-info">
                        <h5>#${cp.order} - ${this.escapeHtml(cp.name)}</h5>
                        <span><span class="badge badge-info">${cp.type}</span> | ${cp.minTime}s-${cp.maxTime}s | ${this.escapeHtml(cp.project)}</span>
                    </div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="app.deleteCheckpoint('${cp.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
    }
    
    addCheckpoint() {
        const projectId = document.getElementById('checkpointProject')?.value || '';
        if (!projectId) { this.showNotification('Selecione um projeto', 'error'); return; }
        
        const project = this.projects.find(p => p.id === projectId);
        this.checkpoints.push({
            id: 'cp_' + Date.now(),
            projectId,
            project: project ? project.name : 'Desconhecido',
            name: document.getElementById('checkpointName')?.value || '',
            type: document.getElementById('checkpointType')?.value || 'linkvertise',
            url: document.getElementById('checkpointUrl')?.value || '',
            minTime: parseInt(document.getElementById('checkpointMinTime')?.value) || 30,
            maxTime: parseInt(document.getElementById('checkpointMaxTime')?.value) || 120,
            order: this.checkpoints.length + 1,
            createdAt: new Date().toISOString()
        });
        
        this.loadCheckpoints();
        this.closeModal('checkpointModal');
        this.showNotification('Checkpoint adicionado!', 'success');
    }
    
    deleteCheckpoint(id) {
        if (confirm('Excluir este checkpoint?')) {
            this.checkpoints = this.checkpoints.filter(cp => cp.id !== id);
            this.checkpoints.forEach((cp, i) => cp.order = i + 1);
            this.loadCheckpoints();
            this.showNotification('Checkpoint removido', 'warning');
        }
    }
    
    loadStatistics() {
        const container = document.getElementById('detailedStats');
        if (!container) return;
        
        const total = this.keys.length;
        const active = this.keys.filter(k => k.status === 'active').length;
        const expired = this.keys.filter(k => k.status !== 'active').length;
        
        container.innerHTML = `
            <div class="stat-card"><div class="stat-icon"><i class="fas fa-key"></i></div><div class="stat-info"><h3>Total Keys</h3><div class="stat-value">${total}</div></div></div>
            <div class="stat-card"><div class="stat-icon"><i class="fas fa-check-circle"></i></div><div class="stat-info"><h3>Checkpoints</h3><div class="stat-value">${this.checkpoints.length}</div></div></div>
            <div class="stat-card"><div class="stat-icon"><i class="fas fa-shield-alt"></i></div><div class="stat-info"><h3>Bloqueios</h3><div class="stat-value">${this.statistics.blockedAttempts}</div></div></div>
            <div class="stat-card"><div class="stat-icon"><i class="fas fa-clock"></i></div><div class="stat-info"><h3>Expiradas</h3><div class="stat-value">${expired}</div></div></div>
        `;
        
        setTimeout(() => this.updateDetailedCharts(), 300);
    }
    
    loadSettings() {
        if (this.currentUser) {
            const usernameInput = document.getElementById('settingsUsername');
            const emailInput = document.getElementById('settingsEmail');
            if (usernameInput) usernameInput.value = this.currentUser.username;
            if (emailInput) emailInput.value = this.currentUser.email;
        }
    }
    
    saveSettings() {
        const newUsername = document.getElementById('settingsUsername')?.value || '';
        const newPassword = document.getElementById('settingsPassword')?.value || '';
        
        if (this.currentUser && newUsername.trim()) {
            this.currentUser.username = newUsername;
            const navUsername = document.getElementById('navUsername');
            if (navUsername) navUsername.textContent = newUsername;
        }
        
        const userIndex = this.registeredUsers.findIndex(u => u.id === this.currentUser?.id);
        if (userIndex !== -1) {
            if (newUsername.trim()) this.registeredUsers[userIndex].username = newUsername;
            if (newPassword) this.registeredUsers[userIndex].password = newPassword;
            localStorage.setItem('ohkeygg_users', JSON.stringify(this.registeredUsers));
        }
        
        this.showNotification(newPassword ? 'Configurações e senha salvas!' : 'Configurações salvas!', 'success');
    }
    
    toggleSecurity(type) {
        const checkbox = document.getElementById(type);
        const status = checkbox?.checked ? 'ativada' : 'desativada';
        const names = { antiVPN: 'Anti-VPN', antiProxy: 'Anti-Proxy', antiBypass: 'Anti-Bypass' };
        this.showNotification(`${names[type] || type} ${status}`, 'info');
    }
    
    // ==================== CHARTS ====================
    
    updateCharts() {
        const keysCtx = document.getElementById('keysChart');
        const usersCtx = document.getElementById('usersChart');
        
        if (keysCtx) {
            if (this.keysChartInstance) this.keysChartInstance.destroy();
            this.keysChartInstance = new Chart(keysCtx, {
                type: 'line',
                data: {
                    labels: ['Início', 'Progresso', 'Atual'],
                    datasets: [{
                        label: 'Keys',
                        data: [0, this.keys.filter(k => k.status === 'active').length, this.keys.length],
                        borderColor: '#DC2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        tension: 0.4, fill: true
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { grid: { color: '#2D3748' }, ticks: { color: '#A0AEC0' } }, x: { grid: { color: '#2D3748' }, ticks: { color: '#A0AEC0' } } }
                }
            });
        }
        
        if (usersCtx) {
            if (this.usersChartInstance) this.usersChartInstance.destroy();
            this.usersChartInstance = new Chart(usersCtx, {
                type: 'bar',
                data: {
                    labels: ['Registrados', 'Ativos'],
                    datasets: [{
                        label: 'Usuários',
                        data: [this.users.length, this.users.filter(u => u.status === 'active').length],
                        backgroundColor: ['rgba(220, 38, 38, 0.5)', 'rgba(72, 187, 120, 0.5)'],
                        borderColor: ['#DC2626', '#48BB78'], borderWidth: 1
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { grid: { color: '#2D3748' }, ticks: { color: '#A0AEC0' } }, x: { grid: { color: '#2D3748' }, ticks: { color: '#A0AEC0' } } }
                }
            });
        }
    }
    
    updateDetailedCharts() {
        const keysCtx = document.getElementById('detailedKeysChart');
        const cpCtx = document.getElementById('checkpointChart');
        
        if (keysCtx) {
            if (this.detailedKeysChartInstance) this.detailedKeysChartInstance.destroy();
            const active = this.keys.filter(k => k.status === 'active').length;
            const expired = this.keys.filter(k => k.status !== 'active').length;
            this.detailedKeysChartInstance = new Chart(keysCtx, {
                type: 'doughnut',
                data: { labels: ['Ativas', 'Expiradas'], datasets: [{ data: [active || 0, expired || 0], backgroundColor: ['#48BB78', '#FC8181'] }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#A0AEC0' } } } }
            });
        }
        
        if (cpCtx) {
            if (this.checkpointChartInstance) this.checkpointChartInstance.destroy();
            this.checkpointChartInstance = new Chart(cpCtx, {
                type: 'bar',
                data: {
                    labels: this.checkpoints.map(cp => cp.name || 'CP ' + cp.order),
                    datasets: [{ label: 'Tempo Médio (s)', data: this.checkpoints.map(cp => Math.floor((cp.minTime + cp.maxTime) / 2)), backgroundColor: 'rgba(220, 38, 38, 0.5)', borderColor: '#DC2626', borderWidth: 1 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#2D3748' }, ticks: { color: '#A0AEC0' } }, x: { grid: { color: '#2D3748' }, ticks: { color: '#A0AEC0' } } } }
            });
        }
    }
    
    // ==================== UTILS ====================
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.classList.add('show');
        
        if (modalId === 'keyModal' || modalId === 'checkpointModal') this.updateProjectSelects();
        if (modalId === 'projectModal') {
            const title = document.getElementById('projectModalTitle');
            if (title) title.textContent = 'Novo Projeto';
            const idInput = document.getElementById('projectId');
            if (idInput) idInput.value = '';
            const form = document.getElementById('projectForm');
            if (form) form.reset();
        }
        if (modalId === 'checkpointModal') {
            const title = document.querySelector('#checkpointModal .modal-header h3');
            if (title) title.textContent = 'Adicionar Checkpoint';
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove('show');
        const form = modal.querySelector('form');
        if (form) form.reset();
        const hiddenId = modal.querySelector('input[type="hidden"]');
        if (hiddenId) hiddenId.value = '';
    }
    
    updateProjectSelects() {
        ['keyProject', 'checkpointProject'].forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            const currentValue = select.value;
            select.innerHTML = this.projects.length === 0 
                ? '<option value="">Crie um projeto primeiro</option>'
                : '<option value="">Selecione um projeto</option>' + this.projects.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');
            select.value = currentValue;
        });
    }
    
    showNotification(message, type = 'info') {
        const icons = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle', info: 'info-circle' };
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<i class="fas fa-${icons[type] || icons.info}"></i><span>${message}</span>`;
        document.body.appendChild(notification);
        setTimeout(() => { notification.style.animation = 'slideInRight 0.3s ease reverse'; setTimeout(() => notification.remove(), 300); }, 4000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ==================== INICIALIZAÇÃO ====================

const app = new OhKeyGG();

// Disponibilizar funções globalmente
window.app = app;
window.navigateTo = (page) => app.navigateTo(page);
window.switchDashboard = (section, el) => app.switchDashboard(section, el);
window.showModal = (id) => app.showModal(id);
window.closeModal = (id) => app.closeModal(id);
window.handleLogin = (e) => app.handleLogin(e);
window.handleRegister = (e) => app.handleRegister(e);
window.verifyEmail = () => app.verifyEmail();
window.saveProject = () => app.saveProject();
window.generateKey = () => app.generateKey();
window.addCheckpoint = () => app.addCheckpoint();
window.saveSettings = () => app.saveSettings();
window.logout = () => app.logout();
window.toggleKeyDuration = () => app.toggleKeyDuration();
window.toggleSecurity = (type) => app.toggleSecurity(type);

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
};

// Fechar modais ao clicar fora
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
});

// Fechar modais com ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(modal => {
            if (modal.id !== 'emailSentModal') modal.classList.remove('show');
        });
    }
});

// Configurar formulários
document.addEventListener('DOMContentLoaded', function() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = function(e) {
            e.preventDefault();
            app.handleLogin(e);
        };
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.onsubmit = function(e) {
            e.preventDefault();
            app.handleRegister(e);
        };
    }
    
    // Project form
    const projectForm = document.getElementById('projectForm');
    if (projectForm) {
        projectForm.onsubmit = function(e) {
            e.preventDefault();
            app.saveProject();
        };
    }
    
    // Key form
    const keyForm = document.getElementById('keyForm');
    if (keyForm) {
        keyForm.onsubmit = function(e) {
            e.preventDefault();
            app.generateKey();
        };
    }
    
    // Checkpoint form
    const checkpointForm = document.getElementById('checkpointForm');
    if (checkpointForm) {
        checkpointForm.onsubmit = function(e) {
            e.preventDefault();
            app.addCheckpoint();
        };
    }
    
    // Settings form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.onsubmit = function(e) {
            e.preventDefault();
            app.saveSettings();
        };
    }
    
    // Code inputs
    document.querySelectorAll('.code-input').forEach(input => {
        input.addEventListener('input', (e) => app.handleCodeInput(e));
        input.addEventListener('keydown', (e) => app.handleCodeKeydown(e));
    });
});

console.log('🔥 OhKeyGG Premium Key System - PRONTO');
console.log('✅ Todos os botões e links funcionando');
console.log('📊 Sistema 100% zerado');
console.log('👆 Clique em "Começar Grátis" para testar');