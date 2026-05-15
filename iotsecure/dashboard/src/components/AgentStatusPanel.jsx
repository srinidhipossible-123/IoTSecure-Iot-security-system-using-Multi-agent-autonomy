import { motion } from 'framer-motion';
import { Search, Cpu, ShieldAlert, Ghost, Zap, Radio, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

const AGENTS = [
  { id: 'discovery', label: 'Discovery', icon: Search, color: '#06b6d4', desc: 'Network Scanner' },
  { id: 'profiler', label: 'Profiler', icon: Cpu, color: '#8b5cf6', desc: 'CVE Risk Scorer' },
  { id: 'threat_detector', label: 'Threat Detector', icon: ShieldAlert, color: '#f59e0b', desc: 'LLM Analyst' },
  { id: 'deception', label: 'Deception', icon: Ghost, color: '#ec4899', desc: 'Honeypot Controller' },
  { id: 'response', label: 'Response', icon: Zap, color: '#ef4444', desc: 'Firewall + Alerts' },
];

const STATUS_COLORS = {
  idle: '#475569',
  running: '#10b981',
  error: '#ef4444',
  waiting: '#f59e0b',
};

export default function AgentStatusPanel({ agentStatuses, orchestratorStatus }) {
  return (
    <div className="glass-card">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-7">
        <div className="w-9 h-9 rounded-[12px] bg-cyan-500/10 border border-cyan-500/12 flex items-center justify-center">
          <Radio className="w-[18px] h-[18px] text-cyan-400" />
        </div>
        <div>
          <h2 className="section-title">Agent Pipeline</h2>
          <span className="section-subtitle">Multi-agent orchestration flow</span>
        </div>
        {orchestratorStatus && (
          <div className="ml-auto flex items-center gap-2.5">
            <span className={clsx(
              'w-2 h-2 rounded-full',
              orchestratorStatus === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            )} />
            <span className={clsx(
              'text-[11px] font-medium',
              orchestratorStatus === 'running' ? 'text-emerald-400' : 'text-slate-500'
            )}>
              Orchestrator: {orchestratorStatus}
            </span>
          </div>
        )}
      </div>

      {/* Pipeline flow */}
      <div className="flex items-stretch gap-4 overflow-x-auto pb-2">
        {AGENTS.map((agent, i) => {
          const status = agentStatuses[agent.id] || {};
          const isRunning = status.status === 'running';
          const isError = status.status === 'error';
          const Icon = agent.icon;

          return (
            <div key={agent.id} className="flex items-center gap-4">
              <motion.div
                className={clsx(
                  'relative flex flex-col items-center px-6 py-5 rounded-2xl min-w-[130px] border transition-all',
                  isRunning ? 'border-emerald-500/25 bg-emerald-500/[0.05]' :
                  isError ? 'border-red-500/25 bg-red-500/[0.05]' :
                  'border-white/[0.05] bg-white/[0.015]'
                )}
                animate={isRunning ? {
                  boxShadow: ['0 0 0px rgba(16,185,129,0)', '0 0 30px rgba(16,185,129,0.12)', '0 0 0px rgba(16,185,129,0)']
                } : {}}
                transition={isRunning ? { duration: 1.5, repeat: Infinity } : {}}
              >
                {isRunning && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-emerald-400/30"
                    animate={{ opacity: [0.15, 0.7, 0.15] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}

                <div className="relative mb-3">
                  <div className="w-11 h-11 rounded-[14px] flex items-center justify-center"
                    style={{ backgroundColor: `${agent.color}12` }}>
                    <Icon className="w-5 h-5" style={{ color: agent.color }} />
                  </div>
                  <span
                    className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{
                      backgroundColor: STATUS_COLORS[status.status] || STATUS_COLORS.idle,
                      borderColor: 'var(--bg-primary)'
                    }}
                  />
                </div>

                <span className="text-[13px] font-semibold text-white text-center leading-tight">{agent.label}</span>
                <span className="text-[10px] text-slate-500 text-center mt-1">{agent.desc}</span>

                <span className={clsx(
                  'mt-3 badge',
                  isRunning ? 'bg-emerald-500/12 text-emerald-400' :
                  isError ? 'bg-red-500/12 text-red-400' :
                  'bg-white/[0.03] text-slate-500'
                )}>
                  {status.status || 'idle'}
                </span>
              </motion.div>

              {/* Arrow */}
              {i < AGENTS.length - 1 && (
                <motion.div
                  className="flex items-center flex-shrink-0"
                  animate={isRunning ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.15 }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <div className="w-5 h-px bg-slate-600" />
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
