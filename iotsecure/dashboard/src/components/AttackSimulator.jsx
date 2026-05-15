import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, Loader2, CheckCircle, XCircle, Zap } from 'lucide-react';

export default function AttackSimulator() {
  const [ip, setIp] = useState('192.168.43.99');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const triggerAttack = async () => {
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch('/webhook/attack-sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attacker_ip: ip }),
      });
      const data = await resp.json();
      setResult({ success: true, message: data.status || 'Attack simulation started!' });
    } catch (err) {
      setResult({ success: false, message: `Failed: ${err.message}` });
    }
    setLoading(false);
  };

  return (
    <div className="glass-card">
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-9 h-9 rounded-[12px] bg-red-500/10 border border-red-500/12 flex items-center justify-center">
          <Crosshair className="w-[18px] h-[18px] text-red-400" />
        </div>
        <div>
          <h2 className="section-title">Attack Simulator</h2>
          <span className="section-subtitle">Trigger agent pipeline for demo</span>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-[0.1em] block mb-2.5">
            Attacker IP Address
          </label>
          <input type="text" value={ip} onChange={e => setIp(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/25 transition-colors placeholder:text-slate-700"
            placeholder="192.168.43.99" />
        </div>

        <motion.button onClick={triggerAttack} disabled={loading}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 text-white cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            boxShadow: '0 4px 24px rgba(239,68,68,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Running Simulation...</>
            : <><Zap className="w-4 h-4" /> Simulate Attack</>}
        </motion.button>

        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 p-4 rounded-xl text-xs ${
              result.success ? 'bg-emerald-500/[0.05] border border-emerald-500/12 text-emerald-400'
                : 'bg-red-500/[0.05] border border-red-500/12 text-red-400'}`}>
            {result.success ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <span>{result.message}</span>
          </motion.div>
        )}

        <div className="rounded-xl bg-white/[0.015] border border-white/[0.04] p-5">
          <p className="text-[11px] text-slate-500 leading-[1.7]">
            Triggers a full attack simulation from the specified IP. The autonomous agent pipeline will activate:
            <span className="text-cyan-400/80 font-medium"> Discovery</span> →
            <span className="text-purple-400/80 font-medium"> Profiler</span> →
            <span className="text-amber-400/80 font-medium"> Threat Detector</span> →
            <span className="text-pink-400/80 font-medium"> Deception</span> →
            <span className="text-red-400/80 font-medium"> Response</span>.
            Watch the dashboard update in real time.
          </p>
        </div>
      </div>
    </div>
  );
}
