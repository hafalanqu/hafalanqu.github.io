const CACHE_NAME = 'hafalanqu-cache-v1.1';
// URL di bawah ini adalah aset utama yang diperlukan agar aplikasi dapat berjalan offline.
const urlsToCache = [
  './', // Cache halaman utama (index.html)
  './css/output.css',
  './css/style.css',
  './js/app-v.1.1.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Lateef:wght@400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', event => {
  // Lakukan proses instalasi: buka cache dan tambahkan aset utama.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache dibuka');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Tangani permintaan jaringan.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika aset ada di cache, kembalikan dari cache.
        if (response) {
          return response;
        }
        // Jika tidak ada, coba ambil dari jaringan.
        return fetch(event.request);
      })
  );
});