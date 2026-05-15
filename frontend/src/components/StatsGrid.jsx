import { useEffect, useState, useRef } from 'react';
import { useScrollReveal, usePolling } from '../hooks';
import { getStats } from '../api';
import './StatsGrid.css';

const STAT_ITEMS = [
  { key: 'protected_devices', label: 'Protected Devices', icon: '📡', color: 'var(--cyan)' },
  { key: 'total_incidents', label: 'Incidents Handled', icon: '🚨', color: 'var(--red)' },
  { key: 'blocked_ips', label: 'IPs Blocked', icon: '🔒', color: 'var(--orange)' },
  { key: 'active_honeypots', label: 'Active Honeypots', icon: '🍯', color: 'var(--yellow)' },
  { key: 'vulnerabilities_found', label: 'CVEs Detected', icon: '🔍', color: 'var(--orange)' },
  { key: 'honeytokens_deployed', label: 'Honeytokens', icon: '🎣', color: 'var(--violet)' },
  { key: 'firewall_rules', label: 'Firewall Rules', icon: '🧱', color: 'var(--green)' },
  { key: 'avg_response_ms', label: 'Avg Response (ms)', icon: '⚡', color: 'var(--cyan)' },
  { key: 'critical_threats', label: 'Critical Threats', icon: '💀', color: 'var(--red)' },
];

function AnimatedNumber({ value, visible }) {
  const [display, setDisplay] = useState(0);
  const prevVal = useRef(0);
  useEffect(() => {
    if (!visible) return;
    const start = prevVal.current;
    const end = typeof value === 'number' ? value : 0;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
      else prevVal.current = end;
    };
    requestAnimationFrame(animate);
  }, [value, visible]);
  return <span>{display}</span>;
}

export default function StatsGrid() {
  const [ref, visible] = useScrollReveal(0.1);
  const { data: stats } = usePolling(getStats, 6000);
  const s = stats || {};

  return (
    <section id="stats" className="section stats-section" ref={ref}>
      <div className="container">
        <div className={`section-header reveal ${visible ? 'visible' : ''}`}>
          <span className="section-tag mono">SYSTEM METRICS</span>
          <h2 className="section-title">Defense <span className="gradient-text">Dashboard</span></h2>
          <p className="section-desc">Real-time metrics from the autonomous defense pipeline</p>
        </div>

        <div className="stats-grid">
          {STAT_ITEMS.map((item, i) => (
            <div key={item.key} className={`stat-card glass-card reveal ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="stat-card-icon" style={{ background: item.color + '15' }}>
                <span>{item.icon}</span>
              </div>
              <div className="stat-card-value" style={{ color: item.color }}>
                <AnimatedNumber value={s[item.key] || 0} visible={visible} />
              </div>
              <div className="stat-card-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
