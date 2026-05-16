import { motion } from 'framer-motion';
import { Search, Cpu, ShieldAlert, Ghost, Zap, Radio, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

const AGENTS = [
  { id: 'discovery', label: 'Discovery', icon: Search, color: '#06b6d4', desc: 'Network scanner', proof: 'ARP + subnet scan' },
  { id: 'profiler', label: 'Profiler', icon: Cpu, color: '#8b5cf6', desc: 'CVE risk scorer', proof: 'Risk model' },
  { id: 'threat_detector', label: 'Threat Detector', icon: ShieldAlert, color: '#f59e0b', desc: 'LLM analyst', proof: 'LLM analysis' },
  { id: 'deception', label: 'Deception', icon: Ghost, color: '#ec4899', desc: 'Honeypot controller', proof: 'Honeypot' },
  { id: 'response', label: 'Response', icon: Zap, color: '#ef4444', desc: 'Firewall + alerts', proof: 'Firewall' },
];

const STATUS_COLORS = {
  idle: '#475569',
  running: '#10b981',
  error: '#ef4444',
  waiting: '#f59e0b',
};

export default function AgentStatusPanel({ agentStatuses, orchestratorStatus }) {
  return (
    <div className="glass-card relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 blur-3xl rounded-full -ml-32 -mb-32 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3.5 mb-8 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/15 flex items-center justify-center shadow-lg shadow-cyan-500/5">
          <Radio className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="section-title text-[15px]">Agentic Pipeline</h2>
          <span className="section-subtitle text-[11px]">Autonomous Multi-Agent Orchestration Flow</span>
        </div>
        {orchestratorStatus && (
          <div className="ml-auto px-4 py-2 rounded-xl bg-[#0a0f1c] border border-white/[0.04] flex items-center gap-3 shadow-inner">
            <span className={clsx(
              'w-2 h-2 rounded-full',
              orchestratorStatus === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            )} />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Orchestrator: <span className={orchestratorStatus === 'running' ? 'text-emerald-400' : 'text-slate-500'}>{orchestratorStatus}</span>
            </span>
          </div>
        )}
      </div>

      {/* Pipeline Visualizer */}
      <div className="relative z-10 flex flex-nowrap items-stretch justify-between gap-2 overflow-x-auto pb-4 custom-scrollbar">
        {AGENTS.map((agent, idx) => {
          const status = agentStatuses?.[agent.id] || {};
          const isRunning = status.status === 'running';
          const isError = status.status === 'error';
          const Icon = agent.icon;
          const taskLine = status.task || status.current_task || '';

          return (
            <div key={agent.id} className="flex items-center gap-2 shrink-0">
              <motion.div
                className={clsx(
                  'relative flex flex-col items-start px-5 py-5 rounded-2xl w-[175px] border transition-all h-full',
                  isRunning ? 'border-cyan-500/30 bg-cyan-500/[0.04] shadow-[0_0_30px_rgba(6,182,212,0.08)]' :
                  isError ? 'border-red-500/30 bg-red-500/[0.04]' :
                  'border-white/[0.06] bg-[#0a0f1c]/50 hover:bg-[#0d1324] hover:border-white/[0.1]'
                )}
                animate={{
                  y: isRunning ? -4 : 0,
                  scale: isRunning ? 1.02 : 1
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Active scanline effect */}
                {isRunning && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl border border-cyan-400/40 pointer-events-none"
                    animate={{ opacity: [0.2, 0.8, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-cyan-400/10 to-transparent rounded-t-2xl" />
                  </motion.div>
                )}

                {/* Icon & Status Indicator */}
                <div className="flex items-start justify-between w-full mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner"
                    style={{ backgroundColor: `${agent.color}15`, border: `1px solid ${agent.color}25` }}>
                    <Icon className="w-5 h-5" style={{ color: agent.color }} />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span
                      className={clsx(
                        "w-2.5 h-2.5 rounded-full border-2 border-[#0a0f1c]",
                        isRunning ? "animate-pulse" : ""
                      )}
                      style={{ backgroundColor: STATUS_COLORS[status.status] || STATUS_COLORS.idle }}
                    />
                    <span className={clsx(
                      'text-[9px] font-bold uppercase tracking-wider',
                      isRunning ? 'text-emerald-400' :
                      isError ? 'text-red-400' :
                      'text-slate-500'
                    )}>
                      {status.status || 'idle'}
                    </span>
                  </div>
                </div>

                {/* Agent Info */}
                <div className="flex-1 w-full">
                  <h3 className="text-[13px] font-bold text-white tracking-tight mb-1">{agent.label}</h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed mb-2">{agent.desc}</p>
                  
                  {/* Task string if active, otherwise proof tag */}
                  {taskLine ? (
                    <div className="mt-3 p-2 rounded-lg bg-[#060a14]/60 border border-white/[0.04]">
                      <p className="text-[9px] text-cyan-300/80 font-mono leading-tight line-clamp-2">
                        {'>'} {taskLine}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-auto pt-3 flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-cyan-500/50" />
                      <span className="text-[9px] text-cyan-500/60 font-bold uppercase tracking-[0.1em]">{agent.proof}</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Arrow Connector */}
              {idx < AGENTS.length - 1 && (
                <div className="flex items-center px-1 shrink-0">
                  <motion.div
                    animate={isRunning ? { 
                      x: [0, 5, 0],
                      opacity: [0.3, 1, 0.3]
                    } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className={clsx(
                      "w-4 h-4",
                      isRunning ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "text-white/10"
                    )} />
                  </motion.div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
