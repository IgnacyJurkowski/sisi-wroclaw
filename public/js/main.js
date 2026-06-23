'use strict';

/* SVG logo extracted from Framer export (viewBox 0 0 68 60), cream fill */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 60" overflow="visible" aria-hidden="true">
  <path d="M 26.296 34.305 C 25.551 30.668 23.408 27.576 20.255 25.611 L 14.039 21.732 C 9.473 18.883 8.013 12.891 10.777 8.361 C 12.133 6.139 14.281 4.591 16.813 3.993 C 19.345 3.395 21.948 3.817 24.162 5.199 C 26.329 6.552 27.856 8.66 28.453 11.153 C 28.695 12.145 29.695 12.763 30.691 12.521 L 30.691 12.506 C 31.682 12.264 32.298 11.262 32.056 10.265 C 31.227 6.832 29.117 3.903 26.115 2.032 C 23.067 0.133 19.454 -0.465 15.96 0.365 C 12.456 1.192 9.502 3.338 7.619 6.415 C 3.789 12.668 5.794 20.953 12.086 24.88 L 18.302 28.759 C 20.578 30.179 22.133 32.41 22.673 35.041 C 23.214 37.671 22.659 40.34 21.118 42.552 C 18.245 46.678 12.598 47.898 8.26 45.335 C 5.984 43.991 4.391 41.835 3.774 39.271 C 3.532 38.279 2.532 37.662 1.536 37.904 C 0.545 38.146 -0.071 39.148 0.171 40.145 C 1.024 43.696 3.229 46.678 6.373 48.54 C 8.487 49.798 10.829 50.396 13.153 50.396 C 17.406 50.396 21.578 48.387 24.157 44.689 C 26.286 41.636 27.054 37.947 26.301 34.305 Z" fill="rgb(237,219,194)"/>
  <path d="M 32.475 48.522 L 32.475 17.759 C 32.475 16.767 31.664 15.955 30.673 15.955 C 29.683 15.955 28.872 16.767 28.872 17.759 L 28.872 48.522 C 28.872 49.515 29.683 50.327 30.673 50.327 C 31.664 50.327 32.475 49.515 32.475 48.522 Z" fill="rgb(237,219,194)"/>
  <path d="M 66.257 12.508 C 66.736 12.393 67.149 12.091 67.405 11.671 C 67.661 11.25 67.739 10.745 67.622 10.267 C 66.792 6.834 64.682 3.905 61.681 2.034 C 58.633 0.125 55.02 -0.464 51.525 0.367 C 48.021 1.194 45.067 3.34 43.185 6.416 C 39.354 12.67 41.36 20.955 47.652 24.882 L 53.867 28.761 C 56.143 30.18 57.698 32.412 58.239 35.043 C 58.779 37.673 58.225 40.341 56.684 42.554 C 53.81 46.68 48.164 47.9 43.825 45.336 C 41.549 43.993 39.956 41.837 39.34 39.273 C 39.098 38.281 38.098 37.664 37.102 37.906 C 36.111 38.148 35.495 39.15 35.736 40.147 C 36.599 43.698 38.795 46.68 41.938 48.541 C 44.053 49.8 46.395 50.398 48.718 50.398 C 52.971 50.398 57.144 48.389 59.723 44.691 C 61.852 41.638 62.62 37.948 61.866 34.307 L 61.866 34.292 C 61.122 30.655 58.979 27.564 55.826 25.599 L 49.61 21.719 C 45.044 18.871 43.583 12.878 46.348 8.349 C 47.704 6.127 49.851 4.579 52.383 3.981 C 54.915 3.382 57.518 3.805 59.732 5.187 C 61.899 6.54 63.426 8.648 64.023 11.141 C 64.265 12.133 65.266 12.75 66.261 12.508 Z" fill="rgb(237,219,194)"/>
  <path d="M 66.198 15.962 C 65.207 15.962 64.397 16.774 64.397 17.766 L 64.397 48.529 C 64.397 49.521 65.207 50.333 66.198 50.333 C 67.189 50.333 68 49.521 68 48.529 L 68 17.766 C 68 16.774 67.189 15.962 66.198 15.962 Z" fill="rgb(237,219,194)"/>
