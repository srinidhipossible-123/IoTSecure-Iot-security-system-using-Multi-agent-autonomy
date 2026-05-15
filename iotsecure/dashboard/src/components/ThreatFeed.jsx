import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle, AlertOctagon, Info, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', bg: 'bg-red-500/[0.05]', border: 'border-red-500/15', icon: AlertOctagon, label: 'CRITICAL' },
  high:     { color: '#f97316', bg: 'bg-orange-500/[0.05]', border: 'border-orange-500/15', icon: AlertTriangle, label: 'HIGH' },
  medium:   { color: '#f59e0b', bg: 'bg-yellow-500/[0.05]', border: 'border-yellow-500/15', icon: AlertTriangle, label: 'MEDIUM' },
  low:      { color: '#3b82f6', bg: 'bg-blue-500/[0.05]', border: 'border-blue-500/15', icon: Info, label: 'LOW' },
};

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleTimeString();
}

export default function ThreatFeed({ threats }) {
  return (
    <div className="glass-card flex flex-col">
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-9 h-9 rounded-[12px] bg-amber-500/10 border border-amber-500/12 flex items-center justify-center">
          <ShieldAlert className="w-[18px] h-[18px] text-amber-400" />
        </div>
        <div>
          <h2 className="section-title">Threat Feed</h2>
          <span className="section-subtitle">Real-time security events</span>
        </div>
        <span className="ml-auto badge bg-amber-500/12 text-amber-400">{threats?.length || 0} events</span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[380px] space-y-3 pr-1">
        {(!threats || threats.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <ShieldCheck className="w-11 h-11 text-emerald-500/25 mb-3" />
            <p className="text-slate-500 text-sm font-medium">No threats detected</p>
            <p className="text-slate-600 text-xs mt-1">Your network is clean</p>
          </div>
        ) : (
          <AnimatePresence>
            {threats.map((threat, i) => {
              const config = SEVERITY_CONFIG[threat.severity] || SEVERITY_CONFIG.low;
              const Icon = config.icon;
              return (
                <motion.div key={threat.event_id || i}
                  initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}
                  className={clsx('p-4 rounded-xl border', config.bg, config.border)}>
                  <div className="flex items-start gap-3">
                    <motion.div className="flex-shrink-0 mt-0.5"
                      animate={threat.severity === 'critical' ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 1, repeat: Infinity }}>
                      <Icon className="w-4 h-4" style={{ color: config.color }} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="badge" style={{ backgroundColor: `${config.color}12`, color: config.color }}>{config.label}</span>
                        <span className="text-xs font-medium text-white">{(threat.threat_type || '').replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-slate-600 ml-auto">{formatTime(threat.timestamp)}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mb-1.5">
                        Source: {threat.source_ip}
                        {threat.confidence > 0 && <span className="ml-3 text-slate-500">Confidence: {Math.round(threat.confidence * 100)}%</span>}
                      </div>
                      {threat.llm_reasoning && <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{threat.llm_reasoning}</p>}
                      {threat.mitigated && <span className="inline-block mt-2 badge bg-emerald-500/12 text-emerald-400">✓ Mitigated: {threat.mitigation_action}</span>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
