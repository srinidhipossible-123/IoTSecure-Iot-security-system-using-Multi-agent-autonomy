import { useState, useEffect } from 'react';
import { getHealth } from '../api';
import './Navbar.css';

const NAV_ITEMS = [
  { id: 'hero', label: 'Home' },
  { id: 'devices', label: 'Devices' },
  { id: 'threats', label: 'Threats' },
  { id: 'traces', label: 'Agent Traces' },
  { id: 'stats', label: 'Stats' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('hero');
  const [status, setStatus] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const sections = NAV_ITEMS.map(n => document.getElementById(n.id)).filter(Boolean);
      for (let i = sections.length - 1; i >= 0; i--) {
        if (sections[i].getBoundingClientRect().top <= 120) {
          setActive(NAV_ITEMS[i].id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const check = async () => {
      const h = await getHealth();
      setStatus(h ? 'online' : 'offline');
    };
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        <div className="navbar-brand" onClick={() => scrollTo('hero')}>
          <div className="shield-icon">🛡️</div>
          <span className="brand-text">AI Home Shield</span>
          <div className={`sys-status ${status || ''}`}>
            <span className={`status-dot ${status || ''}`}></span>
            <span className="status-label mono">{status === 'online' ? 'SYSTEM ACTIVE' : 'OFFLINE'}</span>
          </div>
        </div>
        <button className={`menu-toggle ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
          <span></span><span></span><span></span>
        </button>
        <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {NAV_ITEMS.map(item => (
            <li key={item.id}>
              <button className={`nav-link ${active === item.id ? 'active' : ''}`} onClick={() => scrollTo(item.id)}>
                {item.label}
                {active === item.id && <span className="nav-indicator" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
