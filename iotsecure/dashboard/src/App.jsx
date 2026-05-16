import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Monitor, ShieldAlert, Ghost, Crosshair,
  Terminal, Menu, X, BarChart3, Layers, Lock,
  Download, Trash2, RefreshCw, Eraser, CheckCircle2, AlertCircle, Loader2, Sparkles,
} from 'lucide-react';
import clsx from 'clsx';

import AgentStatusPanel from './components/AgentStatusPanel';
import DeviceRiskCards from './components/DeviceRiskCards';
import ThreatFeed from './components/ThreatFeed';
import HoneypotLog from './components/HoneypotLog';
import NetworkMap from './components/NetworkMap';
import OrchestratorGraph from './components/OrchestratorGraph';
import AttackSimulator from './components/AttackSimulator';
import MissionControl from './components/MissionControl';
import PipelineRail from './components/PipelineRail';
import { useWebSocket } from './hooks/useWebSocket';

const CyberBackdrop = lazy(() => import('./components/CyberBackdrop'));

/* -- Animated Number -- */
function AnimatedNumber({ value, className }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const displayRef = useRef(0);
  useEffect(() => {
    const start = displayRef.current;
    const end = value;
    if (start === end) return;
    const startTime = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - startTime) / 600, 1);
      const next = Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3)));
      displayRef.current = next;
      setDisplay(next);
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  return <span className={className}>{display}</span>;
}

