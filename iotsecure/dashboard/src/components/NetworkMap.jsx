import { Network, Wifi, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

function getRiskColor(level) {
  return { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' }[level] || '#475569';
}

export default function NetworkMap({ devices }) {
  return (
    <div className="glass-card">
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-9 h-9 rounded-[12px] bg-blue-500/10 border border-blue-500/12 flex items-center justify-center">
          <Network className="w-[18px] h-[18px] text-blue-400" />
        </div>
        <div>
          <h2 className="section-title">Network Topology</h2>
          <span className="section-subtitle">Visual device map</span>
        </div>
        <span className="ml-auto badge bg-blue-500/12 text-blue-400">{devices?.length || 0} nodes</span>
      </div>

      {(!devices || devices.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-white/[0.04] bg-white/[0.01]">
          <Globe className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-slate-500 text-sm font-medium">Scanning network...</p>
          <p className="text-slate-600 text-xs mt-1">Devices will appear as they're discovered</p>
        </div>
      ) : (
        <div className="relative flex flex-col items-center rounded-2xl border border-white/[0.04] bg-white/[0.01] p-10">
          <motion.div
            className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/12 to-blue-500/12 border border-cyan-500/15 flex items-center justify-center mb-8"
            animate={{ boxShadow: ['0 0 0 0 rgba(6,182,212,0)', '0 0 0 12px rgba(6,182,212,0.04)', '0 0 0 0 rgba(6,182,212,0)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}>
            <Wifi className="w-7 h-7 text-cyan-400" />
          </motion.div>

          <div className="flex flex-wrap justify-center gap-5 max-w-[600px]">
            {devices.slice(0, 20).map((device, i) => {
              const color = getRiskColor(device.risk_level);
              return (
                <motion.div key={device.ip}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative group">
                  <div className={clsx(
                    'w-[76px] h-[76px] rounded-2xl border flex flex-col items-center justify-center gap-1 cursor-default transition-all',
                    'bg-white/[0.015] hover:bg-white/[0.04] hover:scale-105'
                  )} style={{ borderColor: `${color}20` }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[9px] text-white font-mono font-semibold">.{device.ip.split('.').slice(-1)}</span>
                    <span className="text-[7px] text-slate-600 truncate max-w-[60px] text-center">{device.vendor?.slice(0, 10) || '?'}</span>
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                    <div className="bg-[#080d1a] border border-white/10 rounded-xl p-3.5 text-[10px] whitespace-nowrap shadow-2xl">
                      <div className="text-white font-mono font-semibold">{device.ip}</div>
                      <div className="text-slate-400 mt-0.5">{device.vendor}</div>
                      <div className="mt-1.5 font-semibold" style={{ color }}>Risk: {device.risk_score}/100</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
