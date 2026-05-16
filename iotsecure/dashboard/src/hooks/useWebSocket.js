import { useState, useEffect, useRef, useCallback } from 'react';

const INITIAL_STATE = {
  devices: [],
  threats: [],
  honeypot_hits: [],
  agent_statuses: {},
  blocked_ips: [],
  system_log: [],
  pipelineSession: null,
  pipelineSteps: [],
  lastInjectionNotice: null,
  stats: {
    total_devices: 0,
    high_risk: 0,
    blocked_ips: 0,
    honeypot_hits: 0,
    threats_detected: 0,
  },
};

function resolveWsUrl(url) {
  if (url) return url;
  if (typeof window === 'undefined') return 'ws://localhost:8000/ws';

  const host = window.location.hostname;
  const isLocalLoopback = host === 'localhost' || host === '127.0.0.1';

  const backendPort =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_PORT
      ? String(import.meta.env.VITE_BACKEND_PORT)
      : '8000';

  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV && isLocalLoopback) {
    return `ws://${host}:${backendPort}/ws`;
  }

  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${window.location.host}/ws`;
}

async function fetchJsonSafe(path, fallback) {
  try {
    const r = await fetch(path);
    if (!r.ok) return fallback;
    return await r.json();
  } catch {
    return fallback;
  }
}

export function useWebSocket(urlOrUndefined) {
  const url = resolveWsUrl(urlOrUndefined);
  const [state, setState] = useState(INITIAL_STATE);
  const [connected, setConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const connectFnRef = useRef(null);
  const refreshingRef = useRef(false);

  const scheduleReconnect = useCallback(() => {
    reconnectRef.current = setTimeout(() => connectFnRef.current?.(), 2800);
  }, []);

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
            setState((prev) => ({
              ...prev,
              devices: msg.devices || [],
              threats: msg.threats || [],
              honeypot_hits: msg.honeypot_hits || [],
              agent_statuses: msg.agent_statuses || {},
              blocked_ips: msg.blocked_ips || [],
              system_log: msg.system_log || [],
              pipelineSession: null,
              pipelineSteps: [],
              lastInjectionNotice: null,
              stats: {
                total_devices: (msg.devices || []).length,
                high_risk: (msg.devices || []).filter(
                  (d) => d.risk_level === 'high' || d.risk_level === 'critical',
                ).length,
                blocked_ips: (msg.blocked_ips || []).length,
                honeypot_hits: (msg.honeypot_hits || []).length,
                threats_detected: (msg.threats || []).length,
              },
            }));
            return;
          }

          setState((prev) => {
            const next = { ...prev };

            switch (msg.type) {
              case 'device_update': {
                const idx = next.devices.findIndex((d) => d.ip === msg.data.ip);
                if (idx >= 0) {
                  next.devices = [...next.devices];
                  next.devices[idx] = { ...next.devices[idx], ...msg.data, _isNew: false };
                } else {
                  next.devices = [{ ...msg.data, _isNew: true }, ...next.devices];
                }
                next.stats = {
                  ...next.stats,
                  total_devices: next.devices.length,
                  high_risk: next.devices.filter(
                    (d) => d.risk_level === 'high' || d.risk_level === 'critical',
                  ).length,
                };
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
              case 'pipeline_session':
                next.pipelineSession = msg.data;
                next.pipelineSteps = [];
                break;
              case 'pipeline_step':
                next.pipelineSteps = [...(next.pipelineSteps || []), msg.data].slice(-24);
                break;
              case 'injection_notice':
                next.lastInjectionNotice = msg.data;
                break;
              case 'system_reset':
                next.pipelineSession = null;
                next.pipelineSteps = [];
                next.lastInjectionNotice = null;
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
        wsRef.current = null;
        console.log('[WS] Disconnected — reconnecting…');
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      console.error('[WS] Connection error:', err);
      scheduleReconnect();
    }
  }, [scheduleReconnect, url]);

  const refreshAll = useCallback(async () => {
    if (refreshingRef.current) return false;
    refreshingRef.current = true;
    setRefreshing(true);
    const started = Date.now();

    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    if (wsRef.current) {
      const w = wsRef.current;
      w.onclose = null;
      w.close();
      wsRef.current = null;
    }
    setConnected(false);

    const apiReachable = await fetch('/api/stats').then((r) => r.ok).catch(() => false);
    try {
      const [devices, threats, honeypot_hits, agent_statuses, system_log, stats, blocked_ips] =
        await Promise.all([
          fetchJsonSafe('/api/devices', []),
          fetchJsonSafe('/api/threats', []),
          fetchJsonSafe('/api/honeypot-hits', []),
          fetchJsonSafe('/api/agent-statuses', {}),
          fetchJsonSafe('/api/system-log', []),
          fetchJsonSafe('/api/stats', null),
          fetchJsonSafe('/api/blocked-ips', []),
        ]);

      setState({
        devices: Array.isArray(devices) ? devices : [],
        threats: Array.isArray(threats) ? threats.slice(0, 100) : [],
        honeypot_hits: Array.isArray(honeypot_hits) ? honeypot_hits.slice(0, 100) : [],
        agent_statuses: agent_statuses && typeof agent_statuses === 'object' ? agent_statuses : {},
        blocked_ips: Array.isArray(blocked_ips) ? blocked_ips : [],
        system_log: Array.isArray(system_log) ? system_log.slice(0, 200) : [],
        pipelineSession: null,
        pipelineSteps: [],
        lastInjectionNotice: null,
        stats: stats && typeof stats === 'object'
          ? {
              total_devices: stats.total_devices ?? 0,
              high_risk: stats.high_risk ?? 0,
              blocked_ips: stats.blocked_ips ?? (Array.isArray(blocked_ips) ? blocked_ips.length : 0),
              honeypot_hits: stats.honeypot_hits ?? 0,
              threats_detected: stats.threats_detected ?? (Array.isArray(threats) ? threats.length : 0),
            }
          : {
              total_devices: Array.isArray(devices) ? devices.length : 0,
              high_risk: Array.isArray(devices)
                ? devices.filter((d) => d.risk_level === 'high' || d.risk_level === 'critical').length
                : 0,
              blocked_ips: Array.isArray(blocked_ips) ? blocked_ips.length : 0,
              honeypot_hits: Array.isArray(honeypot_hits) ? honeypot_hits.length : 0,
              threats_detected: Array.isArray(threats) ? threats.length : 0,
            },
      });
    } catch (e) {
      console.warn('[dashboard] Refresh hydration error:', e);
    }

    connect();

    const elapsed = Date.now() - started;
    const restMs = Math.max(0, 380 - elapsed);
    await new Promise((r) => setTimeout(r, restMs));
    setRefreshing(false);
    refreshingRef.current = false;
    return apiReachable;
  }, [connect]);

  useEffect(() => {
    connectFnRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connectFnRef.current = connect;
    connect();
    return () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      if (wsRef.current) {
        const w = wsRef.current;
        w.onclose = null;
        w.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { state, connected, refreshing, refreshAll };
}
