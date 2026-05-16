import { Ghost, AlertCircle, Inbox, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const ACTIVITY_PREFIX = /^\[(HONEYPOT|DECEPTION|CANARY)\]/i;

function isHoneypotRelatedLog(entry) {
  const m = String(entry?.msg ?? '');
  if (ACTIVITY_PREFIX.test(m)) return true;
  if (/^\[STAGING\]/i.test(m) && /deception|honeypot|canary|honey/i.test(m)) return true;
  return false;
}

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleTimeString();
}

function activityLineTone(msg) {
  if (/^\[HONEYPOT]/i.test(msg)) return 'text-cyan-300/90 border-l-cyan-500/55';
  if (/^\[DECEPTION]/i.test(msg)) return 'text-fuchsia-300/90 border-l-fuchsia-500/55';
  if (/^\[CANARY]/i.test(msg)) return 'text-amber-300/90 border-l-amber-500/55';
  if (/^\[STAGING]/i.test(msg)) return 'text-violet-300/85 border-l-violet-500/50';
  return 'text-slate-400 border-l-slate-500/40';
}

export default function HoneypotLog({ hits, systemLog = [] }) {
  const honeypotActivity = Array.isArray(systemLog)
    ? systemLog.filter((e) => e?.msg && isHoneypotRelatedLog(e))
    : [];

  return (
    <div className="glass-card space-y-7">
      <div className="flex items-center gap-3.5 mb-2">
        <div className="w-9 h-9 rounded-[12px] bg-pink-500/10 border border-pink-500/12 flex items-center justify-center">
          <Ghost className="w-[18px] h-[18px] text-pink-400" />
        </div>
        <div>
          <h2 className="section-title">Honeypot Log</h2>
          <span className="section-subtitle">Deception events, listens, canaries — plus TCP trap hits below</span>
        </div>
        <span className="ml-auto badge bg-pink-500/12 text-pink-400 animate-pulse-glow">{hits?.length || 0} hits</span>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Radio className="w-4 h-4 text-pink-400/80" aria-hidden />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Trap &amp; deception activity</h3>
          <span className="badge bg-white/[0.04] text-slate-500 text-[9px]">{honeypotActivity.length} lines</span>
        </div>
        <div className="max-h-[220px] overflow-y-auto rounded-2xl border border-white/[0.04] bg-black/[0.12]">
          {honeypotActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <p className="text-slate-500 text-xs font-medium">No deception / honeypot log lines yet</p>
              <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                When the deception agent deploys traps, listens, and tokens, entries tagged [DECEPTION], [HONEYPOT], [CANARY],
                or relevant [STAGING] lines appear here. Actual attacker TCP connections populate the hits table below.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {honeypotActivity.map((e, i) => (
                <li
                  key={`${e.time}-${i}-${e.msg?.slice?.(0, 24)}`}
                  className={clsx(
                    'flex gap-3 px-4 py-2.5 text-[11px] leading-snug border-l-[3px] font-mono',
                    activityLineTone(e.msg || ''),
                  )}
                >
                  <span className="flex-shrink-0 text-slate-600 tabular-nums w-[4.65rem]">{formatTime(e.time)}</span>
                  <span className="text-slate-300/95 break-all">{e.msg}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-slate-500" aria-hidden />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">TCP fingerprinted hits</h3>
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
      </section>
    </div>
  );
}
