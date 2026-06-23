'use strict';

/* === NAV + FOOTER === */
function renderNav(activePage) {
  const pages = [
    { id: 'o-nas',      label: 'O nas',      href: 'o-nas.html' },
    { id: 'events',     label: 'Wydarzenia', href: 'events.html' },
    { id: 'menu',       label: 'Menu',       href: 'menu.html' },
    { id: 'rezerwacje', label: 'Rezerwacje', href: 'rezerwacje.html' },
    { id: 'kariera',    label: 'Kariera',    href: 'kariera.html' },
  ];

  const desktopLinks = pages.map(p => `
    <a href="${p.href}" ${p.id === activePage ? 'aria-current="page"' : ''}>${p.label}</a>`).join('');

  const mobileLinks = pages.map(p => `
    <a href="${p.href}" ${p.id === activePage ? 'class="active" aria-current="page"' : ''}>${p.label}</a>`).join('');

  const footerLinks = pages.map(p => `
    <a href="${p.href}" class="text-[13px] text-white/40 hover:text-white/80 transition-colors">${p.label}</a>`).join('');

  const navHTML = `
    <a href="#main" class="skip-link">Przejdź do treści</a>
    <nav id="main-nav" role="navigation" aria-label="Główna nawigacja">
      <a href="index.html" class="nav-logo" aria-label="SiSi Wrocław — strona główna">
        Si<span>Si</span>
      </a>
      <div class="nav-links">${desktopLinks}</div>
      <a href="rezerwacje.html" class="nav-cta">Rezerwuj</a>
      <button id="hamburger" aria-label="Otwórz menu" aria-expanded="false" aria-controls="mobile-menu">
        <span></span><span></span><span></span>
      </button>
    </nav>
    <div id="mobile-menu" hidden role="dialog" aria-label="Menu mobilne" aria-modal="true">
      <button id="mobile-close" style="position:absolute;top:1.5rem;right:1.5rem;background:none;border:none;color:rgba(255,255,255,0.35);font-size:2rem;cursor:pointer;line-height:1;" aria-label="Zamknij menu">&times;</button>
      ${mobileLinks}
    </div>`;

  const footerHTML = `
    <footer class="border-t border-white/[0.06] mt-32">
      <div class="max-w-[1280px] mx-auto px-6 py-16 md:py-20">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div class="md:col-span-1">
            <div class="text-[14px] font-bold uppercase tracking-[0.1em] mb-4">
              Si<span class="text-[#B5253B]">Si</span> Wrocław
            </div>
            <p class="text-[13px] text-white/35 leading-relaxed">Premium klub muzyczny<br>w centrum Wrocławia.</p>
          </div>
          <div class="flex flex-col gap-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-white/20 mb-1">Nawigacja</p>
            ${footerLinks}
          </div>
          <div class="flex flex-col gap-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-white/20 mb-1">Kontakt</p>
            <p class="text-[13px] text-white/40">ul. Świdnicka 1<br>50-000 Wrocław</p>
            <a href="tel:+48710000000" class="text-[13px] text-white/40 hover:text-white/80 transition-colors mt-1">+48 71 000 0000</a>
            <a href="mailto:kontakt@sisiwroclaw.pl" class="text-[13px] text-white/40 hover:text-white/80 transition-colors">kontakt@sisiwroclaw.pl</a>
          </div>
          <div class="flex flex-col gap-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-white/20 mb-1">Godziny</p>
            <p class="text-[13px] text-white/40">Piątek – Sobota<br>20:00 – 04:00</p>
            <p class="text-[13px] text-white/40 mt-2">Niedziela<br>18:00 – 01:00</p>
            <div class="flex gap-4 mt-4">
              <a href="https://www.instagram.com/sisiwroclaw" rel="noopener noreferrer" class="text-[13px] text-white/40 hover:text-white/80 transition-colors">Instagram</a>
              <a href="https://www.facebook.com/sisiwroclaw" rel="noopener noreferrer" class="text-[13px] text-white/40 hover:text-white/80 transition-colors">Facebook</a>
            </div>
          </div>
        </div>
        <div class="border-t border-white/[0.05] mt-16 pt-8">
          <p class="text-[11px] text-white/18">&copy; 2026 SiSi Wrocław. Wszelkie prawa zastrzeżone.</p>
        </div>
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

  const focusable = () => Array.from(menu.querySelectorAll('a[href], button:not([disabled])'));

  function open() {
    menu.hidden = false;
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    const els = focusable();
    if (els.length) els[0].focus();
  }
  function close() {
    menu.hidden = true;
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    hamburger.focus();
  }

  hamburger.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    const els = focusable();
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
    else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
}

/* === NAV SCROLL === */
function initNavScroll() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  const update = () => nav.classList.toggle('nav-scrolled', window.scrollY > 60);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* === GSAP ANIMATIONS === */
function initGSAP() {
  if (typeof gsap === 'undefined') return;
  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  /* --- HERO: split title by <br>, animate lines --- */
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    const raw = heroTitle.innerHTML;
    if (raw.includes('<br') || raw.includes('<BR')) {
      const lines = raw.split(/<br\s*\/?>/i);
      heroTitle.innerHTML = lines
        .map(l => `<div class="h-line"><div class="h-line-inner">${l.trim()}</div></div>`)
        .join('');
    }

    const lineInners = heroTitle.querySelectorAll('.h-line-inner');
    const heroLabel  = document.querySelector('.hero-label');
    const heroSub    = document.querySelector('.hero-sub');
    const heroCtas   = document.querySelector('.hero-ctas');
    const heroScroll = document.querySelector('.hero-scroll-hint');

    const tl = gsap.timeline({ delay: 0.06 });

    if (heroLabel) {
      tl.fromTo(heroLabel,
        { x: -16, opacity: 0 },
        { x: 0,   opacity: 1, duration: 0.45, ease: 'expo.out' }, 0
      );
    }

    if (lineInners.length) {
      tl.fromTo(lineInners,
        { y: '110%' },
        { y: '0%', duration: 0.82, stagger: 0.075, ease: 'expo.out' },
        0.08
      );
    }

    if (heroSub) {
      tl.fromTo(heroSub,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.52, ease: 'power3.out' },
        0.55
      );
    }

    if (heroCtas) {
      const kids = Array.from(heroCtas.children);
      tl.fromTo(kids,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.07, duration: 0.42, ease: 'power3.out' },
        0.68
      );
    }

    if (heroScroll) {
      tl.fromTo(heroScroll, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.0);
    }
  }

  /* --- HERO PARALLAX --- */
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg && typeof ScrollTrigger !== 'undefined') {
    gsap.to(heroBg, {
      y: '20%', ease: 'none',
      scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 1.2 }
    });
  }

  if (typeof ScrollTrigger === 'undefined') return;

  /* --- SECTION LABELS: auto inject sweep-line + animate --- */
  document.querySelectorAll('.section-label:not(.hero-label)').forEach(label => {
    /* Inject decorative sweep line after the label */
    if (!label.nextElementSibling || !label.nextElementSibling.classList.contains('sweep-line')) {
      const line = document.createElement('div');
      line.className = 'sweep-line';
      label.parentNode.insertBefore(line, label.nextSibling);

      gsap.fromTo(line,
        { scaleX: 0 },
        {
          scaleX: 1, duration: 0.55, ease: 'expo.out', transformOrigin: 'left center',
          scrollTrigger: { trigger: line, start: 'top 92%' }
        }
      );
    }

    /* Slide in the label itself */
    gsap.fromTo(label,
      { x: -14, opacity: 0 },
      {
        x: 0, opacity: 1, duration: 0.42, ease: 'expo.out',
        scrollTrigger: { trigger: label, start: 'top 90%' }
      }
    );
  });

  /* --- .gs-reveal → clip-path bottom-up sweep --- */
  gsap.utils.toArray('.gs-reveal').forEach(el => {
    gsap.fromTo(el,
      { clipPath: 'inset(0 0 100% 0)', y: 4 },
      {
        clipPath: 'inset(0 0 0% 0)', y: 0,
        duration: 0.68, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      }
    );
  });

  /* --- .gs-image → clip-path left-to-right wipe + subtle zoom --- */
  gsap.utils.toArray('.gs-image').forEach(wrapper => {
    gsap.fromTo(wrapper,
      { clipPath: 'inset(0 100% 0 0)' },
      {
        clipPath: 'inset(0 0% 0 0)',
        duration: 0.88, ease: 'expo.out',
        scrollTrigger: { trigger: wrapper, start: 'top 84%' }
      }
    );
    const img = wrapper.querySelector('img');
    if (img) {
      gsap.fromTo(img,
        { scale: 1.07 },
        { scale: 1, duration: 1.1, ease: 'expo.out',
          scrollTrigger: { trigger: wrapper, start: 'top 84%' } }
      );
    }
  });

  /* --- .gs-stagger → children stagger with fast slide --- */
  gsap.utils.toArray('.gs-stagger').forEach(container => {
    const children = Array.from(container.children);
    if (!children.length) return;
    gsap.fromTo(children,
      { y: 28, opacity: 0 },
      {
        y: 0, opacity: 1,
        stagger: 0.055, duration: 0.58, ease: 'expo.out',
        scrollTrigger: { trigger: container, start: 'top 84%' }
      }
    );
  });

  /* --- Page hero h1 on inner pages --- */
  const pageH1 = document.querySelector('.page-hero h1');
  if (pageH1) {
    gsap.fromTo(pageH1,
      { y: 22, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.62, ease: 'expo.out', delay: 0.15 }
    );
  }
}

/* === RESERVATION FORM === */
function initReservationForm() {
  const form = document.getElementById('reservation-form');
  if (!form) return;
  const container = document.querySelector('.form-container');
  const success   = document.querySelector('.success-container');
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (container) container.style.display = 'none';
    if (success) { success.classList.add('visible'); success.focus(); }
  });
}

/* === INIT === */
document.addEventListener('DOMContentLoaded', () => {
  initGSAP();
  initReservationForm();
});
