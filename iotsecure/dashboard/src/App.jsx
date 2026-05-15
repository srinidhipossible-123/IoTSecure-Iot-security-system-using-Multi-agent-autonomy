import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Wifi, Monitor, ShieldAlert, Ghost, Crosshair,
  Terminal, Menu, X, BarChart3, Layers, Lock, Clock
} from 'lucide-react';
import clsx from 'clsx';

import AgentStatusPanel from './components/AgentStatusPanel';
import DeviceRiskCards from './components/DeviceRiskCards';
import ThreatFeed from './components/ThreatFeed';
import HoneypotLog from './components/HoneypotLog';
import NetworkMap from './components/NetworkMap';
import OrchestratorGraph from './components/OrchestratorGraph';
import AttackSimulator from './components/AttackSimulator';
import { useWebSocket } from './hooks/useWebSocket';

/* ── Animated Number ── */
function AnimatedNumber({ value, className }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const start = display;
    const end = value;
    if (start === end) return;
    const startTime = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - startTime) / 600, 1);
      setDisplay(Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  return <span className={className}>{display}</span>;
}

/* ── System Log ── */
function SystemLog({ logs, filter }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  const filtered = useMemo(() => {
    if (!filter) return logs;
    return logs.filter(l => l.msg?.toLowerCase().includes(filter.toLowerCase()));
  }, [logs, filter]);

  const colorize = (msg) => {
    if (!msg) return '';
    if (msg.includes('[ERROR]') || msg.includes('[FAIL]')) return 'text-red-400';
    if (msg.includes('[WARN]')) return 'text-amber-400';
    if (msg.includes('[THREAT]')) return 'text-orange-400';
    if (msg.includes('[HONEYPOT]')) return 'text-pink-400';
    if (msg.includes('[A2A]')) return 'text-purple-400';
    if (msg.includes('[TRACE]')) return 'text-cyan-400';
    if (msg.includes('[FIREWALL]')) return 'text-red-300';
    if (msg.includes('[DISCOVERY]')) return 'text-blue-400';
    if (msg.includes('[PROFILER]')) return 'text-violet-400';
    if (msg.includes('[RESPONSE]')) return 'text-emerald-400';
    if (msg.includes('[DECEPTION]')) return 'text-pink-300';
    if (msg.includes('[ORCHESTRATOR]')) return 'text-cyan-300';
    if (msg.includes('[SYSTEM]')) return 'text-green-400';
    return 'text-slate-500';
  };

  return (
    <div ref={ref} className="terminal-log h-[220px] overflow-y-auto">
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <span className="text-slate-600 text-xs">Waiting for events...</span>
        </div>
      ) : (
        filtered.slice(0, 100).map((log, i) => (
          <div key={i} className={clsx('py-0.5', colorize(log.msg))}>
            <span className="text-slate-700 mr-3 select-none">
              {log.time ? new Date(log.time * 1000).toLocaleTimeString() : ''}
            </span>
            {log.msg}
          </div>
        ))
      )}
    </div>
  );
}

/* ── Tab Config ── */
const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'devices', label: 'Devices', icon: Monitor },
  { id: 'threats', label: 'Threats', icon: ShieldAlert },
  { id: 'honeypot', label: 'Honeypot', icon: Ghost },
  { id: 'network', label: 'Network', icon: Layers },
  { id: 'attack', label: 'Attack Sim', icon: Crosshair },
];

