// Service worker do admin. Faz o push de alertas de ERRO (só no navegador, sem
// manifest nem instalação) e continua servindo registros antigos sem cache.
const DESTINO_PADRAO = '/dashboard/errors';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No-op service worker for stale browser registrations.
});

self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? JSON.parse(event.data.text()) : {};
  } catch {
    dados = {};
  }
  if (!dados || typeof dados !== 'object') dados = {};

  const titulo = typeof dados.title === 'string' && dados.title ? dados.title : 'Erro no sistema';
  const corpo = typeof dados.body === 'string' ? dados.body : 'Veja o Centro de Monitoramento.';
  const url = typeof dados.url === 'string' && dados.url ? dados.url : DESTINO_PADRAO;

  event.waitUntil(self.registration.showNotification(titulo, { body: corpo, data: { url } }));
});

// A url do payload só vale se ficar no mesmo domínio do admin.
function destinoDoClique(url) {
  const origem = self.location.origin;
  try {
    const destino = new URL(typeof url === 'string' && url ? url : DESTINO_PADRAO, origem);
    if (destino.origin === origem) return destino.href;
  } catch {
    // cai no padrão
  }
  return new URL(DESTINO_PADRAO, origem).href;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = destinoDoClique(event.notification.data && event.notification.data.url);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (janela.url.startsWith(self.location.origin) && 'navigate' in janela) {
          return janela.navigate(destino).then((c) => (c || janela).focus());
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
