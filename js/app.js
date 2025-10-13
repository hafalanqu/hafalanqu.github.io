// Global application state
window.appState = {
    allClasses: [],
    allStudents: [],
    allHafalan: [],
    allUsers: [], 
    pengaturan: { 
        skorMutqin: { 
            'sangat-lancar': 100, 'lancar': 90, 'cukup-lancar': 70, 
            'tidak-lancar': 50, 'sangat-tidak-lancar': 30
        },
        lingkupHafalan: 'full'
    },
    currentTest: {
    isActive: false,
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    settings: {},
    studentIds: [],
},
    currentPageSiswa: 1,
    currentPagePencapaian: 1,
    currentPageRiwayat: 1,
    loggedInRole: null,
    lastSubmittedStudentId: null,
    hafalanSubmissionData: null, // To temporarily hold form data for PIN verification
};

document.addEventListener('DOMContentLoaded', () => {
        try {
    // --- Toast Notification ---
    let toastTimeout;
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast-notification');
        const toastMessage = document.getElementById('toast-message');
        if (!toast || !toastMessage) return;
        clearTimeout(toastTimeout);
        toastMessage.textContent = message;
        toast.className = 'fixed top-5 right-5 text-white py-3 px-5 rounded-lg shadow-lg z-50'; // Reset
        toast.classList.add('show', type);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
        // Membuat dan menyuntikkan link manifest
        const manifestJsonText = document.getElementById('manifest-json').textContent;
        const manifestBlob = new Blob([manifestJsonText], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(manifestBlob);
        const manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = manifestUrl;
        document.head.appendChild(manifestLink);

        // Mendaftarkan service worker dari file sw.js
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js') // <-- CUKUP PANGGIL NAMA FILE-NYA
                .then(registration => {
                    console.log('ServiceWorker pendaftaran berhasil dengan scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker pendaftaran gagal: ', error);
                });
        }
    } catch (e) {
        console.error("Gagal melakukan setup PWA:", e);
    }

    // --- NEW LOGIN & UI SETUP ---
    const ui = {
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
        profile: {
            form: document.getElementById('profile-form'),
            fullNameInput: document.getElementById('profile-fullname'),
            pobInput: document.getElementById('profile-pob'),
            picturePreview: document.getElementById('profile-picture-preview'),
            pictureInput: document.getElementById('profile-picture-input'),
            saveBtn: document.getElementById('save-profile-btn'),
            progressContainer: document.getElementById('upload-progress-container'),
            progressBar: document.getElementById('upload-progress'),
        },
        // PIN Modal elements
        pinModal: {
            el: document.getElementById('pin-modal'),
            form: document.getElementById('pin-form'),
            input: document.getElementById('pin-input'),
            error: document.getElementById('pin-error'),
            okBtn: document.getElementById('pin-modal-ok'),
            cancelBtn: document.getElementById('pin-modal-cancel'),
        },
        // PIN Settings elements (for teachers)
        guruPinSettings: {
            card: document.getElementById('guru-pin-settings-card'),
            form: document.getElementById('guru-pin-form'),
            input: document.getElementById('guru-pin-input'),
        },
        mutqinSettings: {
        card: document.getElementById('mutqin-settings-card'),
        },
        profileSetupModal: {
            el: document.getElementById('profile-setup-modal'),
            form: document.getElementById('profile-setup-form'),
            namaLengkapInput: document.getElementById('setup-nama-lengkap'),
            ttlInput: document.getElementById('setup-ttl'),
            pinContainer: document.getElementById('setup-pin-container'),
            pinInput: document.getElementById('setup-pin'),
            submitBtn: document.getElementById('profile-setup-submit-btn')
        },
    };

    const togglePasswordBtn = document.getElementById('toggle-password');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const eyeIcon = document.getElementById('eye-icon');
            const eyeOffIcon = document.getElementById('eye-off-icon');
            
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            eyeIcon.classList.toggle('hidden', isPassword);
            eyeOffIcon.classList.toggle('hidden', !isPassword);
        });
    }
            /**
         * Fungsi serbaguna untuk menambahkan fungsionalitas toggle password/PIN.
         * @param {string} buttonId - ID dari tombol ikon mata.
         * @param {string} inputId - ID dari input field (password/PIN).
         * @param {string} eyeIconId - ID dari SVG ikon mata terbuka.
         * @param {string} eyeOffIconId - ID dari SVG ikon mata tertutup.
         */
        function setupPasswordToggle(buttonId, inputId, eyeIconId, eyeOffIconId) {
            const toggleBtn = document.getElementById(buttonId);
            const input = document.getElementById(inputId);
            const eyeIcon = document.getElementById(eyeIconId);
            const eyeOffIcon = document.getElementById(eyeOffIconId);

            if (toggleBtn && input && eyeIcon && eyeOffIcon) {
                toggleBtn.addEventListener('click', () => {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    // Tampilkan/sembunyikan ikon yang sesuai
                    eyeIcon.classList.toggle('hidden', isPassword);
                    eyeOffIcon.classList.toggle('hidden', !isPassword);
                });
            }
        }

        // Panggil fungsi untuk setiap input PIN yang telah kita ubah di HTML
        setupPasswordToggle('toggle-guru-pin', 'guru-pin-input', 'guru-pin-eye-icon', 'guru-pin-eye-off-icon');
        setupPasswordToggle('toggle-verify-pin', 'pin-input', 'verify-pin-eye-icon', 'verify-pin-eye-off-icon');
        setupPasswordToggle('toggle-setup-pin', 'setup-pin', 'setup-pin-eye-icon', 'setup-pin-eye-off-icon');
        const loggedInRole = sessionStorage.getItem('loggedInRole');
        const lembagaId = sessionStorage.getItem('lembagaId');
        const currentUserUID = sessionStorage.getItem('currentUserUID');
        if (loggedInRole && lembagaId && currentUserUID) {
            window.appState.loggedInRole = loggedInRole;
            window.appState.lembagaId = lembagaId;
            window.appState.currentUserUID = currentUserUID;
            startApp(loggedInRole, lembagaId, currentUserUID);
        }

        function startApp(role, lembagaId, uid) {
            ui.loginView.classList.add('hidden');
            ui.app.classList.remove('hidden');
            window.appState.currentUserUID = uid;
            setupUIForRole(role);
            initializeAppLogic(lembagaId, uid); 
        }

    function handleLogout() {
        auth.signOut().then(() => {
            sessionStorage.removeItem('loggedInRole');
            sessionStorage.removeItem('lembagaId');
            sessionStorage.removeItem('currentUserUID');
            window.location.reload();
        }).catch(error => {
            console.error("Logout Gagal:", error);
            window.location.reload();
        });
    }
    
            function setupUIForRole(role) {
                const allMenuLinks = document.querySelectorAll('.menu-link');
                const siswaAllowedPages = ['profil', 'ringkasan', 'siswa', 'riwayat', 'tes_hafalan', 'quran', 'tentang', 'pengaturan'];

                if (role === 'siswa') {
                    allMenuLinks.forEach(link => {
                        if (siswaAllowedPages.includes(link.dataset.page)) {
                            link.classList.remove('hidden');
                        } else {
                            link.classList.add('hidden');
                        }
                    });
                    // BARIS INI DITAMBAHKAN untuk menyembunyikan tombol
                    if (ui.addStudentModalBtn) {
                        ui.addStudentModalBtn.classList.add('hidden');
                    }
                } else { // guru
                    allMenuLinks.forEach(link => link.classList.remove('hidden'));
                    // BARIS INI memastikan tombol terlihat untuk guru
                    if (ui.addStudentModalBtn) {
                        ui.addStudentModalBtn.classList.remove('hidden');
                    }
                }
            }

    // --- Navigation and History Management ---

    function _showPageImpl(pageId) {
        ui.iconMenuView.classList.add('hidden');
        ui.mainContentView.classList.remove('hidden');
        ui.pages.forEach(p => p.classList.add('hidden'));
        const pageElement = document.getElementById(`${pageId}-page`);
        if (pageElement) {
            pageElement.classList.remove('hidden');
        }
        const pageTitles = { profil: "Profil Saya", ringkasan: "Pencapaian", kelas: "Manajemen Kelas", siswa: "Hafalan", riwayat: "Riwayat Setoran", tentang: "Tentang Aplikasi", pengaturan: "Pengaturan", tes_hafalan: "Tes Hafalan" };
        ui.pageTitle.textContent = pageTitles[pageId] || "Dashboard";
        
        const headerActions = document.getElementById('header-actions');
        headerActions.innerHTML = ''; // Clear previous actions
        headerActions.className = 'w-full sm:w-auto flex items-center justify-end gap-2';
        
        if (pageId === 'ringkasan' && window.appState.loggedInRole === 'guru') {
            headerActions.innerHTML = `<button id="export-data-btn" class="btn btn-primary w-full sm:w-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Ekspor Hasil Siswa</span>
            </button>`;
            document.getElementById('export-data-btn').addEventListener('click', window.exportAllData);
        }

        if (pageId === 'pengaturan' && typeof window.populateSettingsForms === 'function') {
            window.populateSettingsForms();
        }
        
        if (pageId === 'profil' && typeof window.populateProfileForm === 'function') {
            window.populateProfileForm();
        }
    }

    function _showIconMenuImpl() {
        ui.mainContentView.classList.add('hidden');
        ui.iconMenuView.classList.remove('hidden');
    }
    
    function showPage(pageId) {
        const siswaAllowedPages = ['profil', 'ringkasan', 'siswa', 'riwayat', 'tes_hafalan', 'tentang', 'pengaturan'];
        if (window.appState.loggedInRole === 'siswa') {
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
        _showPageImpl(pageId);
    }
    
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.page) {
            _showPageImpl(event.state.page);
        } else {
            _showIconMenuImpl();
        }
    });

    window.showToast = showToast;
    
    // --- Initial UI bindings ---
    ui.menuLinks.forEach(link => {
        link.addEventListener('click', e => { e.preventDefault(); showPage(link.dataset.page); });
    });
    ui.homeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        try {
            history.back();
        } catch (e) {
            console.warn("history.back() failed, falling back to showIconMenu:", e);
            _showIconMenuImpl();
        }
    });
    ui.addStudentModalBtn.addEventListener('click', () => ui.addStudentModal.classList.remove('hidden'));
    ui.cancelAddStudentBtn.addEventListener('click', () => ui.addStudentModal.classList.add('hidden'));

    // --- App Startup Logic ---
    function startApp(role, lembagaId) {
        ui.loginView.classList.add('hidden');
        ui.app.classList.remove('hidden');

        setupUIForRole(role);
        initializeAppLogic(lembagaId);

        const initialPage = window.location.hash.substring(1);
        if (initialPage && document.getElementById(`${initialPage}-page`)) {
            const siswaAllowedPages = ['profil', 'ringkasan', 'siswa', 'riwayat', 'tes_hafalan', 'tentang', 'pengaturan'];
            if(role === 'siswa' && !siswaAllowedPages.includes(initialPage)){
                window.location.hash = '#';
                _showIconMenuImpl();
            } else {
                history.replaceState({ page: initialPage }, '', `#${initialPage}`);
                _showPageImpl(initialPage);
            }
        } else {
            history.replaceState({ page: null }, '', '#');
            _showIconMenuImpl();
        }
    }
    
    ui.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = ui.usernameInput.value;
        const password = ui.passwordInput.value;
        const loginButton = e.target.querySelector('button[type="submit"]');
        loginButton.disabled = true;
        loginButton.textContent = 'Memproses...';

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            const userDocRef = db.collection('users').doc(user.uid);
            const userDoc = await userDocRef.get();

            let userData;

            if (!userDoc.exists) {
                console.log(`Dokumen untuk user ${user.uid} tidak ditemukan, membuat yang baru...`);
                const newUserPayload = {
                    email: user.email,
                    role: "guru",
                    lembagaId: "man2brebes",
                    namaLengkap: user.email.split('@')[0], 
                    ttl: "", 
                    fotoProfilUrl: "",
                    pin: "" // Add default empty PIN
                };
                await userDocRef.set(newUserPayload);
                userData = newUserPayload;
                showToast("Selamat datang! Akun Anda telah disiapkan.", "success");
            } else {
                userData = userDoc.data();
            }

            const role = userData.role;
            const lembagaId = userData.lembagaId;

            if (role && lembagaId) {
                sessionStorage.setItem('loggedInRole', role);
                sessionStorage.setItem('lembagaId', lembagaId);
                sessionStorage.setItem('currentUserUID', user.uid);
                window.appState.loggedInRole = role;
                window.appState.lembagaId = lembagaId;
                window.appState.currentUserUID = user.uid;

                ui.loginError.classList.add('hidden');
                startApp(role, lembagaId, user.uid);
            } else {
                throw new Error("Peran atau ID Lembaga tidak diatur di database.");
            }

        } catch (error) {
            let message = 'Terjadi kesalahan. Coba lagi.';
            if (error.code) {
                switch (error.code) {
                    case 'auth/user-not-found': message = 'Email tidak ditemukan.'; break;
                    case 'auth/wrong-password': message = 'Password salah.'; break;
                    case 'auth/invalid-email': message = 'Format email tidak valid.'; break;
                }
            } else {
                message = error.message;
            }
            ui.loginError.textContent = message;
            ui.loginError.classList.remove('hidden');
            auth.signOut();
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Masuk';
        }
    });
    
    // --- Online Database (Firestore) Wrapper ---
    const onlineDB = {
        add(collectionName, data) {
            const dataToAdd = { ...data };
            delete dataToAdd.id;
            return db.collection(collectionName).add(dataToAdd);
        },
        async getAll(collectionName) {
            const snapshot = await db.collection(collectionName).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        delete(collectionName, docId) {
            return db.collection(collectionName).doc(docId).delete();
        },
        update(collectionName, data) {
            const docId = data.id;
            const dataToUpdate = { ...data };
            delete dataToUpdate.id;
            return db.collection(collectionName).doc(docId).update(dataToUpdate);
        },
    };

    function exportAllData() {
        const { allStudents, allClasses, allHafalan } = window.appState;
        const filterSelect = document.getElementById('summary-rank-filter-class');
        const selectedClassId = filterSelect ? filterSelect.value : '';

        let studentsToExport = selectedClassId ? allStudents.filter(student => student.classId === selectedClassId) : [...allStudents];
        
        const surahNameList = [ { no: 1, nama: "Al-Fatihah", ayat: 7 }, { no: 2, nama: "Al-Baqarah", ayat: 286 }, { no: 3, nama: "Ali 'Imran", ayat: 200 }, { no: 4, nama: "An-Nisa'", ayat: 176 }, { no: 5, nama: "Al-Ma'idah", ayat: 120 }, { no: 6, nama: "Al-An'am", ayat: 165 }, { no: 7, nama: "Al-A'raf", ayat: 206 }, { no: 8, nama: "Al-Anfal", ayat: 75 }, { no: 9, nama: "At-Taubah", ayat: 129 }, { no: 10, nama: "Yunus", ayat: 109 }, { no: 11, nama: "Hud", ayat: 123 }, { no: 12, nama: "Yusuf", ayat: 111 }, { no: 13, nama: "Ar-Ra'd", ayat: 43 }, { no: 14, nama: "Ibrahim", ayat: 52 }, { no: 15, nama: "Al-Hijr", ayat: 99 }, { no: 16, nama: "An-Nahl", ayat: 128 }, { no: 17, nama: "Al-Isra'", ayat: 111 }, { no: 18, nama: "Al-Kahf", ayat: 110 }, { no: 19, nama: "Maryam", ayat: 98 }, { no: 20, nama: "Taha", ayat: 135 }, { no: 21, nama: "Al-Anbiya'", ayat: 112 }, { no: 22, nama: "Al-Hajj", ayat: 78 }, { no: 23, nama: "Al-Mu'minun", ayat: 118 }, { no: 24, nama: "An-Nur", ayat: 64 }, { no: 25, nama: "Al-Furqan", ayat: 77 }, { no: 26, nama: "Asy-Syu'ara'", ayat: 227 }, { no: 27, nama: "An-Naml", ayat: 93 }, { no: 28, nama: "Al-Qasas", ayat: 88 }, { no: 29, nama: "Al-'Ankabut", ayat: 69 }, { no: 30, nama: "Ar-Rum", ayat: 60 }, { no: 31, nama: "Luqman", ayat: 34 }, { no: 32, nama: "As-Sajdah", ayat: 30 }, { no: 33, nama: "Al-Ahzab", ayat: 73 }, { no: 34, nama: "Saba'", ayat: 54 }, { no: 35, nama: "Fatir", ayat: 45 }, { no: 36, nama: "Yasin", ayat: 83 }, { no: 37, nama: "As-Saffat", ayat: 182 }, { no: 38, nama: "Sad", ayat: 88 }, { no: 39, nama: "Az-Zumar", ayat: 75 }, { no: 40, nama: "Ghafir", ayat: 85 }, { no: 41, nama: "Fussilat", ayat: 54 }, { no: 42, nama: "Asy-Syura", ayat: 53 }, { no: 43, nama: "Az-Zukhruf", ayat: 89 }, { no: 44, nama: "Ad-Dukhan", ayat: 59 }, { no: 45, nama: "Al-Jasiyah", ayat: 37 }, { no: 46, nama: "Al-Ahqaf", ayat: 35 }, { no: 47, nama: "Muhammad", ayat: 38 }, { no: 48, nama: "Al-Fath", ayat: 29 }, { no: 49, nama: "Al-Hujurat", ayat: 18 }, { no: 50, nama: "Qaf", ayat: 45 }, { no: 51, nama: "Az-Zariyat", ayat: 60 }, { no: 52, nama: "At-Tur", ayat: 49 }, { no: 53, nama: "An-Najm", ayat: 62 }, { no: 54, nama: "Al-Qamar", ayat: 55 }, { no: 55, nama: "Ar-Rahman", ayat: 78 }, { no: 56, nama: "Al-Waqi'ah", ayat: 96 }, { no: 57, nama: "Al-Hadid", ayat: 29 }, { no: 58, nama: "Al-Mujadalah", ayat: 22 }, { no: 59, nama: "Al-Hasyr", ayat: 24 }, { no: 60, nama: "Al-Mumtahanah", ayat: 13 }, { no: 61, nama: "As-Saff", ayat: 14 }, { no: 62, nama: "Al-Jumu'ah", ayat: 11 }, { no: 63, nama: "Al-Munafiqun", ayat: 11 }, { no: 64, nama: "At-Tagabun", ayat: 18 }, { no: 65, nama: "At-Talaq", ayat: 12 }, { no: 66, nama: "At-Tahrim", ayat: 12 }, { no: 67, nama: "Al-Mulk", ayat: 30 }, { no: 68, nama: "Al-Qalam", ayat: 52 }, { no: 69, nama: "Al-Haqqah", ayat: 52 }, { no: 70, nama: "Al-Ma'arij", ayat: 44 }, { no: 71, nama: "Nuh", ayat: 28 }, { no: 72, nama: "Al-Jinn", ayat: 28 }, { no: 73, nama: "Al-Muzzammil", ayat: 20 }, { no: 74, nama: "Al-Muddassir", ayat: 56 }, { no: 75, nama: "Al-Qiyamah", ayat: 40 }, { no: 76, nama: "Al-Insan", ayat: 31 }, { no: 77, nama: "Al-Mursalat", ayat: 50 }, { no: 78, nama: "An-Naba'", ayat: 40 }, { no: 79, nama: "An-Nazi'at", ayat: 46 }, { no: 80, nama: "'Abasa", ayat: 42 }, { no: 81, nama: "At-Takwir", ayat: 29 }, { no: 82, nama: "Al-Infitar", ayat: 19 }, { no: 83, nama: "Al-Mutaffifin", ayat: 36 }, { no: 84, nama: "Al-Insyiqaq", ayat: 25 }, { no: 85, nama: "Al-Buruj", ayat: 22 }, { no: 86, "nama": "At-Tariq", ayat: 17 }, { no: 87, nama: "Al-A'la", ayat: 19 }, { no: 88, nama: "Al-Gasyiyah", ayat: 26 }, { no: 89, nama: "Al-Fajr", ayat: 30 }, { no: 90, nama: "Al-Balad", ayat: 20 }, { no: 91, nama: "Asy-Syams", ayat: 15 }, { no: 92, nama: "Al-Lail", ayat: 21 }, { no: 93, nama: "Ad-Duha", ayat: 11 }, { no: 94, nama: "Asy-Syarh", ayat: 8 }, { no: 95, nama: "At-Tin", ayat: 8 }, { no: 96, nama: "Al-'Alaq", ayat: 19 }, { no: 97, nama: "Al-Qadr", ayat: 5 }, { no: 98, nama: "Al-Bayyinah", ayat: 8 }, { no: 99, nama: "Az-Zalzalah", ayat: 8 }, { no: 100, nama: "Al-'Adiyat", ayat: 11 }, { no: 101, nama: "Al-Qari'ah", ayat: 11 }, { no: 102, nama: "At-Takasur", ayat: 8 }, { no: 103, nama: "Al-'Asr", ayat: 3 }, { no: 104, nama: "Al-Humazah", ayat: 9 }, { no: 105, nama: "Al-Fil", ayat: 5 }, { no: 106, nama: "Quraisy", ayat: 4 }, { no: 107, nama: "Al-Ma'un", ayat: 7 }, { no: 108, nama: "Al-Kausar", ayat: 3 }, { no: 109, nama: "Al-Kafirun", ayat: 6 }, { no: 110, nama: "An-Nasr", ayat: 3 }, { no: 111, nama: "Al-Masad", ayat: 5 }, { no: 112, nama: "Al-Ikhlas", ayat: 4 }, { no: 113, nama: "Al-Falaq", ayat: 5 }, { no: 114, nama: "An-Nas", ayat: 6 } ];
        const kualitasDisplayMap = { 
            'sangat-lancar': 'Sangat Lancar', 'lancar': 'Lancar',
            'cukup-lancar': 'Cukup Lancar', 'tidak-lancar': 'Tidak Lancar',
            'sangat-tidak-lancar': 'Sangat Tidak Lancar'
        };

        try {
            let dataForExport = [];
            let studentNumber = 0;

            const sortedStudents = [...studentsToExport].sort((a, b) => {
                const totalAyatA = allHafalan.filter(h => h.studentId === a.id && h.jenis === 'ziyadah').reduce((sum, entry) => sum + (parseInt(entry.ayatSampai) - parseInt(entry.ayatDari) + 1), 0);
                const totalAyatB = allHafalan.filter(h => h.studentId === b.id && h.jenis === 'ziyadah').reduce((sum, entry) => sum + (parseInt(entry.ayatSampai) - parseInt(entry.ayatDari) + 1), 0);
                if (totalAyatB !== totalAyatA) return totalAyatB - totalAyatA;
                return a.name.localeCompare(b.name);
            });

            sortedStudents.forEach(student => {
                studentNumber++;
                const studentClass = allClasses.find(c => c.id === student.classId);
                const studentEntries = allHafalan.filter(h => h.studentId === student.id).sort((a, b) => b.timestamp - a.timestamp);
                let isFirstRowForStudent = true; 

                if (studentEntries.length > 0) {
                    studentEntries.forEach(entry => {
                        const surahInfo = surahNameList.find(s => s.no == entry.surahNo);
                        const rowData = {
                            "No": isFirstRowForStudent ? studentNumber : "",
                            "Nama": isFirstRowForStudent ? student.name : "",
                            "Kelas": isFirstRowForStudent ? (studentClass ? studentClass.name : 'Tanpa Kelas') : "",
                            "Jenis Setoran": entry.jenis === 'ziyadah' ? 'Ziyadah' : "Muraja'ah",
                            "Detail Hafalan": `${surahInfo ? surahInfo.nama : 'Surah ' + entry.surahNo} ${entry.ayatDari}-${entry.ayatSampai}`,
                            "Skor Mutqin": kualitasDisplayMap[entry.kualitas] || entry.kualitas,
                            "Tanggal": new Date(entry.timestamp).toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'}),
                        };
                        dataForExport.push(rowData);
                        isFirstRowForStudent = false;
                    });
                } else {
                    dataForExport.push({
                        "No": studentNumber, "Nama": student.name, "Kelas": studentClass ? studentClass.name : 'Tanpa Kelas',
                        "Jenis Setoran": "-", "Detail Hafalan": "-", "Skor Mutqin": "-", "Tanggal": "-",
                    });
                }
            });

            if (dataForExport.length === 0) {
                showToast("Tidak ada siswa untuk diekspor di kelas ini.", "info");
                return;
            }
            
            const worksheet = XLSX.utils.json_to_sheet(dataForExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Hafalan");
            const date = new Date().toISOString().slice(0, 10);
            let fileName = `laporan_setoran_semua_${date}.xlsx`;
            if (selectedClassId) {
                const selectedClass = allClasses.find(c => c.id === selectedClassId);
                if (selectedClass) {
                    const classNameSafe = selectedClass.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    fileName = `laporan_setoran_${classNameSafe}_${date}.xlsx`;
                }
            }
            XLSX.writeFile(workbook, fileName);
            showToast("Data setoran berhasil diekspor ke XLSX.", "success");
        } catch (error) {
            console.error("Export error:", error);
            showToast("Gagal mengekspor data.", "error");
        }
    }
    window.exportAllData = exportAllData;

    function populateAyatDropdowns(surahElement, ayatDariSelect, ayatSampaiSelect) {
        if (!surahElement || !ayatDariSelect || !ayatSampaiSelect) return;
        const selectedOption = surahElement.options[surahElement.selectedIndex];
        if (!selectedOption) return;
        const maxAyat = parseInt(selectedOption.dataset.maxAyat);
        ayatDariSelect.innerHTML = '';
        ayatSampaiSelect.innerHTML = '';
        for (let i = 1; i <= maxAyat; i++) {
            const option = new Option(i, i);
            ayatDariSelect.appendChild(option.cloneNode(true));
            ayatSampaiSelect.appendChild(option.cloneNode(true));
        }
    }

    function initializeAppLogic(lembagaId, uid) {
        const currentUserUID = uid || window.appState.currentUserUID;
        const surahList = [ { no: 1, nama: "Al-Fatihah", ayat: 7 }, { no: 2, nama: "Al-Baqarah", ayat: 286 }, { no: 3, nama: "Ali 'Imran", ayat: 200 }, { no: 4, nama: "An-Nisa'", ayat: 176 }, { no: 5, nama: "Al-Ma'idah", ayat: 120 }, { no: 6, nama: "Al-An'am", ayat: 165 }, { no: 7, nama: "Al-A'raf", ayat: 206 }, { no: 8, nama: "Al-Anfal", ayat: 75 }, { no: 9, nama: "At-Taubah", ayat: 129 }, { no: 10, nama: "Yunus", ayat: 109 }, { no: 11, nama: "Hud", ayat: 123 }, { no: 12, nama: "Yusuf", ayat: 111 }, { no: 13, nama: "Ar-Ra'd", ayat: 43 }, { no: 14, nama: "Ibrahim", ayat: 52 }, { no: 15, nama: "Al-Hijr", ayat: 99 }, { no: 16, nama: "An-Nahl", ayat: 128 }, { no: 17, nama: "Al-Isra'", ayat: 111 }, { no: 18, nama: "Al-Kahf", ayat: 110 }, { no: 19, nama: "Maryam", ayat: 98 }, { no: 20, nama: "Taha", ayat: 135 }, { no: 21, nama: "Al-Anbiya'", ayat: 112 }, { no: 22, nama: "Al-Hajj", ayat: 78 }, { no: 23, nama: "Al-Mu'minun", ayat: 118 }, { no: 24, nama: "An-Nur", ayat: 64 }, { no: 25, nama: "Al-Furqan", ayat: 77 }, { no: 26, nama: "Asy-Syu'ara'", ayat: 227 }, { no: 27, nama: "An-Naml", ayat: 93 }, { no: 28, nama: "Al-Qasas", ayat: 88 }, { no: 29, nama: "Al-'Ankabut", ayat: 69 }, { no: 30, nama: "Ar-Rum", ayat: 60 }, { no: 31, nama: "Luqman", ayat: 34 }, { no: 32, nama: "As-Sajdah", ayat: 30 }, { no: 33, nama: "Al-Ahzab", ayat: 73 }, { no: 34, nama: "Saba'", ayat: 54 }, { no: 35, nama: "Fatir", ayat: 45 }, { no: 36, nama: "Yasin", ayat: 83 }, { no: 37, nama: "As-Saffat", ayat: 182 }, { no: 38, nama: "Sad", ayat: 88 }, { no: 39, nama: "Az-Zumar", ayat: 75 }, { no: 40, nama: "Ghafir", ayat: 85 }, { no: 41, nama: "Fussilat", ayat: 54 }, { no: 42, nama: "Asy-Syura", ayat: 53 }, { no: 43, nama: "Az-Zukhruf", ayat: 89 }, { no: 44, nama: "Ad-Dukhan", ayat: 59 }, { no: 45, nama: "Al-Jasiyah", ayat: 37 }, { no: 46, nama: "Al-Ahqaf", ayat: 35 }, { no: 47, nama: "Muhammad", ayat: 38 }, { no: 48, nama: "Al-Fath", ayat: 29 }, { no: 49, nama: "Al-Hujurat", ayat: 18 }, { no: 50, nama: "Qaf", ayat: 45 }, { no: 51, nama: "Az-Zariyat", ayat: 60 }, { no: 52, nama: "At-Tur", ayat: 49 }, { no: 53, nama: "An-Najm", ayat: 62 }, { no: 54, nama: "Al-Qamar", ayat: 55 }, { no: 55, nama: "Ar-Rahman", ayat: 78 }, { no: 56, nama: "Al-Waqi'ah", ayat: 96 }, { no: 57, nama: "Al-Hadid", ayat: 29 }, { no: 58, nama: "Al-Mujadalah", ayat: 22 }, { no: 59, nama: "Al-Hasyr", ayat: 24 }, { no: 60, nama: "Al-Mumtahanah", ayat: 13 }, { no: 61, nama: "As-Saff", ayat: 14 }, { no: 62, nama: "Al-Jumu'ah", ayat: 11 }, { no: 63, nama: "Al-Munafiqun", ayat: 11 }, { no: 64, nama: "At-Tagabun", ayat: 18 }, { no: 65, nama: "At-Talaq", ayat: 12 }, { no: 66, nama: "At-Tahrim", ayat: 12 }, { no: 67, nama: "Al-Mulk", ayat: 30 }, { no: 68, nama: "Al-Qalam", ayat: 52 }, { no: 69, nama: "Al-Haqqah", ayat: 52 }, { no: 70, nama: "Al-Ma'arij", ayat: 44 }, { no: 71, nama: "Nuh", ayat: 28 }, { no: 72, nama: "Al-Jinn", ayat: 28 }, { no: 73, nama: "Al-Muzzammil", ayat: 20 }, { no: 74, nama: "Al-Muddassir", ayat: 56 }, { no: 75, nama: "Al-Qiyamah", ayat: 40 }, { no: 76, nama: "Al-Insan", ayat: 31 }, { no: 77, nama: "Al-Mursalat", ayat: 50 }, { no: 78, nama: "An-Naba'", ayat: 40 }, { no: 79, nama: "An-Nazi'at", ayat: 46 }, { no: 80, nama: "'Abasa", ayat: 42 }, { no: 81, nama: "At-Takwir", ayat: 29 }, { no: 82, nama: "Al-Infitar", ayat: 19 }, { no: 83, nama: "Al-Mutaffifin", ayat: 36 }, { no: 84, nama: "Al-Insyiqaq", ayat: 25 }, { no: 85, nama: "Al-Buruj", ayat: 22 }, { no: 86, nama: "At-Tariq", ayat: 17 }, { no: 87, nama: "Al-A'la", ayat: 19 }, { no: 88, nama: "Al-Gasyiyah", ayat: 26 }, { no: 89, nama: "Al-Fajr", ayat: 30 }, { no: 90, nama: "Al-Balad", ayat: 20 }, { no: 91, nama: "Asy-Syams", ayat: 15 }, { no: 92, nama: "Al-Lail", ayat: 21 }, { no: 93, nama: "Ad-Duha", ayat: 11 }, { no: 94, nama: "Asy-Syarh", ayat: 8 }, { no: 95, nama: "At-Tin", ayat: 8 }, { no: 96, nama: "Al-'Alaq", ayat: 19 }, { no: 97, nama: "Al-Qadr", ayat: 5 }, { no: 98, nama: "Al-Bayyinah", ayat: 8 }, { no: 99, nama: "Az-Zalzalah", ayat: 8 }, { no: 100, nama: "Al-'Adiyat", ayat: 11 }, { no: 101, nama: "Al-Qari'ah", ayat: 11 }, { no: 102, nama: "At-Takasur", ayat: 8 }, { no: 103, nama: "Al-'Asr", ayat: 3 }, { no: 104, nama: "Al-Humazah", ayat: 9 }, { no: 105, nama: "Al-Fil", ayat: 5 }, { no: 106, nama: "Quraisy", ayat: 4 }, { no: 107, nama: "Al-Ma'un", ayat: 7 }, { no: 108, nama: "Al-Kausar", ayat: 3 }, { no: 109, nama: "Al-Kafirun", ayat: 6 }, { no: 110, nama: "An-Nasr", ayat: 3 }, { no: 111, nama: "Al-Masad", ayat: 5 }, { no: 112, nama: "Al-Ikhlas", ayat: 4 }, { no: 113, nama: "Al-Falaq", ayat: 5 }, { no: 114, nama: "An-Nas", ayat: 6 } ];
        const uiElements = {
            addStudentModal: document.getElementById('add-student-modal'),
            addClassForm: document.getElementById('add-class-form'),
            classNameInput: document.getElementById('class-name'),
            addClassBtn: document.getElementById('add-class-btn'),
            classList: document.getElementById('class-list'),
            studentList: document.getElementById('student-list'),
            studentFilterClass: document.getElementById('student-filter-class'),
            newStudentClass: document.getElementById('new-student-class'),
            addStudentForm: document.getElementById('add-student-form'),
            addStudentSubmitBtn: document.getElementById('add-student-submit-btn'),
            confirmModal: {
                el: document.getElementById('confirm-modal'),
                title: document.getElementById('confirm-modal-title'),
                text: document.getElementById('confirm-modal-text'),
                okBtn: document.getElementById('confirm-modal-ok'),
                cancelBtn: document.getElementById('confirm-modal-cancel'),
            },
            summary: {
                totalSiswa: document.getElementById('summary-total-siswa'),
                totalKelas: document.getElementById('summary-total-kelas'),
                studentProgressList: document.getElementById('student-progress-list'),
                rankFilterClass: document.getElementById('summary-rank-filter-class'),
                searchStudent: document.getElementById('summary-search-student'),
            },
            riwayat: {
                filterClass: document.getElementById('riwayat-filter-class'),
                list: document.getElementById('riwayat-list'),
                searchStudent: document.getElementById('riwayat-search-student'),
            },
            siswa: {
                searchStudent: document.getElementById('siswa-search-student')
            },
            import: {
                downloadTemplateBtn: document.getElementById('download-template-btn'),
                importBtn: document.getElementById('import-btn'),
                fileInput: document.getElementById('import-file-input'),
            },
            settings: {
                mutqinForm: document.getElementById('mutqin-settings-form'),
                quranScopeForm: document.getElementById('quran-scope-form'),
                quranScopeSelect: document.getElementById('quran-scope-setting'),
            }
        }
    function checkUserProfileCompletion() {
            const currentUserUID = window.appState.currentUserUID;
            const role = window.appState.loggedInRole;
            if (!currentUserUID || !role) return;

            const user = window.appState.allUsers.find(u => u.id === currentUserUID);
            // Jika data user belum termuat, fungsi ini akan berjalan lagi nanti saat data sudah ada.
            if (!user) return;

            const isProfileIncomplete = !user.namaLengkap || !user.ttl;
            const isPinMissingForGuru = (role === 'guru' && !user.pin);
            const modal = ui.profileSetupModal;

            if (isProfileIncomplete || isPinMissingForGuru) {
                // Isi form dengan data yang sudah ada jika ada
                modal.namaLengkapInput.value = user.namaLengkap || '';
                modal.ttlInput.value = user.ttl || '';

                // Tampilkan kolom PIN hanya untuk guru dan jadikan wajib diisi
                if (role === 'guru') {
                    modal.pinContainer.classList.remove('hidden');
                    modal.pinInput.required = true;
                } else {
                    modal.pinContainer.classList.add('hidden');
                    modal.pinInput.required = false;
                }

                // Tampilkan modal
                modal.el.classList.remove('hidden');
            } else {
                // Sembunyikan modal jika profil sudah lengkap
                modal.el.classList.add('hidden');
            }
        };
        Object.assign(ui, uiElements);


        function setButtonLoading(button, isLoading) {
            if (!button) return;

            // Cek apakah originalContent sudah disimpan, jika belum, simpan sekarang.
            if (!button.dataset.originalContent) {
                button.dataset.originalContent = button.innerHTML;
            }

            if (isLoading) {
                button.disabled = true;
                const span = button.querySelector('span');
                // Jika ada span, gunakan teks 'Memproses...', jika tidak, biarkan kosong.
                const loadingText = span ? `<span>Memproses...</span>` : '';
                button.innerHTML = `<div class="spinner"></div> ${loadingText}`;
            } else {
                button.disabled = false;
                button.innerHTML = button.dataset.originalContent;
            }
        }

        function showConfirmModal({ title, message, okText, onConfirm }) {
            ui.confirmModal.title.textContent = title || 'Konfirmasi';
            ui.confirmModal.text.textContent = message;
            ui.confirmModal.okBtn.textContent = okText || 'Ya, Hapus';
            ui.confirmModal.el.classList.remove('hidden');

            const handleOk = () => {
                onConfirm();
                hideModal();
            };
            
            const hideModal = () => {
                ui.confirmModal.el.classList.add('hidden');
                ui.confirmModal.okBtn.removeEventListener('click', handleOk);
                ui.confirmModal.cancelBtn.removeEventListener('click', hideModal);
            };
            
            ui.confirmModal.okBtn.addEventListener('click', handleOk);
            ui.confirmModal.cancelBtn.addEventListener('click', hideModal);
        }

        // --- DATA FUNCTIONS ---
        function isToday(timestamp) {
            const today = new Date();
            const someDate = new Date(timestamp);
            return someDate.getDate() === today.getDate() &&
                    someDate.getMonth() === today.getMonth() &&
                    someDate.getFullYear() === today.getFullYear();
        }

        function downloadTemplate() {
            const templateData = [
                { No: 1, Nama: "NAMA SISWA CONTOH 1", Kelas: "NAMA KELAS" },
                { No: 2, Nama: "NAMA SISWA CONTOH 2", Kelas: "NAMA KELAS" },
                { No: 3, Nama: "NAMA SISWA CONTOH 3", Kelas: "NAMA KELAS" },
            ];
            const worksheet = XLSX.utils.json_to_sheet(templateData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
            XLSX.writeFile(workbook, "template_import_siswa.xlsx");
        }

        function handleImport(event) {
            const file = event.target.files[0];
            if (!file) return;

            const importBtn = ui.import.importBtn;
            setButtonLoading(importBtn, true);

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (!jsonData.length || !jsonData[0].hasOwnProperty('Nama') || !jsonData[0].hasOwnProperty('Kelas')) {
                        showToast("Format template tidak sesuai. Pastikan ada kolom 'Nama' dan 'Kelas'.", "error");
                        setButtonLoading(importBtn, false);
                        return;
                    }

                    const batches = [];
                    let currentBatch = db.batch();
                    batches.push(currentBatch);
                    let operationCount = 0;
                    let newStudentsCount = 0;
                    let newClassesCount = 0;
                    let skippedCount = 0;
                    
                    const classMap = new Map(window.appState.allClasses.map(c => [c.name.toLowerCase().trim(), c.id]));
                    const existingStudentsMap = new Map(window.appState.allStudents.map(s => [`${s.name.toLowerCase().trim()}-${s.classId}`, true]));

                    for (const row of jsonData) {
                        if (operationCount >= 499) {
                            currentBatch = db.batch();
                            batches.push(currentBatch);
                            operationCount = 0;
                        }

                        const studentName = row.Nama?.toString().trim();
                        const className = row.Kelas?.toString().trim();
                        if (!studentName || !className) continue;

                        let classId = classMap.get(className.toLowerCase());

                        if (!classId) {
                            const newClassData = { name: className, lembagaId: window.appState.lembagaId };
                            const newClassRef = db.collection('classes').doc();
                            currentBatch.set(newClassRef, newClassData);
                            operationCount++;
                            classId = newClassRef.id;
                            classMap.set(className.toLowerCase(), classId);
                            newClassesCount++;
                        }

                        const studentKey = `${studentName.toLowerCase()}-${classId}`;
                        if (!existingStudentsMap.has(studentKey)) {
                            const newStudent = { name: studentName, classId, lembagaId: window.appState.lembagaId };
                            const newStudentRef = db.collection('students').doc();
                            currentBatch.set(newStudentRef, newStudent);
                            operationCount++;
                            existingStudentsMap.set(studentKey, true);
                            newStudentsCount++;
                        } else {
                            skippedCount++;
                        }
                    }

                    if (batches.length > 0 && operationCount > 0) {
                        await Promise.all(batches.map(batch => batch.commit()));
                    }
                    
                    ui.addStudentModal.classList.add('hidden');
                    
                    let message = `${newStudentsCount} siswa baru`;
                    if (newClassesCount > 0) message += ` & ${newClassesCount} kelas baru`;
                    message += ' berhasil diimpor.';
                    if (skippedCount > 0) message += ` ${skippedCount} data duplikat dilewati.`;
                    showToast(message, 'success');

                } catch (error) {
                    console.error("Import Error:", error);
                    showToast("Terjadi kesalahan saat memproses file. " + error.message, "error");
                } finally {
                    setButtonLoading(importBtn, false);
                    event.target.value = '';
                }
            };
            reader.readAsArrayBuffer(file);
        }
        function renderAll() {
            renderSummary();
            renderClassList();
            renderStudentList();
            renderStudentProgressList();
            renderRiwayatList();
        }

        function renderSummary() {
            if(ui.summary.totalSiswa) ui.summary.totalSiswa.textContent = window.appState.allStudents.length;
            if(ui.summary.totalKelas) ui.summary.totalKelas.textContent = window.appState.allClasses.length;

            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

            let ziyadahMonth = 0, ziyadahLastMonth = 0;
            let murajaahMonth = 0, murajaahLastMonth = 0;

            window.appState.allHafalan.forEach(h => {
                const ayatCount = (parseInt(h.ayatSampai) - parseInt(h.ayatDari) + 1);
                const timestamp = h.timestamp;
                
                const updateCounters = (type) => {
                        if (timestamp >= monthStart) {
                        if(type === 'ziyadah') ziyadahMonth += ayatCount; else murajaahMonth += ayatCount;
                        } else if (timestamp >= lastMonthStart && timestamp < monthStart) {
                            if(type === 'ziyadah') ziyadahLastMonth += ayatCount; else murajaahLastMonth += ayatCount;
                        }
                };

                if (h.jenis === 'ziyadah') updateCounters('ziyadah');
                else if (h.jenis === 'murajaah') updateCounters('murajaah');
            });
            
            let totalMutqinScore = 0;
            const scoreMap = getMutqinScores();

            if (window.appState.allHafalan.length > 0) {
                const totalScore = window.appState.allHafalan.reduce((sum, entry) => {
                    return sum + (scoreMap[entry.kualitas] || 0);
                }, 0);
                totalMutqinScore = Math.round(totalScore / window.appState.allHafalan.length);
            }
            
            const mutqinElement = document.getElementById('summary-mutqin-score');
            if (mutqinElement) {
                mutqinElement.innerHTML = `<span class="text-teal-700">${totalMutqinScore}%</span>`;
            }

            const calculateTrend = (current, previous) => {
                if (previous > 0) return Math.round(((current - previous) / previous) * 100);
                if (current > 0) return 100;
                return 0;
            };

            const formatTrendText = (trend) => {
                if (trend === 0) return `<span class="text-lg font-medium text-slate-500">/ 0%</span>`;
                const colorClass = trend > 0 ? 'text-green-500' : 'text-red-500';
                const sign = trend > 0 ? '+' : '';
                return `<span class="text-lg font-medium ${colorClass}">/ ${sign}${trend}%</span>`;
            };

            const ziyadahTrend = calculateTrend(ziyadahMonth, ziyadahLastMonth);
            const murajaahTrend = calculateTrend(murajaahMonth, murajaahLastMonth);

            const ziyadahCombinedEl = document.getElementById('summary-ziyadah-combined');
            if (ziyadahCombinedEl) {
                ziyadahCombinedEl.innerHTML = `
                    <span>${ziyadahMonth}</span>
                    <span class="text-lg font-medium text-slate-500">Ayat</span>
                    ${formatTrendText(ziyadahTrend)}
                `;
            }

            const murajaahCombinedEl = document.getElementById('summary-murajaah-combined');
            if (murajaahCombinedEl) {
                    murajaahCombinedEl.innerHTML = `
                    <span>${murajaahMonth}</span>
                    <span class="text-lg font-medium text-slate-500">Ayat</span>
                    ${formatTrendText(murajaahTrend)}
                `;
            }
        }
        function renderPencapaianPagination(totalItems) {
            const paginationContainer = document.getElementById('pencapaian-pagination-controls');
            if (!paginationContainer) return;

            paginationContainer.innerHTML = '';
            const ITEMS_PER_PAGE = 36;
            const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

            if (totalPages <= 1) return; 

            const currentPage = window.appState.currentPagePencapaian;

            const createButton = (text, page, isDisabled = false, isActive = false) => {
                const button = document.createElement('button');
                button.innerHTML = text;
                button.disabled = isDisabled;
                button.className = `btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`;
                if (!isDisabled && page) {
                    button.onclick = () => {
                        window.appState.currentPagePencapaian = page;
                        renderStudentProgressList();
                        document.getElementById('student-progress-list').scrollIntoView({ behavior: 'smooth' });
                    };
                }
                return button;
            };
            
            const createEllipsis = () => {
                const span = document.createElement('span');
                span.textContent = '...';
                span.className = 'flex items-center justify-center px-2 py-1 text-slate-500 font-bold';
                return span;
            };

            paginationContainer.appendChild(createButton('‹', currentPage - 1, currentPage === 1));

            const pagesToShow = new Set();
            pagesToShow.add(1);
            pagesToShow.add(totalPages);
            if (currentPage > 2) pagesToShow.add(currentPage - 1);
            pagesToShow.add(currentPage);
            if (currentPage < totalPages - 1) pagesToShow.add(currentPage + 1);

            const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);
            let lastPage = 0;

            for (const page of sortedPages) {
                if (page > lastPage + 1) {
                    paginationContainer.appendChild(createEllipsis());
                }
                paginationContainer.appendChild(createButton(page, page, false, page === currentPage));
                lastPage = page;
            }

            paginationContainer.appendChild(createButton('›', currentPage + 1, currentPage === totalPages));
        }
            const calculateTrend = (current, previous) => {
                if (previous > 0) return Math.round(((current - previous) / previous) * 100);
                if (current > 0) return 100;
                return 0;
            };

            const renderStudentTrend = (trend) => {
                if (trend === 0) return `<div class="text-xs text-slate-400 flex items-center justify-end gap-1 mt-1"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Tidak ada perubahan</span></div>`;
                
                const colorClass = trend > 0 ? 'text-green-500' : 'text-red-500';
                const icon = trend > 0 
                    ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><polyline points="17 11 12 6 7 11"></polyline><line x1="12" y1="18" x2="12" y2="6"></line></svg>`
                    : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><polyline points="7 13 12 18 17 13"></polyline><line x1="12" y1="6" x2="12" y2="18"></line></svg>`;
                
                return `<div class="text-xs font-semibold ${colorClass} flex items-center justify-end gap-1 mt-1">${icon}<span>${Math.abs(trend)}% 7 hari terakhir</span></div>`;
            }
        function renderStudentProgressList() {
            if (!ui.summary.studentProgressList) return;
            
            // --- DATA STRUKTUR AL-QUR'AN (UNTUK PERHITUNGAN AKURAT) ---
            const surahInfo = [
                { no: 1, ayat: 7, nama: "Al-Fatihah" }, { no: 2, ayat: 286, nama: "Al-Baqarah" }, { no: 3, ayat: 200, nama: "Ali 'Imran" },
                { no: 4, ayat: 176, nama: "An-Nisa'" }, { no: 5, ayat: 120, nama: "Al-Ma'idah" }, { no: 6, ayat: 165, nama: "Al-An'am" },
                { no: 7, ayat: 206, nama: "Al-A'raf" }, { no: 8, ayat: 75, nama: "Al-Anfal" }, { no: 9, ayat: 129, nama: "At-Taubah" },
                { no: 10, ayat: 109, nama: "Yunus" }, { no: 11, ayat: 123, nama: "Hud" }, { no: 12, ayat: 111, nama: "Yusuf" },
                { no: 13, ayat: 43, nama: "Ar-Ra'd" }, { no: 14, ayat: 52, nama: "Ibrahim" }, { no: 15, ayat: 99, nama: "Al-Hijr" },
                { no: 16, ayat: 128, nama: "An-Nahl" }, { no: 17, ayat: 111, nama: "Al-Isra'" }, { no: 18, ayat: 110, nama: "Al-Kahf" },
                { no: 19, ayat: 98, nama: "Maryam" }, { no: 20, ayat: 135, nama: "Taha" }, { no: 21, ayat: 112, nama: "Al-Anbiya'" },
                { no: 22, ayat: 78, nama: "Al-Hajj" }, { no: 23, ayat: 118, nama: "Al-Mu'minun" }, { no: 24, ayat: 64, nama: "An-Nur" },
                { no: 25, ayat: 77, nama: "Al-Furqan" }, { no: 26, ayat: 227, nama: "Asy-Syu'ara'" }, { no: 27, ayat: 93, nama: "An-Naml" },
                { no: 28, ayat: 88, nama: "Al-Qasas" }, { no: 29, ayat: 69, nama: "Al-'Ankabut" }, { no: 30, ayat: 60, nama: "Ar-Rum" },
                { no: 31, ayat: 34, nama: "Luqman" }, { no: 32, ayat: 30, nama: "As-Sajdah" }, { no: 33, ayat: 73, nama: "Al-Ahzab" },
                { no: 34, ayat: 54, nama: "Saba'" }, { no: 35, ayat: 45, nama: "Fatir" }, { no: 36, ayat: 83, nama: "Yasin" },
                { no: 37, ayat: 182, nama: "As-Saffat" }, { no: 38, ayat: 88, nama: "Sad" }, { no: 39, ayat: 75, nama: "Az-Zumar" },
                { no: 40, ayat: 85, nama: "Ghafir" }, { no: 41, ayat: 54, nama: "Fussilat" }, { no: 42, ayat: 53, nama: "Asy-Syura" },
                { no: 43, ayat: 89, nama: "Az-Zukhruf" }, { no: 44, ayat: 59, nama: "Ad-Dukhan" }, { no: 45, ayat: 37, nama: "Al-Jasiyah" },
                { no: 46, ayat: 35, nama: "Al-Ahqaf" }, { no: 47, ayat: 38, nama: "Muhammad" }, { no: 48, ayat: 29, nama: "Al-Fath" },
                { no: 49, ayat: 18, nama: "Al-Hujurat" }, { no: 50, ayat: 45, nama: "Qaf" }, { no: 51, ayat: 60, nama: "Az-Zariyat" },
                { no: 52, ayat: 49, nama: "At-Tur" }, { no: 53, ayat: 62, nama: "An-Najm" }, { no: 54, ayat: 55, nama: "Al-Qamar" },
                { no: 55, ayat: 78, nama: "Ar-Rahman" }, { no: 56, ayat: 96, nama: "Al-Waqi'ah" }, { no: 57, ayat: 29, nama: "Al-Hadid" },
                { no: 58, ayat: 22, nama: "Al-Mujadalah" }, { no: 59, ayat: 24, nama: "Al-Hasyr" }, { no: 60, ayat: 13, nama: "Al-Mumtahanah" },
                { no: 61, ayat: 14, nama: "As-Saff" }, { no: 62, ayat: 11, nama: "Al-Jumu'ah" }, { no: 63, ayat: 11, nama: "Al-Munafiqun" },
                { no: 64, ayat: 18, nama: "At-Tagabun" }, { no: 65, ayat: 12, nama: "At-Talaq" }, { no: 66, ayat: 12, nama: "At-Tahrim" },
                { no: 67, ayat: 30, nama: "Al-Mulk" }, { no: 68, ayat: 52, nama: "Al-Qalam" }, { no: 69, ayat: 52, nama: "Al-Haqqah" },
                { no: 70, ayat: 44, nama: "Al-Ma'arij" }, { no: 71, ayat: 28, nama: "Nuh" }, { no: 72, ayat: 28, nama: "Al-Jinn" },
                { no: 73, ayat: 20, nama: "Al-Muzzammil" }, { no: 74, ayat: 56, nama: "Al-Muddassir" }, { no: 75, ayat: 40, nama: "Al-Qiyamah" },
                { no: 76, ayat: 31, nama: "Al-Insan" }, { no: 77, ayat: 50, nama: "Al-Mursalat" }, { no: 78, ayat: 40, nama: "An-Naba'" },
                { no: 79, ayat: 46, nama: "An-Nazi'at" }, { no: 80, ayat: 42, nama: "'Abasa" }, { no: 81, ayat: 29, nama: "At-Takwir" },
                { no: 82, ayat: 19, nama: "Al-Infitar" }, { no: 83, ayat: 36, nama: "Al-Mutaffifin" }, { no: 84, ayat: 25, nama: "Al-Insyiqaq" },
                { no: 85, ayat: 22, nama: "Al-Buruj" }, { no: 86, ayat: 17, nama: "At-Tariq" }, { no: 87, ayat: 19, nama: "Al-A'la" },
                { no: 88, ayat: 26, nama: "Al-Gasyiyah" }, { no: 89, ayat: 30, nama: "Al-Fajr" }, { no: 90, ayat: 20, nama: "Al-Balad" },
                { no: 91, ayat: 15, nama: "Asy-Syams" }, { no: 92, ayat: 21, nama: "Al-Lail" }, { no: 93, ayat: 11, nama: "Ad-Duha" },
                { no: 94, ayat: 8, nama: "Asy-Syarh" }, { no: 95, ayat: 8, nama: "At-Tin" }, { no: 96, ayat: 19, nama: "Al-'Alaq" },
                { no: 97, ayat: 5, nama: "Al-Qadr" }, { no: 98, ayat: 8, nama: "Al-Bayyinah" }, { no: 99, ayat: 8, nama: "Az-Zalzalah" },
                { no: 100, ayat: 11, nama: "Al-'Adiyat" }, { no: 101, ayat: 11, nama: "Al-Qari'ah" }, { no: 102, ayat: 8, nama: "At-Takasur" },
                { no: 103, ayat: 3, nama: "Al-'Asr" }, { no: 104, ayat: 9, nama: "Al-Humazah" }, { no: 105, ayat: 5, nama: "Al-Fil" },
                { no: 106, ayat: 4, nama: "Quraisy" }, { no: 107, ayat: 7, nama: "Al-Ma'un" }, { no: 108, ayat: 3, nama: "Al-Kausar" },
                { no: 109, ayat: 6, nama: "Al-Kafirun" }, { no: 110, ayat: 3, nama: "An-Nasr" }, { no: 111, ayat: 5, nama: "Al-Masad" },
                { no: 112, ayat: 4, nama: "Al-Ikhlas" }, { no: 113, ayat: 5, nama: "Al-Falaq" }, { no: 114, ayat: 6, nama: "An-Nas" }
            ];

            const juzBoundaries = [
                { juz: 1, start: { s: 1, a: 1 } },   { juz: 2, start: { s: 2, a: 142 } }, { juz: 3, start: { s: 2, a: 253 } },
                { juz: 4, start: { s: 3, a: 93 } },  { juz: 5, start: { s: 4, a: 24 } },  { juz: 6, start: { s: 4, a: 148 } },
                { juz: 7, start: { s: 5, a: 82 } },  { juz: 8, start: { s: 6, a: 111 } }, { juz: 9, start: { s: 7, a: 88 } },
                { juz: 10, start: { s: 8, a: 41 } }, { juz: 11, start: { s: 9, a: 93 } }, { juz: 12, start: { s: 11, a: 6 } },
                { juz: 13, start: { s: 12, a: 53 } },{ juz: 14, start: { s: 15, a: 1 } }, { juz: 15, start: { s: 17, a: 1 } },
                { juz: 16, start: { s: 18, a: 75 } },{ juz: 17, start: { s: 21, a: 1 } }, { juz: 18, start: { s: 23, a: 1 } },
                { juz: 19, start: { s: 25, a: 21 } },{ juz: 20, start: { s: 27, a: 56 } },{ juz: 21, start: { s: 29, a: 46 } },
                { juz: 22, start: { s: 33, a: 31 } },{ juz: 23, start: { s: 36, a: 28 } },{ juz: 24, start: { s: 39, a: 32 } },
                { juz: 25, start: { s: 41, a: 47 } },{ juz: 26, start: { s: 46, a: 1 } },  { juz: 27, start: { s: 51, a: 31 } },
                { juz: 28, start: { s: 58, a: 1 } },  { juz: 29, start: { s: 67, a: 1 } }, { juz: 30, start: { s: 78, a: 1 } }
            ];

            const totalAyatPerJuz = Array(31).fill(0);
            surahInfo.forEach(surah => {
                for (let ayat = 1; ayat <= surah.ayat; ayat++) {
                    let juz = 0;
                    for (let i = juzBoundaries.length - 1; i >= 0; i--) {
                        if (surah.no > juzBoundaries[i].start.s || (surah.no === juzBoundaries[i].start.s && ayat >= juzBoundaries[i].start.a)) {
                            juz = juzBoundaries[i].juz;
                            break;
                        }
                    }
                    if (juz > 0) totalAyatPerJuz[juz]++;
                }
            });

            const ITEMS_PER_PAGE = 36;
            const filterClassId = ui.summary.rankFilterClass ? ui.summary.rankFilterClass.value : '';
            const searchTerm = ui.summary.searchStudent ? ui.summary.searchStudent.value.toLowerCase() : '';
            
            let studentsToRank = filterClassId
                ? window.appState.allStudents.filter(s => s.classId === filterClassId)
                : [...window.appState.allStudents];

            if (searchTerm) {
                studentsToRank = studentsToRank.filter(s => s.name.toLowerCase().includes(searchTerm));
            }

            const studentScores = studentsToRank.map(student => {
                const studentHafalan = window.appState.allHafalan.filter(h => h.studentId === student.id);
                const studentClass = window.appState.allClasses.find(c => c.id === student.classId);
                const ziyadahEntries = studentHafalan.filter(h => h.jenis === 'ziyadah');

                const memorizedVersesBySurah = new Map();
                ziyadahEntries.forEach(entry => {
                    const surahNo = parseInt(entry.surahNo);
                    const dari = parseInt(entry.ayatDari);
                    const sampai = parseInt(entry.ayatSampai);
                    if (isNaN(surahNo) || isNaN(dari) || isNaN(sampai)) return;

                    if (!memorizedVersesBySurah.has(surahNo)) {
                        memorizedVersesBySurah.set(surahNo, new Set());
                    }
                    const surahSet = memorizedVersesBySurah.get(surahNo);
                    for (let i = dari; i <= sampai; i++) {
                        surahSet.add(i);
                    }
                });
                
                const memorizedCountPerJuz = Array(31).fill(0);
                memorizedVersesBySurah.forEach((ayatSet, surahNo) => {
                    ayatSet.forEach(ayatNo => {
                        let juz = 0;
                        for (let i = juzBoundaries.length - 1; i >= 0; i--) {
                            if (surahNo > juzBoundaries[i].start.s || (surahNo === juzBoundaries[i].start.s && ayatNo >= juzBoundaries[i].start.a)) {
                                juz = juzBoundaries[i].juz;
                                break;
                            }
                        }
                        if (juz > 0) memorizedCountPerJuz[juz]++;
                    });
                });

                let totalJuz = 0;
                for (let i = 1; i <= 30; i++) {
                    if (memorizedCountPerJuz[i] > 0 && totalAyatPerJuz[i] > 0) {
                        totalJuz += (memorizedCountPerJuz[i] / totalAyatPerJuz[i]);
                    }
                }
                const totalJuzFormatted = totalJuz.toFixed(1).replace('.', ',');
                
                const testEntries = studentHafalan.filter(h => h.jenis === 'tes');
                let averageTestScore = 0;
                if (testEntries.length > 0) {
                    const totalTestScore = testEntries.reduce((sum, entry) => {
                        const scoreMatch = entry.catatan.match(/Skor:\s*(\d+)/);
                        const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
                        return sum + score;
                    }, 0);
                    averageTestScore = Math.round(totalTestScore / testEntries.length);
                }

                let mutqinScore = 0;
                const scoreMap = getMutqinScores();
                if (studentHafalan.length > 0) {
                    const totalScore = studentHafalan.reduce((sum, entry) => sum + (scoreMap[entry.kualitas] || 0), 0);
                    mutqinScore = Math.round(totalScore / studentHafalan.length);
                }

                const now = new Date().getTime(), sevenDaysAgo = now - 7 * 86400000, fourteenDaysAgo = now - 14 * 86400000;
                let last7DaysTotal = 0, previous7DaysTotal = 0;
                studentHafalan.forEach(h => {
                    const ayatCount = (parseInt(h.ayatSampai) - parseInt(h.ayatDari) + 1);
                    if (h.timestamp >= sevenDaysAgo) last7DaysTotal += ayatCount;
                    else if (h.timestamp >= fourteenDaysAgo) previous7DaysTotal += ayatCount;
                });

                return { 
                    name: student.name, 
                    className: studentClass ? studentClass.name : 'Tanpa Kelas', 
                    totalJuz: totalJuz,
                    totalJuzFormatted: totalJuzFormatted,
                    testScore: averageTestScore,
                    mutqinScore, 
                    trend: calculateTrend(last7DaysTotal, previous7DaysTotal) 
                };
            });

            const totalMutqinKeseluruhan = studentScores.reduce((sum, student) => sum + student.mutqinScore, 0);

            if (totalMutqinKeseluruhan === 0) {
                studentScores.sort((a, b) => a.name.localeCompare(b.name));
            } else {
                studentScores.sort((a, b) => {
                    if (b.totalJuz !== a.totalJuz) {
                        return b.totalJuz - a.totalJuz;
                    }
                    if (b.mutqinScore !== a.mutqinScore) {
                        return b.mutqinScore - a.mutqinScore;
                    }
                    return a.name.localeCompare(b.name);
                });
            }

            const currentPage = window.appState.currentPagePencapaian;
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;
            const paginatedScores = studentScores.slice(startIndex, endIndex);

            ui.summary.studentProgressList.innerHTML = ''; 

            if (studentScores.length === 0) {
                ui.summary.studentProgressList.innerHTML = `<p class="text-center text-slate-500 py-4">Belum ada data siswa.</p>`;
                document.getElementById('pencapaian-pagination-controls').innerHTML = '';
                return;
            }
            
            const fragment = document.createDocumentFragment();
            paginatedScores.forEach((student, index) => {
                const rank = startIndex + index + 1;
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between p-3 rounded-lg transition-colors';
                
                let rankDisplay = `<span class="font-bold text-slate-500 text-lg w-6 text-center">-</span>`;
                if (totalMutqinKeseluruhan > 0) {
                    rankDisplay = `<span class="font-bold text-slate-500 text-lg w-6 text-center">${rank}</span>`;
                    if (rank === 1) item.classList.add('bg-amber-100');
                    else if (rank === 2) item.classList.add('bg-slate-200');
                    else if (rank === 3) item.classList.add('bg-orange-100');
                    else item.classList.add('bg-slate-50');
                } else {
                    item.classList.add('bg-slate-50');
                }
            
                // ▼▼▼ BARIS DI BAWAH INI TELAH DIUBAH ▼▼▼
                item.innerHTML = `
                    <div class="flex items-center space-x-4">
                        ${rankDisplay}
                        <div>
                            <p class="font-semibold text-slate-700">${student.name}</p>
                            <p class="text-sm text-slate-500">${student.className}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="flex justify-end gap-3 sm:gap-4 text-center">
                            <div><p class="font-bold text-teal-600">${student.totalJuzFormatted}</p><p class="text-xs text-slate-500">Juz</p></div>
                            <div><p class="font-bold text-teal-600">${student.testScore}</p><p class="text-xs text-slate-500">Tes</p></div>
                            <div><p class="font-bold text-teal-600">${student.mutqinScore}%</p><p class="text-xs text-slate-500">Mutqin</p></div>
                        </div>
                        ${renderStudentTrend(student.trend)}
                    </div>
                `;
                // ▲▲▲ AKHIR PERUBAHAN ▲▲▲

                fragment.appendChild(item);
            });
            ui.summary.studentProgressList.appendChild(fragment);

            renderPencapaianPagination(studentScores.length);
        }
        function renderRiwayatPagination(totalItems) {
            const paginationContainer = document.getElementById('riwayat-pagination-controls');
            if (!paginationContainer) return;

            paginationContainer.innerHTML = '';
            const ITEMS_PER_PAGE = 36;
            const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

            if (totalPages <= 1) return;

            const currentPage = window.appState.currentPageRiwayat;

            const createButton = (text, page, isDisabled = false, isActive = false) => {
                const button = document.createElement('button');
                button.innerHTML = text;
                button.disabled = isDisabled;
                button.className = `btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`;
                if (!isDisabled && page) {
                    button.onclick = () => {
                        window.appState.currentPageRiwayat = page;
                        renderRiwayatList();
                        document.getElementById('riwayat-list').scrollIntoView({ behavior: 'smooth' });
                    };
                }
                return button;
            };
            
            const createEllipsis = () => {
                const span = document.createElement('span');
                span.textContent = '...';
                span.className = 'flex items-center justify-center px-2 py-1 text-slate-500 font-bold';
                return span;
            };

            paginationContainer.appendChild(createButton('‹', currentPage - 1, currentPage === 1));

            const pagesToShow = new Set();
            pagesToShow.add(1);
            pagesToShow.add(totalPages);
            if (currentPage > 2) pagesToShow.add(currentPage - 1);
            pagesToShow.add(currentPage);
            if (currentPage < totalPages - 1) pagesToShow.add(currentPage + 1);

            const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);
            let lastPage = 0;

            for (const page of sortedPages) {
                if (page > lastPage + 1) {
                    paginationContainer.appendChild(createEllipsis());
                }
                paginationContainer.appendChild(createButton(page, page, false, page === currentPage));
                lastPage = page;
            }

            paginationContainer.appendChild(createButton('›', currentPage + 1, currentPage === totalPages));
        }
        function renderRiwayatList() {
            if (!ui.riwayat || !ui.riwayat.list) return;

            const ITEMS_PER_PAGE = 36;
            const filterClassId = ui.riwayat.filterClass ? ui.riwayat.filterClass.value : '';
            const searchTerm = ui.riwayat.searchStudent ? ui.riwayat.searchStudent.value.toLowerCase() : '';
            let filteredHafalan = [...window.appState.allHafalan];

            const studentMap = new Map(window.appState.allStudents.map(s => [s.id, s]));
            const classMap = new Map(window.appState.allClasses.map(c => [c.id, c.name]));
            const userMap = new Map(window.appState.allUsers.map(u => [u.id, u.namaLengkap || u.email]));
            const surahNameMap = new Map(surahList.map(s => [s.no, s.nama]));
            const kualitasDisplayMap = { 
                'sangat-lancar': 'Sangat Lancar', 'lancar': 'Lancar',
                'cukup-lancar': 'Cukup Lancar', 'tidak-lancar': 'Tidak Lancar',
                'sangat-tidak-lancar': 'Sangat Tidak Lancar'
            };

            if (filterClassId) {
                const studentIdsInClass = new Set(
                    window.appState.allStudents
                        .filter(s => s.classId === filterClassId)
                        .map(s => s.id)
                );
                filteredHafalan = filteredHafalan.filter(h => studentIdsInClass.has(h.studentId));
            }

            if (searchTerm) {
                filteredHafalan = filteredHafalan.filter(h => {
                    const student = studentMap.get(h.studentId);
                    return student && student.name.toLowerCase().includes(searchTerm);
                });
            }

            filteredHafalan.sort((a, b) => b.timestamp - a.timestamp);

            const currentPage = window.appState.currentPageRiwayat;
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;
            const paginatedHafalan = filteredHafalan.slice(startIndex, endIndex);

            ui.riwayat.list.innerHTML = '';
            
            const fragment = document.createDocumentFragment();

            paginatedHafalan.forEach(entry => {
                const student = studentMap.get(entry.studentId);
                if (!student) return;

                const className = classMap.get(student.classId) || 'Tanpa Kelas';
                const surahName = surahNameMap.get(entry.surahNo) || `Surah ${entry.surahNo}`;
                const kualitasText = kualitasDisplayMap[entry.kualitas] || entry.kualitas;
                
                const date = new Date(entry.timestamp).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric'
                });
                
                const guruName = entry.guruId ? userMap.get(entry.guruId) : null;
                const guruNameHTML = guruName ? `<span class="text-slate-400 mx-1">•</span><span class="text-slate-500 italic">${guruName}</span>` : '';

                let detailHafalanHTML = '';
                let jenisLabel = '';
                let jenisColor = '';

                if (entry.jenis === 'tes') {
                    jenisLabel = 'Tes Hafalan';
                    jenisColor = 'text-purple-600';

                    const testTypeDisplayMap = {
                        'continue-verse': 'Sambung Ayat Setelahnya',
                        'previous-verse': 'Sambung Ayat Sebelumnya',
                        'reorder-verses': 'Menyusun Ulang Ayat',
                        'guess-surah': 'Menebak Surah'
                    };
                    const testTypeText = testTypeDisplayMap[entry.testType] || 'Ujian';

                    detailHafalanHTML = `
                        <span>${entry.catatan || 'Hasil Tes'}</span>
                        <span class="text-slate-400 mx-1">•</span>
                        <span>${testTypeText}</span>
                    `;
                } else {
                    jenisLabel = entry.jenis === 'ziyadah' ? 'Ziyadah' : 'Muraja\'ah';
                    jenisColor = entry.jenis === 'ziyadah' ? 'text-teal-600' : 'text-sky-600';
                    detailHafalanHTML = `
                        <span>${surahName} ${entry.ayatDari}-${entry.ayatSampai}</span>
                        <span class="text-slate-400 mx-1">•</span>
                        <span>${kualitasText}</span>
                    `;
                }

                const deleteButtonHTML = window.appState.loggedInRole === 'guru'
                    ? `<button data-action="delete-riwayat" data-id="${entry.id}" class="delete-riwayat-btn text-red-400 hover:text-red-600 p-1 rounded-full mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>`
                    : '';

                const item = document.createElement('div');
                item.className = 'riwayat-item flex items-start justify-between p-3 bg-slate-50 rounded-lg gap-4';
                
                item.innerHTML = `
                    <div class="flex-grow">
                        <p class="font-semibold text-slate-800">${student.name}</p>
                        <p class="text-sm text-slate-500">${className}</p>
                        <div class="mt-2 text-sm text-slate-700">
                            <span class="font-medium ${jenisColor}">${jenisLabel}:</span>
                            ${detailHafalanHTML}
                            ${entry.jenis !== 'tes' ? guruNameHTML : ''} 
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <p class="text-xs text-slate-500">${date}</p>
                        ${deleteButtonHTML}
                    </div>
                `;

                fragment.appendChild(item);
            });

            ui.riwayat.list.appendChild(fragment);
            renderRiwayatPagination(filteredHafalan.length);
        }

        function renderClassList() {
            const filtersToUpdate = [
                { el: ui.studentFilterClass, defaultText: 'Filter: Semua Kelas' },
                { el: ui.summary.rankFilterClass, defaultText: 'Hasil: Semua Kelas' },
                { el: ui.riwayat.filterClass, defaultText: 'Filter: Semua Kelas' }
            ];
            const selectsToUpdate = [
                { el: ui.newStudentClass, defaultText: '-- Pilih Kelas --' }
            ];

            const currentValues = [
                ...filtersToUpdate.map(f => f.el ? f.el.value : null),
                ...selectsToUpdate.map(s => s.el ? s.el.value : null)
            ];

            ui.classList.innerHTML = '';
            filtersToUpdate.forEach(f => { if(f.el) f.el.innerHTML = `<option value="">${f.defaultText}</option>`; });
                const deleteIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
            const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
            const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

            window.appState.allClasses.sort((a,b) => a.name.localeCompare(b.name)).forEach(cls => {
                const studentCount = window.appState.allStudents.filter(s => s.classId === cls.id).length;
                const item = document.createElement('div');
                item.className = 'class-item p-2 rounded-lg hover:bg-slate-50';
                item.dataset.classId = cls.id;
                item.innerHTML = `
                    <div class="class-display">
                        <div class="flex justify-between items-center">
                            <div class="flex-grow mr-2">
                                <h3 class="font-semibold text-teal-700 break-all">${cls.name}</h3>
                                <p class="text-xs text-slate-500">${studentCount} siswa</p>
                            </div>
                            <div class="flex items-center space-x-1 flex-shrink-0">
                                <button data-action="view-students" title="Lihat Siswa" class="inline-flex items-center justify-center rounded-md p-1 bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors">${eyeIcon}</button>
                                <button data-action="edit-class" title="Ubah Nama Kelas" class="inline-flex items-center justify-center rounded-md p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">${editIcon}</button>
                                <button data-action="delete-class" title="Hapus Kelas" class="inline-flex items-center justify-center rounded-md p-1 bg-red-50 text-red-600 hover:bg-red-100 transition-colors">${deleteIcon}</button>
                            </div>
                        </div>
                    </div>
                    <div class="class-edit-form hidden mt-2">
                        <input type="text" value="${cls.name}" class="form-input mb-2 text-sm" required>
                        <div class="flex space-x-2">
                            <button data-action="cancel-edit" class="btn btn-sm btn-secondary flex-1">Batal</button>
                            <button data-action="save-class" class="btn btn-sm btn-primary flex-1">Simpan</button>
                        </div>
                    </div>
                `;

                ui.classList.appendChild(item);
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                
                filtersToUpdate.forEach(f => { if(f.el) f.el.appendChild(option.cloneNode(true)); });
                selectsToUpdate.forEach(s => { if(s.el) s.el.appendChild(option.cloneNode(true)); });
            });
            
            filtersToUpdate.forEach((f, i) => { if(f.el) f.el.value = currentValues[i]; });
            selectsToUpdate.forEach((s, i) => { if(s.el) s.el.value = currentValues[filtersToUpdate.length + i]; });
        }
        function renderSiswaPagination(totalStudents) {
            const paginationContainer = document.getElementById('student-pagination-controls');
            if (!paginationContainer) return;

            paginationContainer.innerHTML = '';
            const SISWA_PER_PAGE = 36;
            const totalPages = Math.ceil(totalStudents / SISWA_PER_PAGE);

            if (totalPages <= 1) return;

            const currentPage = window.appState.currentPageSiswa;

            const createButton = (text, page, isDisabled = false, isActive = false) => {
                const button = document.createElement('button');
                button.innerHTML = text;
                button.disabled = isDisabled;
                button.className = `btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`;
                if (!isDisabled && page) {
                    button.onclick = () => {
                        window.appState.currentPageSiswa = page;
                        renderStudentList();
                        document.getElementById('student-list').scrollIntoView({ behavior: 'smooth' });
                    };
                }
                return button;
            };
            
            const createEllipsis = () => {
                const span = document.createElement('span');
                span.textContent = '...';
                span.className = 'flex items-center justify-center px-2 py-1 text-slate-500 font-bold';
                return span;
            };

            paginationContainer.appendChild(createButton('‹', currentPage - 1, currentPage === 1));

            const pagesToShow = new Set();
            pagesToShow.add(1);
            pagesToShow.add(totalPages);

            if (currentPage > 2) pagesToShow.add(currentPage - 1);
            pagesToShow.add(currentPage);
            if (currentPage < totalPages - 1) pagesToShow.add(currentPage + 1);

            const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);
            let lastPage = 0;

            for (const page of sortedPages) {
                if (page > lastPage + 1) {
                    paginationContainer.appendChild(createEllipsis());
                }
                paginationContainer.appendChild(createButton(page, page, false, page === currentPage));
                lastPage = page;
            }

            paginationContainer.appendChild(createButton('›', currentPage + 1, currentPage === totalPages));
        }
        function renderStudentList() {
            // --- PERUBAHAN BAGIAN 1: Menyimpan state form yang sedang terbuka ---
            const openFormsState = new Map();
            if (ui.studentList) {
                ui.studentList.querySelectorAll('.student-item').forEach(item => {
                    const formContainer = item.querySelector('.hafalan-form-container');
                    if (formContainer && !formContainer.classList.contains('hidden')) {
                        const studentId = item.dataset.studentId;
                        // Hanya simpan state jika BUKAN siswa yang baru saja disubmit.
                        // Ini mencegah state lama (sebelum submit) disimpan dan dipulihkan.
                        if (studentId !== window.appState.lastSubmittedStudentId) {
                            const form = item.querySelector('form');
                            const isJuzAmma = getQuranScope() === 'juz30';
                            const state = {
                                surah: form.surah.value,
                                kualitas: form.kualitas.value,
                                ayatDari: !isJuzAmma ? form.ayatDari.value : null,
                                ayatSampai: !isJuzAmma ? form.ayatSampai.value : null
                            };
                            openFormsState.set(studentId, state);
                        }
                    }
                });
            }

            const SISWA_PER_PAGE = 36;
            const openStudentIds = new Set();
            if (ui.studentList) {
                ui.studentList.querySelectorAll('.student-item').forEach(item => {
                    const form = item.querySelector('.hafalan-form-container');
                    if (form && !form.classList.contains('hidden')) {
                        openStudentIds.add(item.dataset.studentId);
                    }
                });
            }
            if (window.appState.lastSubmittedStudentId) {
                openStudentIds.add(window.appState.lastSubmittedStudentId);
                window.appState.lastSubmittedStudentId = null;
            }

            const filterId = ui.studentFilterClass.value;
            const searchTerm = ui.siswa && ui.siswa.searchStudent ? ui.siswa.searchStudent.value.toLowerCase() : '';

            let filteredStudents = filterId ? window.appState.allStudents.filter(s => s.classId === filterId) : [...window.appState.allStudents];

            if (searchTerm) {
                filteredStudents = filteredStudents.filter(s => s.name.toLowerCase().includes(searchTerm));
            }

            filteredStudents.sort((a, b) => a.name.localeCompare(b.name));

            const currentPage = window.appState.currentPageSiswa;
            const startIndex = (currentPage - 1) * SISWA_PER_PAGE;
            const endIndex = startIndex + SISWA_PER_PAGE;
            const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

            ui.studentList.innerHTML = '';

            const surahList = [ { no: 1, nama: "Al-Fatihah", ayat: 7 }, { no: 2, nama: "Al-Baqarah", ayat: 286 }, { no: 3, nama: "Ali 'Imran", ayat: 200 }, { no: 4, nama: "An-Nisa'", ayat: 176 }, { no: 5, nama: "Al-Ma'idah", ayat: 120 }, { no: 6, nama: "Al-An'am", ayat: 165 }, { no: 7, nama: "Al-A'raf", ayat: 206 }, { no: 8, nama: "Al-Anfal", ayat: 75 }, { no: 9, nama: "At-Taubah", ayat: 129 }, { no: 10, nama: "Yunus", ayat: 109 }, { no: 11, nama: "Hud", ayat: 123 }, { no: 12, nama: "Yusuf", ayat: 111 }, { no: 13, nama: "Ar-Ra'd", ayat: 43 }, { no: 14, nama: "Ibrahim", ayat: 52 }, { no: 15, nama: "Al-Hijr", ayat: 99 }, { no: 16, nama: "An-Nahl", ayat: 128 }, { no: 17, nama: "Al-Isra'", ayat: 111 }, { no: 18, nama: "Al-Kahf", ayat: 110 }, { no: 19, nama: "Maryam", ayat: 98 }, { no: 20, nama: "Taha", ayat: 135 }, { no: 21, nama: "Al-Anbiya'", ayat: 112 }, { no: 22, nama: "Al-Hajj", ayat: 78 }, { no: 23, nama: "Al-Mu'minun", ayat: 118 }, { no: 24, nama: "An-Nur", ayat: 64 }, { no: 25, nama: "Al-Furqan", ayat: 77 }, { no: 26, nama: "Asy-Syu'ara'", ayat: 227 }, { no: 27, nama: "An-Naml", ayat: 93 }, { no: 28, nama: "Al-Qasas", ayat: 88 }, { no: 29, nama: "Al-'Ankabut", ayat: 69 }, { no: 30, nama: "Ar-Rum", ayat: 60 }, { no: 31, nama: "Luqman", ayat: 34 }, { no: 32, nama: "As-Sajdah", ayat: 30 }, { no: 33, nama: "Al-Ahzab", ayat: 73 }, { no: 34, nama: "Saba'", ayat: 54 }, { no: 35, nama: "Fatir", ayat: 45 }, { no: 36, nama: "Yasin", ayat: 83 }, { no: 37, nama: "As-Saffat", ayat: 182 }, { no: 38, nama: "Sad", ayat: 88 }, { no: 39, nama: "Az-Zumar", ayat: 75 }, { no: 40, nama: "Ghafir", ayat: 85 }, { no: 41, nama: "Fussilat", ayat: 54 }, { no: 42, nama: "Asy-Syura", ayat: 53 }, { no: 43, nama: "Az-Zukhruf", ayat: 89 }, { no: 44, nama: "Ad-Dukhan", ayat: 59 }, { no: 45, nama: "Al-Jasiyah", ayat: 37 }, { no: 46, nama: "Al-Ahqaf", ayat: 35 }, { no: 47, nama: "Muhammad", ayat: 38 }, { no: 48, nama: "Al-Fath", ayat: 29 }, { no: 49, nama: "Al-Hujurat", ayat: 18 }, { no: 50, nama: "Qaf", ayat: 45 }, { no: 51, nama: "Az-Zariyat", ayat: 60 }, { no: 52, nama: "At-Tur", ayat: 49 }, { no: 53, nama: "An-Najm", ayat: 62 }, { no: 54, nama: "Al-Qamar", ayat: 55 }, { no: 55, nama: "Ar-Rahman", ayat: 78 }, { no: 56, nama: "Al-Waqi'ah", ayat: 96 }, { no: 57, nama: "Al-Hadid", ayat: 29 }, { no: 58, nama: "Al-Mujadalah", ayat: 22 }, { no: 59, nama: "Al-Hasyr", ayat: 24 }, { no: 60, nama: "Al-Mumtahanah", ayat: 13 }, { no: 61, nama: "As-Saff", ayat: 14 }, { no: 62, nama: "Al-Jumu'ah", ayat: 11 }, { no: 63, nama: "Al-Munafiqun", ayat: 11 }, { no: 64, nama: "At-Tagabun", ayat: 18 }, { no: 65, nama: "At-Talaq", ayat: 12 }, { no: 66, nama: "At-Tahrim", ayat: 12 }, { no: 67, nama: "Al-Mulk", ayat: 30 }, { no: 68, nama: "Al-Qalam", ayat: 52 }, { no: 69, nama: "Al-Haqqah", ayat: 52 }, { no: 70, nama: "Al-Ma'arij", ayat: 44 }, { no: 71, nama: "Nuh", ayat: 28 }, { no: 72, nama: "Al-Jinn", ayat: 28 }, { no: 73, nama: "Al-Muzzammil", ayat: 20 }, { no: 74, nama: "Al-Muddassir", ayat: 56 }, { no: 75, nama: "Al-Qiyamah", ayat: 40 }, { no: 76, nama: "Al-Insan", ayat: 31 }, { no: 77, nama: "Al-Mursalat", ayat: 50 }, { no: 78, nama: "An-Naba'", ayat: 40 }, { no: 79, nama: "An-Nazi'at", ayat: 46 }, { no: 80, nama: "'Abasa", ayat: 42 }, { no: 81, nama: "At-Takwir", ayat: 29 }, { no: 82, nama: "Al-Infitar", ayat: 19 }, { no: 83, nama: "Al-Mutaffifin", ayat: 36 }, { no: 84, nama: "Al-Insyiqaq", ayat: 25 }, { no: 85, nama: "Al-Buruj", ayat: 22 }, { no: 86, nama: "At-Tariq", ayat: 17 }, { no: 87, nama: "Al-A'la", ayat: 19 }, { no: 88, nama: "Al-Gasyiyah", ayat: 26 }, { no: 89, nama: "Al-Fajr", ayat: 30 }, { no: 90, nama: "Al-Balad", ayat: 20 }, { no: 91, nama: "Asy-Syams", ayat: 15 }, { no: 92, nama: "Al-Lail", ayat: 21 }, { no: 93, nama: "Ad-Duha", ayat: 11 }, { no: 94, nama: "Asy-Syarh", ayat: 8 }, { no: 95, nama: "At-Tin", ayat: 8 }, { no: 96, nama: "Al-'Alaq", ayat: 19 }, { no: 97, nama: "Al-Qadr", ayat: 5 }, { no: 98, nama: "Al-Bayyinah", ayat: 8 }, { no: 99, nama: "Az-Zalzalah", ayat: 8 }, { no: 100, nama: "Al-'Adiyat", ayat: 11 }, { no: 101, nama: "Al-Qari'ah", ayat: 11 }, { no: 102, nama: "At-Takasur", ayat: 8 }, { no: 103, nama: "Al-'Asr", ayat: 3 }, { no: 104, nama: "Al-Humazah", ayat: 9 }, { no: 105, nama: "Al-Fil", ayat: 5 }, { no: 106, nama: "Quraisy", ayat: 4 }, { no: 107, nama: "Al-Ma'un", ayat: 7 }, { no: 108, nama: "Al-Kausar", ayat: 3 }, { no: 109, nama: "Al-Kafirun", ayat: 6 }, { no: 110, nama: "An-Nasr", ayat: 3 }, { no: 111, nama: "Al-Masad", ayat: 5 }, { no: 112, nama: "Al-Ikhlas", ayat: 4 }, { no: 113, nama: "Al-Falaq", ayat: 5 }, { no: 114, nama: "An-Nas", ayat: 6 } ];
            const quranScope = getQuranScope();
            const isJuzAmma = quranScope === 'juz30';
            let surahsForForm;
            const pilihanSurahNumbers = [18, 36, 55, 56, 67];
            if (quranScope === 'juz30') {
                surahsForForm = surahList.filter(s => s.no >= 78);
            } else if (quranScope === 'pilihan') {
                surahsForForm = surahList.filter(s => pilihanSurahNumbers.includes(s.no));
            } else {
                surahsForForm = surahList;
            }
            const surahOptionsHTML = surahsForForm.map(s => `<option value="${s.no}" data-max-ayat="${s.ayat}">${s.no}. ${s.nama}</option>`).join('');

            if (window.appState.allClasses.length === 0 && window.appState.allStudents.length > 0) {
                ui.studentList.innerHTML = `<p class="text-center text-sm text-slate-400 p-4">Buat kelas terlebih dahulu untuk melihat siswa.</p>`;
                return;
            }
            if (paginatedStudents.length === 0) {
                const message = filteredStudents.length > 0 ? `<p class="text-center text-sm text-slate-400 p-4">Tidak ada siswa di halaman ini.</p>` : `<p class="text-center text-sm text-slate-400 p-4">Tidak ada siswa di kelas ini.</p>`;
                ui.studentList.innerHTML = message;
                renderSiswaPagination(filteredStudents.length);
                return;
            }

            const ayatInputsHTML = isJuzAmma ? '' : `
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium mb-1">Dari Ayat</label><select name="ayatDari" class="form-select ayat-dari-select" required></select></div>
                    <div><label class="block text-sm font-medium mb-1">Sampai Ayat</label><select name="ayatSampai" class="form-select ayat-sampai-select" required></select></div>
                </div>
            `;

            let pinInputHTML = '';
            if (window.appState.loggedInRole === 'siswa') {
                pinInputHTML = `
                    <div>
                        <label class="block text-sm font-medium mb-1">PIN Verifikasi Guru</label>
                        <div class="relative">
                            <input type="password" name="pin" class="form-input pr-10" placeholder="Masukkan 6 digit PIN" required pattern="\\d{6}" maxlength="6" autocomplete="one-time-code">
                            <button type="button" class="toggle-form-pin absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 focus:outline-none">
                                <svg class="eye-icon h-5 w-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                <svg class="eye-off-icon h-5 w-5 hidden" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                            </button>
                        </div>
                    </div>
                `;
            }

            paginatedStudents.forEach(student => {
                const studentHafalan = window.appState.allHafalan.filter(h => h.studentId === student.id);
                const hasSubmitted = studentHafalan.some(h => isToday(h.timestamp));
                const item = document.createElement('div');
                item.className = 'student-item bg-slate-50 rounded-lg';
                item.dataset.studentId = student.id;

                const deleteButtonHTML = window.appState.loggedInRole === 'guru'
                    ? `<button data-action="delete-student" class="delete-student-btn text-red-400 hover:text-red-600 p-1 rounded-full ml-2 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>`
                    : '';

                const recentHafalan = studentHafalan
                    .filter(entry => entry.jenis !== 'tes')
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 5);
                const kualitasDisplayMap = { 
                    'sangat-lancar': 'Sangat Lancar', 'lancar': 'Lancar',
                    'cukup-lancar': 'Cukup Lancar', 'tidak-lancar': 'Tidak Lancar',
                    'sangat-tidak-lancar': 'Sangat Tidak Lancar'
                };
                
                let historyHTML = '';
                if (recentHafalan.length > 0) {
                    historyHTML = recentHafalan.map(entry => {
                        const surahInfo = surahList.find(s => s.no == entry.surahNo);
                        const surahName = surahInfo ? surahInfo.nama : `Surah ${entry.surahNo}`;
                        const date = new Date(entry.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short'});
                        const jenisLabel = entry.jenis.charAt(0).toUpperCase() + entry.jenis.slice(1);
                        const kualitasText = kualitasDisplayMap[entry.kualitas] || entry.kualitas;
                        const jenisColor = entry.jenis === 'ziyadah' ? 'text-teal-600' : 'text-sky-600';

                        // --- KODE BARU: Tombol Hapus ---
                        const historyDeleteBtn = window.appState.loggedInRole === 'guru'
                            ? `<button data-action="delete-inline-riwayat" data-id="${entry.id}" class="delete-inline-riwayat-btn text-slate-400 hover:text-red-600 p-1 rounded-full -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>`
                            : '';

                        return `
                            <div class="text-xs text-slate-500 flex justify-between items-center bg-slate-100 p-2 rounded group">
                                <div class="flex-grow">
                                    <span class="font-bold ${jenisColor}">${jenisLabel}:</span>
                                    <span class="font-semibold text-slate-700">${surahName} ${entry.ayatDari}-${entry.ayatSampai}</span>
                                    <span class="italic">(${kualitasText})</span>
                                </div>
                                <div class="flex items-center flex-shrink-0 ml-2">
                                    <span class="font-medium mr-1">${date}</span>
                                    ${historyDeleteBtn}
                                </div>
                            </div>
                        `;
                    }).join('');
                } else {
                    historyHTML = '<p class="text-xs text-slate-400 text-center py-2">Belum ada riwayat setoran.</p>';
                }

                item.innerHTML = `
                    <div class="student-header flex items-center p-3 cursor-pointer hover:bg-slate-100 rounded-lg transition-colors">
                        <input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 pointer-events-none" ${hasSubmitted ? 'checked' : ''}>
                        <span class="font-medium ml-3 flex-grow">${student.name}</span>
                        ${deleteButtonHTML}
                    </div>
                    <div class="hafalan-form-container hidden p-4 border-t border-slate-200">
                        <form class="hafalan-form space-y-4">
                            <input type="hidden" name="studentId" value="${student.id}">
                            <div><label class="block text-sm font-medium mb-1">Surah</label><select name="surah" class="form-select surah-select" required>${surahOptionsHTML}</select></div>
                            ${ayatInputsHTML}
                            <div>
                                <label class="block text-sm font-medium mb-1">Kualitas Hafalan</label>
                                <select name="kualitas" class="form-select">
                                    <option value="sangat-lancar" selected>Sangat Lancar</option>
                                    <option value="lancar">Lancar</option>
                                    <option value="cukup-lancar">Cukup Lancar</option>
                                    <option value="tidak-lancar">Tidak Lancar</option>
                                    <option value="sangat-tidak-lancar">Sangat Tidak Lancar</option>
                                </select>
                            </div>
                            ${pinInputHTML}
                            <button type="submit" class="btn btn-primary w-full">Simpan Setoran</button>
                        </form>
                        <div class="mt-6 pt-4 border-t">
                            <h4 class="text-sm font-semibold text-slate-600 mb-2">Riwayat Terbaru</h4>
                            <div class="student-history-list space-y-2 max-h-48 overflow-y-auto pr-2">
                                ${historyHTML}
                            </div>
                        </div>
                    </div>
                `;
                ui.studentList.appendChild(item);

                let lastEntry = null;
                if (studentHafalan.length > 0) {
                    lastEntry = studentHafalan.sort((a, b) => b.timestamp - a.timestamp)[0];
                }

                const form = item.querySelector('.hafalan-form');
                const surahSelect = form.querySelector('.surah-select');
                const ayatDariSelect = form.querySelector('.ayat-dari-select');
                const ayatSampaiSelect = form.querySelector('.ayat-sampai-select');
                
                const previouslyOpenState = openFormsState.get(student.id);

                if (previouslyOpenState) {
                    form.querySelector('[name="kualitas"]').value = previouslyOpenState.kualitas;
                    surahSelect.value = previouslyOpenState.surah;
                    
                    if (ayatDariSelect && ayatSampaiSelect) {
                        populateAyatDropdowns(surahSelect, ayatDariSelect, ayatSampaiSelect);
                        ayatDariSelect.value = previouslyOpenState.ayatDari;
                        ayatSampaiSelect.value = previouslyOpenState.ayatSampai;
                    }
                } else if (lastEntry) {
                    form.querySelector('[name="kualitas"]').value = lastEntry.kualitas;
                    surahSelect.value = lastEntry.surahNo;

                    if (ayatDariSelect && ayatSampaiSelect) {
                        populateAyatDropdowns(surahSelect, ayatDariSelect, ayatSampaiSelect);
                        ayatDariSelect.value = lastEntry.ayatDari;
                        ayatSampaiSelect.value = lastEntry.ayatSampai;
                    }
                } else {
                    if (!isJuzAmma) {
                        populateAyatDropdowns(surahSelect, ayatDariSelect, ayatSampaiSelect);
                    }
                }
            });

            renderSiswaPagination(filteredStudents.length);

            openStudentIds.forEach(studentId => {
                const studentItem = ui.studentList.querySelector(`.student-item[data-student-id="${studentId}"]`);
                if (studentItem) {
                    const formContainer = studentItem.querySelector('.hafalan-form-container');
                    if (formContainer) {
                        formContainer.classList.remove('hidden');
                    }
                }
            });
        }
        // --- Fungsi untuk Menyimpan dan Memuat Sesi Tes ---
        function saveTestState() {
            if (window.appState.currentTest.isActive) {
                sessionStorage.setItem('activeTestState', JSON.stringify(window.appState.currentTest));
            }
        }

        function loadAndRestoreTestState() {
            const savedStateJSON = sessionStorage.getItem('activeTestState');
            if (savedStateJSON) {
                const savedState = JSON.parse(savedStateJSON);
                if (savedState.isActive) {
                    window.appState.currentTest = savedState;
                    
                    // Sembunyikan tampilan setup dan tampilkan progres tes
                    testUI.step1_type_view.classList.add('hidden');
                    testUI.step2_scope_view.classList.add('hidden');
                    testUI.resultView.classList.add('hidden');
                    testUI.progressView.classList.remove('hidden');

                    // Tampilkan kembali soal terakhir yang dibuka
                    displayCurrentQuestion();
                    showToast("Sesi tes sebelumnya berhasil dipulihkan.", "info");
                    return true; // Mengindikasikan sesi berhasil dipulihkan
                }
            }
            return false; // Tidak ada sesi aktif untuk dipulihkan
        }
        // --- TEST HAFALAN FUNCTIONS ---
        // GANTI OBJEK INI
        const testUI = {
            // Tampilan per langkah
            step1_type_view: document.getElementById('test-step-1-type'),
            step2_scope_view: document.getElementById('test-step-2-scope'),
            progressView: document.getElementById('test-progress-view'),
            resultView: document.getElementById('test-result-view'),

            // Kontrol di Langkah 1
            testTypeSelect: document.getElementById('test-type-select'),
            nextStepBtn: document.getElementById('test-next-step-btn'),
            studentSearchContainer: document.getElementById('test-student-search-container'),
            studentSearchInput: document.getElementById('test-student-search-input'),
            studentSearchResults: document.getElementById('test-student-search-results'),
            selectedStudentContainer: document.getElementById('test-selected-student-container'),
            selectedStudentName: document.getElementById('test-selected-student-name'),
            changeStudentBtn: document.getElementById('test-change-student-btn'),
            selectedStudentsList: document.getElementById('test-selected-students-list'),
            questionCountSelect: document.getElementById('test-question-count-select'),
            // Kontrol di Langkah 2
            surahSelectDari: document.getElementById('test-surah-select-dari'),
            surahSelectSampai: document.getElementById('test-surah-select-sampai'),
            juzSelectDari: document.getElementById('test-juz-select-dari'),
            juzSelectSampai: document.getElementById('test-juz-select-sampai'),
            backStepBtn: document.getElementById('test-back-step-btn'),
            startBtn: document.getElementById('start-test-btn'),

            // Elemen di Halaman Progres & Hasil
            questionNumber: document.getElementById('current-question-number'),
            totalQuestions: document.getElementById('total-questions'),
            currentScore: document.getElementById('current-score'),
            questionInstruction: document.getElementById('question-instruction'),
            questionText: document.getElementById('test-question-text'),
            answerOptions: document.getElementById('test-answer-options'),
            feedback: document.getElementById('test-feedback'),
            endTestBtn: document.getElementById('end-test-btn'),
            nextQuestionBtn: document.getElementById('next-question-btn'),
            restartTestBtn: document.getElementById('restart-test-btn'),
            finalScore: document.getElementById('final-score'),
            userAnswerArea: document.getElementById('test-user-answer-area'),
            checkReorderBtn: document.getElementById('check-reorder-btn'),
            previousQuestionBtn: document.getElementById('previous-question-btn'),
        };

        // Fungsi untuk mengisi dropdown surah dan juz
        function populateTestSelectors() {
            const surahList = [ { no: 1, nama: "Al-Fatihah", ayat: 7 }, { no: 2, nama: "Al-Baqarah", ayat: 286 }, { no: 3, nama: "Ali 'Imran", ayat: 200 }, { no: 4, nama: "An-Nisa'", ayat: 176 }, { no: 5, nama: "Al-Ma'idah", ayat: 120 }, { no: 6, nama: "Al-An'am", ayat: 165 }, { no: 7, nama: "Al-A'raf", ayat: 206 }, { no: 8, nama: "Al-Anfal", ayat: 75 }, { no: 9, nama: "At-Taubah", ayat: 129 }, { no: 10, nama: "Yunus", ayat: 109 }, { no: 11, nama: "Hud", ayat: 123 }, { no: 12, nama: "Yusuf", ayat: 111 }, { no: 13, nama: "Ar-Ra'd", ayat: 43 }, { no: 14, nama: "Ibrahim", ayat: 52 }, { no: 15, nama: "Al-Hijr", ayat: 99 }, { no: 16, nama: "An-Nahl", ayat: 128 }, { no: 17, nama: "Al-Isra'", ayat: 111 }, { no: 18, nama: "Al-Kahf", ayat: 110 }, { no: 19, nama: "Maryam", ayat: 98 }, { no: 20, nama: "Taha", ayat: 135 }, { no: 21, nama: "Al-Anbiya'", ayat: 112 }, { no: 22, nama: "Al-Hajj", ayat: 78 }, { no: 23, nama: "Al-Mu'minun", ayat: 118 }, { no: 24, nama: "An-Nur", ayat: 64 }, { no: 25, "nama": "Al-Furqan", ayat: 77 }, { no: 26, nama: "Asy-Syu'ara'", ayat: 227 }, { no: 27, nama: "An-Naml", ayat: 93 }, { no: 28, nama: "Al-Qasas", ayat: 88 }, { no: 29, nama: "Al-'Ankabut", ayat: 69 }, { no: 30, nama: "Ar-Rum", ayat: 60 }, { no: 31, nama: "Luqman", ayat: 34 }, { no: 32, nama: "As-Sajdah", ayat: 30 }, { no: 33, nama: "Al-Ahzab", ayat: 73 }, { no: 34, nama: "Saba'", ayat: 54 }, { no: 35, nama: "Fatir", ayat: 45 }, { no: 36, nama: "Yasin", ayat: 83 }, { no: 37, nama: "As-Saffat", ayat: 182 }, { no: 38, nama: "Sad", ayat: 88 }, { no: 39, nama: "Az-Zumar", ayat: 75 }, { no: 40, nama: "Ghafir", ayat: 85 }, { no: 41, nama: "Fussilat", ayat: 54 }, { no: 42, nama: "Asy-Syura", ayat: 53 }, { no: 43, nama: "Az-Zukhruf", ayat: 89 }, { no: 44, nama: "Ad-Dukhan", ayat: 59 }, { no: 45, nama: "Al-Jasiyah", ayat: 37 }, { no: 46, nama: "Al-Ahqaf", ayat: 35 }, { no: 47, nama: "Muhammad", ayat: 38 }, { no: 48, nama: "Al-Fath", ayat: 29 }, { no: 49, nama: "Al-Hujurat", ayat: 18 }, { no: 50, nama: "Qaf", ayat: 45 }, { no: 51, nama: "Az-Zariyat", ayat: 60 }, { no: 52, nama: "At-Tur", ayat: 49 }, { no: 53, nama: "An-Najm", ayat: 62 }, { no: 54, nama: "Al-Qamar", ayat: 55 }, { no: 55, nama: "Ar-Rahman", ayat: 78 }, { no: 56, nama: "Al-Waqi'ah", ayat: 96 }, { no: 57, nama: "Al-Hadid", ayat: 29 }, { no: 58, nama: "Al-Mujadalah", ayat: 22 }, { no: 59, nama: "Al-Hasyr", ayat: 24 }, { no: 60, nama: "Al-Mumtahanah", ayat: 13 }, { no: 61, nama: "As-Saff", ayat: 14 }, { no: 62, nama: "Al-Jumu'ah", ayat: 11 }, { no: 63, nama: "Al-Munafiqun", ayat: 11 }, { no: 64, nama: "At-Tagabun", ayat: 18 }, { no: 65, nama: "At-Talaq", ayat: 12 }, { no: 66, nama: "At-Tahrim", ayat: 12 }, { no: 67, nama: "Al-Mulk", ayat: 30 }, { no: 68, nama: "Al-Qalam", ayat: 52 }, { no: 69, nama: "Al-Haqqah", ayat: 52 }, { no: 70, nama: "Al-Ma'arij", ayat: 44 }, { no: 71, nama: "Nuh", ayat: 28 }, { no: 72, nama: "Al-Jinn", ayat: 28 }, { no: 73, nama: "Al-Muzzammil", ayat: 20 }, { no: 74, nama: "Al-Muddassir", ayat: 56 }, { no: 75, nama: "Al-Qiyamah", ayat: 40 }, { no: 76, nama: "Al-Insan", ayat: 31 }, { no: 77, nama: "Al-Mursalat", ayat: 50 }, { no: 78, nama: "An-Naba'", ayat: 40 }, { no: 79, nama: "An-Nazi'at", ayat: 46 }, { no: 80, nama: "'Abasa", ayat: 42 }, { no: 81, nama: "At-Takwir", ayat: 29 }, { no: 82, nama: "Al-Infitar", ayat: 19 }, { no: 83, nama: "Al-Mutaffifin", ayat: 36 }, { no: 84, nama: "Al-Insyiqaq", ayat: 25 }, { no: 85, nama: "Al-Buruj", ayat: 22 }, { no: 86, "nama": "At-Tariq", ayat: 17 }, { no: 87, nama: "Al-A'la", ayat: 19 }, { no: 88, nama: "Al-Gasyiyah", ayat: 26 }, { no: 89, nama: "Al-Fajr", ayat: 30 }, { no: 90, nama: "Al-Balad", ayat: 20 }, { no: 91, nama: "Asy-Syams", ayat: 15 }, { no: 92, nama: "Al-Lail", ayat: 21 }, { no: 93, nama: "Ad-Duha", ayat: 11 }, { no: 94, nama: "Asy-Syarh", ayat: 8 }, { no: 95, nama: "At-Tin", ayat: 8 }, { no: 96, nama: "Al-'Alaq", ayat: 19 }, { no: 97, nama: "Al-Qadr", ayat: 5 }, { no: 98, nama: "Al-Bayyinah", ayat: 8 }, { no: 99, nama: "Az-Zalzalah", ayat: 8 }, { no: 100, nama: "Al-'Adiyat", ayat: 11 }, { no: 101, nama: "Al-Qari'ah", ayat: 11 }, { no: 102, nama: "At-Takasur", ayat: 8 }, { no: 103, nama: "Al-'Asr", ayat: 3 }, { no: 104, nama: "Al-Humazah", ayat: 9 }, { no: 105, nama: "Al-Fil", ayat: 5 }, { no: 106, nama: "Quraisy", ayat: 4 }, { no: 107, nama: "Al-Ma'un", ayat: 7 }, { no: 108, nama: "Al-Kausar", ayat: 3 }, { no: 109, nama: "Al-Kafirun", ayat: 6 }, { no: 110, nama: "An-Nasr", ayat: 3 }, { no: 111, nama: "Al-Masad", ayat: 5 }, { no: 112, nama: "Al-Ikhlas", ayat: 4 }, { no: 113, nama: "Al-Falaq", ayat: 5 }, { no: 114, nama: "An-Nas", ayat: 6 } ];

            const surahOptions = '<option value="">-- Dari Surah --</option>' + surahList.map(s => `<option value="${s.no}">${s.no}. ${s.nama}</option>`).join('');
            const juzOptions = '<option value="">-- Dari Juz --</option>' + Array.from({length: 30}, (_, i) => `<option value="${i + 1}">Juz ${i + 1}</option>`).join('');
            
            testUI.surahSelectDari.innerHTML = surahOptions;
            testUI.surahSelectSampai.innerHTML = surahOptions.replace('-- Dari Surah --', '-- Sampai Surah --');
            testUI.juzSelectDari.innerHTML = juzOptions;
            testUI.juzSelectSampai.innerHTML = juzOptions.replace('-- Dari Juz --', '-- Sampai Juz --');
        }
        async function fetchVersesForTest({ surahDari, surahSampai, juzDari, juzSampai }) {
            const commonParams = 'per_page=300&fields=text_uthmani';
            let urls = [];

            if (surahDari && surahSampai) {
                for (let i = parseInt(surahDari); i <= parseInt(surahSampai); i++) {
                    urls.push(`https://api.quran.com/api/v4/verses/by_chapter/${i}?${commonParams}`);
                }
            } else if (juzDari && juzSampai) {
                for (let i = parseInt(juzDari); i <= parseInt(juzSampai); i++) {
                    urls.push(`https://api.quran.com/api/v4/verses/by_juz/${i}?${commonParams}`);
                }
            } else {
                return [];
            }

            try {
                const responses = await Promise.all(urls.map(url => fetch(url)));
                for (const response of responses) {
                    if (!response.ok) {
                        throw new Error(`Gagal mengambil data dari API (Status: ${response.status})`);
                    }
                }
                const data = await Promise.all(responses.map(res => res.json()));
                
                // Gabungkan semua ayat dari semua panggilan API menjadi satu array
                return data.flatMap(d => d.verses || []);
            } catch (error) {
                console.error("Kesalahan pada fetchVersesForTest:", error);
                showToast("Gagal menyambung ke server Al-Qur'an. Periksa koneksi internet Anda.", "error");
                return [];
            }
        }

        async function startTest(event) {
            event.preventDefault();
            const surahDari = testUI.surahSelectDari.value;
            const surahSampai = testUI.surahSelectSampai.value;
            const juzDari = testUI.juzSelectDari.value;
            const juzSampai = testUI.juzSelectSampai.value;
            const testType = testUI.testTypeSelect.value;
            // ▼▼▼ BARIS BARU: Ambil nilai jumlah soal ▼▼▼
            const totalQuestions = parseInt(testUI.questionCountSelect.value, 10);

            if ((!surahDari && !juzDari) || (!surahSampai && !juzSampai)) {
                showToast("Silakan pilih rentang surah atau juz terlebih dahulu.", "error");
                return;
            }

            if ((surahDari && parseInt(surahDari) > parseInt(surahSampai)) || (juzDari && parseInt(juzDari) > parseInt(juzSampai))) {
                showToast("Pilihan 'Dari' tidak boleh lebih besar dari 'Sampai'.", "error");
                return;
            }

            setButtonLoading(testUI.startBtn, true);

            try {
                const verses = await fetchVersesForTest({ surahDari, surahSampai, juzDari, juzSampai });
                if (!verses || verses.length === 0) {
                    showToast("Tidak ada ayat yang ditemukan untuk pilihan ini.", "error");
                    return;
                }

                // ▼▼▼ BARIS YANG DIUBAH: Gunakan variabel totalQuestions ▼▼▼
                const questions = generateQuestions(verses, testType, totalQuestions);
                
                if (questions.length === 0) {
                    return;
                }
                
                Object.assign(window.appState.currentTest, {
                    isActive: true,
                    questions: questions,
                    currentQuestionIndex: 0,
                    score: 0,
                    settings: { surahDari, surahSampai, juzDari, juzSampai, testType }
                });
                
                testUI.step2_scope_view.classList.add('hidden');
                testUI.progressView.classList.remove('hidden');
                displayCurrentQuestion();

            } catch (error) {
                console.error("Gagal memulai tes:", error);
                showToast(error.message || "Gagal memuat data tes. Periksa koneksi Anda.", "error");
            } finally {
                setButtonLoading(testUI.startBtn, false);
            }
        }

        // Fungsi untuk membuat pertanyaan (Ini adalah logika inti yang bisa sangat dikembangkan)
        function generateQuestions(verses, testType, totalQuestions = 10) {
            let questions = [];
            const surahNameList = [ { no: 1, nama: "Al-Fatihah", ayat: 7 }, { no: 2, nama: "Al-Baqarah", ayat: 286 }, { no: 3, nama: "Ali 'Imran", ayat: 200 }, { no: 4, nama: "An-Nisa'", ayat: 176 }, { no: 5, nama: "Al-Ma'idah", ayat: 120 }, { no: 6, nama: "Al-An'am", ayat: 165 }, { no: 7, nama: "Al-A'raf", ayat: 206 }, { no: 8, nama: "Al-Anfal", ayat: 75 }, { no: 9, nama: "At-Taubah", ayat: 129 }, { no: 10, nama: "Yunus", ayat: 109 }, { no: 11, nama: "Hud", ayat: 123 }, { no: 12, nama: "Yusuf", ayat: 111 }, { no: 13, nama: "Ar-Ra'd", ayat: 43 }, { no: 14, nama: "Ibrahim", ayat: 52 }, { no: 15, nama: "Al-Hijr", ayat: 99 }, { no: 16, nama: "An-Nahl", ayat: 128 }, { no: 17, nama: "Al-Isra'", ayat: 111 }, { no: 18, nama: "Al-Kahf", ayat: 110 }, { no: 19, nama: "Maryam", ayat: 98 }, { no: 20, nama: "Taha", ayat: 135 }, { no: 21, nama: "Al-Anbiya'", ayat: 112 }, { no: 22, nama: "Al-Hajj", ayat: 78 }, { no: 23, nama: "Al-Mu'minun", ayat: 118 }, { no: 24, nama: "An-Nur", ayat: 64 }, { no: 25, "nama": "Al-Furqan", ayat: 77 }, { no: 26, nama: "Asy-Syu'ara'", ayat: 227 }, { no: 27, nama: "An-Naml", ayat: 93 }, { no: 28, nama: "Al-Qasas", ayat: 88 }, { no: 29, nama: "Al-'Ankabut", ayat: 69 }, { no: 30, nama: "Ar-Rum", ayat: 60 }, { no: 31, nama: "Luqman", ayat: 34 }, { no: 32, nama: "As-Sajdah", ayat: 30 }, { no: 33, nama: "Al-Ahzab", ayat: 73 }, { no: 34, nama: "Saba'", ayat: 54 }, { no: 35, nama: "Fatir", ayat: 45 }, { no: 36, nama: "Yasin", ayat: 83 }, { no: 37, nama: "As-Saffat", ayat: 182 }, { no: 38, nama: "Sad", ayat: 88 }, { no: 39, nama: "Az-Zumar", ayat: 75 }, { no: 40, nama: "Ghafir", ayat: 85 }, { no: 41, nama: "Fussilat", ayat: 54 }, { no: 42, nama: "Asy-Syura", ayat: 53 }, { no: 43, nama: "Az-Zukhruf", ayat: 89 }, { no: 44, nama: "Ad-Dukhan", ayat: 59 }, { no: 45, nama: "Al-Jasiyah", ayat: 37 }, { no: 46, nama: "Al-Ahqaf", ayat: 35 }, { no: 47, nama: "Muhammad", ayat: 38 }, { no: 48, nama: "Al-Fath", ayat: 29 }, { no: 49, nama: "Al-Hujurat", ayat: 18 }, { no: 50, nama: "Qaf", ayat: 45 }, { no: 51, nama: "Az-Zariyat", ayat: 60 }, { no: 52, nama: "At-Tur", ayat: 49 }, { no: 53, nama: "An-Najm", ayat: 62 }, { no: 54, nama: "Al-Qamar", ayat: 55 }, { no: 55, nama: "Ar-Rahman", ayat: 78 }, { no: 56, nama: "Al-Waqi'ah", ayat: 96 }, { no: 57, nama: "Al-Hadid", ayat: 29 }, { no: 58, nama: "Al-Mujadalah", ayat: 22 }, { no: 59, nama: "Al-Hasyr", ayat: 24 }, { no: 60, nama: "Al-Mumtahanah", ayat: 13 }, { no: 61, nama: "As-Saff", ayat: 14 }, { no: 62, nama: "Al-Jumu'ah", ayat: 11 }, { no: 63, nama: "Al-Munafiqun", ayat: 11 }, { no: 64, nama: "At-Tagabun", ayat: 18 }, { no: 65, nama: "At-Talaq", ayat: 12 }, { no: 66, nama: "At-Tahrim", ayat: 12 }, { no: 67, nama: "Al-Mulk", ayat: 30 }, { no: 68, nama: "Al-Qalam", ayat: 52 }, { no: 69, nama: "Al-Haqqah", ayat: 52 }, { no: 70, nama: "Al-Ma'arij", ayat: 44 }, { no: 71, nama: "Nuh", ayat: 28 }, { no: 72, nama: "Al-Jinn", ayat: 28 }, { no: 73, nama: "Al-Muzzammil", ayat: 20 }, { no: 74, nama: "Al-Muddassir", ayat: 56 }, { no: 75, nama: "Al-Qiyamah", ayat: 40 }, { no: 76, nama: "Al-Insan", ayat: 31 }, { no: 77, nama: "Al-Mursalat", ayat: 50 }, { no: 78, nama: "An-Naba'", ayat: 40 }, { no: 79, nama: "An-Nazi'at", ayat: 46 }, { no: 80, nama: "'Abasa", ayat: 42 }, { no: 81, nama: "At-Takwir", ayat: 29 }, { no: 82, nama: "Al-Infitar", ayat: 19 }, { no: 83, nama: "Al-Mutaffifin", ayat: 36 }, { no: 84, nama: "Al-Insyiqaq", ayat: 25 }, { no: 85, nama: "Al-Buruj", ayat: 22 }, { no: 86, "nama": "At-Tariq", ayat: 17 }, { no: 87, nama: "Al-A'la", ayat: 19 }, { no: 88, nama: "Al-Gasyiyah", ayat: 26 }, { no: 89, nama: "Al-Fajr", ayat: 30 }, { no: 90, nama: "Al-Balad", ayat: 20 }, { no: 91, nama: "Asy-Syams", ayat: 15 }, { no: 92, nama: "Al-Lail", ayat: 21 }, { no: 93, nama: "Ad-Duha", ayat: 11 }, { no: 94, nama: "Asy-Syarh", ayat: 8 }, { no: 95, nama: "At-Tin", ayat: 8 }, { no: 96, nama: "Al-'Alaq", ayat: 19 }, { no: 97, nama: "Al-Qadr", ayat: 5 }, { no: 98, nama: "Al-Bayyinah", ayat: 8 }, { no: 99, nama: "Az-Zalzalah", ayat: 8 }, { no: 100, nama: "Al-'Adiyat", ayat: 11 }, { no: 101, nama: "Al-Qari'ah", ayat: 11 }, { no: 102, nama: "At-Takasur", ayat: 8 }, { no: 103, nama: "Al-'Asr", ayat: 3 }, { no: 104, nama: "Al-Humazah", ayat: 9 }, { no: 105, nama: "Al-Fil", ayat: 5 }, { no: 106, nama: "Quraisy", ayat: 4 }, { no: 107, nama: "Al-Ma'un", ayat: 7 }, { no: 108, nama: "Al-Kausar", ayat: 3 }, { no: 109, nama: "Al-Kafirun", ayat: 6 }, { no: 110, nama: "An-Nasr", ayat: 3 }, { no: 111, nama: "Al-Masad", ayat: 5 }, { no: 112, nama: "Al-Ikhlas", ayat: 4 }, { no: 113, nama: "Al-Falaq", ayat: 5 }, { no: 114, nama: "An-Nas", ayat: 6 } ];
            if (testType === 'continue-verse') {
            const possibleQuestionIndices = [];
            if (verses.length > 1) {
                for (let i = 0; i < verses.length - 1; i++) {
                    // Pastikan kedua ayat (soal dan jawaban) memiliki teks
                    if (verses[i].text_uthmani && verses[i+1].text_uthmani) {
                        possibleQuestionIndices.push(i);
                    }
                }
            }

            if (possibleQuestionIndices.length < 4) {
                showToast("Tidak cukup materi ayat berurutan di lingkup ini untuk membuat tes.", "info");
                return [];
            }

            if (possibleQuestionIndices.length < totalQuestions) {
                totalQuestions = possibleQuestionIndices.length;
            }

            // 2. Pilih beberapa indeks secara acak untuk dijadikan soal
            const selectedIndices = new Set();
            while(selectedIndices.size < totalQuestions) {
                const randomIndex = Math.floor(Math.random() * possibleQuestionIndices.length);
                selectedIndices.add(possibleQuestionIndices[randomIndex]);
            }

            for (const index of selectedIndices) {
                const questionVerse = verses[index];
                const correctAnswerVerse = verses[index + 1];

                const questionText = questionVerse.text_uthmani;
                const correctAnswerText = correctAnswerVerse.text_uthmani;
                
                // 3. Kumpulkan 3 ayat lain sebagai jawaban salah (pengecoh)
                let wrongAnswers = [];
                let otherVerseIndices = verses.map((_, i) => i).filter(i => i !== index && i !== (index + 1));

                // Acak indeks pengecoh
                for (let i = otherVerseIndices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [otherVerseIndices[i], otherVerseIndices[j]] = [otherVerseIndices[j], otherVerseIndices[i]];
                }
                
                for (const otherIndex of otherVerseIndices) {
                    if (wrongAnswers.length >= 3) break;
                    if (verses[otherIndex].text_uthmani) {
                        wrongAnswers.push(verses[otherIndex].text_uthmani);
                    }
                }

                questions.push({
                    type: 'continue-verse',
                    instruction: 'Lanjutkan ayat berikut ini:', // Ubah instruksi
                    question: questionText,                     // Soal: Ayat penuh
                    options: [correctAnswerText, ...wrongAnswers].sort(() => Math.random() - 0.5),
                    answer: correctAnswerText,                  // Jawaban: Ayat penuh berikutnya
                    isAnswered: false,
                    userAnswer: null,
                    isCorrect: null
                });
            }
            
            } else if (testType === 'previous-verse') {
                // ... (logika 'previous-verse' yang sudah ada, tidak perlu diubah)
                if (verses.length < 4) {
                    showToast("Tidak cukup materi ayat di lingkup ini untuk membuat tes.", "info");
                    return [];
                }
                
                const possibleQuestionIndices = [];
                for (let i = 1; i < verses.length; i++) {
                    possibleQuestionIndices.push(i);
                }

                if (possibleQuestionIndices.length < totalQuestions) {
                    totalQuestions = possibleQuestionIndices.length;
                }
                
                const questionIndices = new Set();
                while(questionIndices.size < totalQuestions) {
                    const randomIndex = Math.floor(Math.random() * possibleQuestionIndices.length);
                    questionIndices.add(possibleQuestionIndices[randomIndex]);
                }

                for (const index of questionIndices) {
                    const questionVerse = verses[index];
                    const correctVerse = verses[index - 1]; 

                    const questionText = questionVerse.text_uthmani;
                    const correctAnswerText = correctVerse.text_uthmani;
                    
                    let wrongAnswers = [];
                    let allOtherVerseIndices = verses.map((_, i) => i).filter(i => i !== index && i !== (index - 1));

                    for (let i = allOtherVerseIndices.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [allOtherVerseIndices[i], allOtherVerseIndices[j]] = [allOtherVerseIndices[j], allOtherVerseIndices[i]];
                    }
                    
                    for (const otherIndex of allOtherVerseIndices) {
                        if (wrongAnswers.length >= 3) break;
                        wrongAnswers.push(verses[otherIndex].text_uthmani);
                    }

                    questions.push({
                        type: 'previous-verse',
                        instruction: 'Sebutkan ayat SEBELUM ayat berikut:',
                        question: questionText,
                        options: [correctAnswerText, ...wrongAnswers].sort(() => Math.random() - 0.5),
                        answer: correctAnswerText,
                        isAnswered: false,
                        userAnswer: null,
                        isCorrect: null
                    });
                }
                } else if (testType === 'reorder-verses') {
                    // Proses setiap ayat untuk menggabungkan tanda waqaf dan penanda akhir ayat
                    const suitableVerses = verses.map(v => {
                        if (!v.text_uthmani) return null;
                        let words = v.text_uthmani.split(' ');
                        
                        // Daftar tanda waqaf yang sering muncul sendiri
                        const waqfSigns = ['صلى', 'قلى', 'ج', 'م', 'لا', 'ۛ'];

                        // 1. Menggabungkan penanda akhir ayat (misal: ﴿٥﴾) dengan kata sebelumnya
                        if (words.length > 1 && words[words.length - 1].includes('﴿')) {
                            words[words.length - 2] = words[words.length - 2] + ' ' + words[words.length - 1];
                            words.pop(); // Hapus elemen terakhir yang sudah digabung
                        }
                        
                        // 2. Iterasi dari belakang untuk menggabungkan tanda waqaf
                        for (let i = words.length - 1; i > 0; i--) {
                            // Bersihkan kata dari harakat sebelum dicek
                            const cleanedWord = words[i].trim().replace(/[\u064B-\u0652\u0670]/g, '');
                            
                            if (waqfSigns.includes(cleanedWord)) {
                                words[i - 1] = words[i - 1] + ' ' + words[i];
                                words.splice(i, 1); // Hapus elemen tanda waqaf yang sudah digabung
                            }
                        }
                        
                        return {
                            ...v,
                            processed_words: words,
                            word_count: words.length
                        };
                    }).filter(v => {
                        if (!v) return false;
                        // Filter ayat yang cocok untuk dijadikan soal (antara 4-20 kata)
                        return v.word_count >= 4 && v.word_count <= 20;
                    });

                    if (suitableVerses.length === 0) {
                        showToast("Tidak cukup materi ayat (4-20 kata) di lingkup ini untuk tes susun ulang.", "info");
                        return [];
                    }

                    if (suitableVerses.length < totalQuestions) {
                        totalQuestions = suitableVerses.length;
                    }

                    const questionVerseIndices = new Set();
                    while(questionVerseIndices.size < totalQuestions && questionVerseIndices.size < suitableVerses.length) {
                        questionVerseIndices.add(Math.floor(Math.random() * suitableVerses.length));
                    }

                    for (const index of questionVerseIndices) {
                        const verse = suitableVerses[index];
                        const correctWords = verse.processed_words;
                        
                        const shuffledWords = [...correctWords].sort(() => Math.random() - 0.5);

                        const [surahNo, ayatNo] = verse.verse_key.split(':');
                        const surahInfo = surahNameList.find(s => s.no == surahNo);
                        const questionContext = `(QS. ${surahInfo ? surahInfo.nama : surahNo}:${ayatNo})`;

                        questions.push({
                            type: 'reorder-verses',
                            instruction: 'Susun ulang potongan kata berikut menjadi ayat yang benar:',
                            question: questionContext,
                            options: shuffledWords,
                            answer: correctWords.join(' '),
                            isAnswered: false,
                            userAnswer: null,
                            isCorrect: null
                        });
                    }
                    } else if (testType === 'guess-surah') {
                const surahsInScopeIds = new Set();
                verses.forEach(v => {
                    const [surahNo] = v.verse_key.split(':');
                    surahsInScopeIds.add(parseInt(surahNo, 10));
                });

                // 2. Buat daftar nama surah yang valid HANYA dari lingkup tersebut
                const surahsInScope = surahNameList.filter(s => surahsInScopeIds.has(s.no));

                // 3. Lakukan pengecekan: Jika surah unik kurang dari 2, tes tidak bisa dibuat
                if (surahsInScope.length < 2) {
                    showToast("Lingkup yang dipilih terlalu sempit untuk membuat soal tebak surah (minimal harus ada 2 surah).", "info");
                    return [];
                }
                
                // Pastikan ada cukup ayat untuk dijadikan soal
                if (verses.length < 4) {
                    showToast("Tidak cukup materi ayat di lingkup ini untuk membuat tes.", "info");
                    return [];
                }

                if (verses.length < totalQuestions) {
                    totalQuestions = verses.length;
                }

                const questionVerseIndices = new Set();
                while (questionVerseIndices.size < totalQuestions && questionVerseIndices.size < verses.length) {
                    questionVerseIndices.add(Math.floor(Math.random() * verses.length));
                }

                for (const index of questionVerseIndices) {
                    const verse = verses[index];
                    const [surahNo, ayatNo] = verse.verse_key.split(':');
                    
                    const correctSurahInfo = surahNameList.find(s => s.no == surahNo);
                    if (!correctSurahInfo) continue;
                    const correctAnswer = correctSurahInfo.nama;

                    // 4. Kumpulkan jawaban salah HANYA dari daftar 'surahsInScope'
                    let wrongAnswers = new Set();
                    // Loop akan berhenti jika sudah dapat 3 pengecoh ATAU jika semua surah lain sudah dipakai
                    while (wrongAnswers.size < 3 && wrongAnswers.size < (surahsInScope.length - 1)) {
                        // Ambil surah acak dari daftar lingkup yang valid
                        const randomSurah = surahsInScope[Math.floor(Math.random() * surahsInScope.length)];
                        
                        if (randomSurah.nama !== correctAnswer) {
                            wrongAnswers.add(randomSurah.nama);
                        }
                    }

                    questions.push({
                        type: 'guess-surah',
                        instruction: 'Ayat berikut terdapat dalam surah...',
                        question: verse.text_uthmani,
                        options: [correctAnswer, ...Array.from(wrongAnswers)].sort(() => Math.random() - 0.5),
                        answer: correctAnswer,
                        isAnswered: false,
                        userAnswer: null,
                        isCorrect: null
                    });
                }
                } else {
                    showToast(`Jenis tes yang dipilih belum tersedia.`, "info");
                    return [];
                }
                return questions;
            }

        // Fungsi untuk menampilkan pertanyaan saat ini
        function displayCurrentQuestion() {
            const test = window.appState.currentTest;
            if (!test.isActive || test.currentQuestionIndex >= test.questions.length) {
                endTest();
                return;
            }

            const q = test.questions[test.currentQuestionIndex];
            
            testUI.questionNumber.textContent = test.currentQuestionIndex + 1;
            testUI.totalQuestions.textContent = test.questions.length;
            testUI.currentScore.textContent = Math.round(test.score);
            testUI.questionInstruction.textContent = q.instruction;
            testUI.questionText.textContent = q.question;
            testUI.answerOptions.innerHTML = '';
            testUI.userAnswerArea.innerHTML = '';
            testUI.feedback.classList.add('hidden');
            testUI.checkReorderBtn.classList.add('hidden');

            // Atur status tombol navigasi
            testUI.previousQuestionBtn.disabled = (test.currentQuestionIndex === 0);
            testUI.nextQuestionBtn.disabled = (test.currentQuestionIndex === test.questions.length - 1);

            const renderOptions = (isAnswered) => {
                if (q.type === 'reorder-verses') {
                    testUI.answerOptions.className = 'flex flex-wrap justify-center gap-2';
                    testUI.userAnswerArea.classList.remove('hidden');
                    
                    const wordsToDisplay = isAnswered ? q.answer.split(' ') : q.options;
                    const targetContainer = isAnswered ? testUI.userAnswerArea : testUI.answerOptions;

                    wordsToDisplay.forEach(word => {
                        const element = document.createElement('button');
                        element.className = 'word-in-answer';
                        element.textContent = word;
                        element.dir = 'rtl';
                        element.disabled = isAnswered;
                        targetContainer.appendChild(element);
                    });

                } else {
                    testUI.answerOptions.className = 'space-y-3';
                    testUI.userAnswerArea.classList.add('hidden');

                    q.options.forEach(option => {
                        const button = document.createElement('button');
                        button.textContent = option;
                        button.disabled = isAnswered;

                        if (!isAnswered) {
                            button.onclick = () => checkAnswer(option, q.answer);
                        }
                        
                        if (q.type === 'guess-surah') {
                            button.className = 'btn btn-secondary w-full text-left';
                            button.dir = 'ltr';
                        } else {
                            button.className = 'btn btn-secondary w-full text-right font-lateef text-xl';
                            button.dir = 'rtl';
                        }

                        if (isAnswered) {
                            if (option === q.answer) {
                                button.classList.add('btn-success');
                            }
                            if (option === q.userAnswer && !q.isCorrect) {
                                button.classList.add('btn-danger');
                            }
                        }
                        testUI.answerOptions.appendChild(button);
                    });
                }
            };

            if (q.isAnswered) {
                testUI.feedback.textContent = q.isCorrect ? "Benar!" : "Kurang Tepat";
                testUI.feedback.className = `mt-4 text-center font-semibold ${q.isCorrect ? 'text-green-600' : 'text-red-600'}`;
                testUI.feedback.classList.remove('hidden');
                renderOptions(true);
            } else {
                renderOptions(false);
            }
        }
        function checkAnswer(selectedOption, correctAnswer) {
            const test = window.appState.currentTest;
            const q = test.questions[test.currentQuestionIndex];
            
            if (q.isAnswered) return; // Mencegah menjawab ulang

            const isCorrect = selectedOption === correctAnswer;
            
            q.isAnswered = true;
            q.userAnswer = selectedOption;
            q.isCorrect = isCorrect;

            // Hitung ulang skor dari awal agar akurat
            const pointsPerQuestion = 100 / test.questions.length;
            test.score = test.questions.reduce((total, question) => {
                return total + (question.isCorrect ? pointsPerQuestion : 0);
            }, 0);
            
            saveTestState(); // Simpan state setelah menjawab
            displayCurrentQuestion(); // Tampilkan ulang soal dalam mode "sudah dijawab"
        }
        function showNextQuestion() {
            const test = window.appState.currentTest;
            if (test.currentQuestionIndex < test.questions.length - 1) {
                test.currentQuestionIndex++;
                saveTestState(); // Simpan state setelah navigasi
                displayCurrentQuestion();
            }
        }
        function showPreviousQuestion() {
            const test = window.appState.currentTest;
            if (test.currentQuestionIndex > 0) {
                test.currentQuestionIndex--;
                saveTestState(); // Simpan state setelah navigasi
                displayCurrentQuestion();
            }
        }
        async function endTest() {
            const test = window.appState.currentTest;
            const finalRoundedScore = Math.round(test.score); // Bulatkan skor di awal

            testUI.progressView.classList.add('hidden');
            testUI.resultView.classList.remove('hidden');
            // ▼▼▼ BARIS DI BAWAH INI DIUBAH ▼▼▼
            testUI.finalScore.textContent = finalRoundedScore;

            if (test.studentIds.length > 0) {
                const savePromises = test.studentIds.map(studentId => {
                    let kualitas;
                    // Gunakan skor yang sudah dibulatkan untuk menentukan kualitas
                    if (finalRoundedScore >= 90) kualitas = 'sangat-lancar';
                    else if (finalRoundedScore >= 70) kualitas = 'lancar';
                    else if (finalRoundedScore >= 50) kualitas = 'cukup-lancar';
                    else if (finalRoundedScore >= 30) kualitas = 'tidak-lancar';
                    else kualitas = 'sangat-tidak-lancar';
                    
                    const { surahDari, surahSampai, juzDari, juzSampai, testType } = test.settings;
                    let materi = 'Materi Pilihan';
                    if (surahDari) {
                        const infoDari = surahList.find(s => s.no == surahDari)?.nama;
                        const infoSampai = surahList.find(s => s.no == surahSampai)?.nama;
                        materi = (surahDari === surahSampai) ? `Surah ${infoDari}` : `Surah ${infoDari} - ${infoSampai}`;
                    } else if (juzDari) {
                        materi = (juzDari === juzSampai) ? `Juz ${juzDari}` : `Juz ${juzDari} - ${juzSampai}`;
                    }

                    const newEntry = {
                        studentId: studentId,
                        jenis: 'tes', kualitas: kualitas,
                        surahNo: 0, ayatDari: 0, ayatSampai: 0,
                        // ▼▼▼ BARIS DI BAWAH INI DIUBAH ▼▼▼
                        catatan: `Skor: ${finalRoundedScore} dari ${test.questions.length} Soal | Materi: ${materi}`,
                        testType: testType, timestamp: Date.now(),
                        lembagaId: window.appState.lembagaId,
                        guruId: window.appState.currentUserUID
                    };
                    return onlineDB.add('hafalan', newEntry);
                });

                try {
                    await Promise.all(savePromises);
                    showToast(`Hasil tes berhasil disimpan.`, "success");
                } catch (error) {
                    console.error("Gagal menyimpan hasil tes:", error);
                    showToast("Gagal menyimpan sebagian atau semua hasil tes.", "error");
                }
            }
            window.appState.currentTest.isActive = false;
            sessionStorage.removeItem('activeTestState');
        }
        function restartTest() {
            testUI.resultView.classList.add('hidden');
            testUI.progressView.classList.add('hidden');
            testUI.step2_scope_view.classList.add('hidden');
            testUI.step1_type_view.classList.remove('hidden');

            // PERBAIKAN: Gunakan nama elemen yang benar untuk mereset dropdown
            testUI.surahSelectDari.value = '';
            testUI.surahSelectSampai.value = '';
            testUI.juzSelectDari.value = '';
            testUI.juzSelectSampai.value = '';
            
            // PERBAIKAN: Reset state siswa yang dipilih dan perbarui tampilan
            if (window.appState.currentTest.studentIds) {
                window.appState.currentTest.studentIds = [];
            }
            renderSelectedStudentsForTest();
            sessionStorage.removeItem('activeTestState');
        }
        function searchStudentsForTest() {
            const searchTerm = testUI.studentSearchInput.value.toLowerCase().trim();
            testUI.studentSearchResults.innerHTML = '';

            if (searchTerm.length < 2) {
                testUI.studentSearchResults.classList.add('hidden');
                return;
            }

            const selectedIds = window.appState.currentTest.studentIds;
            const matchingStudents = window.appState.allStudents
                .filter(s => 
                    !selectedIds.includes(s.id) && // <-- Tambahan: Sembunyikan yang sudah dipilih
                    s.name.toLowerCase().includes(searchTerm)
                )
                .slice(0, 10); // Batasi hasil hingga 10

            if (matchingStudents.length > 0) {
                matchingStudents.forEach(student => {
                    const studentClass = window.appState.allClasses.find(c => c.id === student.classId);
                    const item = document.createElement('div');
                    item.className = 'p-3 hover:bg-slate-100 cursor-pointer';
                    item.innerHTML = `<p class="font-medium">${student.name}</p><p class="text-sm text-slate-500">${studentClass ? studentClass.name : 'Tanpa Kelas'}</p>`;
                    item.dataset.studentId = student.id;
                    item.dataset.studentName = student.name;
                    testUI.studentSearchResults.appendChild(item);
                });
                testUI.studentSearchResults.classList.remove('hidden');
            } else {
                testUI.studentSearchResults.classList.add('hidden');
            }
        }
        function renderSelectedStudentsForTest() {
            testUI.selectedStudentsList.innerHTML = '';
            const selectedIds = window.appState.currentTest.studentIds;

            if (selectedIds.length === 0) return;

            selectedIds.forEach(studentId => {
                const student = window.appState.allStudents.find(s => s.id === studentId);
                if (student) {
                    const tag = document.createElement('div');
                    tag.className = 'flex items-center gap-2 bg-teal-100 text-teal-800 text-sm font-medium px-2.5 py-1 rounded-full';
                    tag.innerHTML = `
                        <span>${student.name}</span>
                        <button data-action="remove-student" data-id="${student.id}" class="text-teal-500 hover:text-teal-700">&times;</button>
                    `;
                    testUI.selectedStudentsList.appendChild(tag);
                }
            });
        }

        // Fungsi untuk MENAMBAH siswa ke daftar tes
        function addStudentToTest(studentId) {
            const { studentIds } = window.appState.currentTest;
            // Cek agar tidak ada duplikat
            if (!studentIds.includes(studentId)) {
                studentIds.push(studentId);
                renderSelectedStudentsForTest();
            }
            // Kosongkan input dan sembunyikan hasil pencarian
            testUI.studentSearchInput.value = '';
            testUI.studentSearchResults.classList.add('hidden');
        }

        // Fungsi untuk MENGHAPUS siswa dari daftar tes
        function removeStudentFromTest(studentId) {
            window.appState.currentTest.studentIds = window.appState.currentTest.studentIds.filter(id => id !== studentId);
            renderSelectedStudentsForTest();
        }
        // --- EVENT HANDLERS (CRUD) ---
        
        function getMutqinScores() {
            return window.appState.pengaturan.skorMutqin;
        }

        function getQuranScope() {
            return window.appState.pengaturan.lingkupHafalan;
        }

        async function saveMutqinScores(scores) {
            const currentUserUID = window.appState.currentUserUID;
            if (!currentUserUID) return showToast("Error: User tidak teridentifikasi.", "error");

            try {
                const snapshot = await db.collection('pengaturan')
                    .where('nama', '==', 'skorMutqin')
                    .where('userId', '==', currentUserUID)
                    .get();

                if (!snapshot.empty) {
                    const docId = snapshot.docs[0].id;
                    await db.collection('pengaturan').doc(docId).update({ scores });
                } else {
                    await db.collection('pengaturan').add({
                        nama: 'skorMutqin',
                        scores: scores,
                        userId: currentUserUID
                    });
                }
                showToast("Pengaturan skor pribadi berhasil disimpan.");
            } catch (e) { 
                console.error("Error saat menyimpan skor: ", e);
                showToast("Terjadi kesalahan saat menyimpan.", "error");
            }
        }

        async function saveQuranScope(scope) {
            const currentUserUID = window.appState.currentUserUID;
            if (!currentUserUID) return showToast("Error: User tidak teridentifikasi.", "error");

            try {
                const snapshot = await db.collection('pengaturan')
                    .where('nama', '==', 'lingkupHafalan')
                    .where('userId', '==', currentUserUID)
                    .get();

                if (!snapshot.empty) {
                    const docId = snapshot.docs[0].id;
                    await db.collection('pengaturan').doc(docId).update({ scope });
                } else {
                    await db.collection('pengaturan').add({
                        nama: 'lingkupHafalan',
                        scope: scope,
                        userId: currentUserUID
                    });
                }
                showToast("Pengaturan lingkup pribadi berhasil disimpan.");
            } catch(e) { 
                console.error("Error saat menyimpan lingkup: ", e);
                showToast("Terjadi kesalahan saat menyimpan.", "error");
            }
        }

        window.populateProfileForm = function() {
            const currentUserUID = window.appState.currentUserUID;
            const userProfile = window.appState.allUsers.find(u => u.id === currentUserUID);

            if (userProfile) {
                ui.profile.fullNameInput.value = userProfile.namaLengkap || '';
                ui.profile.pobInput.value = userProfile.ttl || '';
                if (userProfile.fotoProfilUrl) {
                    ui.profile.picturePreview.src = userProfile.fotoProfilUrl;
                } else {
                    ui.profile.picturePreview.src = 'https://placehold.co/128x128/e2e8f0/94a3b8?text=Foto';
                }
            }
        }

        window.populateSettingsForms = function() {
            // --- 1. Isi semua form dengan data yang ada ---
            const scores = getMutqinScores();
            document.getElementById('score-sangat-lancar').value = scores['sangat-lancar'];
            document.getElementById('score-lancar').value = scores['lancar'];
            document.getElementById('score-cukup-lancar').value = scores['cukup-lancar'];
            document.getElementById('score-tidak-lancar').value = scores['tidak-lancar'];
            document.getElementById('score-sangat-tidak-lancar').value = scores['sangat-tidak-lancar'];

            const quranScopeSelect = document.getElementById('quran-scope-setting');
            if (quranScopeSelect) {
                quranScopeSelect.value = getQuranScope();
            }

            // --- 2. Ambil referensi semua kartu pengaturan ---
            const lingkupCard = document.querySelector('.card:has(#quran-scope-form)'); // Cara lain menargetkan kartu
            const pinCard = ui.guruPinSettings.card;
            const mutqinCard = ui.mutqinSettings.card;

            // --- 3. Atur visibilitas kartu berdasarkan peran ---
            if (window.appState.loggedInRole === 'guru') {
                // Jika GURU, tampilkan semuanya
                if (lingkupCard) lingkupCard.classList.remove('hidden');
                if (pinCard) pinCard.classList.remove('hidden');
                if (mutqinCard) mutqinCard.classList.remove('hidden');

                // Isi form PIN khusus guru
                const currentUser = window.appState.allUsers.find(u => u.id === window.appState.currentUserUID);
                if (currentUser && currentUser.pin && ui.guruPinSettings.input) {
                    ui.guruPinSettings.input.value = currentUser.pin;
                }
            } else { // Jika SISWA
                // Tampilkan HANYA kartu lingkup hafalan
                if (lingkupCard) lingkupCard.classList.remove('hidden');

                // Sembunyikan kartu PIN dan Skor Mutqin
                if (pinCard) pinCard.classList.add('hidden');
                if (mutqinCard) mutqinCard.classList.add('hidden');
            }

            // Show PIN settings card and populate PIN for teachers
            if (window.appState.loggedInRole === 'guru') {
                if (ui.guruPinSettings.card) ui.guruPinSettings.card.classList.remove('hidden');
                const currentUser = window.appState.allUsers.find(u => u.id === window.appState.currentUserUID);
                if (currentUser && currentUser.pin && ui.guruPinSettings.input) {
                    ui.guruPinSettings.input.value = currentUser.pin;
                }
            } else {
                if (ui.guruPinSettings.card) ui.guruPinSettings.card.classList.add('hidden');
            }
        }
        
        async function initApp() {
                if (loadAndRestoreTestState()) {
        // Jika sesi dipulihkan, beberapa inisialisasi mungkin tidak diperlukan
        // atau perlu disesuaikan. Untuk sekarang, kita lanjutkan saja.
    }
            [ui.addClassBtn, ui.addStudentSubmitBtn, ui.import.importBtn, ui.import.downloadTemplateBtn, ui.profile.saveBtn, ui.pinModal.okBtn].forEach(btn => {
                if (btn) btn.dataset.originalContent = btn.innerHTML;
            });
            
            ui.addClassForm.addEventListener('submit', async e => { 
                e.preventDefault(); 
                const name = ui.classNameInput.value.trim(); 
                if (name) { 
                    setButtonLoading(ui.addClassBtn, true);
                    await onlineDB.add('classes', { name, lembagaId: window.appState.lembagaId }); 
                    ui.classNameInput.value = ''; 
                    showToast(`Kelas "${name}" berhasil dibuat.`);
                    setButtonLoading(ui.addClassBtn, false);
                } 
            });
            ui.classList.addEventListener('click', async (e) => {
                const button = e.target.closest('button');
                const classItem = e.target.closest('.class-item');
                if (!classItem) return;
                const classId = classItem.dataset.classId;

                if (button) {
                    const action = button.dataset.action;
                    switch(action) {
                        case 'view-students':
                            ui.studentFilterClass.value = classId;
                            showPage('siswa');
                            renderStudentList();
                            break;
                        case 'delete-class': {
                            const cls = window.appState.allClasses.find(c => c.id === classId);
                            showConfirmModal({
                                message: `Yakin ingin hapus kelas "${cls.name}"? SEMUA data siswa dan riwayat setoran di dalamnya akan terhapus permanen.`, 
                                onConfirm: async () => {
                                    const studentsInClass = window.appState.allStudents.filter(s => s.classId === classId);
                                    for (const student of studentsInClass) {
                                            const hafalanToDelete = window.appState.allHafalan.filter(h => h.studentId === student.id);
                                            for (const hafalan of hafalanToDelete) {
                                            await onlineDB.delete('hafalan', hafalan.id);
                                            }
                                        await onlineDB.delete('students', student.id);
                                    }
                                    await onlineDB.delete('classes', classId);
                                    showToast("Kelas berhasil dihapus.");
                                }
                            });
                            break;
                        }
                        case 'edit-class': {
                            classItem.querySelector('.class-display').classList.add('hidden');
                            classItem.querySelector('.class-edit-form').classList.remove('hidden');
                            classItem.querySelector('.class-edit-form input').focus();
                            break;
                        }
                        case 'cancel-edit': {
                            classItem.querySelector('.class-display').classList.remove('hidden');
                            classItem.querySelector('.class-edit-form').classList.add('hidden');
                            break;
                        }
                        case 'save-class': {
                            const input = classItem.querySelector('.class-edit-form input');
                            const newName = input.value.trim();
                            if (newName) {
                                await onlineDB.update('classes', { name: newName, id: classId });
                                showToast("Nama kelas diperbarui.");
                            }
                            classItem.querySelector('.class-display').classList.remove('hidden');
                            classItem.querySelector('.class-edit-form').classList.add('hidden');
                            break;
                        }
                    }
                }
            });
            ui.addStudentForm.addEventListener('submit', async e => { 
                e.preventDefault(); 
                const name = document.getElementById('new-student-name').value.trim(); 
                const classId = document.getElementById('new-student-class').value; 
                if (!name || !classId) return showToast('Nama siswa dan kelas harus diisi.', 'error');
                setButtonLoading(ui.addStudentSubmitBtn, true);
                await onlineDB.add('students', { name, classId, lembagaId: window.appState.lembagaId });
                ui.addStudentForm.reset(); 
                document.getElementById('add-student-modal').classList.add('hidden'); 
                    showToast("Siswa baru berhasil ditambahkan.");
                setButtonLoading(ui.addStudentSubmitBtn, false);
            });
            ui.studentFilterClass.addEventListener('change', () => {
                window.appState.currentPageSiswa = 1;
                renderStudentList();
            });
            if(ui.summary.rankFilterClass) ui.summary.rankFilterClass.addEventListener('change', () => {
                window.appState.currentPagePencapaian = 1;
                renderStudentProgressList();
            });
            if(ui.summary.searchStudent) ui.summary.searchStudent.addEventListener('input', () => {
                window.appState.currentPagePencapaian = 1;
                renderStudentProgressList();
            });
            if(ui.riwayat.filterClass) ui.riwayat.filterClass.addEventListener('change', () => {
                window.appState.currentPageRiwayat = 1;
                renderRiwayatList();
            });
            if(ui.riwayat.searchStudent) ui.riwayat.searchStudent.addEventListener('input', () => {
                window.appState.currentPageRiwayat = 1;
                renderRiwayatList();
            });
            if(ui.siswa && ui.siswa.searchStudent) {
                ui.siswa.searchStudent.addEventListener('input', () => {
                    window.appState.currentPageSiswa = 1; // Reset ke halaman pertama saat mencari
                    renderStudentList();
                });
            }
        if (ui.riwayat.list) {
            ui.riwayat.list.addEventListener('click', async (e) => {
                const deleteBtn = e.target.closest('[data-action="delete-riwayat"]');
                if (!deleteBtn) return;

                const hafalanId = deleteBtn.dataset.id;
                if (!hafalanId) return;

                showConfirmModal({
                    title: "Hapus Riwayat?",
                    message: "Apakah Anda yakin ingin menghapus data setoran ini secara permanen?",
                    okText: "Ya, Hapus",
                    onConfirm: async () => {
                        try {
                            await onlineDB.delete('hafalan', hafalanId);
                            showToast("Riwayat setoran berhasil dihapus.");
                            // Daftar akan diperbarui secara otomatis oleh listener real-time.
                        } catch (error) {
                            console.error("Gagal menghapus riwayat:", error);
                            showToast("Gagal menghapus data.", "error");
                        }
                    }
                });
            });
        }
            ui.import.downloadTemplateBtn.addEventListener('click', downloadTemplate);
            ui.import.importBtn.addEventListener('click', () => ui.import.fileInput.click());
            ui.import.fileInput.addEventListener('change', handleImport);

            ui.studentList.addEventListener('click', async e => {
                const studentItem = e.target.closest('.student-item');
                if (!studentItem) return;
                
                const studentId = studentItem.dataset.studentId;
                
                const header = e.target.closest('.student-header');
                if (header) {
                    const formContainer = studentItem.querySelector('.hafalan-form-container');
                    if (formContainer) {
                        formContainer.classList.toggle('hidden');
                    }
                }
                
                const deleteStudentBtn = e.target.closest('.delete-student-btn');
                if (deleteStudentBtn) {
                    e.stopPropagation();
                    const student = window.appState.allStudents.find(s => s.id === studentId);
                    showConfirmModal({
                        message: `Yakin hapus siswa "${student?.name}"? Semua riwayat setorannya juga akan terhapus.`,
                        onConfirm: async () => {
                            const hafalanToDelete = window.appState.allHafalan.filter(h => h.studentId === studentId);
                            for (const hafalan of hafalanToDelete) {
                                await onlineDB.delete('hafalan', hafalan.id);
                            }
                            await onlineDB.delete('students', studentId);
                            showToast("Siswa berhasil dihapus.");
                        }
                    });
                }

                // --- KODE BARU: Logika untuk hapus riwayat terbaru ---
                const deleteRiwayatBtn = e.target.closest('[data-action="delete-inline-riwayat"]');
                if (deleteRiwayatBtn) {
                    e.stopPropagation(); // Mencegah form tertutup saat tombol diklik
                    const hafalanId = deleteRiwayatBtn.dataset.id;
                    if (!hafalanId) return;

                    showConfirmModal({
                        title: "Hapus Riwayat?",
                        message: "Apakah Anda yakin ingin menghapus data setoran ini secara permanen?",
                        okText: "Ya, Hapus",
                        onConfirm: async () => {
                            try {
                                // Menyimpan ID siswa agar form tetap terbuka setelah data di-refresh
                                window.appState.lastSubmittedStudentId = studentId;
                                await onlineDB.delete('hafalan', hafalanId);
                                showToast("Riwayat setoran berhasil dihapus.");
                                // Tampilan akan diperbarui secara otomatis oleh listener database
                            } catch (error) {
                                console.error("Gagal menghapus riwayat:", error);
                                showToast("Gagal menghapus data.", "error");
                                window.appState.lastSubmittedStudentId = null; // Hapus jika gagal
                            }
                        }
                    });
                }
            });

            ui.studentList.addEventListener('change', e => {
                if (e.target.classList.contains('surah-select')) {
                    const quranScope = getQuranScope();
                    if (quranScope !== 'juz30') {
                        const form = e.target.closest('.hafalan-form');
                        const ayatDariSelect = form.querySelector('.ayat-dari-select');
                        const ayatSampaiSelect = form.querySelector('.ayat-sampai-select');
                        populateAyatDropdowns(e.target, ayatDariSelect, ayatSampaiSelect);
                    }
                }
            });

        ui.studentList.addEventListener('submit', async e => {
            e.preventDefault();
            if (!e.target.classList.contains('hafalan-form')) return;

            const form = e.target;
            const submitButton = form.querySelector('button[type="submit"]');
            setButtonLoading(submitButton, true);

            try {
                const formData = new FormData(form);
                const quranScope = getQuranScope();
                
                const surahSelect = form.querySelector('.surah-select');
                const selectedOption = surahSelect.options[surahSelect.selectedIndex];
                const maxAyat = parseInt(selectedOption.dataset.maxAyat);
                
                let ayatDari, ayatSampai;

                if (quranScope === 'juz30') {
                    ayatDari = 1;
                    ayatSampai = maxAyat;
                } else {
                    ayatDari = parseInt(formData.get('ayatDari'));
                    ayatSampai = parseInt(formData.get('ayatSampai'));
                    if (isNaN(ayatDari) || isNaN(ayatSampai)) throw new Error("Ayat harus berupa angka.");
                    if (ayatDari > ayatSampai) throw new Error("'Dari Ayat' tidak boleh lebih besar dari 'Sampai Ayat'.");
                    if (ayatSampai > maxAyat || ayatDari < 1) throw new Error(`Ayat tidak valid. Surah ini memiliki 1-${maxAyat} ayat.`);
                }
                
                const studentId = formData.get('studentId');
                const surahNo = parseInt(formData.get('surah'));

                // --- AWAL LOGIKA BARU ---
                // 1. Dapatkan semua riwayat Ziyadah siswa pada surah yang sama.
                const previousZiyadah = window.appState.allHafalan.filter(h => 
                    h.studentId === studentId && 
                    h.jenis === 'ziyadah' &&
                    h.surahNo === surahNo
                );

                // 2. Buat daftar (Set) ayat yang sudah pernah dihafal dari riwayat Ziyadah.
                const memorizedVerses = new Set();
                previousZiyadah.forEach(entry => {
                    for (let i = parseInt(entry.ayatDari); i <= parseInt(entry.ayatSampai); i++) {
                        memorizedVerses.add(i);
                    }
                });

                // 3. Cek apakah SEMUA ayat yang disetor kali ini sudah ada di daftar hafalan.
                let isAllRepeated = true;
                for (let i = ayatDari; i <= ayatSampai; i++) {
                    if (!memorizedVerses.has(i)) {
                        // Jika ditemukan satu saja ayat baru, maka ini adalah Ziyadah.
                        isAllRepeated = false;
                        break;
                    }
                }

                // 4. Tentukan jenis setorannya.
                const jenis = isAllRepeated ? 'murajaah' : 'ziyadah';
                // --- AKHIR LOGIKA BARU ---

                const newEntry = {
                    studentId: studentId,
                    jenis: jenis, // Menggunakan jenis yang sudah ditentukan secara otomatis
                    kualitas: formData.get('kualitas'),
                    surahNo: surahNo,
                    ayatDari,
                    ayatSampai,
                    catatan: '',
                    timestamp: Date.now(),
                    lembagaId: window.appState.lembagaId,
                    guruId: window.appState.currentUserUID // Default guruId
                };

                if (window.appState.loggedInRole === 'siswa') {
                    const enteredPin = formData.get('pin');
                    if (!enteredPin || !/^\d{6}$/.test(enteredPin)) {
                        throw new Error("PIN Guru harus diisi dengan 6 digit angka.");
                    }
                    const togglePinBtn = e.target.closest('.toggle-form-pin');
                    if (togglePinBtn) {
                        e.stopPropagation();
                        const container = togglePinBtn.closest('.relative');
                        const input = container.querySelector('input[name="pin"]');
                        const eyeIcon = container.querySelector('.eye-icon');
                        const eyeOffIcon = container.querySelector('.eye-off-icon');
                        
                        const isPassword = input.type === 'password';
                        input.type = isPassword ? 'text' : 'password';
                        eyeIcon.classList.toggle('hidden', isPassword);
                        eyeOffIcon.classList.toggle('hidden', !isPassword);
                    }
                    const teachers = window.appState.allUsers.filter(u => u.role === 'guru');
                    const verifyingTeacher = teachers.find(t => t.pin === enteredPin);

                    if (!verifyingTeacher) {
                        throw new Error("PIN Guru salah atau tidak ditemukan.");
                    }
                    newEntry.guruId = verifyingTeacher.id;
                }

                window.appState.lastSubmittedStudentId = newEntry.studentId;
                await onlineDB.add('hafalan', newEntry);
                showToast("Setoran berhasil disimpan!");

            } catch (error) {
                showToast(error.message, "error");
            } finally {
                setButtonLoading(submitButton, false);
            }
        });
            if (ui.profileSetupModal.form) {
                ui.profileSetupModal.form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const role = window.appState.loggedInRole;
                    const uid = window.appState.currentUserUID;
                    setButtonLoading(ui.profileSetupModal.submitBtn, true);

                    const updatedData = {
                        namaLengkap: ui.profileSetupModal.namaLengkapInput.value.trim(),
                        ttl: ui.profileSetupModal.ttlInput.value.trim()
                    };

                    if (role === 'guru') {
                        const pin = ui.profileSetupModal.pinInput.value;
                        if (!/^\d{6}$/.test(pin)) {
                            showToast("PIN harus terdiri dari 6 digit angka.", "error");
                            setButtonLoading(ui.profileSetupModal.submitBtn, false);
                            return;
                        }
                        updatedData.pin = pin;
                    }

                    try {
                        await db.collection('users').doc(uid).update(updatedData);
                        showToast("Profil berhasil disimpan.", "success");
                        ui.profileSetupModal.el.classList.add('hidden'); // Sembunyikan jika berhasil
                    } catch (error) {
                        console.error("Gagal update profil dari modal setup:", error);
                        showToast("Gagal menyimpan perubahan.", "error");
                    } finally {
                        setButtonLoading(ui.profileSetupModal.submitBtn, false);
                    }
                });
            }
            ui.settings.mutqinForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newScores = {
                    'sangat-lancar': parseInt(document.getElementById('score-sangat-lancar').value),
                    'lancar': parseInt(document.getElementById('score-lancar').value),
                    'cukup-lancar': parseInt(document.getElementById('score-cukup-lancar').value),
                    'tidak-lancar': parseInt(document.getElementById('score-tidak-lancar').value),
                    'sangat-tidak-lancar': parseInt(document.getElementById('score-sangat-tidak-lancar').value)
                };
                await saveMutqinScores(newScores);
            });

            if (ui.settings.quranScopeForm) {
                    ui.settings.quranScopeForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const newScope = ui.settings.quranScopeSelect.value;
                    await saveQuranScope(newScope);
                });
            }

            // --- Guru PIN Settings Form Listener ---
            if (ui.guruPinSettings.form) {
                ui.guruPinSettings.form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const pin = ui.guruPinSettings.input.value;
                    if (!/^\d{6}$/.test(pin)) {
                        showToast("PIN harus terdiri dari 6 digit angka.", "error");
                        return;
                    }
                    
                    const currentUserUID = window.appState.currentUserUID;
                    const saveButton = e.target.querySelector('button[type="submit"]');
                    setButtonLoading(saveButton, true);
                    try {
                        await db.collection('users').doc(currentUserUID).update({ pin: pin });
                        showToast("PIN berhasil disimpan.", "success");
                    } catch (error) {
                        console.error("Gagal simpan PIN:", error);
                        showToast("Gagal menyimpan PIN.", "error");
                    } finally {
                        setButtonLoading(saveButton, false);
                    }
                });
            }
            
            if (ui.profile.form) {
                ui.profile.form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const currentUserUID = window.appState.currentUserUID;
                    if (!currentUserUID) return showToast("Gagal menyimpan, user tidak ditemukan.", "error");

                    setButtonLoading(ui.profile.saveBtn, true);
                    const updatedData = {
                        namaLengkap: ui.profile.fullNameInput.value.trim(),
                        ttl: ui.profile.pobInput.value.trim(),
                    };

                    try {
                        await db.collection('users').doc(currentUserUID).update(updatedData);
                        showToast("Profil berhasil diperbarui.", "success");
                    } catch (error) {
                        console.error("Gagal update profil:", error);
                        showToast("Gagal menyimpan perubahan.", "error");
                    } finally {
                        setButtonLoading(ui.profile.saveBtn, false);
                    }
                });

                ui.profile.pictureInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { // Batas 2MB
                        showToast("Ukuran file terlalu besar. Maksimal 2MB.", "error");
                        return;
                    }

                    const currentUserUID = window.appState.currentUserUID;
                    const filePath = `profile_pictures/${currentUserUID}/${file.name}`;
                    const fileRef = storage.ref(filePath);
                    const uploadTask = fileRef.put(file);

                    uploadTask.on('state_changed', 
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            ui.profile.progressContainer.classList.remove('hidden');
                            ui.profile.progressBar.value = progress;
                        }, 
                        (error) => {
                            console.error("Upload failed:", error);
                            showToast("Gagal mengunggah foto.", "error");
                            ui.profile.progressContainer.classList.add('hidden');
                        }, 
                        async () => {
                            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                            await db.collection('users').doc(currentUserUID).update({
                                fotoProfilUrl: downloadURL
                            });
                            ui.profile.picturePreview.src = downloadURL;
                            ui.profile.progressContainer.classList.add('hidden');
                            showToast("Foto profil berhasil diperbarui.", "success");
                        }
                    );
                });
            }

            const settingsLogoutBtn = document.getElementById('settings-logout-btn');
            if (settingsLogoutBtn) {
                settingsLogoutBtn.addEventListener('click', handleLogout);
            }
            populateTestSelectors();
            testUI.nextStepBtn.addEventListener('click', () => {
                testUI.step1_type_view.classList.add('hidden');
                testUI.step2_scope_view.classList.remove('hidden');
            });

            testUI.backStepBtn.addEventListener('click', () => {
                testUI.step2_scope_view.classList.add('hidden');
                testUI.step1_type_view.classList.remove('hidden');
            });
            testUI.startBtn.addEventListener('click', startTest);
            testUI.nextQuestionBtn.addEventListener('click', showNextQuestion);
            testUI.previousQuestionBtn.addEventListener('click', showPreviousQuestion);
            testUI.endTestBtn.addEventListener('click', () => {
                showConfirmModal({
                    title: "Akhiri Tes?",
                    message: "Apakah Anda yakin ingin mengakhiri sesi tes ini? Progres saat ini akan disimpan jika ada siswa yang dipilih.",
                    okText: "Ya, Akhiri Tes",
                    onConfirm: () => {
                        endTest(); // Panggil fungsi endTest hanya jika dikonfirmasi
                    }
                });
            });
            testUI.restartTestBtn.addEventListener('click', restartTest);
            testUI.answerOptions.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    // Ubah style menjadi seperti teks biasa saat dipindahkan ke kotak jawaban
                    e.target.className = 'word-in-answer';
                    testUI.userAnswerArea.appendChild(e.target); // Pindahkan elemen

                    // Tampilkan tombol periksa jika semua kata sudah dipindahkan
                    if (testUI.answerOptions.children.length === 0) {
                        testUI.checkReorderBtn.classList.remove('hidden');
                    }
                }
            });
            testUI.userAnswerArea.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    // Kembalikan style menjadi tombol saat dikembalikan ke pilihan kata
                    e.target.className = 'btn btn-secondary font-scheherazade text-xl';
                    testUI.answerOptions.appendChild(e.target); // Kembalikan elemen

                    testUI.checkReorderBtn.classList.add('hidden'); // Sembunyikan lagi tombol periksa
                }
            });

            // Event handler untuk tombol "Periksa Jawaban"
            testUI.checkReorderBtn.addEventListener('click', () => {
                const test = window.appState.currentTest;
                const q = test.questions[test.currentQuestionIndex];

                const userAnswer = Array.from(testUI.userAnswerArea.children)
                    .map(btn => btn.textContent)
                    .join(' ');

                checkAnswer(userAnswer, q.answer);
                testUI.checkReorderBtn.classList.add('hidden');
            });
            testUI.studentSearchInput.addEventListener('input', searchStudentsForTest);
            testUI.studentSearchInput.addEventListener('focus', searchStudentsForTest); // Tampilkan juga saat fokus

            testUI.studentSearchResults.addEventListener('click', (e) => {
                const selectedItem = e.target.closest('div');
                if (selectedItem && selectedItem.dataset.studentId) {
                    // Panggil fungsi baru untuk MENAMBAH siswa
                    addStudentToTest(selectedItem.dataset.studentId);
                }
            });
            testUI.selectedStudentsList.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('button[data-action="remove-student"]');
                if (removeBtn) {
                    removeStudentFromTest(removeBtn.dataset.id);
                }
            });
            // Sembunyikan hasil pencarian jika klik di luar
            document.addEventListener('click', (e) => {
                if (!testUI.studentSearchContainer.contains(e.target)) {
                    testUI.studentSearchResults.classList.add('hidden');
                }
            });
            // Reset pilihan lain jika salah satu dipilih
            const handleSurahChange = (selectDari, selectSampai, otherDari, otherSampai) => {
                if (selectDari.value) {
                    otherDari.value = '';
                    otherSampai.value = '';
                    if (!selectSampai.value) {
                        selectSampai.value = selectDari.value;
                    }
                }
            };

            const handleJuzChange = (selectDari, selectSampai, otherDari, otherSampai) => {
                if (selectDari.value) {
                    otherDari.value = '';
                    otherSampai.value = '';
                    if (!selectSampai.value) {
                        selectSampai.value = selectDari.value;
                    }
                }
            };

            testUI.surahSelectDari.addEventListener('change', () => handleSurahChange(testUI.surahSelectDari, testUI.surahSelectSampai, testUI.juzSelectDari, testUI.juzSelectSampai));
            testUI.surahSelectSampai.addEventListener('change', () => handleSurahChange(testUI.surahSelectDari, testUI.surahSelectSampai, testUI.juzSelectDari, testUI.juzSelectSampai));
            testUI.juzSelectDari.addEventListener('change', () => handleJuzChange(testUI.juzSelectDari, testUI.juzSelectSampai, testUI.surahSelectDari, testUI.surahSelectSampai));
            testUI.juzSelectSampai.addEventListener('change', () => handleJuzChange(testUI.juzSelectDari, testUI.juzSelectSampai, testUI.surahSelectDari, testUI.surahSelectSampai));
            // --- Initial Data Load with Real-time Listeners ---
            try {
                const commonErrorHandler = (error, collectionName) => {
                    console.error(`Error listener '${collectionName}': `, error);
                    showToast(`Gagal memuat data dari ${collectionName}. Periksa izin.`, "error");
                };

                db.collection('classes').where('lembagaId', '==', lembagaId)
                    .onSnapshot(snapshot => {
                        window.appState.allClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        renderAll();
                    }, error => commonErrorHandler(error, 'classes'));

                db.collection('students').where('lembagaId', '==', lembagaId)
                    .onSnapshot(snapshot => {
                        window.appState.allStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        renderAll();
                    }, error => commonErrorHandler(error, 'students'));

                db.collection('hafalan').where('lembagaId', '==', lembagaId)
                    .onSnapshot(snapshot => {
                        window.appState.allHafalan = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        
                        const currentPageId = window.location.hash.substring(1);

                        // Jika pengguna sedang di halaman input hafalan ('siswa').
                        if (currentPageId === 'siswa') {
                            // Panggil renderStudentList() untuk me-refresh daftar siswa DAN riwayat terbarunya.
                            // Fungsi ini sudah dirancang untuk mengingat form mana yang sedang terbuka.
                            renderStudentList(); 
                            
                            // Tetap update halaman lain di latar belakang.
                            renderSummary();
                            renderStudentProgressList();
                            renderRiwayatList();
                        } else {
                            // Jika di halaman lain, aman untuk melakukan refresh total.
                            renderAll();
                        }
                    }, error => commonErrorHandler(error, 'hafalan'));

                db.collection('users').where('lembagaId', '==', lembagaId)
                    .onSnapshot(snapshot => {
                        window.appState.allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        renderAll();
                    }, error => commonErrorHandler(error, 'users'));
                                db.collection('users').where('lembagaId', '==', lembagaId)
                    .onSnapshot(snapshot => {
                        window.appState.allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        checkUserProfileCompletion(); // <-- TAMBAHKAN BARIS INI
                        renderAll();
                    }, error => commonErrorHandler(error, 'users'));
                db.collection('pengaturan').where('userId', '==', currentUserUID)
                    .onSnapshot(snapshot => {
                        window.appState.pengaturan.skorMutqin = { 'sangat-lancar': 100, 'lancar': 90, 'cukup-lancar': 70, 'tidak-lancar': 50, 'sangat-tidak-lancar': 30 };
                        window.appState.pengaturan.lingkupHafalan = 'full';
                        if (snapshot.empty) {
                            console.log("Tidak ada pengaturan khusus untuk pengguna ini, menggunakan default.");
                        } else {
                            snapshot.docs.forEach(doc => {
                                const data = doc.data();
                                if (data.nama === 'skorMutqin') {
                                    window.appState.pengaturan.skorMutqin = data.scores;
                                } else if (data.nama === 'lingkupHafalan') {
                                    window.appState.pengaturan.lingkupHafalan = data.scope;
                                }
                            });
                        }
                        
                        renderAll(); 
                        
                        if (typeof window.populateSettingsForms === 'function') {
                            window.populateSettingsForms();
                        }
                    }, error => commonErrorHandler(error, 'pengaturan'));
                document.getElementById('loader').classList.add('hidden');
                showToast("Assalamu'alaikum!", "info");

            } catch(error) {
                console.error("DB Listener error:", error); 
                showToast("Gagal menyambungkan ke database real-time.", "error");
                document.getElementById('loader').classList.add('hidden');
            }
        }
        initApp();
    }
});
