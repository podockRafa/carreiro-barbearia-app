const CACHE_NAME = 'barbearia-cliente-v1';
const urlsToCache = [
  '/html/index.html',
  '/html/home.html',
  '/html/historico.html',
  '/html/agendar-servico.html',
  '/html/agendar-profissional.html',
  '/html/agendar-horario.html',
  '/html/agendar-confirmar.html',
  '/css/styles.css',
  '/js/login.js',
  '/js/home.js',
  '/js/historico.js',
  '/js/agendamento.js',
  '/js/firebase-config.js',
  '../assets/icones-logo/sr.carreiro (4).png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache do Cliente aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});