// js/database.js

// Local utility to format local date to ISO-like string for datetime-local input fields
function getLocalISOString(date) {
    const pad = (num) => num.toString().padStart(2, '0');
    const y = date.getFullYear();
    const M = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const m = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    return `${y}-${M}-${d}T${h}:${m}:${s}`;
}

// Master rendering function
window.renderAll = window.debounce(function() {
    if (typeof window.renderSummary === 'function') window.renderSummary();
    if (typeof window.renderClassList === 'function') window.renderClassList();
    if (typeof window.renderDaftarHadirRoster === 'function') window.renderDaftarHadirRoster();
    if (typeof window.renderStudentList === 'function') window.renderStudentList();
    if (typeof window.renderStudentProgressList === 'function') window.renderStudentProgressList();
    if (typeof window.renderRiwayatList === 'function') window.renderRiwayatList();
    if ((window.appState.loggedInRole === 'admin_lembaga' || sessionStorage.getItem('loggedInRole') === 'admin_lembaga') && typeof window.renderManajemenAkunList === 'function') {
        window.renderManajemenAkunList();
    }
}, 50);

// digital clock interval for live timestamp inputs
setInterval(() => {
    const nowString = getLocalISOString(new Date());
    const inputs = document.querySelectorAll('.live-timestamp-input');

    inputs.forEach(input => {
        if (input.offsetParent !== null) {
            const wrapper = input.closest('div') || input.parentElement;
            if (!wrapper) return;
            const toggle = wrapper.querySelector('.live-clock-toggle');
            if (toggle && toggle.checked) {
                input.value = nowString;
            }
        }
    });
}, 1000);

// Global startApp entry point called when authentication succeeds
window.startApp = function(role, lembagaId, uid) {
    // 1. Swapping layout is handled inside routing, but ensure window.appState has session credentials
    window.appState.loggedInRole = role;
    window.appState.lembagaId = lembagaId;
    window.appState.currentUserUID = uid;

    sessionStorage.setItem('loggedInRole', role);
    sessionStorage.setItem('lembagaId', lembagaId);
    sessionStorage.setItem('currentUserUID', uid);

    // 2. Clear any old real-time database listeners
    window.activeDBListeners.forEach(unsubscribe => unsubscribe());
    window.activeDBListeners = [];

    // 3. Register real-time Firestore listeners
    try {
        const commonErrorHandler = (error, collectionName) => {
            console.error(`Error real-time listener on '${collectionName}': `, error);
            window.showToast(`Gagal memuat data dari ${collectionName}. Periksa izin database Anda.`, "error");
        };

        // Listen for classes
        const unsubClasses = window.db.collection('classes').where('lembagaId', '==', lembagaId)
            .onSnapshot(snapshot => {
                window.appState.allClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const activePage = document.querySelector('.page.page-active');
                if (activePage && activePage.id === 'detail_siswa-page' && window.appState.currentDetailStudentId && window.appState.allStudents.length > 0) {
                    if (typeof window.renderStudentDetailPage === 'function') {
                        window.renderStudentDetailPage();
                    }
                }
                window.renderAll();
            }, error => commonErrorHandler(error, 'classes'));
        window.activeDBListeners.push(unsubClasses);

        // Listen for students
        const unsubStudents = window.db.collection('students').where('lembagaId', '==', lembagaId)
            .onSnapshot(snapshot => {
                window.appState.allStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const activePage = document.querySelector('.page.page-active');
                if (activePage && activePage.id === 'detail_siswa-page' && window.appState.currentDetailStudentId) {
                    if (typeof window.renderStudentDetailPage === 'function') {
                        window.renderStudentDetailPage();
                    }
                }
                window.renderAll();
            }, error => commonErrorHandler(error, 'students'));
        window.activeDBListeners.push(unsubStudents);

        // Listen for hafalan/setoran
        const unsubHafalan = window.db.collection('hafalan').where('lembagaId', '==', lembagaId)
            .onSnapshot(snapshot => {
                window.appState.allHafalan = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const activePage = document.querySelector('.page.page-active');
                if (activePage && activePage.id === 'detail_siswa-page' && window.appState.currentDetailStudentId) {
                    if (typeof window.renderStudentDetailPage === 'function') {
                        window.renderStudentDetailPage();
                    }
                }
                window.renderAll();
            }, error => commonErrorHandler(error, 'hafalan'));
        window.activeDBListeners.push(unsubHafalan);

        // Listen for users
        const unsubUsers = window.db.collection('users').where('lembagaId', '==', lembagaId)
            .onSnapshot(snapshot => {
                window.appState.allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Profile completion modal trigger
                if (typeof window.checkUserProfileCompletion === 'function') {
                    window.checkUserProfileCompletion();
                }

                window.renderAll();

                const activePage = document.querySelector('.page.page-active');
                if (activePage && activePage.id === 'profil-page' && typeof window.populateProfileForm === 'function') {
                    window.populateProfileForm();
                }
            }, error => commonErrorHandler(error, 'users'));
        window.activeDBListeners.push(unsubUsers);

        // Listen for user-specific settings
        const unsubPengaturan = window.db.collection('pengaturan').where('userId', '==', uid)
            .onSnapshot(snapshot => {
                // Initialize default configurations first
                window.appState.pengaturan.skorMutqin = {
                    'sangat-lancar': 100, 
                    'lancar': 90, 
                    'cukup-lancar': 70, 
                    'tidak-lancar': 50, 
                    'sangat-tidak-lancar': 30
                };
                window.appState.pengaturan.lingkupHafalan = 'full';

                if (!snapshot.empty) {
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        if (data.nama === 'skorMutqin') {
                            window.appState.pengaturan.skorMutqin = data.scores;
                        } else if (data.nama === 'lingkupHafalan') {
                            window.appState.pengaturan.lingkupHafalan = data.scope;
                        }
                    });
                }
                
                window.renderAll(); 
                
                if (typeof window.populateSettingsForms === 'function') {
                    window.populateSettingsForms();
                }
            }, error => commonErrorHandler(error, 'pengaturan'));
        window.activeDBListeners.push(unsubPengaturan);

        // Hide screen loader
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('hidden');

        // Show welcome toast
        window.showToast("Assalamu'alaikum!", "info");

    } catch (error) {
        console.error("DB Real-time listener activation error:", error); 
        window.showToast("Gagal menyambungkan ke database real-time.", "error");
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('hidden');
    }

    // 4. Perform router resolution to open the initial page (e.g. /dashboard or /manajemenakun)
    let initialPath = window.location.pathname;
    if (initialPath === '/' || initialPath === '/login') {
        initialPath = (role === 'admin_lembaga') ? '/manajemenakun' : '/dashboard';
    }
    window.navigate(initialPath);
};