/* ═════════════════════════════ MAIN APP ═════════════════════════════ */
export default function App() {
  const { state, connected } = useWebSocket('ws://localhost:8000/ws');
  const [activeTab, setActiveTab] = useState('overview');
  const [logFilter, setLogFilter] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const orchestratorStatus = state.agent_statuses?.orchestrator?.status || 'idle';

  // Derive active pipeline phase from which agent is currently running
  const currentPhase = useMemo(() => {
    const statuses = state.agent_statuses || {};
    if (statuses.discovery?.status === 'running') return 'discover';
    if (statuses.profiler?.status === 'running') return 'profile';
    if (statuses.threat_detector?.status === 'running') return 'analyse';
    if (statuses.deception?.status === 'running') return 'deceive';
    if (statuses.response?.status === 'running') return 'respond';
    if (orchestratorStatus === 'running') return 'running';
    return 'idle';
  }, [state.agent_statuses, orchestratorStatus]);

  // Count pipeline iterations from log
  const iterationCount = useMemo(() => {
    return (state.system_log || []).filter(l => l.msg?.includes('Pipeline complete')).length;
  }, [state.system_log]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>

      {/* ══════════ HEADER ══════════ */}
      <header className="sticky top-0 z-30">
        <div className="flex items-center px-8 py-4 bg-[#080d1a]/90 backdrop-blur-2xl border-b border-white/[0.04]">

          {/* Mobile toggle */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-5 lg:hidden text-slate-400 hover:text-white transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Brand */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/15 flex items-center justify-center shadow-lg shadow-cyan-500/5">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="leading-tight">
              <h1 className="text-[17px] font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                IoTSecure
              </h1>
              <span className="text-[9px] text-slate-600 font-semibold tracking-[0.15em] uppercase">Agentic AI Defence</span>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 ml-6">
            <motion.div
              className={clsx('w-2 h-2 rounded-full', connected ? 'bg-emerald-400' : 'bg-red-500')}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className={clsx('text-[10px] font-semibold tracking-wider',
              connected ? 'text-emerald-400/70' : 'text-red-400/70')}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Stats — right */}
          <div className="ml-auto flex items-center gap-3.5">
            {[
              { label: 'Devices', val: state.stats.total_devices, color: 'text-cyan-400' },
              { label: 'Threats', val: state.stats.threats_detected, color: 'text-amber-400' },
              { label: 'Blocked', val: state.stats.blocked_ips, color: 'text-red-400' },
              { label: 'Honeypot', val: state.stats.honeypot_hits, color: 'text-pink-400' },
            ].map(s => (
              <div key={s.label} className="stat-card hidden sm:flex flex-col items-center">
                <AnimatedNumber value={s.val} className={clsx('text-[22px] font-bold leading-none', s.color)} />
                <span className="text-[8px] text-slate-500 uppercase tracking-[0.12em] font-semibold mt-1.5">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="header-glow h-px" />
      </header>

      {/* ══════════ BODY ══════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col overflow-hidden flex-shrink-0 border-r border-white/[0.04] bg-[#080d1a]/40"
            >
              {/* Nav label */}
              <div className="px-6 pt-7 pb-3">
                <span className="text-[10px] text-slate-600 font-bold tracking-[0.15em] uppercase">Navigation</span>
              </div>

              {/* Nav items */}
              <nav className="flex-1 px-4 space-y-1.5">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={clsx('sidebar-nav-item', isActive && 'active')}
                    >
                      <Icon className={clsx('w-[18px] h-[18px] flex-shrink-0',
                        isActive ? 'text-cyan-400' : 'text-slate-500')} />
                      <span className="flex-1">{tab.label}</span>
                      {tab.id === 'threats' && state.stats.threats_detected > 0 && (
                        <span className="badge bg-amber-500/15 text-amber-400 text-[9px]">{state.stats.threats_detected}</span>
                      )}
                      {tab.id === 'honeypot' && state.stats.honeypot_hits > 0 && (
                        <span className="badge bg-pink-500/15 text-pink-400 text-[9px] animate-pulse-glow">{state.stats.honeypot_hits}</span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Sidebar footer */}
              <div className="p-5 border-t border-white/[0.04] space-y-4">
                <div>
                  <label className="text-[9px] text-slate-600 font-bold tracking-[0.12em] uppercase block mb-2">Filter Logs</label>
                  <input
                    type="text"
                    value={logFilter}
                    onChange={e => setLogFilter(e.target.value)}
                    placeholder="e.g. THREAT, A2A..."
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[11px] text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/20 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2.5 px-1">
                  <Lock className="w-3.5 h-3.5 text-slate-700" />
                  <span className="text-[10px] text-slate-700 font-medium">Secured by HMAC-SHA256</span>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-[1600px] mx-auto space-y-7">

            {/* Agent Pipeline — always on top */}
            <section>
              <AgentStatusPanel agentStatuses={state.agent_statuses} orchestratorStatus={orchestratorStatus} />
            </section>

            {/* Tab content with smooth transition */}
            <AnimatePresence mode="wait">
              <motion.section
                key={activeTab}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {activeTab === 'overview' && (
                  <div className="space-y-7">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                      <OrchestratorGraph agentStatuses={state.agent_statuses} currentPhase={currentPhase} iteration={iterationCount} />
                      <ThreatFeed threats={state.threats} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                      <DeviceRiskCards devices={state.devices} />
                      <HoneypotLog hits={state.honeypot_hits} />
                    </div>
                  </div>
                )}

                {activeTab === 'devices' && (
                  <div className="space-y-7">
                    <DeviceRiskCards devices={state.devices} />
                    <NetworkMap devices={state.devices} />
                  </div>
                )}

                {activeTab === 'threats' && <ThreatFeed threats={state.threats} />}
                {activeTab === 'honeypot' && <HoneypotLog hits={state.honeypot_hits} />}
                {activeTab === 'network' && <NetworkMap devices={state.devices} />}

                {activeTab === 'attack' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                    <AttackSimulator />
                    <OrchestratorGraph agentStatuses={state.agent_statuses} currentPhase={orchestratorStatus} iteration={0} />
                  </div>
                )}
              </motion.section>
            </AnimatePresence>

            {/* System Log — always at bottom */}
            <section className="glass-card">
              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-9 h-9 rounded-[12px] bg-emerald-500/10 border border-emerald-500/12 flex items-center justify-center">
                  <Terminal className="w-[18px] h-[18px] text-emerald-400" />
                </div>
                <div>
                  <h2 className="section-title">System Log</h2>
                  <span className="section-subtitle">Live terminal feed · color-coded by agent</span>
                </div>
                <div className="ml-auto flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
                  <span className="text-[10px] text-slate-500 font-medium">{state.system_log.length} events</span>
                </div>
              </div>
              <SystemLog logs={state.system_log} filter={logFilter} />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
