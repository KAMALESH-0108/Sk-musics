const CACHE_NAME = 'tamil-music-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle downloaded audio files
  if (url.pathname.startsWith('/downloaded/')) {
    event.respondWith(
      caches.open('sk-music-downloads').then(async (cache) => {
        const response = await cache.match(event.request);
        if (!response) {
          return new Response('Not found', { status: 404 });
        }
        
        // Handle Range requests for audio
        if (event.request.headers.has('range')) {
          const rangeHeader = event.request.headers.get('range');
          const blob = await response.blob();
          const totalSize = blob.size;
          
          const parts = rangeHeader.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
          
          const chunk = blob.slice(start, end + 1);
          
          return new Response(chunk, {
            status: 206,
            statusText: 'Partial Content',
            headers: new Headers({
              'Content-Range': `bytes ${start}-${end}/${totalSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunk.size.toString(),
              'Content-Type': response.headers.get('Content-Type') || 'audio/mp4'
            })
          });
        }
        
        return response;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