function SystemLog({ logs, filter, onClear }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  const filtered = useMemo(() => {
    if (!filter) return logs;
    return logs.filter(l => l.msg?.toLowerCase().includes(filter.toLowerCase()));
  }, [logs, filter]);

  const downloadLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iotsecure-trace-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const colorize = (msg) => {
    if (!msg) return '';
    const m = msg.toUpperCase();
    if (m.includes('[STAGING]')) return 'text-fuchsia-400';
    if (m.includes('[ERROR]') || m.includes('[FAIL]')) return 'text-red-400';
    if (m.includes('[WARN]')) return 'text-amber-400';
    if (m.includes('[THREAT]')) return 'text-orange-400';
    if (m.includes('[HONEYPOT]')) return 'text-pink-400';
    if (m.includes('[A2A]')) return 'text-purple-400';
    if (m.includes('[TRACE]')) return 'text-cyan-400';
    if (m.includes('[FIREWALL]')) return 'text-red-300';
    if (m.includes('[DISCOVERY]')) return 'text-blue-400';
    if (m.includes('[PROFILER]')) return 'text-violet-400';
    if (m.includes('[RESPONSE]')) return 'text-emerald-400';
    if (m.includes('[DECEPTION]')) return 'text-pink-300';
    if (m.includes('[ORCHESTRATOR]')) return 'text-cyan-300';
    if (m.includes('[SYSTEM]')) return 'text-green-400';
    return 'text-slate-500';
  };

  return (
    <div className="glass-card flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">System Log</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadLogs} title="Download Logs" className="p-1.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-cyan-400 transition-colors">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClear} title="Clear Logs" className="p-1.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div ref={ref} className="terminal-log flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-slate-600 text-[10px] uppercase font-bold tracking-widest">Awaiting Traces...</span>
          </div>
        ) : (
          filtered.slice(0, 100).map((log, i) => (
            <div key={i} className={clsx('py-0.5 text-[11px] font-mono leading-relaxed', colorize(log.msg))}>
              <span className="text-slate-700 mr-2 opacity-50">
                {log.time ? new Date(log.time * 1000).toLocaleTimeString([], { hour12: false }) : ''}
              </span>
              {log.msg}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* -- Tab Config -- */
const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'devices', label: 'Devices', icon: Monitor },
  { id: 'threats', label: 'Threats', icon: ShieldAlert },
  { id: 'honeypot', label: 'Honeypot', icon: Ghost },
  { id: 'network', label: 'Network', icon: Layers },
  { id: 'attack', label: 'Attack Sim', icon: Crosshair },
];

/* ========= MAIN APP ========= */
export default function App() {
  const { state, connected, refreshing, refreshAll } = useWebSocket();
  const [activeTab, setActiveTab] = useState('overview');
  const [logFilter, setLogFilter] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [layoutKey, setLayoutKey] = useState(0);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const dashboardState = state;
  const [lastCleared, setLastCleared] = useState(0);

  const showToast = (payload) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(payload);
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // Filter logs locally if user clicked "Clear"
  const localLogs = useMemo(() => {
    return (dashboardState.system_log || []).filter(l => l.time > lastCleared);
  }, [dashboardState.system_log, lastCleared]);

  const orchestratorStatus = dashboardState.agent_statuses?.orchestrator?.status || 'idle';

  // Derive active pipeline phase from which agent is currently running
  const currentPhase = useMemo(() => {
    const statuses = dashboardState.agent_statuses || {};
    if (statuses.discovery?.status === 'running') return 'discover';
    if (statuses.profiler?.status === 'running') return 'profile';
    if (statuses.threat_detector?.status === 'running') return 'analyse';
    if (statuses.deception?.status === 'running') return 'deceive';
    if (statuses.response?.status === 'running') return 'respond';
    if (orchestratorStatus === 'running') return 'running';
    return 'idle';
  }, [dashboardState.agent_statuses, orchestratorStatus]);

  const handleRefreshEverything = async () => {
    try {
      const ok = await refreshAll();
      setLastCleared(0);
      setLayoutKey((k) => k + 1);
      if (ok) {
        showToast({ type: 'ok', message: 'Live state synced — agents, devices, and logs updated.' });
      } else {
        showToast({
          type: 'err',
          message: 'API unreachable — reconnected live stream only. Start the backend on :8000.',
        });
      }
    } catch (err) {
      console.error('Refresh failed:', err);
      showToast({ type: 'err', message: 'Could not refresh. Check the console for details.' });
    }
  };

  const handleGlobalReset = async () => {
    try {
      const res = await fetch('/api/system/reset', { method: 'POST' });
      setLastCleared(Date.now() / 1000);
      await refreshAll();
      setLayoutKey((k) => k + 1);
      if (res.ok) {
        showToast({ type: 'ok', message: 'System wiped — fresh defence surface from the backend.' });
      } else {
        showToast({ type: 'err', message: 'Reset rejected by the server. Check API logs.' });
      }
    } catch (err) {
      console.error('Failed to reset system:', err);
      showToast({ type: 'err', message: 'Reset request failed. Try again when the API is online.' });
    }
  };

  // Count pipeline iterations from log
  const iterationCount = useMemo(() => {
    return (dashboardState.system_log || []).filter(l => l.msg?.includes('Pipeline complete')).length;
  }, [dashboardState.system_log]);

  return (
    <div className="relative isolate min-h-screen flex flex-col overflow-x-hidden bg-[#030712] text-slate-100">
      <Suspense fallback={null}>
        <CyberBackdrop />
      </Suspense>

      <div className="relative z-10 flex min-h-screen flex-1 flex-col">
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="fixed top-[4.25rem] left-1/2 z-[100] -translate-x-1/2 px-5 py-3 rounded-2xl border border-white/[0.08] bg-[#0c1324]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] flex items-center gap-3 max-w-[min(420px,calc(100vw-2rem))]"
          >
            {toast.type === 'ok' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            )}
            <p className="text-[12px] text-slate-200 leading-snug font-medium">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl">
        <div className="flex items-center gap-4 px-5 sm:px-8 py-3.5 sm:py-4 border-b border-cyan-500/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)] bg-gradient-to-r from-[#050a14]/94 via-[#070f1e]/92 to-[#050a14]/94">

          {/* Mobile toggle */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-5 lg:hidden text-slate-400 hover:text-white transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Brand */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-cyan-400/25 to-blue-600/25 border border-cyan-400/25 flex items-center justify-center shadow-[0_0_28px_rgba(34,211,238,0.18)] ring-1 ring-white/10">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="leading-tight">
              <h1 className="font-[Outfit,Inter,sans-serif] text-[18px] sm:text-[19px] font-extrabold bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent tracking-tight">
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

          {/* Stats & Actions — right (refresh is rightmost) */}
          <div className="ml-auto flex items-center gap-3 sm:gap-5 flex-wrap justify-end">
            <div className="flex items-center gap-2 sm:gap-3.5">
              {[
                { label: 'Devices', val: dashboardState.stats.total_devices, color: 'text-cyan-400' },
                { label: 'Threats', val: dashboardState.stats.threats_detected, color: 'text-amber-400' },
                { label: 'Blocked', val: dashboardState.stats.blocked_ips, color: 'text-red-400' },
                { label: 'Honeypot', val: dashboardState.stats.honeypot_hits, color: 'text-pink-400' },
              ].map(s => (
                <div key={s.label} className="stat-card hidden sm:flex flex-col items-center min-w-[4.5rem]">
                  <AnimatedNumber value={s.val} className={clsx('text-[22px] font-bold leading-none tabular-nums', s.color)} />
                  <span className="text-[8px] text-slate-500 uppercase tracking-[0.12em] font-semibold mt-1.5">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="w-px h-8 bg-white/[0.06] hidden md:block" aria-hidden />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGlobalReset}
                title="Wipe in-memory state on the server (destructive)"
                className="ux-btn flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-red-500/[0.08] hover:border-red-500/25 transition-all text-slate-400 hover:text-red-300 group"
              >
                <Eraser className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Hard reset</span>
              </button>

              <button
                type="button"
                onClick={handleRefreshEverything}
                disabled={refreshing}
                title="Reconnect stream and pull the latest snapshot from the API"
                className="ux-btn flex items-center gap-2 pl-3.5 pr-4 sm:pl-4 sm:pr-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/15 border border-cyan-500/25 hover:border-cyan-400/45 hover:shadow-[0_0_24px_rgba(6,182,212,0.12)] transition-all text-cyan-100 disabled:opacity-60 disabled:pointer-events-none ring-1 ring-white/[0.04]"
              >
                {refreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-300" aria-hidden />
                ) : (
                  <RefreshCw className="w-4 h-4 text-cyan-300" aria-hidden />
                )}
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-50/95">
                  {refreshing ? 'Syncing…' : 'Refresh all'}
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="header-glow h-px" />
      </header>

      {/* === BODY === */}
      <div className="flex flex-1 overflow-hidden">

        {/* -- SIDEBAR -- */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col overflow-hidden flex-shrink-0 border-r border-white/[0.07] bg-slate-950/45 backdrop-blur-2xl"
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
                      {tab.id === 'threats' && dashboardState.stats.threats_detected > 0 && (
                        <span className="badge bg-amber-500/15 text-amber-400 text-[9px]">{dashboardState.stats.threats_detected}</span>
                      )}
                      {tab.id === 'honeypot' && dashboardState.stats.honeypot_hits > 0 && (
                        <span className="badge bg-pink-500/15 text-pink-400 text-[9px] animate-pulse-glow">{dashboardState.stats.honeypot_hits}</span>
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

        {/* -- MAIN CONTENT -- */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 sm:p-8 max-w-[1680px] mx-auto space-y-7">

            <PipelineRail steps={dashboardState.pipelineSteps} agentStatuses={dashboardState.agent_statuses} />

            <AnimatePresence>
              {dashboardState.lastInjectionNotice && (
                <motion.div
                  key={String(dashboardState.lastInjectionNotice.ts ?? dashboardState.lastInjectionNotice.summary)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28 }}
                  className="rounded-2xl border border-fuchsia-500/25 bg-gradient-to-r from-fuchsia-500/10 via-violet-600/5 to-transparent px-5 py-3.5 flex items-start gap-3"
                >
                  <Sparkles className="w-5 h-5 text-fuchsia-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300/80 mb-1">
                      Stage narration · {(dashboardState.lastInjectionNotice.stage || 'signal').replace(/_/g, ' ')}
                    </p>
                    <p className="text-[12px] text-slate-200 leading-snug">{dashboardState.lastInjectionNotice.summary}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tab content with smooth transition */}
            <AnimatePresence mode="wait">
              <motion.section
                key={`${activeTab}-${layoutKey}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {activeTab === 'overview' && (
                  <div className="space-y-7">
                    <AgentStatusPanel agentStatuses={dashboardState.agent_statuses} orchestratorStatus={orchestratorStatus} />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
                      <div className="lg:col-span-2">
                        <OrchestratorGraph agentStatuses={dashboardState.agent_statuses} currentPhase={currentPhase} iteration={iterationCount} />
                      </div>
                      <MissionControl />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                      <ThreatFeed threats={dashboardState.threats} />
                      <DeviceRiskCards devices={dashboardState.devices} />
                    </div>
                  </div>
                )}

                {activeTab === 'devices' && (
                  <div className="space-y-7">
                    <DeviceRiskCards devices={dashboardState.devices} />
                    <NetworkMap devices={dashboardState.devices} />
                  </div>
                )}

                {activeTab === 'threats' && <ThreatFeed threats={dashboardState.threats} />}
                {activeTab === 'honeypot' && (
                  <HoneypotLog hits={dashboardState.honeypot_hits} systemLog={dashboardState.system_log} />
                )}
                {activeTab === 'network' && <NetworkMap devices={dashboardState.devices} />}

                {activeTab === 'attack' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                    <AttackSimulator />
                    <OrchestratorGraph agentStatuses={dashboardState.agent_statuses} currentPhase={orchestratorStatus} iteration={0} />
                  </div>
                )}
              </motion.section>
            </AnimatePresence>

            {/* System Log — always at bottom */}
            <section className="h-[300px]">
              <SystemLog 
                logs={localLogs} 
                filter={logFilter} 
                onClear={() => setLastCleared(Date.now() / 1000)}
              />
            </section>
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}
