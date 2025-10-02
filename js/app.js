// Global application state
window.appState = {
    allClasses: [],
    allStudents: [],
    allHafalan: [],
    quranData: [],
    pengaturan: { 
        skorMutqin: { 
            'sangat-lancar': 100, 'lancar': 90, 'cukup-lancar': 70, 
            'tidak-lancar': 50, 'sangat-tidak-lancar': 30
        },
        lingkupHafalan: 'full'
    },
    currentPageSiswa: 1,
    loggedInRole: null,
};

document.addEventListener('DOMContentLoaded', () => {
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
    window.showToast = showToast;

    try {
        const manifestJsonText = document.getElementById('manifest-json').textContent;
        const manifestBlob = new Blob([manifestJsonText], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(manifestBlob);
        const manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = manifestUrl;
        document.head.appendChild(manifestLink);

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
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

    // --- LOGIN & UI SETUP ---
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
    };

    const togglePasswordBtn = document.getElementById('toggle-password');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = ui.passwordInput.type === 'password';
            ui.passwordInput.type = isPassword ? 'text' : 'password';
            document.getElementById('eye-icon').classList.toggle('hidden', isPassword);
            document.getElementById('eye-off-icon').classList.toggle('hidden', !isPassword);
        });
    }

    // --- App Startup & Navigation ---
    const loggedInRole = sessionStorage.getItem('loggedInRole');
    if (loggedInRole) {
        window.appState.loggedInRole = loggedInRole;
        startApp(loggedInRole);
    }

    function handleLogout() {
        auth.signOut().then(() => {
            sessionStorage.removeItem('loggedInRole');
            window.location.reload();
        }).catch(error => {
            console.error("Logout Gagal:", error);
            window.location.reload();
        });
    }

    function setupUIForRole(role) {
        const siswaAllowedPages = new Set(['ringkasan', 'riwayat', 'quran', 'tentang', 'pengaturan']);
        ui.menuLinks.forEach(link => {
            const page = link.dataset.page;
            if (role === 'siswa' && !siswaAllowedPages.has(page)) {
                link.classList.add('hidden');
            } else {
                link.classList.remove('hidden');
            }
        });
        // Sembunyikan elemen khusus guru untuk siswa
        if (role === 'siswa') {
            document.getElementById('mutqin-card')?.classList.add('hidden');
        }
    }

    function _showPageImpl(pageId) {
        ui.iconMenuView.classList.add('hidden');
        ui.mainContentView.classList.remove('hidden');
        ui.pages.forEach(p => p.classList.add('hidden'));
        const pageElement = document.getElementById(`${pageId}-page`);
        if (pageElement) pageElement.classList.remove('hidden');
        
        const pageTitles = { ringkasan: "Pencapaian", kelas: "Manajemen Kelas", quran: "Al-Qur'an", siswa: "Manajemen Siswa", riwayat: "Riwayat Setoran", tentang: "Tentang Aplikasi", pengaturan: "Pengaturan" };
        ui.pageTitle.textContent = pageTitles[pageId] || "Dashboard";
        
        const headerActions = document.getElementById('header-actions');
        headerActions.innerHTML = '';
        headerActions.className = 'w-full sm:w-auto flex items-center justify-end gap-2';
        
        if (pageId === 'ringkasan' && window.appState.loggedInRole === 'guru') {
            headerActions.innerHTML = `<button id="export-data-btn" class="btn btn-primary w-full sm:w-auto"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Ekspor Hasil Siswa</span></button>`;
            document.getElementById('export-data-btn').addEventListener('click', window.exportAllData);
        }

        if (pageId === 'quran' && typeof window.loadQuranDigital === 'function') window.loadQuranDigital();
        if (pageId === 'pengaturan' && typeof window.populateSettingsForms === 'function') window.populateSettingsForms();
    }

    function _showIconMenuImpl() {
        ui.mainContentView.classList.add('hidden');
        ui.iconMenuView.classList.remove('hidden');
    }

    function showPage(pageId) {
        const role = window.appState.loggedInRole;
        const siswaAllowedPages = new Set(['ringkasan', 'riwayat', 'quran', 'tentang', 'pengaturan']);
        if (role === 'siswa' && !siswaAllowedPages.has(pageId)) {
            console.warn(`Akses ditolak untuk siswa ke halaman: ${pageId}`);
            return; 
        }
    
        const currentHash = window.location.hash.substring(1);
        if (currentHash !== pageId) {
            history.pushState({ page: pageId }, '', `#${pageId}`);
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

    ui.menuLinks.forEach(link => link.addEventListener('click', e => { e.preventDefault(); showPage(link.dataset.page); }));
    ui.homeBtn.addEventListener('click', e => { e.preventDefault(); history.pushState(null, '', '#'); _showIconMenuImpl(); });
    ui.addStudentModalBtn.addEventListener('click', () => ui.addStudentModal.classList.remove('hidden'));
    ui.cancelAddStudentBtn.addEventListener('click', () => ui.addStudentModal.classList.add('hidden'));

    function startApp(role) {
        ui.loginView.classList.add('hidden');
        ui.app.classList.remove('hidden');
        setupUIForRole(role);
        initializeAppLogic();
        const initialPage = window.location.hash.substring(1);
        const siswaAllowedPages = new Set(['ringkasan', 'riwayat', 'quran', 'tentang', 'pengaturan']);
        if (initialPage && document.getElementById(`${initialPage}-page`) && !(role === 'siswa' && !siswaAllowedPages.has(initialPage))) {
            history.replaceState({ page: initialPage }, '', `#${initialPage}`);
            _showPageImpl(initialPage);
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
            const userDoc = await db.collection('users').doc(user.uid).get();
    
            if (userDoc.exists) {
                const role = userDoc.data().role;
                if (role) {
                    sessionStorage.setItem('loggedInRole', role);
                    window.appState.loggedInRole = role;
                    ui.loginError.classList.add('hidden');
                    startApp(role);
                } else {
                    throw new Error("Peran pengguna tidak diatur.");
                }
            } else {
                throw new Error("Data pengguna tidak ditemukan.");
            }
        } catch (error) {
            let message = 'Terjadi kesalahan. Coba lagi.';
            if (error.code) {
                switch (error.code) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        message = 'Email atau password salah.'; break;
                    case 'auth/invalid-email':
                        message = 'Format email tidak valid.'; break;
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

    const onlineDB = {
        add: (collectionName, data) => db.collection(collectionName).add(data),
        getAll: async (collectionName) => {
            const snapshot = await db.collection(collectionName).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        delete: (collectionName, docId) => db.collection(collectionName).doc(docId).delete(),
        update: (collectionName, data) => {
            const { id, ...dataToUpdate } = data;
            return db.collection(collectionName).doc(id).update(dataToUpdate);
        },
    };

    window.exportAllData = function() {
        const { allStudents, allClasses, allHafalan } = window.appState;
        const filterSelect = document.getElementById('summary-rank-filter-class');
        const selectedClassId = filterSelect ? filterSelect.value : '';
        const studentsToExport = selectedClassId ? allStudents.filter(s => s.classId === selectedClassId) : [...allStudents];
        const surahNameList = [ { no: 1, nama: "Al-Fatihah", ayat: 7 }, { no: 2, nama: "Al-Baqarah", ayat: 286 }, { no: 3, nama: "Ali 'Imran", ayat: 200 }, { no: 4, nama: "An-Nisa'", ayat: 176 }, { no: 5, nama: "Al-Ma'idah", ayat: 120 }, { no: 6, nama: "Al-An'am", ayat: 165 }, { no: 7, nama: "Al-A'raf", ayat: 206 }, { no: 8, nama: "Al-Anfal", ayat: 75 }, { no: 9, nama: "At-Taubah", ayat: 129 }, { no: 10, nama: "Yunus", ayat: 109 }, { no: 11, nama: "Hud", ayat: 123 }, { no: 12, nama: "Yusuf", ayat: 111 }, { no: 13, nama: "Ar-Ra'd", ayat: 43 }, { no: 14, nama: "Ibrahim", ayat: 52 }, { no: 15, nama: "Al-Hijr", ayat: 99 }, { no: 16, nama: "An-Nahl", ayat: 128 }, { no: 17, nama: "Al-Isra'", ayat: 111 }, { no: 18, nama: "Al-Kahf", ayat: 110 }, { no: 19, nama: "Maryam", ayat: 98 }, { no: 20, nama: "Taha", ayat: 135 }, { no: 21, nama: "Al-Anbiya'", ayat: 112 }, { no: 22, nama: "Al-Hajj", ayat: 78 }, { no: 23, nama: "Al-Mu'minun", ayat: 118 }, { no: 24, nama: "An-Nur", ayat: 64 }, { no: 25, nama: "Al-Furqan", ayat: 77 }, { no: 26, nama: "Asy-Syu'ara'", ayat: 227 }, { no: 27, nama: "An-Naml", ayat: 93 }, { no: 28, nama: "Al-Qasas", ayat: 88 }, { no: 29, nama: "Al-'Ankabut", ayat: 69 }, { no: 30, nama: "Ar-Rum", ayat: 60 }, { no: 31, nama: "Luqman", ayat: 34 }, { no: 32, nama: "As-Sajdah", ayat: 30 }, { no: 33, nama: "Al-Ahzab", ayat: 73 }, { no: 34, nama: "Saba'", ayat: 54 }, { no: 35, nama: "Fatir", ayat: 45 }, { no: 36, nama: "Yasin", ayat: 83 }, { no: 37, nama: "As-Saffat", ayat: 182 }, { no: 38, nama: "Sad", ayat: 88 }, { no: 39, nama: "Az-Zumar", ayat: 75 }, { no: 40, nama: "Ghafir", ayat: 85 }, { no: 41, nama: "Fussilat", ayat: 54 }, { no: 42, nama: "Asy-Syura", ayat: 53 }, { no: 43, nama: "Az-Zukhruf", ayat: 89 }, { no: 44, nama: "Ad-Dukhan", ayat: 59 }, { no: 45, nama: "Al-Jasiyah", ayat: 37 }, { no: 46, nama: "Al-Ahqaf", ayat: 35 }, { no: 47, nama: "Muhammad", ayat: 38 }, { no: 48, nama: "Al-Fath", ayat: 29 }, { no: 49, nama: "Al-Hujurat", ayat: 18 }, { no: 50, nama: "Qaf", ayat: 45 }, { no: 51, nama: "Az-Zariyat", ayat: 60 }, { no: 52, nama: "At-Tur", ayat: 49 }, { no: 53, nama: "An-Najm", ayat: 62 }, { no: 54, nama: "Al-Qamar", ayat: 55 }, { no: 55, nama: "Ar-Rahman", ayat: 78 }, { no: 56, nama: "Al-Waqi'ah", ayat: 96 }, { no: 57, nama: "Al-Hadid", ayat: 29 }, { no: 58, nama: "Al-Mujadalah", ayat: 22 }, { no: 59, nama: "Al-Hasyr", ayat: 24 }, { no: 60, nama: "Al-Mumtahanah", ayat: 13 }, { no: 61, nama: "As-Saff", ayat: 14 }, { no: 62, nama: "Al-Jumu'ah", ayat: 11 }, { no: 63, nama: "Al-Munafiqun", ayat: 11 }, { no: 64, nama: "At-Tagabun", ayat: 18 }, { no: 65, nama: "At-Talaq", ayat: 12 }, { no: 66, nama: "At-Tahrim", ayat: 12 }, { no: 67, nama: "Al-Mulk", ayat: 30 }, { no: 68, nama: "Al-Qalam", ayat: 52 }, { no: 69, nama: "Al-Haqqah", ayat: 52 }, { no: 70, nama: "Al-Ma'arij", ayat: 44 }, { no: 71, nama: "Nuh", ayat: 28 }, { no: 72, nama: "Al-Jinn", ayat: 28 }, { no: 73, nama: "Al-Muzzammil", ayat: 20 }, { no: 74, nama: "Al-Muddassir", ayat: 56 }, { no: 75, nama: "Al-Qiyamah", ayat: 40 }, { no: 76, nama: "Al-Insan", ayat: 31 }, { no: 77, nama: "Al-Mursalat", ayat: 50 }, { no: 78, nama: "An-Naba'", ayat: 40 }, { no: 79, nama: "An-Nazi'at", ayat: 46 }, { no: 80, nama: "'Abasa", ayat: 42 }, { no: 81, nama: "At-Takwir", ayat: 29 }, { no: 82, nama: "Al-Infitar", ayat: 19 }, { no: 83, nama: "Al-Mutaffifin", ayat: 36 }, { no: 84, nama: "Al-Insyiqaq", ayat: 25 }, { no: 85, nama: "Al-Buruj", ayat: 22 }, { no: 86, "nama": "At-Tariq", ayat: 17 }, { no: 87, nama: "Al-A'la", ayat: 19 }, { no: 88, nama: "Al-Gasyiyah", ayat: 26 }, { no: 89, nama: "Al-Fajr", ayat: 30 }, { no: 90, nama: "Al-Balad", ayat: 20 }, { no: 91, nama: "Asy-Syams", ayat: 15 }, { no: 92, nama: "Al-Lail", ayat: 21 }, { no: 93, nama: "Ad-Duha", ayat: 11 }, { no: 94, nama: "Asy-Syarh", ayat: 8 }, { no: 95, nama: "At-Tin", ayat: 8 }, { no: 96, nama: "Al-'Alaq", ayat: 19 }, { no: 97, nama: "Al-Qadr", ayat: 5 }, { no: 98, nama: "Al-Bayyinah", ayat: 8 }, { no: 99, nama: "Az-Zalzalah", ayat: 8 }, { no: 100, nama: "Al-'Adiyat", ayat: 11 }, { no: 101, nama: "Al-Qari'ah", ayat: 11 }, { no: 102, nama: "At-Takasur", ayat: 8 }, { no: 103, nama: "Al-'Asr", ayat: 3 }, { no: 104, nama: "Al-Humazah", ayat: 9 }, { no: 105, nama: "Al-Fil", ayat: 5 }, { no: 106, nama: "Quraisy", ayat: 4 }, { no: 107, nama: "Al-Ma'un", ayat: 7 }, { no: 108, nama: "Al-Kausar", ayat: 3 }, { no: 109, nama: "Al-Kafirun", ayat: 6 }, { no: 110, nama: "An-Nasr", ayat: 3 }, { no: 111, nama: "Al-Masad", ayat: 5 }, { no: 112, nama: "Al-Ikhlas", ayat: 4 }, { no: 113, nama: "Al-Falaq", ayat: 5 }, { no: 114, nama: "An-Nas", ayat: 6 } ];
        const kualitasDisplayMap = { 'sangat-lancar': 'Sangat Lancar', 'lancar': 'Lancar', 'cukup-lancar': 'Cukup Lancar', 'tidak-lancar': 'Tidak Lancar', 'sangat-tidak-lancar': 'Sangat Tidak Lancar' };
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
                        dataForExport.push({
                            "No": isFirstRowForStudent ? studentNumber : "", "Nama": isFirstRowForStudent ? student.name : "", "Kelas": isFirstRowForStudent ? (studentClass ? studentClass.name : 'Tanpa Kelas') : "",
                            "Jenis Setoran": entry.jenis === 'ziyadah' ? 'Ziyadah' : "Muraja'ah", "Detail Hafalan": `${surahInfo ? surahInfo.nama : 'Surah ' + entry.surahNo} ${entry.ayatDari}-${entry.ayatSampai}`,
                            "Skor Mutqin": kualitasDisplayMap[entry.kualitas] || entry.kualitas, "Tanggal": new Date(entry.timestamp).toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'}),
                        });
                        isFirstRowForStudent = false;
                    });
                } else {
                    dataForExport.push({ "No": studentNumber, "Nama": student.name, "Kelas": studentClass ? studentClass.name : 'Tanpa Kelas', "Jenis Setoran": "-", "Detail Hafalan": "-", "Skor Mutqin": "-", "Tanggal": "-" });
                }
            });
            if (dataForExport.length === 0) return showToast("Tidak ada siswa untuk diekspor.", "info");
            const worksheet = XLSX.utils.json_to_sheet(dataForExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Hafalan");
            const date = new Date().toISOString().slice(0, 10);
            let fileName = `laporan_setoran_semua_${date}.xlsx`;
            if (selectedClassId) {
                const selectedClass = allClasses.find(c => c.id === selectedClassId);
                if (selectedClass) fileName = `laporan_setoran_${selectedClass.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${date}.xlsx`;
            }
            XLSX.writeFile(workbook, fileName);
            showToast("Data berhasil diekspor.", "success");
        } catch (error) {
            console.error("Export error:", error);
            showToast("Gagal mengekspor data.", "error");
        }
    }

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

    function initializeAppLogic() {
        const surahList = [ { no: 1, nama: "Al-Fatihah", ayat: 7 }, { no: 2, nama: "Al-Baqarah", ayat: 286 }, { no: 3, nama: "Ali 'Imran", ayat: 200 }, { no: 4, nama: "An-Nisa'", ayat: 176 }, { no: 5, nama: "Al-Ma'idah", ayat: 120 }, { no: 6, nama: "Al-An'am", ayat: 165 }, { no: 7, nama: "Al-A'raf", ayat: 206 }, { no: 8, nama: "Al-Anfal", ayat: 75 }, { no: 9, nama: "At-Taubah", ayat: 129 }, { no: 10, nama: "Yunus", ayat: 109 }, { no: 11, nama: "Hud", ayat: 123 }, { no: 12, nama: "Yusuf", ayat: 111 }, { no: 13, nama: "Ar-Ra'd", ayat: 43 }, { no: 14, nama: "Ibrahim", ayat: 52 }, { no: 15, nama: "Al-Hijr", ayat: 99 }, { no: 16, nama: "An-Nahl", ayat: 128 }, { no: 17, nama: "Al-Isra'", ayat: 111 }, { no: 18, nama: "Al-Kahf", ayat: 110 }, { no: 19, nama: "Maryam", ayat: 98 }, { no: 20, nama: "Taha", ayat: 135 }, { no: 21, nama: "Al-Anbiya'", ayat: 112 }, { no: 22, nama: "Al-Hajj", ayat: 78 }, { no: 23, nama: "Al-Mu'minun", ayat: 118 }, { no: 24, nama: "An-Nur", ayat: 64 }, { no: 25, nama: "Al-Furqan", ayat: 77 }, { no: 26, nama: "Asy-Syu'ara'", ayat: 227 }, { no: 27, nama: "An-Naml", ayat: 93 }, { no: 28, nama: "Al-Qasas", ayat: 88 }, { no: 29, nama: "Al-'Ankabut", ayat: 69 }, { no: 30, nama: "Ar-Rum", ayat: 60 }, { no: 31, nama: "Luqman", ayat: 34 }, { no: 32, nama: "As-Sajdah", ayat: 30 }, { no: 33, nama: "Al-Ahzab", ayat: 73 }, { no: 34, nama: "Saba'", ayat: 54 }, { no: 35, nama: "Fatir", ayat: 45 }, { no: 36, nama: "Yasin", ayat: 83 }, { no: 37, nama: "As-Saffat", ayat: 182 }, { no: 38, nama: "Sad", ayat: 88 }, { no: 39, nama: "Az-Zumar", ayat: 75 }, { no: 40, nama: "Ghafir", ayat: 85 }, { no: 41, nama: "Fussilat", ayat: 54 }, { no: 42, nama: "Asy-Syura", ayat: 53 }, { no: 43, nama: "Az-Zukhruf", ayat: 89 }, { no: 44, nama: "Ad-Dukhan", ayat: 59 }, { no: 45, nama: "Al-Jasiyah", ayat: 37 }, { no: 46, nama: "Al-Ahqaf", ayat: 35 }, { no: 47, nama: "Muhammad", ayat: 38 }, { no: 48, nama: "Al-Fath", ayat: 29 }, { no: 49, nama: "Al-Hujurat", ayat: 18 }, { no: 50, nama: "Qaf", ayat: 45 }, { no: 51, nama: "Az-Zariyat", ayat: 60 }, { no: 52, nama: "At-Tur", ayat: 49 }, { no: 53, nama: "An-Najm", ayat: 62 }, { no: 54, nama: "Al-Qamar", ayat: 55 }, { no: 55, nama: "Ar-Rahman", ayat: 78 }, { no: 56, nama: "Al-Waqi'ah", ayat: 96 }, { no: 57, nama: "Al-Hadid", ayat: 29 }, { no: 58, nama: "Al-Mujadalah", ayat: 22 }, { no: 59, nama: "Al-Hasyr", ayat: 24 }, { no: 60, nama: "Al-Mumtahanah", ayat: 13 }, { no: 61, nama: "As-Saff", ayat: 14 }, { no: 62, nama: "Al-Jumu'ah", ayat: 11 }, { no: 63, nama: "Al-Munafiqun", ayat: 11 }, { no: 64, nama: "At-Tagabun", ayat: 18 }, { no: 65, nama: "At-Talaq", ayat: 12 }, { no: 66, nama: "At-Tahrim", ayat: 12 }, { no: 67, nama: "Al-Mulk", ayat: 30 }, { no: 68, nama: "Al-Qalam", ayat: 52 }, { no: 69, nama: "Al-Haqqah", ayat: 52 }, { no: 70, nama: "Al-Ma'arij", ayat: 44 }, { no: 71, nama: "Nuh", ayat: 28 }, { no: 72, nama: "Al-Jinn", ayat: 28 }, { no: 73, nama: "Al-Muzzammil", ayat: 20 }, { no: 74, nama: "Al-Muddassir", ayat: 56 }, { no: 75, nama: "Al-Qiyamah", ayat: 40 }, { no: 76, nama: "Al-Insan", ayat: 31 }, { no: 77, nama: "Al-Mursalat", ayat: 50 }, { no: 78, nama: "An-Naba'", ayat: 40 }, { no: 79, nama: "An-Nazi'at", ayat: 46 }, { no: 80, nama: "'Abasa", ayat: 42 }, { no: 81, nama: "At-Takwir", ayat: 29 }, { no: 82, nama: "Al-Infitar", ayat: 19 }, { no: 83, nama: "Al-Mutaffifin", ayat: 36 }, { no: 84, nama: "Al-Insyiqaq", ayat: 25 }, { no: 85, nama: "Al-Buruj", ayat: 22 }, { no: 86, nama: "At-Tariq", ayat: 17 }, { no: 87, nama: "Al-A'la", ayat: 19 }, { no: 88, nama: "Al-Gasyiyah", ayat: 26 }, { no: 89, nama: "Al-Fajr", ayat: 30 }, { no: 90, nama: "Al-Balad", ayat: 20 }, { no: 91, nama: "Asy-Syams", ayat: 15 }, { no: 92, nama: "Al-Lail", ayat: 21 }, { no: 93, nama: "Ad-Duha", ayat: 11 }, { no: 94, nama: "Asy-Syarh", ayat: 8 }, { no: 95, nama: "At-Tin", ayat: 8 }, { no: 96, nama: "Al-'Alaq", ayat: 19 }, { no: 97, nama: "Al-Qadr", ayat: 5 }, { no: 98, nama: "Al-Bayyinah", ayat: 8 }, { no: 99, nama: "Az-Zalzalah", ayat: 8 }, { no: 100, nama: "Al-'Adiyat", ayat: 11 }, { no: 101, nama: "Al-Qari'ah", ayat: 11 }, { no: 102, nama: "At-Takasur", ayat: 8 }, { no: 103, nama: "Al-'Asr", ayat: 3 }, { no: 104, nama: "Al-Humazah", ayat: 9 }, { no: 105, nama: "Al-Fil", ayat: 5 }, { no: 106, nama: "Quraisy", ayat: 4 }, { no: 107, nama: "Al-Ma'un", ayat: 7 }, { no: 108, nama: "Al-Kausar", ayat: 3 }, { no: 109, nama: "Al-Kafirun", ayat: 6 }, { no: 110, nama: "An-Nasr", ayat: 3 }, { no: 111, nama: "Al-Masad", ayat: 5 }, { no: 112, nama: "Al-Ikhlas", ayat: 4 }, { no: 113, nama: "Al-Falaq", ayat: 5 }, { no: 114, nama: "An-Nas", ayat: 6 } ];
        const quranSurahList = [{"number":1,"numberOfVerses":7,"name":{"short":"الفاتحة","long":"сُورَةُ ٱلْفَاتِحَةِ","transliteration":{"id":"Al-Fatihah"},"translation":{"id":"Pembukaan"}},"revelation":{"id":"Makkiyah"}},{"number":2,"numberOfVerses":286,"name":{"short":"البقرة","long":"сُورَةُ الْبَقَرَةِ","transliteration":{"id":"Al-Baqarah"},"translation":{"id":"Sapi Betina"}},"revelation":{"id":"Madaniyah"}},{"number":3,"numberOfVerses":200,"name":{"short":"اٰل عمران","long":"сُورَةُ اٰلِ عِمْرَانَ","transliteration":{"id":"Ali 'Imran"},"translation":{"id":"Keluarga Imran"}},"revelation":{"id":"Madaniyah"}},{"number":4,"numberOfVerses":176,"name":{"short":"النّساۤء","long":"сُورَةُ النِّسَاءِ","transliteration":{"id":"An-Nisa'"},"translation":{"id":"Perempuan"}},"revelation":{"id":"Madaniyah"}},{"number":5,"numberOfVerses":120,"name":{"short":"الماۤئدة","long":"сُورَةُ الْمَائِدَةِ","transliteration":{"id":"Al-Ma'idah"},"translation":{"id":"Hidangan"}},"revelation":{"id":"Madaniyah"}},{"number":6,"numberOfVerses":165,"name":{"short":"الانعام","long":"сُورَةُ الْأَنْعَامِ","transliteration":{"id":"Al-An'am"},"translation":{"id":"Binatang Ternak"}},"revelation":{"id":"Makkiyah"}},{"number":7,"numberOfVerses":206,"name":{"short":"الاعراف","long":"сُورَةُ الْأَعْرَافِ","transliteration":{"id":"Al-A'raf"},"translation":{"id":"Tempat Tertinggi"}},"revelation":{"id":"Makkiyah"}},{"number":8,"numberOfVerses":75,"name":{"short":"الانفال","long":"сُورَةُ الْأَنْفَالِ","transliteration":{"id":"Al-Anfal"},"translation":{"id":"Rampasan Perang"}},"revelation":{"id":"Madaniyah"}},{"number":9,"numberOfVerses":129,"name":{"short":"التوبة","long":"сُورَةُ التَّوْبَةِ","transliteration":{"id":"At-Taubah"},"translation":{"id":"Pengampunan"}},"revelation":{"id":"Madaniyah"}},{"number":10,"numberOfVerses":109,"name":{"short":"يونس","long":"сُورَةُ يُونُсَ","transliteration":{"id":"Yunus"},"translation":{"id":"Yunus"}},"revelation":{"id":"Makkiyah"}},{"number":11,"numberOfVerses":123,"name":{"short":"هود","long":"сُورَةُ هُودٍ","transliteration":{"id":"Hud"},"translation":{"id":"Hud"}},"revelation":{"id":"Makkiyah"}},{"number":12,"numberOfVerses":111,"name":{"short":"يوسف","long":"сُورَةُ يُوسُفَ","transliteration":{"id":"Yusuf"},"translation":{"id":"Yusuf"}},"revelation":{"id":"Makkiyah"}},{"number":13,"numberOfVerses":43,"name":{"short":"الرّعد","long":"сُورَةُ الرَّعْدِ","transliteration":{"id":"Ar-Ra'd"},"translation":{"id":"Guruh"}},"revelation":{"id":"Madaniyah"}},{"number":14,"numberOfVerses":52,"name":{"short":"اٰبراهيم","long":"сُورَةُ إِبْرَاهِيمَ","transliteration":{"id":"Ibrahim"},"translation":{"id":"Ibrahim"}},"revelation":{"id":"Makkiyah"}},{"number":15,"numberOfVerses":99,"name":{"short":"الحجر","long":"сُورَةُ الْحِجْرِ","transliteration":{"id":"Al-Hijr"},"translation":{"id":"Hijr"}},"revelation":{"id":"Makkiyah"}},{"number":16,"numberOfVerses":128,"name":{"short":"النحل","long":"сُورَةُ النَّحْلِ","transliteration":{"id":"An-Nahl"},"translation":{"id":"Lebah"}},"revelation":{"id":"Makkiyah"}},{"number":17,"numberOfVerses":111,"name":{"short":"الاسراۤء","long":"сُورَةُ الْإِسْرَاءِ","transliteration":{"id":"Al-Isra'"},"translation":{"id":"Perjalanan Malam"}},"revelation":{"id":"Makkiyah"}},{"number":18,"numberOfVerses":110,"name":{"short":"الكهف","long":"сُورَةُ الْكَهْفِ","transliteration":{"id":"Al-Kahf"},"translation":{"id":"Gua"}},"revelation":{"id":"Makkiyah"}},{"number":19,"numberOfVerses":98,"name":{"short":"مريم","long":"сُورَةُ مَرْيَمَ","transliteration":{"id":"Maryam"},"translation":{"id":"Maryam"}},"revelation":{"id":"Makkiyah"}},{"number":20,"numberOfVerses":135,"name":{"short":"طٰهٰ","long":"сُورَةُ طه","transliteration":{"id":"Taha"},"translation":{"id":"Taha"}},"revelation":{"id":"Makkiyah"}},{"number":21,"numberOfVerses":112,"name":{"short":"الانبياۤء","long":"сُورَةُ الْأَنْبِيَاءِ","transliteration":{"id":"Al-Anbiya'"},"translation":{"id":"Para Nabi"}},"revelation":{"id":"Makkiyah"}},{"number":22,"numberOfVerses":78,"name":{"short":"الحج","long":"сُورَةُ الْحَجِّ","transliteration":{"id":"Al-Hajj"},"translation":{"id":"Haji"}},"revelation":{"id":"Madaniyah"}},{"number":23,"numberOfVerses":118,"name":{"short":"المؤمنون","long":"сُورَةُ الْمُؤْمِنُونَ","transliteration":{"id":"Al-Mu'minun"},"translation":{"id":"Orang-Orang Mukmin"}},"revelation":{"id":"Makkiyah"}},{"number":24,"numberOfVerses":64,"name":{"short":"النّور","long":"сُورَةُ النُّورِ","transliteration":{"id":"An-Nur"},"translation":{"id":"Cahaya"}},"revelation":{"id":"Madaniyah"}},{"number":25,"numberOfVerses":77,"name":{"short":"الفرقان","long":"сُورَةُ الْفُرْقَانِ","transliteration":{"id":"Al-Furqan"},"translation":{"id":"Pembeda"}},"revelation":{"id":"Makkiyah"}},{"number":26,"numberOfVerses":227,"name":{"short":"الشعراۤء","long":"сُورَةُ الشُّعَرَاءِ","transliteration":{"id":"Asy-Syu'ara'"},"translation":{"id":"Para Penyair"}},"revelation":{"id":"Makkiyah"}},{"number":27,"numberOfVerses":93,"name":{"short":"النمل","long":"сُورَةُ النَّمْلِ","transliteration":{"id":"An-Naml"},"translation":{"id":"Semut"}},"revelation":{"id":"Makkiyah"}},{"number":28,"numberOfVerses":88,"name":{"short":"القصص","long":"сُورَةُ الْقَصَصِ","transliteration":{"id":"Al-Qasas"},"translation":{"id":"Kisah-Kisah"}},"revelation":{"id":"Makkiyah"}},{"number":29,"numberOfVerses":69,"name":{"short":"العنكبوت","long":"сُورَةُ الْعَنْكَبُوتِ","transliteration":{"id":"Al-'Ankabut"},"translation":{"id":"Laba-Laba"}},"revelation":{"id":"Makkiyah"}},{"number":30,"numberOfVerses":60,"name":{"short":"الرّوم","long":"сُورَةُ الرُّومِ","transliteration":{"id":"Ar-Rum"},"translation":{"id":"Bangsa Romawi"}},"revelation":{"id":"Makkiyah"}},{"number":31,"numberOfVerses":34,"name":{"short":"لقمٰن","long":"сُورَةُ لُقْمَانَ","transliteration":{"id":"Luqman"},"translation":{"id":"Luqman"}},"revelation":{"id":"Makkiyah"}},{"number":32,"numberOfVerses":30,"name":{"short":"السّجدة","long":"сُورَةُ السَّجْدَةِ","transliteration":{"id":"As-Sajdah"},"translation":{"id":"Sujud"}},"revelation":{"id":"Makkiyah"}},{"number":33,"numberOfVerses":73,"name":{"short":"الاحزاب","long":"сُورَةُ الْأَحْزَابِ","transliteration":{"id":"Al-Ahzab"},"translation":{"id":"Golongan-Golongan yang Bersekutu"}},"revelation":{"id":"Madaniyah"}},{"number":34,"numberOfVerses":54,"name":{"short":"سبأ","long":"сُورَةُ سَبَأٍ","transliteration":{"id":"Saba'"},"translation":{"id":"Saba'"}},"revelation":{"id":"Makkiyah"}},{"number":35,"numberOfVerses":45,"name":{"short":"فاطر","long":"сُورَةُ فَاطِرٍ","transliteration":{"id":"Fatir"},"translation":{"id":"Pencipta"}},"revelation":{"id":"Makkiyah"}},{"number":36,"numberOfVerses":83,"name":{"short":"يٰسۤ","long":"сُورَةُ يٰسۤ","transliteration":{"id":"Yasin"},"translation":{"id":"Yasin"}},"revelation":{"id":"Makkiyah"}},{"number":37,"numberOfVerses":182,"name":{"short":"الصّٰۤفّٰت","long":"сُورَةُ الصَّافَّاتِ","transliteration":{"id":"As-Saffat"},"translation":{"id":"Barisan-Barisan"}},"revelation":{"id":"Makkiyah"}},{"number":38,"numberOfVerses":88,"name":{"short":"ص","long":"сُورَةُ ص","transliteration":{"id":"Sad"},"translation":{"id":"Sad"}},"revelation":{"id":"Makkiyah"}},{"number":39,"numberOfVerses":75,"name":{"short":"الزمر","long":"сُورَةُ الزُّمَرِ","transliteration":{"id":"Az-Zumar"},"translation":{"id":"Rombongan-Rombongan"}},"revelation":{"id":"Makkiyah"}},{"number":40,"numberOfVerses":85,"name":{"short":"غافر","long":"сُورَةُ غَافِرٍ","transliteration":{"id":"Ghafir"},"translation":{"id":"Maha Pengampun"}},"revelation":{"id":"Makkiyah"}},{"number":41,"numberOfVerses":54,"name":{"short":"فصّلت","long":"сُورَةُ فُصِّلَتْ","transliteration":{"id":"Fussilat"},"translation":{"id":"Yang Dijelaskan"}},"revelation":{"id":"Makkiyah"}},{"number":42,"numberOfVerses":53,"name":{"short":"الشورى","long":"сُورَةُ الشُّورَىٰ","transliteration":{"id":"Asy-Syura"},"translation":{"id":"Musyawarah"}},"revelation":{"id":"Makkiyah"}},{"number":43,"numberOfVerses":89,"name":{"short":"الزخرف","long":"сُورَةُ الزُّخْرُفِ","transliteration":{"id":"Az-Zukhruf"},"translation":{"id":"Perhiasan"}},"revelation":{"id":"Makkiyah"}},{"number":44,"numberOfVerses":59,"name":{"short":"الدخان","long":"сُورَةُ الدُّخَانِ","transliteration":{"id":"Ad-Dukhan"},"translation":{"id":"Kabut"}},"revelation":{"id":"Makkiyah"}},{"number":45,"numberOfVerses":37,"name":{"short":"الجاثية","long":"сُورَةُ الْجَاثِيَةِ","transliteration":{"id":"Al-Jasiyah"},"translation":{"id":"Berlutut"}},"revelation":{"id":"Makkiyah"}},{"number":46,"numberOfVerses":35,"name":{"short":"الاحقاف","long":"сُورَةُ الْأَحْقَافِ","transliteration":{"id":"Al-Ahqaf"},"translation":{"id":"Bukit Pasir"}},"revelation":{"id":"Makkiyah"}},{"number":47,"numberOfVerses":38,"name":{"short":"محمد","long":"сُورَةُ مُحَمَّدٍ","transliteration":{"id":"Muhammad"},"translation":{"id":"Muhammad"}},"revelation":{"id":"Madaniyah"}},{"number":48,"numberOfVerses":29,"name":{"short":"الفتح","long":"сُورَةُ الْفَتْحِ","transliteration":{"id":"Al-Fath"},"translation":{"id":"Kemenangan"}},"revelation":{"id":"Madaniyah"}},{"number":49,"numberOfVerses":18,"name":{"short":"الحجرٰت","long":"сُورَةُ الْحُجُرَاتِ","transliteration":{"id":"Al-Hujurat"},"translation":{"id":"Kamar-Kamar"}},"revelation":{"id":"Madaniyah"}},{"number":50,"numberOfVerses":45,"name":{"short":"ق","long":"сُورَةُ ق","transliteration":{"id":"Qaf"},"translation":{"id":"Qaf"}},"revelation":{"id":"Makkiyah"}},{"number":51,"numberOfVerses":60,"name":{"short":"الذّٰريٰت","long":"сُورَةُ الذَّارِيَاتِ","transliteration":{"id":"Az-Zariyat"},"translation":{"id":"Angin yang Menerbangkan"}},"revelation":{"id":"Makkiyah"}},{"number":52,"numberOfVerses":49,"name":{"short":"الطور","long":"сُورَةُ الطُّورِ","transliteration":{"id":"At-Tur"},"translation":{"id":"Bukit"}},"revelation":{"id":"Makkiyah"}},{"number":53,"numberOfVerses":62,"name":{"short":"النجم","long":"сُورَةُ النَّجْمِ","transliteration":{"id":"An-Najm"},"translation":{"id":"Bintang"}},"revelation":{"id":"Makkiyah"}},{"number":54,"numberOfVerses":55,"name":{"short":"القمر","long":"сُورَةُ الْقَمَرِ","transliteration":{"id":"Al-Qamar"},"translation":{"id":"Bulan"}},"revelation":{"id":"Makkiyah"}},{"number":55,"numberOfVerses":78,"name":{"short":"الرحمن","long":"сُورَةُ الرَّحْمٰنِ","transliteration":{"id":"Ar-Rahman"},"translation":{"id":"Maha Pengasih"}},"revelation":{"id":"Madaniyah"}},{"number":56,"numberOfVerses":96,"name":{"short":"الواقعة","long":"сُورَةُ الْوَاقِعَةِ","transliteration":{"id":"Al-Waqi'ah"},"translation":{"id":"Hari Kiamat"}},"revelation":{"id":"Makkiyah"}},{"number":57,"numberOfVerses":29,"name":{"short":"الحديد","long":"сُورَةُ الْحَدِيدِ","transliteration":{"id":"Al-Hadid"},"translation":{"id":"Besi"}},"revelation":{"id":"Madaniyah"}},{"number":58,"numberOfVerses":22,"name":{"short":"المجادلة","long":"сُورَةُ الْمُجَادَلَةِ","transliteration":{"id":"Al-Mujadalah"},"translation":{"id":"Gugatan"}},"revelation":{"id":"Madaniyah"}},{"number":59,"numberOfVerses":24,"name":{"short":"الحشر","long":"сُورَةُ الْحَشْرِ","transliteration":{"id":"Al-Hasyr"},"translation":{"id":"Pengusiran"}},"revelation":{"id":"Madaniyah"}},{"number":60,"numberOfVerses":13,"name":{"short":"الممتحنة","long":"сُورَةُ الْمُمْتَحَنَةِ","transliteration":{"id":"Al-Mumtahanah"},"translation":{"id":"Wanita yang Diuji"}},"revelation":{"id":"Madaniyah"}},{"number":61,"numberOfVerses":14,"name":{"short":"الصّفّ","long":"сُورَةُ الصَّفِّ","transliteration":{"id":"As-Saff"},"translation":{"id":"Barisan"}},"revelation":{"id":"Madaniyah"}},{"number":62,"numberOfVerses":11,"name":{"short":"الجمعة","long":"сُورَةُ الْجُمُعَةِ","transliteration":{"id":"Al-Jumu'ah"},"translation":{"id":"Jumat"}},"revelation":{"id":"Madaniyah"}},{"number":63,"numberOfVerses":11,"name":{"short":"المنٰفقون","long":"сُورَةُ الْمُنَافِقُونَ","transliteration":{"id":"Al-Munafiqun"},"translation":{"id":"Orang-Orang Munafik"}},"revelation":{"id":"Madaniyah"}},{"number":64,"numberOfVerses":18,"name":{"short":"التغابن","long":"сُورَةُ التَّغَابُنِ","transliteration":{"id":"At-Tagabun"},"translation":{"id":"Pengungkapan Kesalahan"}},"revelation":{"id":"Madaniyah"}},{"number":65,"numberOfVerses":12,"name":{"short":"الطلاق","long":"сُورَةُ الطَّلَاقِ","transliteration":{"id":"At-Talaq"},"translation":{"id":"Talak"}},"revelation":{"id":"Madaniyah"}},{"number":66,"numberOfVerses":12,"name":{"short":"التحريم","long":"сُورَةُ التَّحْرِيمِ","transliteration":{"id":"At-Tahrim"},"translation":{"id":"Mengharamkan"}},"revelation":{"id":"Madaniyah"}},{"number":67,"numberOfVerses":30,"name":{"short":"الملك","long":"сُورَةُ الْمُلْكِ","transliteration":{"id":"Al-Mulk"},"translation":{"id":"Kerajaan"}},"revelation":{"id":"Makkiyah"}},{"number":68,"numberOfVerses":52,"name":{"short":"القلم","long":"сُورَةُ الْقَلَقِ","transliteration":{"id":"Al-Qalam"},"translation":{"id":"Pena"}},"revelation":{"id":"Makkiyah"}},{"number":69,"numberOfVerses":52,"name":{"short":"الحاۤقّة","long":"сُورَةُ الْحَاقَّةِ","transliteration":{"id":"Al-Haqqah"},"translation":{"id":"Hari Kiamat"}},"revelation":{"id":"Makkiyah"}},{"number":70,"numberOfVerses":44,"name":{"short":"المعارج","long":"сُورَةُ الْمَعَارِjِ","transliteration":{"id":"Al-Ma'arij"},"translation":{"id":"Tempat Naik"}},"revelation":{"id":"Makkiyah"}},{"number":71,"numberOfVerses":28,"name":{"short":"نوح","long":"сُورَةُ نُوحٍ","transliteration":{"id":"Nuh"},"translation":{"id":"Nuh"}},"revelation":{"id":"Makkiyah"}},{"number":72,"numberOfVerses":28,"name":{"short":"الجن","long":"сُورَةُ الْجِنِّ","transliteration":{"id":"Al-Jinn"},"translation":{"id":"Jin"}},"revelation":{"id":"Makkiyah"}},{"number":73,"numberOfVerses":20,"name":{"short":"المزّمّل","long":"сُورَةُ الْمُزَّمِّلِ","transliteration":{"id":"Al-Muzzammil"},"translation":{"id":"Orang yang Berselimut"}},"revelation":{"id":"Makkiyah"}},{"number":74,"numberOfVerses":56,"name":{"short":"المدّثّر","long":"сُورَةُ الْمُدَّثِّرِ","transliteration":{"id":"Al-Muddassir"},"translation":{"id":"Orang yang Berkemul"}},"revelation":{"id":"Makkiyah"}},{"number":75,"numberOfVerses":40,"name":{"short":"القيٰمة","long":"сُورَةُ الْقِيَامَةِ","transliteration":{"id":"Al-Qiyamah"},"translation":{"id":"Hari Kiamat"}},"revelation":{"id":"Makkiyah"}},{"number":76,"numberOfVerses":31,"name":{"short":"الانسان","long":"сُورَةُ الْإِنْسَانِ","transliteration":{"id":"Al-Insan"},"translation":{"id":"Manusia"}},"revelation":{"id":"Madaniyah"}},{"number":77,"numberOfVerses":50,"name":{"short":"المرسلٰت","long":"сُورَةُ الْمُرْسَلَاتِ","transliteration":{"id":"Al-Mursalat"},"translation":{"id":"Malaikat yang Diutus"}},"revelation":{"id":"Makkiyah"}},{"number":78,"numberOfVerses":40,"name":{"short":"النبأ","long":"сُورَةُ النَّبَأِ","transliteration":{"id":"An-Naba'"},"translation":{"id":"Berita Besar"}},"revelation":{"id":"Makkiyah"}},{"number":79,"numberOfVerses":46,"name":{"short":"النّٰزعٰت","long":"сُورَةُ النَّازِعَاتِ","transliteration":{"id":"An-Nazi'at"},"translation":{"id":"Malaikat yang Mencabut"}},"revelation":{"id":"Makkiyah"}},{"number":80,"numberOfVerses":42,"name":{"short":"عبس","long":"сُورَةُ عَبَسَ","transliteration":{"id":"'Abasa"},"translation":{"id":"Bermuka Masam"}},"revelation":{"id":"Makkiyah"}},{"number":81,"numberOfVerses":29,"name":{"short":"التكوير","long":"сُورَةُ التَّكْوِيرِ","transliteration":{"id":"At-Takwir"},"translation":{"id":"Menggulung"}},"revelation":{"id":"Makkiyah"}},{"number":82,"numberOfVerses":19,"name":{"short":"الانفطار","long":"сُورَةُ الْإِنْفِطَारِ","transliteration":{"id":"Al-Infitar"},"translation":{"id":"Terbelah"}},"revelation":{"id":"Makkiyah"}},{"number":83,"numberOfVerses":36,"name":{"short":"المطفّفين","long":"сُورَةُ الْمُطَفِّفِينَ","transliteration":{"id":"Al-Mutaffifin"},"translation":{"id":"Orang-Orang Curang"}},"revelation":{"id":"Makkiyah"}},{"number":84,"numberOfVerses":25,"name":{"short":"الانشقاق","long":"сُورَةُ الْإِنْشِقَاقِ","transliteration":{"id":"Al-Insyiqaq"},"translation":{"id":"Terbelah"}},"revelation":{"id":"Makkiyah"}},{"number":85,"numberOfVerses":22,"name":{"short":"البروج","long":"сُورَةُ الْبُرُوجِ","transliteration":{"id":"Al-Buruj"},"translation":{"id":"Gugusan Bintang"}},"revelation":{"id":"Makkiyah"}},{"number":86,"numberOfVerses":17,"name":{"short":"الطارق","long":"сُورَةُ الطَّارِقِ","transliteration":{"id":"At-Tariq"},"translation":{"id":"Yang Datang di Malam Hari"}},"revelation":{"id":"Makkiyah"}},{"number":87,"numberOfVerses":19,"name":{"short":"الاعلى","long":"сُورَةُ الْأَعْلَىٰ","transliteration":{"id":"Al-A'la"},"translation":{"id":"Maha Tinggi"}},"revelation":{"id":"Makkiyah"}},{"number":88,"numberOfVerses":26,"name":{"short":"الغاشية","long":"сُورَةُ الْغَاشِيَةِ","transliteration":{"id":"Al-Gasyiyah"},"translation":{"id":"Hari Kiamat"}},"revelation":{"id":"Makkiyah"}},{"number":89,"numberOfVerses":30,"name":{"short":"الفجر","long":"сُورَةُ الْفَجْرِ","transliteration":{"id":"Al-Fajr"},"translation":{"id":"Fajar"}},"revelation":{"id":"Makkiyah"}},{"number":90,"numberOfVerses":20,"name":{"short":"البلد","long":"сُورَةُ الْبَلَدِ","transliteration":{"id":"Al-Balad"},"translation":{"id":"Negeri"}},"revelation":{"id":"Makkiyah"}},{"number":91,"numberOfVerses":15,"name":{"short":"الشمس","long":"сُورَةُ الشَّمْسِ","transliteration":{"id":"Asy-Syams"},"translation":{"id":"Matahari"}},"revelation":{"id":"Makkiyah"}},{"number":92,"numberOfVerses":21,"name":{"short":"الّيل","long":"сُورَةُ اللَّيْلِ","transliteration":{"id":"Al-Lail"},"translation":{"id":"Malam"}},"revelation":{"id":"Makkiyah"}},{"number":93,"numberOfVerses":11,"name":{"short":"الضحى","long":"сُورَةُ الضُّحَىٰ","transliteration":{"id":"Ad-Duha"},"translation":{"id":"Duha"}},"revelation":{"id":"Makkiyah"}},{"number":94,"numberOfVerses":8,"name":{"short":"الشرح","long":"сُورَةُ الشَّרْحِ","transliteration":{"id":"Asy-Syarh"},"translation":{"id":"Lapang"}},"revelation":{"id":"Makkiyah"}},{"number":95,"numberOfVerses":8,"name":{"short":"التين","long":"сُورَةُ التِّينِ","transliteration":{"id":"At-Tin"},"translation":{"id":"Buah Tin"}},"revelation":{"id":"Makkiyah"}},{"number":96,"numberOfVerses":19,"name":{"short":"العلق","long":"сُورَةُ الْعَلَقِ","transliteration":{"id":"Al-'Alaq"},"translation":{"id":"Segumpal Darah"}},"revelation":{"id":"Makkiyah"}},{"number":97,"numberOfVerses":5,"name":{"short":"القدر","long":"сُورَةُ الْقَدْرِ","transliteration":{"id":"Al-Qadr"},"translation":{"id":"Kemuliaan"}},"revelation":{"id":"Makkiyah"}},{"number":98,"numberOfVerses":8,"name":{"short":"البيّنة","long":"сُورَةُ الْبَيِّنَةِ","transliteration":{"id":"Al-Bayyinah"},"translation":{"id":"Bukti Nyata"}},"revelation":{"id":"Madaniyah"}},{"number":99,"numberOfVerses":8,"name":{"short":"الزلزلة","long":"сُورَةُ الزَّلْзَلَةِ","transliteration":{"id":"Az-Zalzalah"},"translation":{"id":"Guncangan"}},"revelation":{"id":"Madaniyah"}},{"number":100,"numberOfVerses":11,"name":{"short":"العٰديٰت","long":"сُورَةُ الْعَادِيَاتِ","transliteration":{"id":"Al-'Adiyat"},"translation":{"id":"Kuda Perang"}},"revelation":{"id":"Makkiyah"}},{"number":101,"numberOfVerses":11,"name":{"short":"القارعة","long":"сُورَةُ الْقَارِعَةِ","transliteration":{"id":"Al-Qari'ah"},"translation":{"id":"Hari Kiamat"}},"revelation":{"id":"Makkiyah"}},{"number":102,"numberOfVerses":8,"name":{"short":"التكاثر","long":"сُورَةُ التَّكَاثُرِ","transliteration":{"id":"At-Takasur"},"translation":{"id":"Bermegah-Megahan"}},"revelation":{"id":"Makkiyah"}},{"number":103,"numberOfVerses":3,"name":{"short":"العصر","long":"сُورَةُ الْعَصْرِ","transliteration":{"id":"Al-'Asr"},"translation":{"id":"Asar"}},"revelation":{"id":"Makkiyah"}},{"number":104,"numberOfVerses":9,"name":{"short":"الهمزة","long":"сُورَةُ الْهُمَزَةِ","transliteration":{"id":"Al-Humazah"},"translation":{"id":"Pengumpat"}},"revelation":{"id":"Makkiyah"}},{"number":105,"numberOfVerses":5,"name":{"short":"الفيل","long":"сُورَةُ الْفِيلِ","transliteration":{"id":"Al-Fil"},"translation":{"id":"Gajah"}},"revelation":{"id":"Makkiyah"}},{"number":106,"numberOfVerses":4,"name":{"short":"قريش","long":"сُورَةُ قُرَيْشٍ","transliteration":{"id":"Quraisy"},"translation":{"id":"Suku Quraisy"}},"revelation":{"id":"Makkiyah"}},{"number":107,"numberOfVerses":7,"name":{"short":"الماعون","long":"сُورَةُ الْمَاعُونَ","transliteration":{"id":"Al-Ma'un"},"translation":{"id":"Bantuan"}},"revelation":{"id":"Makkiyah"}},{"number":108,"numberOfVerses":3,"name":{"short":"الكوثر","long":"сُورَةُ الْكَوْثَرِ","transliteration":{"id":"Al-Kausar"},"translation":{"id":"Pemberian yang Banyak"}},"revelation":{"id":"Makkiyah"}},{"number":109,"numberOfVerses":6,"name":{"short":"الكٰفرون","long":"сُورَةُ الْكَافِرُونَ","transliteration":{"id":"Al-Kafirun"},"translation":{"id":"Orang-Orang Kafir"}},"revelation":{"id":"Makkiyah"}},{"number":110,"numberOfVerses":3,"name":{"short":"النصر","long":"сُورَةُ النَّصْرِ","transliteration":{"id":"An-Nasr"},"translation":{"id":"Pertolongan"}},"revelation":{"id":"Madaniyah"}},{"number":111,"numberOfVerses":5,"name":{"short":"اللهب","long":"сُورَةُ اللَّهَبِ","transliteration":{"id":"Al-Lahab"},"translation":{"id":"Api yang Bergejolak"}},"revelation":{"id":"Makkiyah"}},{"number":112,"numberOfVerses":4,"name":{"short":"الاخلاص","long":"сُورَةُ الْإِخْلَاصِ","transliteration":{"id":"Al-Ikhlas"},"translation":{"id":"Ikhlas"}},"revelation":{"id":"Makkiyah"}},{"number":113,"numberOfVerses":5,"name":{"short":"الفلق","long":"сُورَةُ الْفَلَقِ","transliteration":{"id":"Al-Falaq"},"translation":{"id":"Subuh"}},"revelation":{"id":"Makkiyah"}},{"number":114,"numberOfVerses":6,"name":{"short":"الناس","long":"сُورَةُ النَّاسِ","transliteration":{"id":"An-Nas"},"translation":{"id":"Manusia"}},"revelation":{"id":"Makkiyah"}}];

        const ui = {
            addStudentModal: document.getElementById('add-student-modal'), addClassForm: document.getElementById('add-class-form'), classNameInput: document.getElementById('class-name'),
            addClassBtn: document.getElementById('add-class-btn'), classList: document.getElementById('class-list'), studentList: document.getElementById('student-list'),
            studentFilterClass: document.getElementById('student-filter-class'), newStudentClass: document.getElementById('new-student-class'), addStudentForm: document.getElementById('add-student-form'),
            addStudentSubmitBtn: document.getElementById('add-student-submit-btn'),
            confirmModal: { el: document.getElementById('confirm-modal'), title: document.getElementById('confirm-modal-title'), text: document.getElementById('confirm-modal-text'), okBtn: document.getElementById('confirm-modal-ok'), cancelBtn: document.getElementById('confirm-modal-cancel') },
            summary: { totalSiswa: document.getElementById('summary-total-siswa'), totalKelas: document.getElementById('summary-total-kelas'), studentProgressList: document.getElementById('student-progress-list'), rankFilterClass: document.getElementById('summary-rank-filter-class'), searchStudent: document.getElementById('summary-search-student') },
            riwayat: { filterClass: document.getElementById('riwayat-filter-class'), list: document.getElementById('riwayat-list'), searchStudent: document.getElementById('riwayat-search-student') },
            quran: { surahListContainer: document.getElementById('surah-list-container'), surahDetailContainer: document.getElementById('surah-detail-container'), surahSearch: document.getElementById('surah-search') },
            import: { downloadTemplateBtn: document.getElementById('download-template-btn'), importBtn: document.getElementById('import-btn'), fileInput: document.getElementById('import-file-input') },
            settings: { mutqinForm: document.getElementById('mutqin-settings-form'), quranScopeForm: document.getElementById('quran-scope-form'), quranScopeSelect: document.getElementById('quran-scope-setting') }
        };

        function setButtonLoading(button, isLoading) { /* ... content ... */ }
        function showConfirmModal({ title, message, okText, onConfirm }) { /* ... content ... */ }
        // ... ALL RENDER FUNCTIONS AND HELPERS GO HERE ...
        function renderAll() {
            renderSummary(); renderClassList(); renderStudentList();
            renderStudentProgressList(); renderRiwayatList();
        }
        // ... etc ...

        // ******** START OF MOVED CODE ********
        // This entire function block should be INSIDE initializeAppLogic
        function initApp() {
            [ui.addClassBtn, ui.addStudentSubmitBtn, ui.import.importBtn, ui.import.downloadTemplateBtn].forEach(btn => {
                if (btn) btn.dataset.originalContent = btn.innerHTML;
            });
            
            ui.addClassForm.addEventListener('submit', async e => { 
                e.preventDefault(); 
                const name = ui.classNameInput.value.trim(); 
                if (name) { 
                    setButtonLoading(ui.addClassBtn, true);
                    await onlineDB.add('classes', { name });
                    ui.classNameInput.value = ''; 
                    showToast(`Kelas "${name}" berhasil dibuat.`);
                    setButtonLoading(ui.addClassBtn, false);
                } 
            });
            
            ui.classList.addEventListener('click', async (e) => { /* ... content ... */ });
            ui.addStudentForm.addEventListener('submit', async e => { /* ... content ... */ });
            ui.studentFilterClass.addEventListener('change', () => { /* ... content ... */ });
            
            if(ui.summary.rankFilterClass) ui.summary.rankFilterClass.addEventListener('change', renderStudentProgressList);
            if(ui.summary.searchStudent) ui.summary.searchStudent.addEventListener('input', renderStudentProgressList);
            if(ui.riwayat.filterClass) ui.riwayat.filterClass.addEventListener('change', renderRiwayatList);
            if(ui.riwayat.searchStudent) ui.riwayat.searchStudent.addEventListener('input', renderRiwayatList);
            
            ui.import.downloadTemplateBtn.addEventListener('click', downloadTemplate);
            ui.import.importBtn.addEventListener('click', () => ui.import.fileInput.click());
            ui.import.fileInput.addEventListener('change', handleImport);

            ui.studentList.addEventListener('click', async e => { /* ... content ... */ });
            ui.studentList.addEventListener('change', e => { /* ... content ... */ });
            ui.studentList.addEventListener('submit', async e => { /* ... content ... */ });

            if(ui.riwayat && ui.riwayat.list) {
                ui.riwayat.list.addEventListener('click', async e => { /* ... content ... */ });
            }

            ui.quran.surahSearch.addEventListener('input', e => { /* ... content ... */ });
            
            ui.settings.mutqinForm.addEventListener('submit', async (e) => { /* ... content ... */ });
            if (ui.settings.quranScopeForm) {
                 ui.settings.quranScopeForm.addEventListener('submit', async (e) => { /* ... content ... */ });
            }
            const settingsLogoutBtn = document.getElementById('settings-logout-btn');
            if (settingsLogoutBtn) {
                settingsLogoutBtn.addEventListener('click', handleLogout);
            }
        }
        // ******** END OF MOVED CODE ********

        db.collection('classes').onSnapshot(snapshot => {
            window.appState.allClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderAll();
        });
        // ... other listeners ...
        db.collection('pengaturan').onSnapshot(snapshot => {
            snapshot.docs.forEach(doc => { /* ... */ });
            renderAll(); 
            if (typeof window.populateSettingsForms === 'function') {
                window.populateSettingsForms();
            }
        });
        document.getElementById('loader').classList.add('hidden');
        showToast("Assalamu'alaikum!", "info");

        // CALL initApp AT THE END
        initApp();
    } // This closes initializeAppLogic
});