/**
 * Scroll-driven reveal, dependency-free.
 *
 * Replaces GSAP + ScrollTrigger (~42KB) - it was the last item on the critical
 * request path, and all it powered here was fade-up-on-scroll.
 *
 * Progressive enhancement: the initial hidden states live in CSS under
 * `html.js`, so no-JS clients see everything. Reduced motion fades without
 * movement (handled in CSS).
 *
 * The background parallax was removed: its only way to track scroll was a
 * per-frame getBoundingClientRect(), which forces a synchronous layout
 * (Lighthouse "Forced reflow"). The drift was subtle and not worth a recurring
 * main-thread layout, so the backgrounds now sit still (the hero image itself is
 * unchanged). IntersectionObserver, used below, costs no layout read.
 *
 * Markup hooks:
 *   [data-reveal]        reveal when scrolled into view (adds .is-in)
 *   [data-reveal-group]  reveal; children stagger via CSS nth-child delays
 */
function init() {
  const revealEls = document.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-group]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            obs.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    // No IO support: just show everything.
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  document.documentElement.dataset.anim = 'ready';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
