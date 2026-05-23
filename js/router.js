// js/router.js
window.routes = {
    '/': { layout: 'landing' },
    '/login': { layout: 'auth', view: 'login-view', title: 'Login' },
    '/ustadz': { layout: 'auth', view: 'ustadz-view', title: 'Pendaftaran Guru' },
    '/santri': { layout: 'auth', view: 'santri-view', title: 'Pendaftaran Siswa' },
    '/admin': { layout: 'auth', view: 'admin-view', title: 'Pendaftaran Admin' },
    '/infaq': { layout: 'auth', view: 'infaq-view', title: 'Dukungan Pengembangan' },
    
    // Logged-in App routes
    '/dashboard': { layout: 'app', page: 'ringkasan', title: 'Dashboard' },
    '/inputhafalan': { layout: 'app', page: 'siswa', title: 'Input Hafalan' },
    '/daftarhadir': { layout: 'app', page: 'daftar_hadir', title: 'Daftar Hadir' },
    '/teshafalan': { layout: 'app', page: 'tes_hafalan', title: 'Tes Hafalan' },
    '/riwayat': { layout: 'app', page: 'riwayat', title: 'Riwayat' },
    '/manajemenakun': { layout: 'app', page: 'manajemen_akun', title: 'Manajemen Akun' },
    '/kelas': { layout: 'app', page: 'kelas', title: 'Manajemen Kelas' },
    '/profil': { layout: 'app', page: 'profil', title: 'Profil Saya' },
    '/pengaturan': { layout: 'app', page: 'pengaturan', title: 'Pengaturan' },
    '/tentang': { layout: 'app', page: 'tentang', title: 'Tentang Aplikasi' },
    '/detailsiswa': { layout: 'app', page: 'detail_siswa', title: 'Detail Siswa' }
};

window.navigate = function(path) {
    if (window.location.pathname !== path) {
        history.pushState(null, null, path);
    }
    window.resolveRoute();
};

window.resolveRoute = function() {
    let path = window.location.pathname;
    
    // Normalize path (handle trailing slashes)
    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }
    
    const route = window.routes[path] || window.routes['/'];
    
    // Route guard: Redirect if user is accessing App pages without credentials
    const loggedInRole = sessionStorage.getItem('loggedInRole') || window.appState.loggedInRole;
    const lembagaId = sessionStorage.getItem('lembagaId') || window.appState.lembagaId;
    const currentUserUID = sessionStorage.getItem('currentUserUID') || window.appState.currentUserUID;
    
    if (route.layout === 'app') {
        if (!loggedInRole || !lembagaId || !currentUserUID) {
            console.warn("Unauthenticated access to app page. Redirecting to /login...");
            history.replaceState(null, null, '/login');
            window.resolveRoute();
            return;
        }
    }

    // Role-based route guard for Siswa (restrict classes, manajemen_akun, etc.)
    if (loggedInRole === 'siswa' && route.layout === 'app') {
        const siswaAllowedPages = ['profil', 'ringkasan', 'siswa', 'riwayat', 'tes_hafalan', 'tentang', 'pengaturan', 'daftar_hadir', 'detail_siswa'];
        if (!siswaAllowedPages.includes(route.page)) {
            console.warn(`Siswa unauthorized access to page: ${route.page}. Redirecting to /dashboard...`);
            history.replaceState(null, null, '/dashboard');
            window.resolveRoute();
            return;
        }
    }
    
    // Role-based route guard for Admin (restrict inputhafalan, daftarhadir, etc.)
    if (loggedInRole === 'admin_lembaga' && route.layout === 'app') {
        const adminAllowedPages = ['profil', 'manajemen_akun', 'tentang'];
        if (!adminAllowedPages.includes(route.page)) {
            console.warn(`Admin unauthorized access to page: ${route.page}. Redirecting to /manajemenakun...`);
            history.replaceState(null, null, '/manajemenakun');
            window.resolveRoute();
            return;
        }
    }

    // Hide all main layouts first
    document.getElementById('landing-layout')?.classList.add('hidden');
    document.getElementById('auth-layout')?.classList.add('hidden');
    document.getElementById('app-layout')?.classList.add('hidden');
    
    // Reset body classes if necessary
    document.body.className = "bg-white text-slate-800 antialiased";

    if (route.layout === 'landing') {
        document.getElementById('landing-layout')?.classList.remove('hidden');
    } 
    else if (route.layout === 'auth') {
        document.getElementById('auth-layout')?.classList.remove('hidden');
        document.body.className = "bg-slate-50 text-slate-800 antialiased";
        
        // Hide all views inside auth container
        ['login-view', 'ustadz-view', 'santri-view', 'admin-view', 'infaq-view'].forEach(viewId => {
            document.getElementById(viewId)?.classList.add('hidden');
        });
        
        // Show specific form view
        document.getElementById(route.view)?.classList.remove('hidden');
        document.title = `${route.title} - HafalanQu`;
    } 
    else if (route.layout === 'app') {
        document.getElementById('app-layout')?.classList.remove('hidden');
        document.body.className = "antialiased bg-slate-50";
        
        // Toggle page class
        const pages = document.querySelectorAll('#page-content > .page');
        pages.forEach(p => {
            if (p.id === `${route.page}-page`) {
                p.classList.add('page-active');
            } else {
                p.classList.remove('page-active');
            }
        });
        
        window.scrollTo(0, 0);

        // Update page title
        let pageTitle = route.title;
        if (route.page === 'detail_siswa') {
            const studentId = window.appState.currentDetailStudentId || sessionStorage.getItem('currentDetailStudentId');
            const student = studentId ? window.appState.allStudents.find(s => s.id === studentId) : null;
            if (student) {
                const studentClass = window.appState.allClasses.find(c => c.id === student.classId);
                const className = studentClass ? studentClass.name : 'Tanpa Kelas';
                pageTitle = `${student.name} (${className})`;
            } else {
                pageTitle = "Detail Siswa";
            }
        }
        
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = pageTitle;
        document.title = `${pageTitle} - HafalanQu`;
        
        // Sync active nav links
        window.updateNavActiveState(route.page);
        
        // Update header actions (like export button)
        window.updateHeaderActions(route.page);

        // Run view-specific populates
        if (route.page === 'profil' && typeof window.populateProfileForm === 'function') {
            window.populateProfileForm();
        }
        if (route.page === 'pengaturan' && typeof window.populateSettingsForms === 'function') {
            window.populateSettingsForms();
        }
        if (route.page === 'manajemen_akun' && typeof window.renderManajemenAkunList === 'function') {
            window.renderManajemenAkunList();
        }
        if (route.page === 'detail_siswa') {
            let studentId = window.appState.currentDetailStudentId || sessionStorage.getItem('currentDetailStudentId');
            if (studentId) {
                window.appState.currentDetailStudentId = studentId;
                if (typeof window.renderStudentDetailPage === 'function') {
                    window.renderStudentDetailPage();
                }
            } else {
                window.showToast("Gagal memuat detail, silakan kembali.", "error");
                window.navigate('/dashboard');
            }
        }
    }
};

