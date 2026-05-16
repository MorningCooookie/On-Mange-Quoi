// Menu hamburger mobile — toggle la nav principale en dropdown
// CSS gère le breakpoint, ce JS gère uniquement l'état ouvert/fermé
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('hamburger-menu');
  const nav = document.getElementById('primary-nav');
  if (!btn || !nav) return;

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
});
