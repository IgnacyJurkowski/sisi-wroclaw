import Logo from './Logo';
import { NAV_ITEMS, CONTACT } from '../data/site';

export default function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-logo">
            <a href="/" aria-label="SiSi Wrocław"><Logo /></a>
          </div>

          <div>
            <p className="footer-col-heading">Strony</p>
            {NAV_ITEMS.map((p) => (
              <a key={p.id} href={p.href} className="footer-link">{p.label}</a>
            ))}
          </div>

          <div>
            <p className="footer-col-heading">Kontakt</p>
            <a href={`mailto:${CONTACT.email}`} className="footer-link">{CONTACT.email}</a>
            <span className="footer-text">{CONTACT.address}</span>
            <a href={CONTACT.phoneHref} className="footer-link">{CONTACT.phone}</a>
          </div>

          <div>
            <p className="footer-col-heading">Godziny otwarcia</p>
            <span className="footer-text" style={{ fontWeight: 600 }}>{CONTACT.hoursLabel}</span>
            <span className="footer-text">{CONTACT.hours}</span>
            <div className="footer-social" style={{ marginTop: 16 }}>
              <a href={CONTACT.instagram} className="footer-link" rel="noopener" target="_blank">Instagram</a>
              <a href={CONTACT.facebook} className="footer-link" rel="noopener" target="_blank">Facebook</a>
            </div>
          </div>
        </div>
        <p className="footer-bottom">© 2026 SISI Wrocław. Wszelkie prawa zastrzeżone.</p>
      </div>
    </footer>
  );
}
