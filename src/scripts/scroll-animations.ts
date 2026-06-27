/**
 * Scroll-driven animations, dependency-free.
 *
 * Replaces GSAP + ScrollTrigger (~42KB) - it was the last item on the
 * critical request path, and all it powered here was fade-up-on-scroll and a
 * subtle background parallax, both cheap to do by hand.
 *
 * Progressive enhancement: the initial hidden states live in CSS under
 * `html.js`, so no-JS clients see everything. Reduced motion fades without
 * movement and skips the parallax entirely.
 *
 * Markup hooks:
 *   [data-reveal]        reveal when scrolled into view (adds .is-in)
 *   [data-reveal-group]  reveal; children stagger via CSS nth-child delays
 *   [data-parallax]      scroll-linked vertical drift; value = % of own height
 */
function init() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Reveal on scroll ---------------------------------------------------
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

  // --- Scroll-linked parallax (skipped under reduced motion) --------------
  const parallaxEls = reduce
    ? []
    : Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
  if (parallaxEls.length) {
    // Measure each element's document-relative top + height ONCE (and on resize),
    // never inside the scroll handler. getBoundingClientRect() forces a synchronous
    // layout, so calling it every frame made Lighthouse flag a "Forced reflow."
    // The transforms we set are visual only and don't change these offsets, so the
    // cached values stay valid; the scroll handler then reads only window.scrollY
    // (free, no layout) and writes transforms.
    let vh = window.innerHeight;
    let bases: { top: number; height: number; amount: number }[] = [];
    const measure = () => {
      vh = window.innerHeight;
      const y = window.scrollY;
      bases = parallaxEls.map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top + y, // document-relative top, independent of scroll
          height: rect.height,
          amount: parseFloat(el.dataset.parallax || '') || 12,
        };
      });
    };
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      parallaxEls.forEach((el, i) => {
        const b = bases[i];
        const top = b.top - y; // reconstruct viewport-relative top without a read
        // Progress is 0 when the element's top is at the viewport bottom and 1
        // when its bottom reaches the viewport top. Centering on 0.5 means the
        // offset is 0 while the element fills/centers the viewport - the case for
        // the hero at load - so the parallax never shifts the above-the-fold view
        // after first paint (that would inflate Speed Index).
        const progress = (vh - top) / (vh + b.height);
        const offset = (progress - 0.5) * b.amount;
        el.style.transform = `translate3d(0, ${offset.toFixed(2)}%, 0)`;
      });
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { measure(); update(); }, { passive: true });
    // Defer the one-time measurement to the next frame so it reads a settled
    // layout rather than forcing one during the load/hydration burst.
    requestAnimationFrame(() => { measure(); update(); });
  }

  document.documentElement.dataset.anim = 'ready';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
