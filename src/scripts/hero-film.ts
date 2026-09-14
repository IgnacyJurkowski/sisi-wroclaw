/** A decorative film: the photo and all hero content work without JavaScript. */
const hero = document.querySelector<HTMLElement>('.hero');
const film = hero?.querySelector<HTMLVideoElement>('.hero-film');
const control = hero?.querySelector<HTMLButtonElement>('.hero-film-toggle');

if (hero && film && control) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  let userPaused = connection?.saveData === true;
  let inView = false;
  let failed = false;

  const reflectPlayback = () => {
    control.toggleAttribute('data-paused', film.paused);
    control.setAttribute('aria-label', (film.paused ? control.dataset.playLabel : control.dataset.pauseLabel) ?? '');
  };

  const syncPlayback = () => {
    control.hidden = reducedMotion.matches || failed;
    if (reducedMotion.matches) film.classList.remove('is-ready');
    if (failed || reducedMotion.matches || userPaused || !inView || document.hidden) {
      film.pause();
      reflectPlayback();
      return;
    }
    // Attach exactly one source, only when motion is permitted and visible.
    // A data-saving visit keeps the photo until Play is explicitly selected.
    if (!film.getAttribute('src')) {
      film.src = (matchMedia('(max-width: 600px)').matches ? film.dataset.mobileSrc : film.dataset.desktopSrc) ?? '';
      film.muted = true;
    }
    void film.play().catch(() => {
      // Leaving the hero can interrupt a pending play request normally.
      // A browser autoplay restriction still leaves an explicit Play control.
      reflectPlayback();
    });
  };

  film.addEventListener('playing', () => {
    if (reducedMotion.matches || userPaused || !inView || document.hidden) {
      film.pause();
      return;
    }
    film.classList.add('is-ready');
    reflectPlayback();
  });
  film.addEventListener('pause', reflectPlayback);
  film.addEventListener('error', () => {
    failed = true;
    film.classList.remove('is-ready');
    syncPlayback();
  });
  control.addEventListener('click', () => {
    userPaused = !film.paused;
    syncPlayback();
  });

  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncPlayback();
  }, { threshold: 0 });
  observer.observe(hero);
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', syncPlayback);
  // A page restored from the back/forward cache may still have a paused film.
  window.addEventListener('pageshow', syncPlayback);
  window.addEventListener('pagehide', () => film.pause());
  syncPlayback();
}
