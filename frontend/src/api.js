const API_BASE = 'http://localhost:8001';

async function fetchApi(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`API error [${endpoint}]:`, e);
    return null;
  }
}

export async function getHealth() { return fetchApi('/api/health'); }
export async function getDevices() { return fetchApi('/api/devices'); }
export async function getIncidents() { return fetchApi('/api/incidents'); }
export async function getTraces() { return fetchApi('/api/traces'); }
export async function getStats() { return fetchApi('/api/stats'); }
export async function getFirewall() { return fetchApi('/api/firewall'); }
export async function getHoneypots() { return fetchApi('/api/honeypots'); }

export async function scanNetwork() {
  try {
    const res = await fetch(`${API_BASE}/api/scan`, { method: 'POST' });
    return await res.json();
  } catch (e) {
    console.error('Scan error:', e);
    return null;
  }
}

export async function triggerDemo(mode = 'honeytoken') {
  try {
    const res = await fetch(`${API_BASE}/api/demo/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    return await res.json();
  } catch (e) {
    console.error('Demo trigger error:', e);
    return null;
  }
}
