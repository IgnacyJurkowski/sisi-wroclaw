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

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1101px)');
  const canAnimate = typeof menu.animate === 'function';
  const listenMediaChange = (query: MediaQueryList, listener: () => void) => {
    if (typeof query.addEventListener === 'function') query.addEventListener('change', listener);
    else query.addListener(listener);
  };
  let expanded = false;
  let animations: Animation[] = [];
  let transitionId = 0;
  let previousOverflow = '';
  let scrollLocked = false;

  const unlockScroll = () => {
    if (!scrollLocked) return;
    document.body.style.overflow = previousOverflow;
    scrollLocked = false;
  };

  const cancelAnimations = () => {
    animations.forEach((animation) => animation.cancel());
    animations = [];
  };

  const finishClose = () => {
    menu.hidden = true;
    menu.dataset.menuState = 'closed';
    cancelAnimations();
    unlockScroll();
  };

  const open = () => {
    if (desktop.matches) return;
    const reopening = !menu.hidden;
    const currentPanel = reopening ? getComputedStyle(menu) : null;
    const from = {
      opacity: currentPanel?.opacity ?? '0',
    };
    ++transitionId;
    cancelAnimations();
    expanded = true;
    menu.hidden = false;
    menu.inert = false;
    menu.removeAttribute('aria-hidden');
    menu.dataset.menuState = 'open';
    hamburger.setAttribute('aria-expanded', 'true');
    if (!scrollLocked) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      scrollLocked = true;
    }
    if (!reducedMotion.matches && canAnimate) {
      // Keep every destination together, reversing from the visible opacity
      // when the menu is toggled again before its fade has finished.
      animations.push(menu.animate([from, { opacity: '1' }], {
        duration: 220,
        easing: 'ease-out',
      }));
    }
    focusable()[0]?.focus({ preventScroll: true });
  };

  const close = ({ immediate = false, restoreFocus = true } = {}) => {
    if (menu.hidden) return;
    const currentPanel = getComputedStyle(menu);
    const from = { opacity: currentPanel.opacity };
    const id = ++transitionId;
    cancelAnimations();
    expanded = false;
    hamburger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) hamburger.focus({ preventScroll: true });
    menu.inert = true;
    menu.setAttribute('aria-hidden', 'true');
    menu.dataset.menuState = 'closing';
    if (immediate || reducedMotion.matches || !canAnimate) {
      finishClose();
      return;
    }
    const closing = menu.animate([from, { opacity: 0 }], {
      duration: 180,
      easing: 'ease-in',
      fill: 'forwards',
    });
    animations.push(closing);
    closing.onfinish = () => {
      if (id === transitionId) finishClose();
    };
  };

  // The hamburger is the only toggle: its 3 lines morph to an X when open
  // (aria-expanded drives the CSS), and tapping the X closes the menu.
  hamburger.addEventListener('click', () => (expanded ? close() : open()));

  // Close after choosing a destination (incl. same-page hash links).
  menu.querySelectorAll<HTMLElement>('[data-nav-link]').forEach((link) =>
    link.addEventListener('click', () => close())
  );

  // Include the hamburger in the trap: it remains the visible close button
  // above the panel, and Escape must also work when it has keyboard focus.
  document.addEventListener('keydown', (e) => {
    if (!expanded) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const els = [hamburger, ...focusable()];
    const first = els[0];
    const last = els[els.length - 1];
    if (!els.includes(document.activeElement as HTMLElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  listenMediaChange(desktop, () => {
    if (!desktop.matches) return;
    const focusWasInMenu = menu.contains(document.activeElement) || document.activeElement === hamburger;
    close({ immediate: true, restoreFocus: false });
    if (focusWasInMenu) document.querySelector<HTMLElement>('.nav-logo')?.focus({ preventScroll: true });
  });
  listenMediaChange(reducedMotion, () => {
    if (!reducedMotion.matches) return;
    if (expanded) cancelAnimations();
    else if (!menu.hidden) close({ immediate: true });
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