</svg>`;

/* === NAV + FOOTER === */
function renderNav(activePage) {
  const pages = [
    { id: 'o-nas',      label: 'O nas',      href: 'index.html#ewolucja-onas' },
    { id: 'events',     label: 'Wydarzenia', href: 'index.html#wydarzenia' },
    { id: 'menu',       label: 'Menu',       href: 'menu.html' },
    { id: 'kariera',    label: 'Kariera',    href: 'kariera.html' },
  ];

  const desktopLinks = pages.map(p =>
    `<a href="${p.href}"${p.id === activePage ? ' aria-current="page"' : ''}>${p.label}</a>`
  ).join('');

  const mobileLinks = pages.map(p =>
    `<a href="${p.href}"${p.id === activePage ? ' class="active"' : ''}>${p.label}</a>`
  ).join('');

  const navHTML = `
    <nav id="main-nav" role="navigation" aria-label="Główna nawigacja">
      <div class="nav-inner">
        <a href="index.html" class="nav-logo" aria-label="SiSi Wrocław — strona główna">${LOGO_SVG}</a>
        <div class="nav-links">${desktopLinks}</div>
        <a href="https://emenago.com/inner/cart/6619/0519b014958d73fb0d5d2d58c360a661/pl" class="nav-cta" rel="noopener" target="_blank">Rezerwacje</a>
        <button id="hamburger" aria-label="Otwórz menu" aria-expanded="false" aria-controls="mobile-menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
    <div id="mobile-menu" hidden role="dialog" aria-label="Menu mobilne" aria-modal="true">
      <button id="mobile-close" style="position:absolute;top:1.5rem;right:1.5rem;background:none;border:none;color:rgba(255,255,255,0.4);font-size:2rem;cursor:pointer;line-height:1;" aria-label="Zamknij">&times;</button>
      ${mobileLinks}
      <a href="https://emenago.com/inner/cart/6619/0519b014958d73fb0d5d2d58c360a661/pl" class="btn-cta" rel="noopener" target="_blank" style="margin-top:1rem;">Rezerwacje</a>
    </div>`;

  const footerHTML = `
    <footer>
      <div class="footer-inner">
        <div class="footer-grid">
          <div>
            <a href="index.html" aria-label="SiSi Wrocław">${LOGO_SVG.replace('height: 32px', 'height: 52px')}</a>
          </div>
          <div>
            <p class="footer-col-heading">Strony</p>
            ${pages.map(p => `<a href="${p.href}" class="footer-link">${p.label}</a>`).join('')}
          </div>
          <div>
            <p class="footer-col-heading">Kontakt</p>
            <a href="mailto:biuro@r32.com.pl" class="footer-link">biuro@r32.com.pl</a>
            <span class="footer-text">Rzeźnicza 32, Wrocław</span>
            <a href="tel:+48515126260" class="footer-link">+48 515 126 260</a>
          </div>
          <div>
            <p class="footer-col-heading">Godziny otwarcia</p>
            <span class="footer-text" style="font-weight:600;">Piątek – Sobota</span>
            <span class="footer-text">22:00 – 04:00</span>
            <div class="footer-social" style="margin-top:16px;">
              <a href="https://www.instagram.com/sisiwroclaw/" class="footer-link" rel="noopener" target="_blank">Instagram</a>
              <a href="https://www.facebook.com/sisimusicclub" class="footer-link" rel="noopener" target="_blank">Facebook</a>
            </div>
          </div>
        </div>
        <p class="footer-bottom">© 2026 SISI Wrocław. Wszelkie prawa zastrzeżone.</p>
      </div>
    </footer>`;

  const navEl = document.getElementById('nav-placeholder');
  const footerEl = document.getElementById('footer-placeholder');
  if (navEl) navEl.innerHTML = navHTML;
  if (footerEl) footerEl.innerHTML = footerHTML;

  initHamburger();
  initNavScroll();
}

/* === HAMBURGER === */
function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  const closeBtn = document.getElementById('mobile-close');
  if (!hamburger || !menu) return;

  function open() {
    menu.hidden = false;
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    menu.hidden = true;
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    hamburger.focus();
  }

  hamburger.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  menu.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* === NAV SCROLL === */
function initNavScroll() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  const update = () => nav.style.background =
    window.scrollY > 60
      ? 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)'
      : 'linear-gradient(180deg, rgba(0,0,0,0.4) 6.6%, rgba(0,0,0,0.6) 100%)';
  window.addEventListener('scroll', update, { passive: true });
  update();
}

document.addEventListener('DOMContentLoaded', () => {});
