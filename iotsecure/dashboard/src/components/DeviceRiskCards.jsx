import { motion } from 'framer-motion';
import { Camera, Lightbulb, Router, Smartphone, Laptop, Cpu, ShieldX, Globe, Terminal } from 'lucide-react';
import clsx from 'clsx';

const DEVICE_ICONS = {
  'camera': Camera, 'hikvision': Camera, 'dahua': Camera,
  'hue': Lightbulb, 'bulb': Lightbulb, 'light': Lightbulb,
  'router': Router, 'tp-link': Router, 'netgear': Router, 'd-link': Router,
  'phone': Smartphone, 'samsung': Smartphone, 'apple': Smartphone, 'xiaomi': Smartphone,
  'laptop': Laptop, 'raspberry': Cpu, 'pi': Cpu,
};

function getDeviceIcon(device) {
  const name = `${device.vendor || ''} ${device.hostname || ''}`.toLowerCase();
  for (const [key, Icon] of Object.entries(DEVICE_ICONS)) {
    if (name.includes(key)) return Icon;
  }
  return Cpu;
}

function getRiskColor(score) {
  if (score >= 75) return '#ef4444';
  if (score >= 50) return '#f97316';
  if (score >= 25) return '#f59e0b';
  return '#10b981';
}

function RiskRing({ score, size = 48 }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getRiskColor(score);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(148,163,184,0.06)" strokeWidth="4" />
        <motion.circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-bold leading-none" style={{ color }}>{score}</span>
        <span className="text-[6px] uppercase font-bold tracking-tighter opacity-50" style={{ color }}>Risk</span>
      </div>
    </div>
  );
}

export default function DeviceRiskCards({ devices }) {
  return (
    <div className="glass-card h-full flex flex-col">
      <div className="flex items-center gap-3.5 mb-8">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center shadow-lg shadow-cyan-500/5">
          <Globe className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="section-title text-[15px]">IoT Inventory</h2>
          <span className="section-subtitle text-[11px]">Discovered endpoints on active subnet</span>
        </div>
        <div className="ml-auto px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{devices?.length || 0} Live</span>
        </div>
      </div>

      {(!devices || devices.length === 0) ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-40">
          <ShieldX className="w-12 h-12 text-slate-700 mb-4" />
          <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Passive Mode</p>
          <p className="text-slate-600 text-[11px] mt-1">Waiting for discovery sweep...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {devices.map((device, i) => {
            const Icon = getDeviceIcon(device);
            const isHighRisk = (device.risk_score || 0) >= 70;

            return (
              <motion.div 
                key={device.ip}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={clsx(
                  'relative p-5 rounded-2xl border transition-all hover:bg-white/[0.02]',
                  isHighRisk ? 'border-red-500/20 bg-red-500/[0.02]' : 'border-white/[0.06] bg-white/[0.01]'
                )}
              >
                {/* Header: Icon & Risk */}
                <div className="flex items-start justify-between mb-5">
                  <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                    isHighRisk ? "bg-red-500/10" : "bg-cyan-500/10"
                  )}>
                    <Icon className="w-6 h-6" style={{ color: isHighRisk ? '#ef4444' : '#06b6d4' }} />
                  </div>
                  <RiskRing score={device.risk_score || 0} />
                </div>

                {/* Body: IP & Identity */}
                <div className="space-y-1.5 mb-5">
                  <h3 className="text-sm font-bold text-white font-mono tracking-tight">{device.ip}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">{device.mac}</span>
                    <span className="text-slate-700 text-[10px]">|</span>
                    <span className="text-[11px] font-bold text-slate-300 truncate uppercase tracking-tighter">
                      {device.vendor || 'Generic Device'}
                    </span>
                  </div>
                </div>

                {/* Footer: Ports & Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5">
                    {device.open_ports?.slice(0, 3).map(p => (
                      <span key={p} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-500 border border-white/[0.05]">
                        {p}
                      </span>
                    ))}
                    {(device.open_ports?.length > 3) && (
                      <span className="text-[9px] text-slate-700 font-bold">+{device.open_ports.length - 3}</span>
                    )}
                  </div>
                  
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all group">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider group-hover:scale-105 transition-transform">Analyze</span>
                  </button>
                </div>

                {device.is_honeypot && (
                  <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full bg-pink-500 text-white text-[9px] font-bold shadow-lg shadow-pink-500/20 animate-pulse">
                    ACTIVE DECEPTION
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
