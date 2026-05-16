import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Radar, Cpu, ShieldAlert, Ghost, Zap, Orbit } from 'lucide-react';

const META = [
  { key: 'discovery', label: 'Discover', icon: Radar },
  { key: 'profiler', label: 'Profiler', icon: Cpu },
  { key: 'threat_detector', label: 'Threat', icon: ShieldAlert },
  { key: 'deception', label: 'Deceive', icon: Ghost },
  { key: 'response', label: 'Respond', icon: Zap },
];

export default function PipelineRail({ steps, agentStatuses }) {
  const last = steps?.length ? steps[steps.length - 1] : null;
  const highlightKey = last?.node_key;

  const activity = (agentId) => agentStatuses?.[agentId]?.status === 'running';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#0a1020]/98 via-[#0c1528]/95 to-[#080d18]/98 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(115deg, transparent 40%, rgba(6,182,212,0.07) 48%, transparent 55%)',
        }}
      />
      <div className="relative z-10 px-5 py-4 sm:px-7 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_24px_rgba(6,182,212,0.12)]">
              <Orbit className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-white tracking-tight font-[Outfit,Inter,sans-serif]">
                Autonomous duty cycle
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl leading-relaxed">
                Each cell lights as LangGraph hands state to the next agent. JSONL audit mirrors this on disk under{' '}
                <span className="text-cyan-600/90 font-mono text-[10px]">logs/audit/</span>.
              </p>
            </div>
          </div>
          {last && (
            <div className="text-right sm:pl-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Live beat</p>
              <p className="text-[12px] font-semibold text-cyan-100/90 truncate max-w-[220px]">{last.title}</p>
              <p className="text-[10px] text-slate-500 truncate max-w-[280px]">{last.subtitle}</p>
            </div>
          )}
        </div>

        <div className="relative flex flex-wrap items-stretch gap-2 sm:gap-0 sm:flex-nowrap">
          {META.map((cell, i) => {
            const Icon = cell.icon;
            const done = steps?.some((s) => s.node_key === cell.key);
            const pulse = highlightKey === cell.key || activity(cell.key);
            const cool = done && !pulse;

            return (
              <div key={cell.key} className="flex flex-1 min-w-[calc(50%-4px)] sm:min-w-0 items-center">
                <motion.div
                  layout
                  className={clsx(
                    'flex-1 rounded-xl border px-3 py-2.5 sm:py-3 transition-colors duration-300',
                    pulse && 'border-cyan-400/45 bg-cyan-500/[0.07] shadow-[0_0_32px_rgba(6,182,212,0.12)]',
                    cool && !pulse && 'border-emerald-500/20 bg-emerald-500/[0.03]',
                    !done && !pulse && 'border-white/[0.05] bg-white/[0.02]',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={clsx(
                        'flex h-8 w-8 items-center justify-center rounded-lg border',
                        pulse && 'border-cyan-400/30 bg-cyan-500/15',
                        cool && !pulse && 'border-emerald-500/25 bg-emerald-500/10',
                        !done && !pulse && 'border-white/10 bg-black/20',
                      )}
                    >
                      <Icon className={clsx('h-4 w-4', pulse && 'text-cyan-200', cool && 'text-emerald-400', !done && 'text-slate-600')} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{cell.label}</div>
                      <div className={clsx('text-[9px] truncate', pulse ? 'text-cyan-300/80' : 'text-slate-600')}>
                        {pulse ? 'Executing…' : done ? 'Committed' : 'Queued'}
                      </div>
                    </div>
                  </div>
                </motion.div>
                {i < META.length - 1 && (
                  <div className="hidden sm:block w-px h-8 mx-0.5 shrink-0 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
