import { useState, useEffect } from 'react';
import './LiveTraffic.css';

const PROTOCOLS = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'MQTT', 'DNS', 'RTSP', 'SSH'];
const SERVICES = ['Smart TV', 'IP Camera', 'Smart Bulb', 'Thermostat', 'Mobile Phone', 'Laptop', 'Gateway'];

export default function LiveTraffic() {
  const [packets, setPackets] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newPacket = {
        id: Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString().split(' ')[0],
        source: SERVICES[Math.floor(Math.random() * SERVICES.length)],
        dest: SERVICES[Math.floor(Math.random() * SERVICES.length)],
        proto: PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)],
        size: Math.floor(Math.random() * 1500) + 'B',
        status: Math.random() > 0.95 ? 'blocked' : 'allowed'
      };
      
      setPackets(prev => [newPacket, ...prev].slice(0, 8));
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="live-traffic" className="section live-traffic-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag mono">REAL-TIME MONITOR</span>
          <h2 className="section-title">Live <span className="gradient-text">Traffic</span> Analysis</h2>
          <p className="section-desc">Deep packet inspection and autonomous traffic filtering</p>
        </div>

        <div className="traffic-monitor glass-card">
          <div className="monitor-header mono">
            <span>TIME</span>
            <span>SOURCE</span>
            <span>DESTINATION</span>
            <span>PROTOCOL</span>
            <span>SIZE</span>
            <span>STATUS</span>
          </div>
          <div className="packet-list">
            {packets.map(p => (
              <div key={p.id} className={`packet-row ${p.status}`}>
                <span className="mono">{p.time}</span>
                <span>{p.source}</span>
                <span>{p.dest}</span>
                <span className="mono proto-tag">{p.proto}</span>
                <span className="mono">{p.size}</span>
                <span className={`status-tag ${p.status}`}>{p.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
          <div className="monitor-footer">
            <div className="scan-line"></div>
            <span className="mono">SCANNING INTERFACE: eth0 [PROMISCUOUS MODE]</span>
          </div>
        </div>
      </div>
    </section>
  );
}
