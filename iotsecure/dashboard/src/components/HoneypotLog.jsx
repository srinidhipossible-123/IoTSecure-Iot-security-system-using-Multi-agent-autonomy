import { Ghost, AlertCircle, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleTimeString();
}

export default function HoneypotLog({ hits }) {
  return (
    <div className="glass-card">
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-9 h-9 rounded-[12px] bg-pink-500/10 border border-pink-500/12 flex items-center justify-center">
          <Ghost className="w-[18px] h-[18px] text-pink-400" />
        </div>
        <div>
          <h2 className="section-title">Honeypot Log</h2>
          <span className="section-subtitle">Trap interactions & attacker fingerprints</span>
        </div>
        <span className="ml-auto badge bg-pink-500/12 text-pink-400 animate-pulse-glow">{hits?.length || 0} hits</span>
      </div>

      <div className="overflow-x-auto max-h-[360px] overflow-y-auto rounded-2xl border border-white/[0.04]">
        {(!hits || hits.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Inbox className="w-11 h-11 text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm font-medium">No honeypot interactions yet</p>
            <p className="text-slate-600 text-xs mt-1">Traps are set and waiting</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.05] text-slate-500 text-left">
                <th className="py-3.5 px-5 font-semibold text-[10px] uppercase tracking-[0.08em]">Time</th>
                <th className="py-3.5 px-5 font-semibold text-[10px] uppercase tracking-[0.08em]">Attacker IP</th>
                <th className="py-3.5 px-5 font-semibold text-[10px] uppercase tracking-[0.08em]">Ports</th>
                <th className="py-3.5 px-5 font-semibold text-[10px] uppercase tracking-[0.08em]">Payloads</th>
                <th className="py-3.5 px-5 font-semibold text-[10px] uppercase tracking-[0.08em]">Canary</th>
              </tr>
            </thead>
            <tbody>
              {hits.map((hit, i) => (
                <motion.tr key={i}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className={clsx(
                    'border-b border-white/[0.03] transition-colors',
                    hit.canary_triggered ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06]' : 'hover:bg-white/[0.02]'
                  )}>
                  <td className="py-3.5 px-5 text-slate-500 font-mono">{formatTime(hit.timestamp)}</td>
                  <td className="py-3.5 px-5 text-white font-mono font-semibold">{hit.attacker_ip}</td>
                  <td className="py-3.5 px-5">
                    <div className="flex flex-wrap gap-1.5">
                      {(hit.ports_tried || []).map(p => (
                        <span key={p} className="badge bg-white/[0.04] text-slate-400">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-slate-500">{hit.payloads?.length || 0} captured</td>
                  <td className="py-3.5 px-5">
                    {hit.canary_triggered ? (
                      <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" /> Triggered!
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
