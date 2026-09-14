/** Start the decorative field after load; remember an explicit pause choice. */
const root = document.documentElement;
const control = document.querySelector<HTMLButtonElement>('#background-motion-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const storageKey = 'sisi-background-motion';
let ready = false;
let userPaused = false;
try { userPaused = localStorage.getItem(storageKey) === 'paused'; } catch { /* Storage can be unavailable. */ }

function sync() {
  root.classList.toggle('bg-live', ready && !userPaused && !reducedMotion.matches && !document.hidden);
  if (control) {
    control.hidden = !ready || reducedMotion.matches;
    control.textContent = (userPaused ? control.dataset.resumeLabel : control.dataset.pauseLabel) ?? '';
  }
}

control?.addEventListener('click', () => {
  userPaused = !userPaused;
  try { localStorage.setItem(storageKey, userPaused ? 'paused' : 'playing'); } catch { /* Pause still works for this page. */ }
  sync();
});
reducedMotion.addEventListener('change', sync);
document.addEventListener('visibilitychange', sync);
window.addEventListener('pageshow', sync);
window.addEventListener('pagehide', () => root.classList.remove('bg-live'));

function start() {
  const wake = () => { ready = true; sync(); };
  if ('requestIdleCallback' in window) requestIdleCallback(wake, { timeout: 2000 });
  else setTimeout(wake, 200);
}

if (document.readyState === 'complete') start();
else window.addEventListener('load', start, { once: true });
sync();
