// sw.js - Service Worker Básico

const CACHE_NAME = 'barbearia-funcionario-v1';
// Lista de arquivos essenciais para o "app" funcionar offline
const urlsToCache = [
  '/',
  '/pages/funcionario/agenda.html',
  '/pages/funcionario/caixa.html',
  '/pages/funcionario/perfil.html',
  '/css/admin.css',
  '/js/agenda-funcionario.js',
  '/js/caixa-funcionario.js',
  '/js/perfil-funcionario.js',
  '/assets/icones-logo/sr.carreiro(4).png'
];

// Evento de Instalação: Salva os arquivos no cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de Fetch: Intercepta as requisições
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se o arquivo estiver no cache, retorna ele.
        if (response) {
          return response;
        }
        // Se não, busca na rede.
        return fetch(event.request);
      }
    )
  );
});