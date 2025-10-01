// js/ui.js
class UIManager {
    constructor() {
        this.elements = {};
        this.initElements();
        this.setupEventListeners();
    }

    initElements() {
        // Cache semua DOM elements
        this.elements = {
            loginView: document.getElementById('login-view'),
            loginForm: document.getElementById('login-form'),
            loginError: document.getElementById('login-error'),
            usernameInput: document.getElementById('username'),
            passwordInput: document.getElementById('password'),
            app: document.getElementById('app'),
            loader: document.getElementById('loader'),
            iconMenuView: document.getElementById('icon-menu-view'),
            mainContentView: document.getElementById('main-content-view'),
            menuLinks: document.querySelectorAll('.menu-link'),
            homeBtn: document.getElementById('home-btn'),
            pages: document.querySelectorAll('.page'),
            pageTitle: document.getElementById('page-title'),
            addStudentModal: document.getElementById('add-student-modal'),
            addStudentModalBtn: document.getElementById('add-student-modal-btn'),
            cancelAddStudentBtn: document.getElementById('cancel-add-student'),
            // ... tambahkan elements lainnya
        };
    }

    setupEventListeners() {
        // Password toggle
        const togglePasswordBtn = document.getElementById('toggle-password');
        if (togglePasswordBtn) {
            togglePasswordBtn.addEventListener('click', this.togglePasswordVisibility.bind(this));
        }

        // Menu navigation
        this.elements.menuLinks.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                this.showPage(link.dataset.page);
            });
        });

        // Home button
        this.elements.homeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showIconMenu();
        });

        // Modal handlers
        this.elements.addStudentModalBtn.addEventListener('click', () => {
            this.elements.addStudentModal.classList.remove('hidden');
        });
        
        this.elements.cancelAddStudentBtn.addEventListener('click', () => {
            this.elements.addStudentModal.classList.add('hidden');
        });

        // ... tambahkan event listeners lainnya
    }

    togglePasswordVisibility() {
        const passwordInput = this.elements.passwordInput;
        const eyeIcon = document.getElementById('eye-icon');
        const eyeOffIcon = document.getElementById('eye-off-icon');
        
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        eyeIcon.classList.toggle('hidden', isPassword);
        eyeOffIcon.classList.toggle('hidden', !isPassword);
    }

    showPage(pageId) {
        // Implementasi showPage
        if (window.appState.loggedInRole === 'siswa') {
            const siswaAllowedPages = ['ringkasan', 'riwayat', 'quran', 'tentang'];
            if (!siswaAllowedPages.includes(pageId)) {
                console.warn(`Akses ditolak untuk siswa ke halaman: ${pageId}`);
                return; 
            }
        }

        const currentHash = window.location.hash.substring(1);
        if (currentHash !== pageId) {
            try {
                history.pushState({ page: pageId }, '', `#${pageId}`);
            } catch (e) {
                console.warn("History API pushState failed:", e);
            }
        }
        this._showPageImpl(pageId);
    }

    _showPageImpl(pageId) {
        this.elements.iconMenuView.classList.add('hidden');
        this.elements.mainContentView.classList.remove('hidden');
        this.elements.pages.forEach(p => p.classList.add('hidden'));
        
        const pageElement = document.getElementById(`${pageId}-page`);
        if (pageElement) {
            pageElement.classList.remove('hidden');
        }
        
        const pageTitles = { 
            ringkasan: "Pencapaian", 
            kelas: "Manajemen Kelas", 
            quran: "Al-Qur'an", 
            siswa: "Manajemen Siswa", 
            riwayat: "Riwayat Setoran", 
            tentang: "Tentang Aplikasi", 
            pengaturan: "Pengaturan" 
        };
        this.elements.pageTitle.textContent = pageTitles[pageId] || "Dashboard";
        
        this.updateHeaderActions(pageId);
        
        // Trigger page-specific functions
        if (pageId === 'quran' && typeof window.loadQuranDigital === 'function') {
            window.loadQuranDigital();
        }
        if (pageId === 'pengaturan' && typeof window.populateSettingsForms === 'function') {
            window.populateSettingsForms();
        }
    }

    showIconMenu() {
        try {
            history.back();
        } catch (e) {
            console.warn("history.back() failed, falling back to showIconMenu:", e);
            this._showIconMenuImpl();
        }
    }

    _showIconMenuImpl() {
        this.elements.mainContentView.classList.add('hidden');
        this.elements.iconMenuView.classList.remove('hidden');
    }

    updateHeaderActions(pageId) {
        const headerActions = document.getElementById('header-actions');
        headerActions.innerHTML = '';
        headerActions.className = 'w-full sm:w-auto flex items-center justify-end gap-2';
        
        if (pageId === 'ringkasan' && window.appState.loggedInRole === 'guru') {
            headerActions.innerHTML = `
                <button id="export-data-btn" class="btn btn-primary w-full sm:w-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span>Ekspor Hasil Siswa</span>
                </button>`;
            document.getElementById('export-data-btn').addEventListener('click', window.exportAllData);
        }
    }

    setButtonLoading(button, isLoading) {
        if (!button) return;
        const span = button.querySelector('span');
        const text = span ? span.textContent : '';

        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `<div class="spinner"></div> ${text ? `<span>Memproses...</span>` : ''}`;
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalContent;
        }
    }

    showConfirmModal({ title, message, okText, onConfirm }) {
        const confirmModal = {
            el: document.getElementById('confirm-modal'),
            title: document.getElementById('confirm-modal-title'),
            text: document.getElementById('confirm-modal-text'),
            okBtn: document.getElementById('confirm-modal-ok'),
            cancelBtn: document.getElementById('confirm-modal-cancel'),
        };

        confirmModal.title.textContent = title || 'Konfirmasi';
        confirmModal.text.textContent = message;
        confirmModal.okBtn.textContent = okText || 'Ya, Hapus';
        confirmModal.el.classList.remove('hidden');

        const handleOk = () => {
            onConfirm();
            this.hideModal(confirmModal);
        };
        
        const hideModal = () => {
            this.hideModal(confirmModal);
        };
        
        confirmModal.okBtn.addEventListener('click', handleOk);
        confirmModal.cancelBtn.addEventListener('click', hideModal);
    }

    hideModal(modal) {
        modal.el.classList.add('hidden');
        modal.okBtn.removeEventListener('click', modal.handleOk);
        modal.cancelBtn.removeEventListener('click', modal.handleCancel);
    }
}

window.UIManager = UIManager;