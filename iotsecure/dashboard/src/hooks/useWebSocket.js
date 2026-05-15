import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url) {
  const [state, setState] = useState({
    devices: [],
    threats: [],
    honeypot_hits: [],
    agent_statuses: {},
    blocked_ips: [],
    system_log: [],
    stats: { total_devices: 0, high_risk: 0, blocked_ips: 0, honeypot_hits: 0, threats_detected: 0 },
  });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log('[WS] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'init') {
            setState(prev => ({
              ...prev,
              devices: msg.devices || [],
              threats: msg.threats || [],
              honeypot_hits: msg.honeypot_hits || [],
              agent_statuses: msg.agent_statuses || {},
              blocked_ips: msg.blocked_ips || [],
              system_log: msg.system_log || [],
              stats: {
                total_devices: (msg.devices || []).length,
                high_risk: (msg.devices || []).filter(d => d.risk_level === 'high' || d.risk_level === 'critical').length,
                blocked_ips: (msg.blocked_ips || []).length,
                honeypot_hits: (msg.honeypot_hits || []).length,
                threats_detected: (msg.threats || []).length,
              }
            }));
            return;
          }

          setState(prev => {
            const next = { ...prev };

            switch (msg.type) {
              case 'device_update': {
                const idx = next.devices.findIndex(d => d.ip === msg.data.ip);
                if (idx >= 0) {
                  next.devices = [...next.devices];
                  next.devices[idx] = { ...next.devices[idx], ...msg.data, _isNew: false };
                } else {
                  next.devices = [{ ...msg.data, _isNew: true }, ...next.devices];
                }
                next.stats = { ...next.stats, total_devices: next.devices.length, high_risk: next.devices.filter(d => d.risk_level === 'high' || d.risk_level === 'critical').length };
                break;
              }
              case 'threat_event':
                next.threats = [msg.data, ...next.threats].slice(0, 100);
                next.stats = { ...next.stats, threats_detected: next.threats.length };
                break;
              case 'honeypot_hit':
                next.honeypot_hits = [msg.data, ...next.honeypot_hits].slice(0, 100);
                next.stats = { ...next.stats, honeypot_hits: next.honeypot_hits.length };
                break;
              case 'ip_blocked':
                if (!next.blocked_ips.includes(msg.data.ip)) {
                  next.blocked_ips = [msg.data.ip, ...next.blocked_ips];
                  next.stats = { ...next.stats, blocked_ips: next.blocked_ips.length };
                }
                break;
              case 'agent_status':
                next.agent_statuses = { ...next.agent_statuses, [msg.data.agent_id]: msg.data };
                break;
              case 'log':
                next.system_log = [msg.data, ...next.system_log].slice(0, 200);
                break;
              default:
                break;
            }
            return next;
          });
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        console.log('[WS] Disconnected — reconnecting in 3s');
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      console.error('[WS] Connection error:', err);
      reconnectRef.current = setTimeout(connect, 3000);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  return { state, connected };
}
