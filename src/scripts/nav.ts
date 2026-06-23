/* Floating-nav interactions: scroll state + mobile hamburger.
   Plain DOM, no framework — the markup is server-rendered by Nav.astro. */

function initNavScroll() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  const update = () => nav.classList.toggle('nav-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  const closeBtn = document.getElementById('mobile-close');
  if (!hamburger || !menu) return;

  const focusable = () =>
    Array.from(menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));

  const open = () => {
    menu.hidden = false;
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    focusable()[0]?.focus();
  };
  const close = () => {
    menu.hidden = true;
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    hamburger.focus();
  };

  hamburger.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);

  // Close after choosing a destination (incl. same-page hash links).
  menu.querySelectorAll<HTMLElement>('[data-nav-link]').forEach((link) =>
    link.addEventListener('click', close)
  );

  // Esc to close + focus trap while open.
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    const els = focusable();
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

function init() {
  initNavScroll();
  initHamburger();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
