import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Scroll-driven animations for the SiSi site.
 *
 * Progressive enhancement: elements only start hidden once <html class="js">
 * is set (inline head script in Base.astro), so no-JS clients see everything.
 *
 * prefers-reduced-motion: we still fade content in (so it never stays hidden
 * and there is a gentle reveal) but drop all movement and the scrubbed
 * parallax.
 *
 * Markup hooks:
 *   [data-hero]          one-shot entrance on load (staggered)
 *   [data-reveal]        reveal when scrolled into view
 *   [data-reveal-group]  direct children reveal, staggered
 *   [data-parallax]      scroll-linked vertical drift; value = yPercent travel
 */
function init() {
  gsap.registerPlugin(ScrollTrigger);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Shared "to" vars. Under reduced motion: opacity only, no movement.
  const reveal = reduce
    ? { opacity: 1, duration: 0.5, ease: 'power1.out' }
    : { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' };

  // Hero entrance — immediate, no scroll needed.
  const heroEls = gsap.utils.toArray<HTMLElement>('[data-hero]');
  if (heroEls.length) {
    gsap.to(heroEls, { ...reveal, stagger: 0.15, delay: 0.15 });
  }

  // Standalone reveals.
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.to(el, { ...reveal, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });

  // Staggered groups (cards, accordion rows, contact lines).
  gsap.utils.toArray<HTMLElement>('[data-reveal-group]').forEach((group) => {
    gsap.to(group.children, {
      ...reveal,
      stagger: 0.1,
      scrollTrigger: { trigger: group, start: 'top 82%' },
    });
  });

  // Scroll-linked parallax — skipped entirely under reduced motion.
  if (!reduce) {
    gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
      const amount = parseFloat(el.dataset.parallax || '') || 12;
      gsap.to(el, {
        yPercent: amount,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });
  }

  // Triggers were measured before images/fonts settled — recompute on load.
  window.addEventListener('load', () => ScrollTrigger.refresh());

  document.documentElement.dataset.anim = 'ready';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
