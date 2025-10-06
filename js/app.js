// Global application state
window.appState = {
    allClasses: [],
    allStudents: [],
    allHafalan: [],
    allUsers: [], 
    quranData: [],
    pengaturan: { 
        skorMutqin: { 
            'sangat-lancar': 100, 'lancar': 90, 'cukup-lancar': 70, 
            'tidak-lancar': 50, 'sangat-tidak-lancar': 30
        },
        lingkupHafalan: 'full'
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
        toast.className = 'fixed bottom-5 right-5 text-white py-3 px-5 rounded-lg shadow-lg z-50'; // Reset
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
        }
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
        const siswaAllowedPages = ['profil', 'ringkasan', 'siswa', 'riwayat', 'quran', 'tentang'];

        if (role === 'siswa') {
            allMenuLinks.forEach(link => {
                if (siswaAllowedPages.includes(link.dataset.page)) {
                    link.classList.remove('hidden');
                } else {
                    link.classList.add('hidden');
                }
            });
        } else { // guru
            allMenuLinks.forEach(link => link.classList.remove('hidden'));
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
        const pageTitles = { profil: "Profil Saya", ringkasan: "Pencapaian", kelas: "Manajemen Kelas", quran: "Al-Qur'an", siswa: "Manajemen Siswa", riwayat: "Riwayat Setoran", tentang: "Tentang Aplikasi", pengaturan: "Pengaturan" };
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

        if (pageId === 'quran' && typeof window.loadQuranDigital === 'function') {
            window.loadQuranDigital();
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
        const siswaAllowedPages = ['profil', 'ringkasan', 'siswa', 'riwayat', 'quran', 'tentang', 'pengaturan'];
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
            const siswaAllowedPages = ['profil', 'ringkasan', 'siswa', 'riwayat', 'quran', 'tentang', 'pengaturan'];
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
        const quranSurahList = [{"number":1,"numberOfVerses":7,"name":{"short":"الفاتحة","long":"сُورَةُ ٱلْفَاتِحَةِ","transliteration":{"id":"Al-Fatihah"},"translation":{"id":"Pembukaan"}},"revelation":{"id":"Makkiyah"}},{"number":2,"numberOfVerses":286,"name":{"short":"البقرة","long":"сُورَةُ الْبَقَرَةِ","transliteration":{"id":"Al-Baqarah"},"translation":{"id":"Sapi Betina"}},"revelation":{"id":"Madaniyah"}},{"number":3,"numberOfVerses":200,"name":{"short":"اٰل عمران","long":"сُورَةُ اٰلِ عِمْرَانَ","transliteration":{"id":"Ali 'Imran"},"translation":{"id":"Keluarga Imran"}},"revelation":{"id":"Madaniyah"}},{"number":4,"numberOfVerses":176,"name":{"short":"النّساۤء","long":"сُورَةُ النِّسَاءِ","transliteration":{"id":"An-Nisa'"},"translation":{"id":"Perempuan"}},"revelation":{"id":"Madaniyah"}},{"number":5,"numberOfVerses":120,"name":{"short":"الماۤئدة","long":"сُورَةُ الْمَائِدَةِ","transliteration":{"id":"Al-Ma'idah"},"translation":{"id":"Hidangan"}},"revelation":{"id":"Madaniyah"}},{"number":6,"numberOfVerses":165,"name":{"short":"الانعام","long":"сُورَةُ الْأَنْعَامِ","transliteration":{"id":"Al-An'am"},"translation":{"id":"Binatang Ternak"}},"revelation":{"id":"Makkiyah"}},{"number":7,"numberOfVerses":206,"name":{"short":"الاعراف","long":"сُورَةُ الْأَعْرَافِ","transliteration":{"id":"Al-A'raf"},"translation":{"id":"Tempat Tertinggi"}},"revelation":{"id":"Makkiyah"}},{"number":8,"numberOfVerses":75,"name":{"short":"الانفال","long":"сُورَةُ الْأَنْفَالِ","transliteration":{"id":"Al-Anfal"},"translation":{"id":"Rampasan Perang"}},"revelation":{"id":"Madaniyah"}},{"number":9,"numberOfVerses":129,"name":{"short":"التوبة","long":"сُورَةُ التَّوْبَةِ","transliteration":{"id":"At-Taubah"},"translation":{"id":"Pengampunan"}},"revelation":{"id":"Madaniyah"}},{"number":10,"numberOfVerses":109,"name":{"short":"يونس","long":"сُورَةُ يُونُсَ","transliteration":{"id":"Yunus"},"translation":{"id":"Yunus"}},"revelation":{"id":"Makkiyah"}},{"number":11,"numberOfVerses":123,"name":{"short":"هود","long":"сُورَةُ هُودٍ","transliteration":{"id":"Hud"},"translation":{"id":"Hud"}},"revelation":{"id":"Makkiyah"}},{"number":12,"numberOfVerses":111,"name":{"short":"يوسف","long":"сُورَةُ يُوسُفَ","transliteration":{"id":"Yusuf"},"translation":{"id":"Yusuf"}},"revelation":{"id":"Makkiyah"}},{"number":13,"numberOfVerses":43,"name":{"short":"الرّعد","long":"сُورَةُ الرَّعْدِ","transliteration":{"id":"Ar-Ra'd"},"translation":{"id":"Guruh"}},"revelation":{"id":"Madaniyah"}},{"number":14,"numberOfVerses":52,"name":{"short":"اٰبراهيم","long":"сُورَةُ إِبْرَاهِيمَ","transliteration":{"id":"Ibrahim"},"translation":{"id":"Ibrahim"}},"revelation":{"id":"Makkiyah"}},{"number":15,"numberOfVerses":99,"name":{"short":"الحجر","long":"сُورَةُ الْحِجْرِ","transliteration":{"id":"Al-Hijr"},"translation":{"id":"Hijr"}},"revelation":{"id":"Makkiyah"}},{"number":16,"numberOfVerses":128,"name":{"short":"النحل","long":"сُورَةُ النَّحْلِ","transliteration":{"id":"An-Nahl"},"translation":{"id":"Lebah"}},"revelation":{"id":"Makkiyah"}},{"number":17,"numberOfVerses":111,"name":{"short":"الاسراۤء","long":"сُورَةُ الْإِسْرَاءِ","transliteration":{"id":"Al-Isra'"},"translation":{"id":"Perjalanan Malam"}},"revelation":{"id":"Makkiyah"}},{"number":18,"numberOfVerses":110,"name":{"short":"الكهف","long":"сُورَةُ الْكَهْفِ","transliteration":{"id":"Al-Kahf"},"translation":{"id":"Gua"}},"revelation":{"id":"Makkiyah"}},{"number":19,"numberOfVerses":98,"name":{"short":"مريم","long":"сُورَةُ مَرْيَمَ","transliteration":{"id":"Maryam"},"translation":{"id":"Maryam"}},"revelation":{"id":"Makkiyah"}},{"number":20,"numberOfVerses":135,"name":{"short":"طٰهٰ","long":"сُورَةُ طه","transliteration":{"id":"Taha"},"translation":{"id":"Taha"}},"revelation":{"id":"Makkiyah"}},{"number":21,"numberOfVerses":112,"name":{"short":"الانبياۤء","long":"сُورَةُ الْأَنْبِيَاءِ","transliteration":{"id":"Al-Anbiya'"},"translation":{"id":"Para Nabi"}},"revelation":{"id":"Makkiyah"}},{"number":22,"numberOfVerses":78,"name":{"short":"الحج","long":"сُورَةُ الْحَجِّ","transliteration":{"id":"Al-Hajj"},"translation":{"id":"Haji"}},"revelation":{"id":"Madaniyah"}},{"number":23,"numberOfVerses":118,"name":{"short":"المؤمنون","long":"сُورَةُ الْمُؤْمِنُونَ","transliteration":{"id":"Al-Mu'minun"},"translation":{"id":"Orang-Orang Mukmin"}},"revelation":{"id":"Makkiyah"}},{"number":24,"numberOfVerses":64,"name":{"short":"النّور","long":"сُورَةُ النُّورِ","transliteration":{"id":"An-Nur"},"translation":{"id":"Cahaya"}},"revelation":{"id":"Madaniyah"}},{"number":25,"numberOfVerses":77,"name":{"short":"الفرقان","long":"сُورَةُ الْفُرْقَانِ","transliteration":{"id":"Al-Furqan"},"translation":{"id":"Pembeda"}},"revelation":{"id":"Makkiyah"}},{"number":26,"numberOfVerses":227,"name":{"short":"الشعراۤء","long":"сُورَةُ الشُّعَرَاءِ","transliteration":{"id":"Asy-Syu'ara'"},"translation":{"id":"Para Penyair"}},"revelation":{"id":"Makkiyah"}},{"number":27,"numberOfVerses":93,"name":{"short":"النمل","long":"сُورَةُ النَّمْلِ","transliteration":{"id":"An-Naml"},"translation":{"id":"Semut"}},"revelation":{"id":"Makkiyah"}},{"number":28,"numberOfVerses":88,"name":{"short":"القصص","long":"сُورَةُ الْقَصَصِ","transliteration":{"id":"Al-Qasas"},"translation":{"id":"Kisah-Kisah"}},"revelation":{"id":"Makkiyah"}},{"number":29,"numberOfVerses":69,"name":{"short":"العنكبوت","long":"сُورَةُ الْعَنْكَبُوتِ","transliteration":{"id":"Al-'Ankabut"},"translation":{"id":"Laba-Laba"}},"revelation":{"id":"Makkiyah"}},{"number":30,"numberOfVerses":60,"name":{"short":"الرّوم","long":"сُورَةُ الرُّومِ","transliteration":{"id":"Ar-Rum"},"translation":{"id":"Bangsa Romawi"}},"revelation":{"id":"Makkiyah"}},{"number":31,"numberOfVerses":34,"name":{"short":"لقمٰن","long":"сُورَةُ لُقْمَانَ","transliteration":{"id":"Luqman"},"translation":{"id":"Luqman"}},"revelation":{"id":"Makkiyah"}},{"number":32,"numberOfVerses":30,"name":{"short":"السّجدة","long":"сُورَةُ السَّجْدَةِ","transliteration":{"id":"As-Sajdah"},"translation":{"id":"Sujud"}},"revelation":{"id":"Makkiyah"}},{"number":33,"numberOfVerses":73,"name":{"short":"الاحزاب","long":"сُورَةُ الْأَحْزَابِ","transliteration":{"id":"Al-Ahzab"},"translation":{"id":"Golongan-Golongan yang Bersekutu"}},"revelation":{"id":"Madaniyah"}},{"number":34,"numberOfVerses":54,"name":{"short":"سبأ","long":"сُورَةُ سَبَأٍ","transliteration":{"id":"Saba'"},"translation":{"id":"Saba'"}},"revelation":{"id":"Makkiyah"}},{"number":35,"numberOfVerses":45,"name":{"short":"فاطر","long":"сُورَةُ فَاطِرٍ","transliteration":{"id":"Fatir"},"translation":{"id":"Pencipta"}},"revelation":{"id":"Makkiyah"}},{"number":36,"numberOfVerses":83,"name":{"short":"يٰسۤ","long":"сُورَةُ يٰسۤ","transliteration":{"id":"Yasin"},"translation":{"id":"Yasin"}},"revelation":{"id":"Makkiyah"}},{"number":37,"numberOfVerses":182,"name":{"short":"الصّٰۤفّٰت","long":"сُورَةُ الصَّافَّاتِ","transliteration":{"id":"As-Saffat"},"translation":{"id":"Barisan-Barisan"}},"revelation":{"id":"Makkiyah"}},{"number":38,"numberOfVerses":88,"name":{"short":"ص","long":"сُورَةُ ص","transliteration":{"id":"Sad"},"translation":{"id":"Sad"}},"revelation":{"id":"Makkiyah"}},{"number":39,"numberOfVerses":75,"name":{"short":"الزمر","long":"сُورَةُ الزُّمَرِ","transliteration":{"id":"Az-Zumar"},"translation":{"id":"Rombongan-Rombongan"}},"revelation":{"id":"Makkiyah"}},{"number":40,"numberOfVerses":85,"name":{"short":"غافر","long":"сُورَةُ غَافِرٍ","transliteration":{"id":"Ghafir"},"translation":{"id":"Maha Pengampun"}},"revelation":{"id":"Makkiyah"}},{"number":41,"numberOfVerses":54,"name":{"short":"فصّلت","long":"сُورَةُ فُصِّلَتْ","transliteration":{"id":"Fussilat"},"translation":{"id":"Yang Dijelaskan"}},"revelation":{"id":"Makkiyah"}},{"number":42,"numberOfVerses":53,"name":{"short":"الشورى","long":"сُورَةُ الشُّورَىٰ","transliteration":{"id":"Asy-Syura"},"translation":{"id":"Musyawarah"}},"revelation":{"id":"Makkiyah"}},{"number":43,"numberOfVerses":89,"name":{"short":"الزخرف","long":"сُورَةُ الزُّخْرُفِ","transliteration":{"id":"Az-Zukhruf"},"translation":{"id":"Perhiasan"}},"revelation":{"id":"Makkiyah"}},{"number":44,"numberOfVerses":59,"name":{"short":"الدخان","long":"сُورَةُ الدُّخَانِ","transliteration":{"id":"Ad-Dukhan"},"translation":{"id":"Kabut"}},"revelation":{"id":"Makkiyah"}},{"number":45,"numberOfVerses":37,"name":{"short":"الجاثية","long":"сُورَةُ الْجَاثِيَةِ","transliteration":{"id":"Al-Jasiyah"},"translation":{"id":"Berlutut"}},"revelation":{"id":"Makkiyah"}},{"number":46,"numberOfVerses":35,"name":{"short":"الاحقاف","long":"сُورَةُ الْأَحْقَافِ","transliteration":{"id":"Al-Ahqaf"},"translation":{"id":"Bukit Pasir"}},"revelation":{"id":"Makkiyah"}},{"number":47,"numberOfVerses":38,"name":{"short":"محمد","long":"сُورَةُ مُحَمَّدٍ","transliteration":{"id":"Muhammad"},"translation":{"id":"Muhammad"}},"revelation":{"id":"Madaniyah"}},{"number":48,"numberOfVerses":29,"name":{"short":"الفتح","long":"сُورَةُ الْﻓَﺘْﺢِ","transliteration":{"id":"Al-Fath"},"translation":{"id":"Kemenangan"}},"revelation":{"id":"Madaniyah"}},{"number":49,"numberOfVerses":18,"name":{"short":"الحجرٰت","long":"сُورَةُ الْحُجُرَاتِ","transliteration":{"id":"Al-Hujurat"},"translation":{"id":"Kamar-Kamar"}},"revelation":{"id":"Madaniyah"}},{"number":50,"numberOfVerses":45,"name":{"short":"ق","long":"сُورَةُ ق","transliteration":{"id":"Qaf"},"translation":{"id":"Qaf"}},"revelation":{"id":"Makkiyah"}},{"number":51,"numberOfVerses":60,"name":{"short":"الذّٰريٰت","long":"сُورَةُ الذَّارِيَاتِ","transliteration":{"id":"Az-Zariyat"},"translation":{"id":"Angin yang Menerbangkan"}},"revelation":{"id":"Makkiyah"}},{"number":52,"numberOfVerses":49,"name":{"short":"الطور","long":"сُورَةُ الطُّورِ","transliteration":{"id":"At-Tur"},"translation":{"id":"Bukit"}},"revelation":{"id":"Makkiyah"}},{"number":53,"numberOfVerses":62,"name":{"short":"النجم","long":"сُورَةُ النَّجْمِ","transliteration":{"id":"An-Najm"},"translation":{"id":"Bintang"}},"revelation":{"id":"Makkiyah"}},{"number":54,"numberOfVerses":55,"name":{"short":"القمر","long":"сُورَةُ الْقَمَرِ","transliteration":{"id":"Al-Qamar"},"translation":{"id":"Bulan"}},"revelation":{"id":"Makkiyah"}},{"number":55,"numberOfVerses":78,"name":{"short":"الرحمن","long":"сُورَةُ الرَّحْمٰنِ","transliteration":{"id":"Ar-Rahman"},"translation":{"id":"Maha Pengasih"}},"revelation":{"id":"Madaniyah"}},{"number":56,"numberOfVerses":96,"name":{"short":"الواقعة","long":"сُورَةُ الْوَاقِعَةِ","transliteration":{"id":"Al-Waqi'ah"},"translation":{"id":"Hari Kiamat"}},"revelation":{"id":"Makkiyah"}},{"number":57,"numberOfVerses":29,"name":{"short":"الحديد","long":"сُورَةُ الْحَدِيدِ","transliteration":{"id":"Al-Hadid"},"translation":{"id":"Besi"}},"revelation":{"id":"Madaniyah"}},{"number":58,"numberOfVerses":22,"name":{"short":"المجادلة","long":"сُورَةُ الْمُجَادَلَةِ","transliteration":{"id":"Al-Mujadalah"},"translation":{"id":"Gugatan"}},"revelation":{"id":"Madaniyah"}},{"number":59,"numberOfVerses":24,"name":{"short":"الحشر","long":"сُورَةُ الْحَشْرِ","transliteration":{"id":"Al-Hasyr"},"translation":{"id":"Pengusiran"}},"revelation":{"id":"Madaniyah"}},{"number":60,"numberOfVerses":13,"name":{"short":"الممتحنة","long":"сُورَةُ الْمُمْتَحَنَةِ","transliteration":{"id":"Al-Mumtahanah"},"translation":{"id":"Wanita yang Diuji"}},"revelation":{"id":"Madaniyah"}},{"number":61,"numberOfVerses":14,"name":{"short":"الصّفّ","long":"сُورَةُ الصَّفِّ","transliteration":{"id":"As-Saff"},"translation":{"id":"Barisan"}},"revelation":{"id":"Madaniyah"}},{"number":62,"numberOfVerses":11,"name":{"short":"الجمعة","long":"сُورَةُ الْجُمُعَةِ","transliteration":{"id":"Al-Jumu'ah"},"translation":{"id":"Jumat"}},"revelation":{"id":"Madaniyah"}},{"number":63,"numberOfVerses":11,"name":{"short":"المنٰفقون","long":"сُورَةُ الْمُنَافِقُونَ","transliteration":{"id":"Al-Munafiqun"},"translation":{"id":"Orang-Orang Munafik"}},"revelation":{"id":"Madaniyah"}},{"number":64,"numberOfVerses":18,"name":{"short":"التغابن","long":"сُورَةُ التَّغَابُنِ","transliteration":{"id":"At-Tagabun"},"translation":{"id":"Pengungkapan Kesalahan"}},"revelation":{"id":"Madaniyah"}},{"number":65,"numberOfVerses":12,"name":{"short":"الطلاق","long":"сُورَةُ الطَّلَاقِ","transliteration":{"id":"At-Talaq"},"translation":{"id":"Talak"}},"revelation":{"id":"Madaniyah"}},{"number":66,"numberOfVerses":12,"name":{"short":"التحريم","long":"сُورَةُ التَّحْرِيمِ","transliteration":{"id":"At-Tahrim"},"translation":{"id":"Mengharamkan"}},"revelation":{"id":"Madaniyah"}},{"number":67,"numberOfVerses":30,"name":{"short":"الملك","long":"сُورَةُ الْمُلْكِ","transliteration":{"id":"Al-Mulk"},"translation":{"id":"Kerajaan"}},"revelation":{"id":"Makkiyah"}},{"number":68,"numberOfVerses":52,"name":{"short":"القلم","long":"сُورَةُ الْقَلَقِ","transliteration":{"id":"Al-Qalam"},"translation":{"id":"Pena"}},"revelation":{"id":"Makkiyah"}},{"number":69,"numberOfVerses":52,"name":{"short":"الحاۤقّة","long":"сُورَةُ الْحَاقَّةِ","transliteration":{"id":"Al-Haqqah"},"translation":{"id":"Hari Kiamat"}},"revelation":{"id":"Makkiyah"}},{"number":70,"numberOfVerses":44,"name":{"short":"المعارج","long":"сُورَةُ الْمَعَارِjِ","transliteration":{"id":"Al-Ma'arij"},"translation":{"id":"Tempat Naik"}},"revelation":{"id":"Makkiyah"}},{"number":71,"numberOfVerses":28,"name":{"short":"نوح","long":"сُورَةُ نُوحٍ","transliteration":{"id":"Nuh"},"translation":{"id":"Nuh"}},"revelation":{"id":"Makkiyah"}},{"number":72,"numberOfVerses":28,"name":{"short":"الجن","long":"сُورَةُ الْجِنِّ","transliteration":{"id":"Al-Jinn"},"translation":{"id":"Jin"}},"revelation":{"id":"Makkiyah"}},{"number":73,"numberOfVerses":20,"name":{"short":"المزّمّل","long":"сُورَةُ الْمُزَّمِّلِ","transliteration":{"id":"Al-Muzzammil"},"translation":{"id":"Orang yang Berselimut"}},"revelation":{"id":"Makkiyah"}},{"number":74,"numberOfVerses":56,"name":{"short":"المدّثّر","long":"сُورَةُ الْمُدَّثِّرِ","transliteration":{"id":"Al-Muddassir"},"translation":{"id":"Orang yang Berkemul"}},"revelation":{"id":"Makkiyah"}},{"number":75,"numberOfVerses":40,"name":{"short":"القيٰمة","long":"сُورَةُ الْقِيَامَةِ","transliteration":{"id":"Al-Qiyamah"},"translation":{"id":"Hari Kiamat"}},"revelation":{"id":"Makkiyah"}},{"number":76,"numberOfVerses":31,"name":{"short":"الانسان","long":"сُورَةُ الْإِنْسَانِ","transliteration":{"id":"Al-Insan"},"translation":{"id":"Manusia"}},"revelation":{"id":"Madaniyah"}},{"number":77,"numberOfVerses":50,"name":{"short":"المرسلٰت","long":"сُورَةُ الْمُرْسَلَاتِ","transliteration":{"id":"Al-Mursalat"},"translation":{"id":"Malaikat yang Diutus"}},"revelation":{"id":"Makkiyah"}},{"number":78,"numberOfVerses":40,"name":{"short":"النبأ","long":"сُورَةُ النَّبَأِ","transliteration":{"id":"An-Naba'"},"translation":{"id":"Berita Besar"}},"revelation":{"id":"Makkiyah"}},{"number":79,"numberOfVerses":46,"name":{"short":"النّٰزعٰت","long":"сُورَةُ النَّازِعَاتِ","transliteration":{"id":"An-Nazi'at"},"translation":{"id":"Malaikat yang Mencabut"}},"revelation":{"id":"Makkiyah"}},{"number":80,"numberOfVerses":42,"name":{"short":"عبس","long":"сُورَةُ عَبَسَ","transliteration":{"id":"'Abasa"},"translation":{"id":"Bermuka Masam"}},"revelation":{"id":"Makkiyah"}},{"number":81,"numberOfVerses":29,"name":{"short":"التكوير","long":"сُورَةُ التَّكْوِيرِ","transliteration":{"id":"At-Takwir"},"translation":{"id":"Menggulung"}},"revelation":{"id":"Makkiyah"}},{"number":82,"numberOfVerses":19,"name":{"short":"الانفطار","long":"сُورَةُ الْإِنْفِطَारِ","transliteration":{"id":"Al-Infitar"},"translation":{"id":"Terbelah"}},"revelation":{"id":"Makkiyah"}},{"number":83,"numberOfVerses":36,"name":{"short":"المطفّفين","long":"сُورَةُ الْمُطَفِّفِينَ","transliteration":{"id":"Al-Mutaffifin"},"translation":{"id":"Orang-Orang Curang"}},"revelation":{"id":"Makkiyah"}},{"number":84,"numberOfVerses":25,"name":{"short":"الانشقاق","long":"сُورَةُ الْإِنْشِقَاقِ","transliteration":{"id":"Al-Insyiqaq"},"translation":{"id":"Terbelah"}},"revelation":{"id":"Makkiyah"}},{"number":85,"numberOfVerses":22,"name":{"short":"البروج","long":"сُورَةُ الْبُرُوجِ","transliteration":{"id":"Al-Buruj"},"translation":{"id":"Gugusan Bintang"}},"revelation":{"id":"Makkiyah"}},{"number":86,"numberOfVerses":17,"name":{"short":"الطارق","long":"сُورَةُ الطَّارِقِ","transliteration":{"id":"At-Tariq"},"translation":{"id":"Yang Datang di Malam Hari"}},"revelation":{"id":"Makkiyah"}},{"number":87,"numberOfVerses":19,"name":{"short":"الاعلى","long":"сُورَةُ الْأَعْلَىٰ","transliteration":{"id":"Al-A'la"},"translation":{"id":"Maha Tinggi"}},"revelation":{"id":"Makkiyah"}},{"number":88,"numberOfVerses":26,"name":{"short":"الغاشية","long":"сُورَةُ الْغَاشِيَةِ","transliteration":{"id":"Al-Gasyiyah"},"translation":{"id":"Hari Kiamat"}},"revelation":{"id":"Makkiyah"}},{"number":89,"numberOfVerses":30,"name":{"short":"الفجر","long":"сُورَةُ الْفَجْرِ","transliteration":{"id":"Al-Fajr"},"translation":{"id":"Fajar"}},"revelation":{"id":"Makkiyah"}},{"number":90,"numberOfVerses":20,"name":{"short":"البلد","long":"сُورَةُ الْبَلَدِ","transliteration":{"id":"Al-Balad"},"translation":{"id":"Negeri"}},"revelation":{"id":"Makkiyah"}},{"number":91,"numberOfVerses":15,"name":{"short":"الشمس","long":"сُورَةُ الشَّمْسِ","transliteration":{"id":"Asy-Syams"},"translation":{"id":"Matahari"}},"revelation":{"id":"Makkiyah"}},{"number":92,"numberOfVerses":21,"name":{"short":"الّيل","long":"сُورَةُ اللَّيْلِ","transliteration":{"id":"Al-Lail"},"translation":{"id":"Malam"}},"revelation":{"id":"Makkiyah"}},{"number":93,"numberOfVerses":11,"name":{"short":"الضحى","long":"сُورَةُ الضُّحَىٰ","transliteration":{"id":"Ad-Duha"},"translation":{"id":"Duha"}},"revelation":{"id":"Makkiyah"}},{"number":94,"numberOfVerses":8,"name":{"short":"الشرح","long":"сُورَةُ الشَّרْحِ","transliteration":{"id":"Asy-Syarh"},"translation":{"id":"Lapang"}},"revelation":{"id":"Makkiyah"}},{"number":95,"numberOfVerses":8,"name":{"short":"التين","long":"сُورَةُ التِّينِ","transliteration":{"id":"At-Tin"},"translation":{"id":"Buah Tin"}},"revelation":{"id":"Makkiyah"}},{"number":96,"numberOfVerses":19,"name":{"short":"العلق","long":"сُورَةُ الْعَلَقِ","transliteration":{"id":"Al-'Alaq"},"translation":{"id":"Segumpal Darah"}},"revelation":{"id":"Makkiyah"}},{"number":97,"numberOfVerses":5,"name":{"short":"القدر","long":"сُورَةُ الْقَدْرِ","transliteration":{"id":"Al-Qadr"},"translation":{"id":"Kemuliaan"}},"revelation":{"id":"Makkiyah"}},{"number":98,"numberOfVerses":8,"name":{"short":"البيّنة","long":"сُورَةُ الْبَيِّنَةِ","transliteration":{"id":"Al-Bayyinah"},"translation":{"id":"Bukti Nyata"}},"revelation":{"id":"Madaniyah"}},{"number":99,"numberOfVerses":8,"name":{"short":"الزلزلة","long":"сُورَةُ الزَّلْзَلَةِ","transliteration":{"id":"Az-Zalzalah"},"translation":{"id":"Guncangan"}},"revelation":{"id":"Madaniyah"}},{"number":100,"numberOfVerses":11,"name":{"short":"العٰديٰت","long":"сُورَةُ الْعَادِيَاتِ","transliteration":{"id":"Al-'Adiyat"},"translation":{"id":"Kuda Perang"}},"revelation":{"id":"Makkiyah"}},{"number":101,"numberOfVerses":11,"name":{"short":"القارعة","long":"сُورَةُ الْقَارِعَةِ","transliteration":{"id":"Al-Qari'ah"},"translation":{"id":"Hari Kiamat"}},"revelation":{"id":"Makkiyah"}},{"number":102,"numberOfVerses":8,"name":{"short":"التكاثر","long":"сُورَةُ التَّكَاثُرِ","transliteration":{"id":"At-Takasur"},"translation":{"id":"Bermegah-Megahan"}},"revelation":{"id":"Makkiyah"}},{"number":103,"numberOfVerses":3,"name":{"short":"العصر","long":"сُورَةُ الْعَصْرِ","transliteration":{"id":"Al-'Asr"},"translation":{"id":"Asar"}},"revelation":{"id":"Makkiyah"}},{"number":104,"numberOfVerses":9,"name":{"short":"الهمزة","long":"сُورَةُ الْهُمَزَةِ","transliteration":{"id":"Al-Humazah"},"translation":{"id":"Pengumpat"}},"revelation":{"id":"Makkiyah"}},{"number":105,"numberOfVerses":5,"name":{"short":"الفيل","long":"сُورَةُ الْفِيلِ","transliteration":{"id":"Al-Fil"},"translation":{"id":"Gajah"}},"revelation":{"id":"Makkiyah"}},{"number":106,"numberOfVerses":4,"name":{"short":"قريش","long":"сُورَةُ قُرَيْشٍ","transliteration":{"id":"Quraisy"},"translation":{"id":"Suku Quraisy"}},"revelation":{"id":"Makkiyah"}},{"number":107,"numberOfVerses":7,"name":{"short":"الماعون","long":"сُورَةُ الْمَاعُونَ","transliteration":{"id":"Al-Ma'un"},"translation":{"id":"Bantuan"}},"revelation":{"id":"Makkiyah"}},{"number":108,"numberOfVerses":3,"name":{"short":"الكوثر","long":"сُورَةُ الْكَوْثَرِ","transliteration":{"id":"Al-Kausar"},"translation":{"id":"Pemberian yang Banyak"}},"revelation":{"id":"Makkiyah"}},{"number":109,"numberOfVerses":6,"name":{"short":"الكٰفرون","long":"сُورَةُ الْكَافِرُونَ","transliteration":{"id":"Al-Kafirun"},"translation":{"id":"Orang-Orang Kafir"}},"revelation":{"id":"Makkiyah"}},{"number":110,"numberOfVerses":3,"name":{"short":"النصر","long":"сُورَةُ النَّصْرِ","transliteration":{"id":"An-Nasr"},"translation":{"id":"Pertolongan"}},"revelation":{"id":"Madaniyah"}},{"number":111,"numberOfVerses":5,"name":{"short":"اللهب","long":"сُورَةُ اللَّهَبِ","transliteration":{"id":"Al-Lahab"},"translation":{"id":"Api yang Bergejolak"}},"revelation":{"id":"Makkiyah"}},{"number":112,"numberOfVerses":4,"name":{"short":"الاخلاص","long":"сُورَةُ الْإِخْلَاصِ","transliteration":{"id":"Al-Ikhlas"},"translation":{"id":"Ikhlas"}},"revelation":{"id":"Makkiyah"}},{"number":113,"numberOfVerses":5,"name":{"short":"الفلق","long":"сُورَةُ الْفَلَقِ","transliteration":{"id":"Al-Falaq"},"translation":{"id":"Subuh"}},"revelation":{"id":"Makkiyah"}},{"number":114,"numberOfVerses":6,"name":{"short":"الناس","long":"сُورَةُ النَّاسِ","transliteration":{"id":"An-Nas"},"translation":{"id":"Manusia"}},"revelation":{"id":"Makkiyah"}}];
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
            quran: {
                surahListContainer: document.getElementById('surah-list-container'),
                surahDetailContainer: document.getElementById('surah-detail-container'),
                surahSearch: document.getElementById('surah-search'),
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
        };
        Object.assign(ui, uiElements);


        function setButtonLoading(button, isLoading) {
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
        
        // --- QURAN READER FUNCTIONS ---
        window.loadQuranDigital = function() {
            if (window.appState.quranData.length === 0) {
                window.appState.quranData = quranSurahList; 
            }
            renderSurahList(window.appState.quranData);
        }

        function renderSurahList(surahs) {
            ui.quran.surahListContainer.innerHTML = '';
            if (!surahs || surahs.length === 0) {
                    ui.quran.surahListContainer.innerHTML = `<p class="text-center text-slate-500 p-4">Tidak ada data surah.</p>`;
                    return;
            }
            const fragment = document.createDocumentFragment();
            surahs.forEach(surah => {
                const item = document.createElement('div');
                item.className = 'p-3 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors';
                item.dataset.number = surah.number;
                item.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <span class="flex items-center justify-center w-8 h-8 text-xs font-bold bg-slate-100 rounded-full">${surah.number}</span>
                            <div>
                                <p class="font-semibold text-teal-700">${surah.name.transliteration.id}</p>
                                <p class="text-xs text-slate-500">${surah.revelation.id} - ${surah.numberOfVerses} Ayat</p>
                            </div>
                        </div>
                        <p class="font-semibold text-lg" style="font-family: 'Lateef', serif;">${surah.name.short}</p>
                    </div>
                `;
                item.addEventListener('click', () => {
                    loadSurahDetail(surah.number, null);
                });
                fragment.appendChild(item);
            });
            ui.quran.surahListContainer.appendChild(fragment);
        }
        
        async function loadSurahDetail(surahNumber, highlightVerseNumber = null) {
            const SURAH_DETAIL_CACHE_KEY = `surahDetailCache_${surahNumber}`;
            const cachedData = localStorage.getItem(SURAH_DETAIL_CACHE_KEY);

            const renderDetail = (surah) => {
                ui.quran.surahDetailContainer.innerHTML = `
                    <div class="border-b pb-4 mb-6">
                        <h2 class="text-3xl font-bold text-center text-teal-600 arabic-text" style="line-height: 1.5;">${surah.name.long}</h2>
                        <h3 class="text-2xl font-bold text-center text-slate-700">${surah.name.transliteration.id}</h3>
                        <p class="text-center text-sm text-slate-500 mt-1">${surah.name.translation.id} • ${surah.numberOfVerses} Ayat</p>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-2 my-4">
                        <div class="w-full sm:w-2/3">
                            <label for="quran-nav-surah" class="sr-only">Pilih Surah</label>
                            <select id="quran-nav-surah" class="form-select"></select>
                        </div>
                        <div class="w-full sm:w-1/3">
                            <label for="quran-nav-ayat" class="sr-only">Pilih Ayat</label>
                            <select id="quran-nav-ayat" class="form-select"></select>
                        </div>
                    </div>
                    <div class="space-y-8">${surah.verses.map(verse => `
                        <div id="verse-${surah.number}-${verse.number.inSurah}" class="flex flex-col rounded-lg">
                            <div class="flex justify-between items-center bg-slate-100 p-2 rounded-t-lg">
                                <span class="font-bold text-teal-700">${surah.number}:${verse.number.inSurah}</span>
                            </div>
                            <div class="p-4">
                                <p class="text-right arabic-text">${verse.text.arab}</p>
                                <p class="mt-4 text-slate-600">${verse.translation.id}</p>
                            </div>
                        </div>`).join('')}
                    </div>`;
                
                const surahNavSelect = document.getElementById('quran-nav-surah');
                const ayatNavSelect = document.getElementById('quran-nav-ayat');

                surahList.forEach(s => {
                    const option = new Option(`${s.no}. ${s.nama}`, s.no);
                    if (s.no == surah.number) option.selected = true;
                    surahNavSelect.add(option);
                });

                ayatNavSelect.add(new Option('Pilih Ayat', ''));
                for (let i = 1; i <= surah.numberOfVerses; i++) {
                    ayatNavSelect.add(new Option(`Ayat ${i}`, i));
                }
                
                surahNavSelect.addEventListener('change', (e) => {
                    loadSurahDetail(e.target.value);
                });

                ayatNavSelect.addEventListener('change', (e) => {
                    const verseEl = document.getElementById(`verse-${surah.number}-${e.target.value}`);
                    if (verseEl) {
                        verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });

                if (highlightVerseNumber) {
                    const verseElement = document.getElementById(`verse-${surah.number}-${highlightVerseNumber}`);
                    if (verseElement) {
                        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            verseElement.classList.add('verse-highlight');
                        setTimeout(() => {
                            verseElement.classList.remove('verse-highlight');
                        }, 2500);
                    }
                } else if (window.innerWidth < 768) {
                    ui.quran.surahDetailContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            };

            if (cachedData) {
                try {
                    renderDetail(JSON.parse(cachedData));
                } catch (e) {
                    localStorage.removeItem(SURAH_DETAIL_CACHE_KEY);
                }
            } else {
                ui.quran.surahDetailContainer.innerHTML = `<div class="text-center py-20"><p class="text-slate-500">Memuat surah...</p></div>`;
            }
            
            if (!navigator.onLine) {
                if (!cachedData) {
                    ui.quran.surahDetailContainer.innerHTML = `<div class="text-center py-20"><p class="text-red-500">Mode offline. Data surah ini belum tersimpan.</p></div>`;
                }
                return;
            }

            try {
                const response = await fetch(`https://api.quran.gading.dev/surah/${surahNumber}`);
                if(response.ok) {
                    const json = await response.json();
                    const surah = json.data;
                    renderDetail(surah);
                    if(!cachedData) {
                        localStorage.setItem(SURAH_DETAIL_CACHE_KEY, JSON.stringify(surah));
                    }
                } else if (!cachedData) {
                    ui.quran.surahDetailContainer.innerHTML = `<div class="text-center py-20"><p class="text-red-500">Gagal memuat surah.</p></div>`;
                }
            } catch(e) {
                    if (!cachedData) {
                        ui.quran.surahDetailContainer.innerHTML = `<div class="text-center py-20"><p class="text-red-500">Gagal memuat surah. Periksa koneksi.</p></div>`;
                }
            }
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
                const totalAyat = ziyadahEntries.reduce((sum, entry) => sum + (parseInt(entry.ayatSampai) - parseInt(entry.ayatDari) + 1), 0);
                const memorizedSurahs = new Set(ziyadahEntries.map(entry => entry.surahNo));
                const totalSurat = memorizedSurahs.size;
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
                return { name: student.name, className: studentClass ? studentClass.name : 'Tanpa Kelas', totalAyat, totalSurat, mutqinScore, trend: calculateTrend(last7DaysTotal, previous7DaysTotal) };
            });

            const totalMutqinKeseluruhan = studentScores.reduce((sum, student) => sum + student.mutqinScore, 0);

            if (totalMutqinKeseluruhan === 0) {
                studentScores.sort((a, b) => a.name.localeCompare(b.name));
            } else {
                studentScores.sort((a, b) => {
                    if (b.mutqinScore !== a.mutqinScore) {
                        return b.mutqinScore - a.mutqinScore;
                    }
                    if (b.totalAyat !== a.totalAyat) {
                        return b.totalAyat - a.totalAyat;
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
                            <div><p class="font-bold text-teal-600">${student.totalAyat}</p><p class="text-xs text-slate-500">Ayat</p></div>
                            <div><p class="font-bold text-teal-600">${student.totalSurat}</p><p class="text-xs text-slate-500">Surat</p></div>
                            <div><p class="font-bold text-teal-600">${student.mutqinScore}%</p><p class="text-xs text-slate-500">Mutqin</p></div>
                        </div>
                        ${renderStudentTrend(student.trend)}
                    </div>
                `;
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
            
            const userMap = new Map(window.appState.allUsers.map(u => [u.id, u.namaLengkap || u.email]));

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
            
            if (filteredHafalan.length === 0) {
                const message = filterClassId || searchTerm ? "Tidak ada riwayat yang cocok dengan filter." : "Belum ada riwayat setoran.";
                ui.riwayat.list.innerHTML = `<p class="text-center text-slate-500 py-8">${message}</p>`;
                document.getElementById('riwayat-pagination-controls').innerHTML = '';
                return;
            }

            const fragment = document.createDocumentFragment();
            const surahNameMap = new Map(surahList.map(s => [s.no, s.nama]));
            const classMap = new Map(window.appState.allClasses.map(c => [c.id, c.name]));
            const kualitasDisplayMap = {
                'sangat-lancar': 'Sangat Lancar', 'lancar': 'Lancar',
                'cukup-lancar': 'Cukup Lancar', 'tidak-lancar': 'Tidak Lancar',
                'sangat-tidak-lancar': 'Sangat Tdk Lancar'
            };

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
                            <span class="font-medium ${entry.jenis === 'ziyadah' ? 'text-teal-600' : 'text-sky-600'}">${entry.jenis === 'ziyadah' ? 'Ziyadah' : 'Muraja\'ah'}:</span>
                            <span>${surahName} ${entry.ayatDari}-${entry.ayatSampai}</span>
                            <span class="text-slate-400 mx-1">•</span>
                            <span>${kualitasText}</span>
                            ${guruNameHTML} 
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
            const SISWA_PER_PAGE = 36;
            const filterId = ui.studentFilterClass.value;
            const filteredStudents = filterId 
                ? window.appState.allStudents.filter(s => s.classId === filterId) 
                : [...window.appState.allStudents]; 

            filteredStudents.sort((a, b) => a.name.localeCompare(b.name));

            const currentPage = window.appState.currentPageSiswa;
            const startIndex = (currentPage - 1) * SISWA_PER_PAGE;
            const endIndex = startIndex + SISWA_PER_PAGE;
            const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

            ui.studentList.innerHTML = '';

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
            if(paginatedStudents.length === 0) {
                const message = filteredStudents.length > 0 
                    ? `<p class="text-center text-sm text-slate-400 p-4">Tidak ada siswa di halaman ini.</p>`
                    : `<p class="text-center text-sm text-slate-400 p-4">Tidak ada siswa di kelas ini.</p>`;
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

            paginatedStudents.forEach(student => {
                const studentHafalan = window.appState.allHafalan.filter(h => h.studentId === student.id);
                const hasSubmitted = studentHafalan.some(h => isToday(h.timestamp));

                const item = document.createElement('div');
                item.className = 'student-item bg-slate-50 rounded-lg';
                item.dataset.studentId = student.id;

                item.innerHTML = `
                    <div class="student-header flex items-center p-3 cursor-pointer hover:bg-slate-100 rounded-lg transition-colors">
                        <input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 pointer-events-none" ${hasSubmitted ? 'checked' : ''}>
                        <span class="font-medium ml-3 flex-grow">${student.name}</span>
                        <button data-action="delete-student" class="delete-student-btn text-red-400 hover:text-red-600 p-1 rounded-full ml-2 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                    <div class="hafalan-form-container hidden p-4 border-t border-slate-200">
                        <form class="hafalan-form space-y-4">
                            <input type="hidden" name="studentId" value="${student.id}">
                            <div><label class="block text-sm font-medium mb-1">Jenis Setoran</label><select name="jenis" class="form-select" required><option value="ziyadah">Ziyadah</option><option value="murajaah">Muraja'ah</option></select></div>
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
                            <button type="submit" class="btn btn-primary w-full">Simpan Setoran</button>
                        </form>
                    </div>
                `;
                ui.studentList.appendChild(item);

                if (!isJuzAmma) {
                    const surahSelect = item.querySelector('.surah-select');
                    const ayatDariSelect = item.querySelector('.ayat-dari-select');
                    const ayatSampaiSelect = item.querySelector('.ayat-sampai-select');
                    populateAyatDropdowns(surahSelect, ayatDariSelect, ayatSampaiSelect);
                }
            });

            renderSiswaPagination(filteredStudents.length);
                if (window.appState.lastSubmittedStudentId) {
                    const lastStudentItem = ui.studentList.querySelector(
                        `.student-item[data-student-id="${window.appState.lastSubmittedStudentId}"]`
                    );
                    if (lastStudentItem) {
                        const formContainer = lastStudentItem.querySelector('.hafalan-form-container');
                        if (formContainer) {
                            formContainer.classList.remove('hidden');
                        }
                    }
                    // Reset pengingat agar tidak berlaku untuk render selanjutnya
                    window.appState.lastSubmittedStudentId = null;
                }
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
            const scores = getMutqinScores();
            document.getElementById('score-sangat-lancar').value = scores['sangat-lancar'];
            document.getElementById('score-lancar').value = scores['lancar'];
            document.getElementById('score-cukup-lancar').value = scores['cukup-lancar'];
            document.getElementById('score-tidak-lancar').value = scores['tidak-lancar'];
            document.getElementById('score-sangat-tidak-lancar').value = scores['sangat-tidak-lancar'];

            if(ui.settings.quranScopeSelect) {
                ui.settings.quranScopeSelect.value = getQuranScope();
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
                
                const deleteBtn = e.target.closest('.delete-student-btn');
                if (deleteBtn) {
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
                if (e.target.classList.contains('hafalan-form')) {
                    const form = e.target;
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

                        if (isNaN(ayatDari) || isNaN(ayatSampai)) return showToast("Ayat harus berupa angka.", "error");
                        if (ayatDari > ayatSampai) return showToast("'Dari Ayat' tidak boleh lebih besar dari 'Sampai Ayat'.", "error");
                        if (ayatSampai > maxAyat || ayatDari < 1) return showToast(`Ayat tidak valid. Surah ini memiliki 1-${maxAyat} ayat.`, "error");
                    }
                    
                    const newEntry = {
                        studentId: formData.get('studentId'),
                        jenis: formData.get('jenis'),
                        kualitas: formData.get('kualitas'),
                        surahNo: parseInt(formData.get('surah')),
                        ayatDari,
                        ayatSampai,
                        catatan: '',
                        timestamp: Date.now(),
                        lembagaId: window.appState.lembagaId,
                        guruId: window.appState.currentUserUID // Default to current user
                    };

                    if (window.appState.loggedInRole === 'guru') {
                        window.appState.lastSubmittedStudentId = newEntry.studentId;
                        await onlineDB.add('hafalan', newEntry);
                        showToast("Setoran berhasil disimpan!");
                    } else { // Role is 'siswa'
                        window.appState.hafalanSubmissionData = newEntry; // Store data
                        ui.pinModal.el.classList.remove('hidden'); // Show PIN modal
                        ui.pinModal.input.focus();
                    }
                }
            });

            // --- PIN Modal Listeners ---
            if (ui.pinModal.form) {
                ui.pinModal.form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const enteredPin = ui.pinModal.input.value;
                    const submissionData = window.appState.hafalanSubmissionData;

                    if (!submissionData) {
                        showToast("Data setoran tidak ditemukan.", "error");
                        ui.pinModal.el.classList.add('hidden');
                        return;
                    }

                    const teachers = window.appState.allUsers.filter(u => u.role === 'guru');
                    const verifyingTeacher = teachers.find(t => t.pin === enteredPin);

                    if (verifyingTeacher) {
                        ui.pinModal.error.classList.add('hidden');
                        setButtonLoading(ui.pinModal.okBtn, true);

                        // Set the guruId to the teacher who verified
                        submissionData.guruId = verifyingTeacher.id; 
                        
                        try {
                            await onlineDB.add('hafalan', submissionData);
                            showToast("Setoran berhasil diverifikasi dan disimpan!");
                            
                            window.appState.lastSubmittedStudentId = submissionData.studentId;
                            
                            ui.pinModal.el.classList.add('hidden');
                            ui.pinModal.form.reset();
                            window.appState.hafalanSubmissionData = null;

                        } catch (error) {
                            console.error("Error saving after PIN verification:", error);
                            showToast("Gagal menyimpan data.", "error");
                        } finally {
                            setButtonLoading(ui.pinModal.okBtn, false);
                        }

                    } else {
                        ui.pinModal.error.textContent = "PIN salah. Coba lagi.";
                        ui.pinModal.error.classList.remove('hidden');
                        ui.pinModal.input.select();
                    }
                });
            }

            if (ui.pinModal.cancelBtn) {
                ui.pinModal.cancelBtn.addEventListener('click', () => {
                    ui.pinModal.el.classList.add('hidden');
                    ui.pinModal.form.reset();
                    ui.pinModal.error.classList.add('hidden');
                    window.appState.hafalanSubmissionData = null;
                });
            }


            if(ui.riwayat && ui.riwayat.list) {
                ui.riwayat.list.addEventListener('click', async e => {
                    const deleteBtn = e.target.closest('.delete-riwayat-btn');
                    if (deleteBtn) {
                        e.stopPropagation();
                        const entryId = deleteBtn.dataset.id;
                        showConfirmModal({
                            message: `Yakin ingin menghapus riwayat setoran ini? Tindakan ini tidak dapat dibatalkan.`,
                            onConfirm: async () => {
                                await onlineDB.delete('hafalan', entryId);
                                showToast("Riwayat setoran berhasil dihapus.");
                            }
                        });
                    }
                });
            }


            ui.quran.surahSearch.addEventListener('input', e => {
                const searchTerm = e.target.value.trim().toLowerCase();
                const allSurahs = window.appState.quranData;
                const verseMatch = searchTerm.match(/(.+)\s*[:\s]\s*(\d+)$/);

                if (verseMatch) {
                    const surahIdentifier = verseMatch[1].trim();
                    const verseNumber = parseInt(verseMatch[2], 10);
                    let targetSurah = null;
                    if (!isNaN(surahIdentifier)) {
                        targetSurah = allSurahs.find(s => s.number == surahIdentifier);
                    } else {
                        targetSurah = allSurahs.find(s => s.name.transliteration.id.toLowerCase().includes(surahIdentifier));
                    }

                    if (targetSurah) {
                        if (verseNumber > 0 && verseNumber <= targetSurah.numberOfVerses) {
                            loadSurahDetail(targetSurah.number, verseNumber);
                        } else {
                            showToast(`Ayat ${verseNumber} tidak ditemukan di surah ${targetSurah.name.transliteration.id}.`, 'error');
                        }
                    }
                } else {
                    const filtered = allSurahs.filter(s => s.name.transliteration.id.toLowerCase().includes(searchTerm));
                    renderSurahList(filtered);
                }
            });
            
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
                        renderAll();
                    }, error => commonErrorHandler(error, 'hafalan'));

                db.collection('users').where('lembagaId', '==', lembagaId)
                    .onSnapshot(snapshot => {
                        window.appState.allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