window.updateNavActiveState = function(pageId) {
    let activePageLink = pageId;
    if (pageId === 'detail_siswa') {
        activePageLink = 'ringkasan';
    }

    const allLinks = [
        ...document.querySelectorAll('#sidebar-nav .sidebar-link'),
        ...document.querySelectorAll('#bottom-nav .bottom-nav-link'),
        ...document.querySelectorAll('#profil-page .card a[data-page]')
    ];

    allLinks.forEach(link => {
        // Map data-page to route path or page ID
        const targetPage = link.dataset.page;
        if (targetPage === activePageLink) { 
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
};

window.updateHeaderActions = function(pageId) {
    const headerActions = document.getElementById('header-actions');
    if (!headerActions) return;
    
    headerActions.innerHTML = ''; // Clear actions
    headerActions.className = 'w-full sm:w-auto flex items-center justify-end gap-2'; 
    
    if (pageId === 'ringkasan' && (sessionStorage.getItem('loggedInRole') === 'guru' || window.appState.loggedInRole === 'guru')) {
        headerActions.innerHTML = `
            <button id="export-data-btn" class="btn btn-primary w-full sm:w-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Ekspor Hasil Siswa</span>
            </button>`;
    }
};

// popstate back/forward navigation handler
window.addEventListener('popstate', () => {
    window.resolveRoute();
});

// Intercept all internal links click
document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (anchor) {
        const href = anchor.getAttribute('href');
        
        // Intercept paths starting with '/' but excluding externals (http, mailto, tel)
        if (href && href.startsWith('/') && !href.startsWith('//')) {
            e.preventDefault();
            window.navigate(href);
        }
    }
});

// Navigation helper for layout elements
document.addEventListener('DOMContentLoaded', () => {
    // Select sidebar/bottom links or detail redirects and bind clean URLs
    const navBindings = {
        'ringkasan': '/dashboard',
        'siswa': '/inputhafalan',
        'daftar_hadir': '/daftarhadir',
        'tes_hafalan': '/teshafalan',
        'riwayat': '/riwayat',
        'manajemen_akun': '/manajemenakun',
        'kelas': '/kelas',
        'profil': '/profil',
        'pengaturan': '/pengaturan',
        'tentang': '/tentang'
    };

    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('[data-page]');
        if (link) {
            const pageName = link.dataset.page;
            const mappedPath = navBindings[pageName];
            if (mappedPath) {
                e.preventDefault();
                window.navigate(mappedPath);
            }
        }
    });
});
