import { useState, useEffect } from 'react';
import { useScrollReveal, usePolling } from '../hooks';
import { getDevices, triggerDemo, scanNetwork } from '../api';
import './DeviceCarousel.css';

const DEVICE_ICONS = { smart_tv: '📺', camera: '📷', smart_bulb: '💡', thermostat: '🌡️', generic_iot: '📟' };
const FALLBACK_DEVICES = [
  { ip: '192.168.1.10', name: 'Smart TV', type: 'smart_tv', risk_score: 0.2, status: 'online', normal_ports: [80,443,8443], normal_bandwidth_mbps: 5.0, quarantined: false, cves: [] },
  { ip: '192.168.1.14', name: 'IP Camera', type: 'camera', risk_score: 0.6, status: 'online', normal_ports: [80,554,8080], normal_bandwidth_mbps: 2.5, quarantined: false, cves: [{id: 'CVE-2023-1234', severity: 'HIGH'}] },
  { ip: '192.168.1.21', name: 'Smart Bulb', type: 'smart_bulb', risk_score: 0.3, status: 'online', normal_ports: [80,443], normal_bandwidth_mbps: 0.1, quarantined: false, cves: [] },
  { ip: '192.168.1.33', name: 'Thermostat', type: 'thermostat', risk_score: 0.4, status: 'online', normal_ports: [80,443,8883], normal_bandwidth_mbps: 0.2, quarantined: false, cves: [{id: 'CVE-2024-0001', severity: 'CRITICAL'}] },
];

export default function DeviceCarousel() {
  const [ref, visible] = useScrollReveal(0.1);
  const { data: apiDevices, refresh } = usePolling(getDevices, 8000);
  const [flipped, setFlipped] = useState({});
  const [scanning, setScanning] = useState(false);
  const devices = apiDevices || FALLBACK_DEVICES;

   const handleScan = async () => {
     setScanning(true);
     await scanNetwork();
     await new Promise(r => setTimeout(r, 3000));
     refresh();
     setScanning(false);
   };

  const riskColor = (score) => score >= 0.6 ? 'var(--red)' : score >= 0.4 ? 'var(--orange)' : 'var(--green)';
  const riskLabel = (score) => score >= 0.6 ? 'HIGH' : score >= 0.4 ? 'MEDIUM' : 'LOW';

  return (
    <section id="devices" className="section devices-section" ref={ref}>
      <div className="container">
        <div className={`section-header reveal ${visible ? 'visible' : ''}`}>
          <div className="header-top">
            <span className="section-tag mono">NETWORK OVERVIEW</span>
            <button className={`scan-btn mono ${scanning ? 'scanning' : ''}`} onClick={handleScan} disabled={scanning}>
              {scanning ? 'SCANNING...' : 'SCAN NETWORK'}
            </button>
          </div>
          <h2 className="section-title">Protected <span className="gradient-text">Devices</span></h2>
          <p className="section-desc">Real-time monitoring and automated vulnerability assessment</p>
        </div>

        <div className="device-grid">
          {devices.map((dev, i) => (
            <div
              key={dev.ip}
              className={`device-card-wrapper reveal ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${i * 0.12}s` }}
              onClick={() => setFlipped(p => ({ ...p, [dev.ip]: !p[dev.ip] }))}
            >
              <div className={`device-card-inner ${flipped[dev.ip] ? 'flipped' : ''}`}>
                {/* Front */}
                <div className="device-card-face device-front glass-card">
                  <div className="device-status-bar">
                    <span className={`status-dot ${dev.quarantined ? 'quarantined' : 'online'}`} />
                    <span className="device-ip mono">{dev.ip}</span>
                  </div>
                  <div className="device-icon">{DEVICE_ICONS[dev.type] || '📟'}</div>
                  <h3 className="device-name">{dev.name}</h3>
                  <div className="risk-meter">
                    <div className="risk-bar">
                      <div className="risk-fill" style={{ width: `${dev.risk_score * 100}%`, background: riskColor(dev.risk_score) }} />
                    </div>
                    <span className="risk-label mono" style={{ color: riskColor(dev.risk_score) }}>
                      {riskLabel(dev.risk_score)} RISK
                    </span>
                  </div>
                  <span className="flip-hint mono">CLICK FOR DETAILS →</span>
                </div>
                {/* Back */}
                <div className="device-card-face device-back glass-card">
                  <h4 className="back-title">{dev.name} Details</h4>
                  <div className="detail-grid">
                    <div className="detail-item"><span className="detail-label">Type</span><span className="detail-val mono">{dev.type}</span></div>
                    <div className="detail-item"><span className="detail-label">Open Ports</span><span className="detail-val mono">{(dev.normal_ports || []).join(', ')}</span></div>
                    <div className="detail-item"><span className="detail-label">Bandwidth</span><span className="detail-val mono">{dev.normal_bandwidth_mbps} Mbps</span></div>
                  </div>
                  
                  <div className="vulnerability-section">
                    <span className="vulnerability-title mono">VULNERABILITIES (CVE)</span>
                    <div className="cve-list">
                      {(dev.cves || []).length > 0 ? (
                        dev.cves.map(cve => (
                          <div key={cve.id} className="cve-item">
                            <span className="cve-id mono">{cve.id}</span>
                            <span className="cve-sev mono" style={{color: cve.severity === 'CRITICAL' ? 'var(--red)' : 'var(--orange)'}}>{cve.severity}</span>
                          </div>
                        ))
                      ) : (
                        <span className="cve-none mono">NO KNOWN VULNERABILITIES</span>
                      )}
                    </div>
                  </div>
                  
                  <span className="flip-hint mono">← BACK</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
