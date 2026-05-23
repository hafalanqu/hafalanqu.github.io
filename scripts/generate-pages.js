// scripts/generate-pages.js
const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, '../index.html');
const rootDir = path.join(__dirname, '..');

if (!fs.existsSync(srcFile)) {
  console.error("Source index.html not found!");
  process.exit(1);
}

const htmlTemplate = fs.readFileSync(srcFile, 'utf8');

// Define our routes and their layout-specific states
const routes = [
  // Auth routes
  { path: 'login', layout: 'auth', view: 'login-view' },
  { path: 'ustadz', layout: 'auth', view: 'ustadz-view' },
  { path: 'santri', layout: 'auth', view: 'santri-view' },
  { path: 'admin', layout: 'auth', view: 'admin-view' },
  { path: 'infaq', layout: 'auth', view: 'infaq-view' },

  // App routes
  { path: 'dashboard', layout: 'app', page: 'ringkasan' },
  { path: 'inputhafalan', layout: 'app', page: 'siswa' },
  { path: 'daftarhadir', layout: 'app', page: 'daftar_hadir' },
  { path: 'teshafalan', layout: 'app', page: 'tes_hafalan' },
  { path: 'riwayat', layout: 'app', page: 'riwayat' },
  { path: 'manajemenakun', layout: 'app', page: 'manajemen_akun' },
  { path: 'kelas', layout: 'app', page: 'kelas' },
  { path: 'profil', layout: 'app', page: 'profil' },
  { path: 'pengaturan', layout: 'app', page: 'pengaturan' },
  { path: 'tentang', layout: 'app', page: 'tentang' },
  { path: 'detailsiswa', layout: 'app', page: 'detail_siswa' }
];

// Replaces relative assets with absolute paths
function makePathsAbsolute(html) {
  return html
    .replace(/href="css\/style\.css"/g, 'href="/css/style.css"')
    .replace(/href="favicon\.png"/g, 'href="/favicon.png"')
    .replace(/src="js\/([^"]+)"/g, 'src="/js/$1"');
}

console.log("Generating physical HTML pages for SPA routes...");

routes.forEach(route => {
  const destDir = path.join(rootDir, route.path);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  let pageHtml = htmlTemplate;

  // 1. Make asset paths absolute
  pageHtml = makePathsAbsolute(pageHtml);

  // 2. Adjust layouts visibility based on route layout type
  if (route.layout === 'auth') {
    // Hide landing layout, show auth layout, hide app layout
    pageHtml = pageHtml
      .replace('id="landing-layout" class="hidden"', 'id="landing-layout" class="hidden"')
      .replace('id="auth-layout" class="hidden min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50"', 'id="auth-layout" class="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50"')
      .replace('id="app-layout" class="hidden min-h-screen bg-slate-50"', 'id="app-layout" class="hidden min-h-screen bg-slate-50"');

    // Show only the targeted view inside auth-layout, hide others
    const views = ['login-view', 'ustadz-view', 'santri-view', 'admin-view', 'infaq-view'];
    views.forEach(v => {
      const viewRegex = new RegExp(`(id="${v}"\\s+class=")([^"]+)(")`);
      pageHtml = pageHtml.replace(viewRegex, (match, prefix, classList, suffix) => {
        let newClasses = classList.replace(/\bhidden\b/g, '').trim().replace(/\s+/g, ' ');
        if (v !== route.view) {
          newClasses += ' hidden';
        }
        return `${prefix}${newClasses}${suffix}`;
      });
    });

    // Replace the anti-flicker script with clean comment
    const antiFlickerRegex = /<!-- Prevent Layout Flash \/ Flicker before mounting -->[\s\S]*?<\/script>/;
    pageHtml = pageHtml.replace(antiFlickerRegex, '<!-- Statically rendered layout: Auth -->');

  } else if (route.layout === 'app') {
    // Hide landing, hide auth, show app layout
    pageHtml = pageHtml
      .replace('id="landing-layout" class="hidden"', 'id="landing-layout" class="hidden"')
      .replace('id="auth-layout" class="hidden min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50"', 'id="auth-layout" class="hidden min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50"')
      .replace('id="app-layout" class="hidden min-h-screen bg-slate-50"', 'id="app-layout" class="min-h-screen bg-slate-50"');

    // Make the targeted page div active, hide others
    const pages = [
      'ringkasan', 'siswa', 'daftar_hadir', 'tes_hafalan', 'riwayat',
      'manajemen_akun', 'kelas', 'profil', 'pengaturan', 'tentang', 'detail_siswa'
    ];
    pages.forEach(p => {
      const pageRegex = new RegExp(`(id="${p}-page"\\s+class=")([^"]+)(")`);
      pageHtml = pageHtml.replace(pageRegex, (match, prefix, classList, suffix) => {
        let newClasses = classList.replace(/\bpage-active\b/g, '').trim().replace(/\s+/g, ' ');
        if (!newClasses.includes('page')) {
          newClasses = 'page ' + newClasses;
        }
        
        if (p === route.page) {
          newClasses = newClasses.replace(/\bhidden\b/g, '').trim().replace(/\s+/g, ' ');
          newClasses += ' page-active';
        } else {
          if (!newClasses.includes('hidden')) {
            newClasses += ' hidden';
          }
        }
        return `${prefix}${newClasses}${suffix}`;
      });
    });

    // Replace the anti-flicker script with the session security guard script
    const antiFlickerRegex = /<!-- Prevent Layout Flash \/ Flicker before mounting -->[\s\S]*?<\/script>/;
    const sessionGuardScript = `<!-- Unauthorized Access Session Guard -->
    <script type="text/javascript">
      (function() {
        var role = sessionStorage.getItem('loggedInRole');
        var uid = sessionStorage.getItem('currentUserUID');
        if (!role || !uid) {
          window.location.href = '/login';
        }
      })();
    </script>`;
    pageHtml = pageHtml.replace(antiFlickerRegex, sessionGuardScript);
  }

  const destFile = path.join(destDir, 'index.html');
  fs.writeFileSync(destFile, pageHtml, 'utf8');
  console.log(`Generated: ${destFile}`);
});

console.log("Pages generated successfully!");
