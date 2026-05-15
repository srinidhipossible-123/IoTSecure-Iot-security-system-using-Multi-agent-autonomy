import { useScrollReveal } from '../hooks';
import './Footer.css';

export default function Footer() {
  const [ref, visible] = useScrollReveal(0.1);

  return (
    <footer className="footer-section" ref={ref}>
      <div className="footer-wave">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,40 C360,100 720,0 1080,60 C1260,90 1380,40 1440,50 L1440,100 L0,100 Z" fill="var(--bg-tertiary)" />
        </svg>
      </div>

      <div className="footer-content">
        <div className="container">
          <div className={`footer-cta reveal ${visible ? 'visible' : ''}`}>
            <h2 className="cta-title">Ready to <span className="gradient-text">Shield</span> Your Home?</h2>
            <p className="cta-desc">Zero-intervention autonomous IoT security, powered by multi-agent AI</p>
            <button className="cta-button" onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })}>
              <span className="cta-pulse" />
              Deploy Your Shield
            </button>
          </div>

          <div className={`footer-info reveal ${visible ? 'visible' : ''}`} style={{transitionDelay:'0.2s'}}>
            <div className="footer-col">
              <h4 className="footer-col-title">Architecture</h4>
              <ul>
                <li>Custom Orchestrator Agent</li>
                <li>Groq LLM Reasoning</li>
                <li>FastAPI Webhooks</li>
                <li>Structured Tracing</li>
              </ul>
            </div>
            <div className="footer-col">
              <h4 className="footer-col-title">Agents</h4>
              <ul>
                <li>🧠 Orchestrator</li>
                <li>🍯 Deception</li>
                <li>🧱 Firewall</li>
                <li>🔔 Notifier</li>
              </ul>
            </div>
            <div className="footer-col">
              <h4 className="footer-col-title">Stack</h4>
              <div className="tech-badges">
                {['Python', 'FastAPI', 'Groq', 'React', 'Vite', 'SQLite'].map(t => (
                  <span key={t} className="tech-badge mono">{t}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="footer-brand gradient-text">🛡️ AI Home Shield</span>
            <span className="footer-event mono">ANVIL 2026 · Problem 3 · Sponsored by Omium</span>
            <span className="footer-copy">Built with ⚡ by Team</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
