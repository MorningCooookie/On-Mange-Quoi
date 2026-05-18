// Menu hamburger mobile — toggle la nav principale en dropdown
// CSS gère le breakpoint, ce JS gère uniquement l'état ouvert/fermé.
//
// Note : sur des navigations inter-pages rapides (bfcache, prefetch), l'event
// `DOMContentLoaded` peut être déjà émis avant que ce script soit exécuté.
// Dans ce cas, attacher un listener à cet event est trop tard et le handler
// ne se déclenche jamais → le hamburger ne répond plus aux clics. La garde
// `document.readyState` règle ce cas.
function initHamburgerMenu() {
  const btn = document.getElementById('hamburger-menu');
  const nav = document.getElementById('primary-nav');
  if (!btn || !nav) return;

  // Idempotence : si déjà initialisé, ne pas double-attacher les listeners
  if (btn.dataset.navInit === '1') return;
  btn.dataset.navInit = '1';

  const close = () => {
    btn.setAttribute('aria-expanded', 'false');
    nav.removeAttribute('data-mobile-open');
  };

  const open = () => {
    btn.setAttribute('aria-expanded', 'true');
    nav.setAttribute('data-mobile-open', 'true');
  };

  btn.addEventListener('click', () => {
    btn.getAttribute('aria-expanded') === 'true' ? close() : open();
  });

  // Fermer en cliquant sur un lien
  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') close();
  });

  // Fermer avec Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHamburgerMenu);
} else {
  // DOM déjà prêt : init immédiat (cas navigations rapides / page restored bfcache)
  initHamburgerMenu();
}

// bfcache : Safari/Firefox peuvent restaurer la page sans re-déclencher
// DOMContentLoaded. L'event `pageshow` se déclenche dans tous les cas, y
// compris depuis le back-forward cache.
window.addEventListener('pageshow', initHamburgerMenu);
