// Service worker ini tidak lagi melakukan caching.
// Semua permintaan akan langsung diteruskan ke jaringan.

self.addEventListener('install', event => {
  // Service worker baru akan langsung aktif setelah instalasi.
  console.log('Service Worker baru sedang diinstal (tanpa caching).');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Hapus cache lama saat service worker baru aktif.
  const cacheNameToDelete = 'hafalanqu-cache-v1.3';
  console.log(`Service Worker aktif, menghapus cache lama: ${cacheNameToDelete}`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName === cacheNameToDelete) {
            console.log(`Menghapus cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Tangani permintaan jaringan dengan langsung mengambil dari jaringan,
  // tanpa mencoba mencocokkan dengan cache terlebih dahulu.
  event.respondWith(fetch(event.request));
});