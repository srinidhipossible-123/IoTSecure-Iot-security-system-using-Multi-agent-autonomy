import { motion } from 'framer-motion';
import { Play, Ghost, Zap, Activity, Crosshair, Radar } from 'lucide-react';

export default function MissionControl() {
  const triggerDemo = async () => {
    try {
      await fetch('/api/demo/autopilot', { method: 'POST' });
    } catch (err) { console.error(err); }
  };

  const runDiscoveryCycle = async () => {
    try {
      await fetch('/api/pipeline/run', { method: 'POST' });
    } catch (err) { console.error(err); }
  };

  const injectAttack = async () => {
    try {
      await fetch('/webhook/attack-sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attacker_ip: "192.168.1.15", target_ip: "192.168.1.1" })
      });
    } catch (err) { console.error(err); }
  };

  return (
    <div className="glass-card overflow-hidden relative">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
      
      <div className="flex items-center gap-3.5 mb-7 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center shadow-inner">
          <Activity className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="section-title text-[15px]">Mission Control</h2>
          <span className="section-subtitle text-[11px]">Manual overrides — use when autopilot polling is paused</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 relative z-10">
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={runDiscoveryCycle}
          className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.04] border border-cyan-500/20 hover:border-cyan-400/40 hover:bg-cyan-500/[0.06] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center">
            <Radar className="w-5 h-5 text-sky-300" />
          </div>
          <div className="text-left flex-1">
            <span className="block text-[11px] font-bold text-sky-300 uppercase tracking-widest">Run one scan cycle</span>
            <span className="text-[10px] text-slate-500 font-medium mt-1">Discovery → Profiler → Threat → Deception → Response</span>
          </div>
        </motion.button>

        {/* PRIMARY ACTION: AUTOPILOT */}
        <motion.button 
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={triggerDemo}
          className="group relative overflow-hidden flex items-center justify-between px-6 py-5 rounded-2xl bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 border border-white/10 hover:border-cyan-500/40 transition-all shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/40 transition-colors">
              <Play className="w-5 h-5 text-cyan-400 fill-cyan-400" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-cyan-400 uppercase tracking-widest">Autonomous Mode</span>
              <span className="text-[11px] text-slate-400 font-medium mt-0.5">Launch Full Incident Story</span>
            </div>
          </div>
          <Zap className="w-5 h-5 text-cyan-500/40 group-hover:text-cyan-400 transition-colors" />
        </motion.button>

        <div className="grid grid-cols-2 gap-3">
          {/* INJECT ATTACK */}
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={injectAttack}
            className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-red-500/[0.05] hover:border-red-500/30 transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
              <Crosshair className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-red-400 transition-colors uppercase tracking-tight">Inject Threat</span>
          </motion.button>

          {/* DECEPTION TRIGGER */}
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-pink-500/[0.05] hover:border-pink-500/30 transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
              <Ghost className="w-5 h-5 text-pink-400" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-pink-400 transition-colors uppercase tracking-tight">Honeypot Lure</span>
          </motion.button>
        </div>
      </div>

      {/* FOOTER STATUS */}
      <div className="mt-6 pt-5 border-t border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">System Ready</span>
        </div>
        <span className="text-[10px] text-slate-700 font-mono">v1.2.4-BETA</span>
      </div>
    </div>
  );
}
