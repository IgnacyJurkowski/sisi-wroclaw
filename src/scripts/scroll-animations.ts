import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Scroll-driven animations for the SiSi site.
 *
 * Progressive enhancement: elements are only hidden once `<html class="js">`
 * is set (see the inline head script in Base.astro), so without JS everything
 * stays visible. `prefers-reduced-motion` skips all motion and reveals content.
 *
 * Markup hooks:
 *   [data-hero]           one-shot entrance on load (staggered)
 *   [data-reveal]         fade + rise when scrolled into view
 *   [data-reveal-group]   its direct children fade + rise, staggered
 *   [data-parallax]       scroll-linked vertical drift (scrubbed); the value
 *                         is the yPercent travel (default 12)
 */
function init() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    // CSS already restores visibility under (prefers-reduced-motion); nothing to do.
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Hero entrance — runs immediately, no scroll needed.
  const heroEls = gsap.utils.toArray<HTMLElement>('[data-hero]');
  if (heroEls.length) {
    gsap.to(heroEls, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.15,
      delay: 0.15,
    });
  }

  // Standalone reveals.
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  // Staggered groups (cards, accordion rows, contact lines).
  gsap.utils.toArray<HTMLElement>('[data-reveal-group]').forEach((group) => {
    gsap.to(group.children, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.12,
      scrollTrigger: { trigger: group, start: 'top 80%' },
    });
  });

  // Scroll-linked parallax (hero + Chivas backgrounds).
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

  // Recalculate once fonts/images settle.
  window.addEventListener('load', () => ScrollTrigger.refresh());

  document.documentElement.dataset.anim = 'ready';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
