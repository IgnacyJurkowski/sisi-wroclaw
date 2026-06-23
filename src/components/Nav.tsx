import { useEffect, useState } from 'react';
import Logo from './Logo';
import { NAV_ITEMS, RESERVATION_URL } from '../data/site';

type Props = { active?: string };

export default function Nav({ active }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const navBg = scrolled
    ? 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)'
    : 'linear-gradient(180deg, rgba(0,0,0,0.4) 6.6%, rgba(0,0,0,0.6) 100%)';

  return (
    <>
      <nav id="main-nav" role="navigation" aria-label="Główna nawigacja" style={{ background: navBg }}>
        <div className="nav-inner">
          <a href="/" className="nav-logo" aria-label="SiSi Wrocław — strona główna"><Logo /></a>
          <div className="nav-links">
            {NAV_ITEMS.map((p) => (
              <a key={p.id} href={p.href} aria-current={p.id === active ? 'page' : undefined}>
                {p.label}
              </a>
            ))}
          </div>
          <a href={RESERVATION_URL} className="nav-cta" rel="noopener" target="_blank">Rezerwacje</a>
          <button
            className="hamburger"
            aria-label="Otwórz menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-label="Menu mobilne" aria-modal="true">
          <button className="mobile-close" aria-label="Zamknij" onClick={() => setMenuOpen(false)}>×</button>
          {NAV_ITEMS.map((p) => (
            <a key={p.id} href={p.href} className={p.id === active ? 'active' : undefined} onClick={() => setMenuOpen(false)}>
              {p.label}
            </a>
          ))}
          <a href={RESERVATION_URL} className="btn-cta" rel="noopener" target="_blank" style={{ marginTop: '1rem' }}>
            Rezerwacje
          </a>
        </div>
      )}
    </>
  );
}
