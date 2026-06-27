/* Floating-nav interactions: scroll state + mobile hamburger.
   Plain DOM, no framework - the markup is server-rendered by Nav.astro. */

function initNavScroll() {
  const nav = document.getElementById('main-nav');
  const sentinel = document.getElementById('nav-sentinel');
  if (!nav || !sentinel) return;
  // Watch a sentinel 40px down the page instead of listening to scroll and
  // reading window.scrollY. A scrollY read after the page mutates styles forces
  // a synchronous layout flush (Lighthouse "Forced reflow"); IntersectionObserver
  // computes visibility off the main thread, so the nav state costs no layout.
  const io = new IntersectionObserver(
    ([entry]) => nav.classList.toggle('nav-scrolled', !entry.isIntersecting),
    { rootMargin: '0px' },
  );
  io.observe(sentinel);
}

function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
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

  // The hamburger is the only toggle: its 3 lines morph to an X when open
  // (aria-expanded drives the CSS), and tapping the X closes the menu.
  hamburger.addEventListener('click', () => (menu.hidden ? open() : close()));

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
