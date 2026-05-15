import { motion } from 'framer-motion';
import { Camera, Lightbulb, Router, Smartphone, Laptop, Cpu, Bug, ShieldX } from 'lucide-react';
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

function RiskRing({ score, size = 42 }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getRiskColor(score);
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(148,163,184,0.05)" strokeWidth="3" />
      <motion.circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="3"
        strokeLinecap="round" strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: 'easeOut' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dy="0.35em" fill={color}
        fontSize="10" fontWeight="700" transform={`rotate(90 ${size/2} ${size/2})`}>{score}</text>
    </svg>
  );
}

export default function DeviceRiskCards({ devices }) {
  return (
    <div className="glass-card">
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-9 h-9 rounded-[12px] bg-cyan-500/10 border border-cyan-500/12 flex items-center justify-center">
          <Cpu className="w-[18px] h-[18px] text-cyan-400" />
        </div>
        <div>
          <h2 className="section-title">Network Devices</h2>
          <span className="section-subtitle">Discovered IoT endpoints</span>
        </div>
        <span className="ml-auto badge bg-cyan-500/12 text-cyan-400">{devices?.length || 0} found</span>
      </div>

      {(!devices || devices.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <ShieldX className="w-11 h-11 text-slate-700 mb-3" />
          <p className="text-slate-500 text-sm font-medium">No devices discovered yet</p>
          <p className="text-slate-600 text-xs mt-1">Waiting for network scan...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[420px] overflow-y-auto pr-1">
          {devices.map((device, i) => {
            const Icon = getDeviceIcon(device);
            const isHighRisk = device.risk_level === 'high' || device.risk_level === 'critical';
            return (
              <motion.div key={device.ip}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className={clsx(
                  'relative p-5 rounded-2xl border transition-all',
                  isHighRisk ? 'border-red-500/15 bg-red-500/[0.02]' : 'border-white/[0.05] bg-white/[0.01]',
                  device._isNew && 'animate-shake'
                )}
                style={isHighRisk ? { boxShadow: '0 0 25px rgba(239,68,68,0.04)' } : {}}>
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-[12px] flex items-center justify-center"
                      style={{ backgroundColor: isHighRisk ? 'rgba(239,68,68,0.07)' : 'rgba(6,182,212,0.07)' }}>
                      <Icon className="w-[18px] h-[18px]" style={{ color: isHighRisk ? '#ef4444' : '#06b6d4' }} />
                    </div>
                    <RiskRing score={device.risk_score || 0} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-mono font-semibold text-white">{device.ip}</div>
                    {device.mac && device.mac !== '00:00:00:00:00:00' && (
                      <div className="text-[10px] font-mono text-cyan-400/70 mt-0.5 tracking-wide">{device.mac}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-slate-400 truncate">{device.vendor || 'Unknown'}</span>
                      {device.hostname && (
                        <span className="text-[10px] text-slate-600 truncate">· {device.hostname}</span>
                      )}
                    </div>
                    {device.open_ports && device.open_ports.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {device.open_ports.slice(0, 5).map(p => (
                          <span key={p} className={clsx('text-[9px] px-2 py-0.5 rounded-md font-mono',
                            [23, 21, 7547].includes(p) ? 'bg-red-500/12 text-red-400' : 'bg-white/[0.04] text-slate-400'
                          )}>{p}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2.5">
                      {device.cve_count > 0 && (
                        <span className="badge bg-amber-500/12 text-amber-400">
                          <Bug className="w-2.5 h-2.5" /> {device.cve_count} CVEs
                        </span>
                      )}
                      <span className={clsx('badge',
                        device.risk_level === 'critical' ? 'bg-red-500/12 text-red-400' :
                        device.risk_level === 'high' ? 'bg-orange-500/12 text-orange-400' :
                        device.risk_level === 'medium' ? 'bg-yellow-500/12 text-yellow-400' :
                        'bg-emerald-500/12 text-emerald-400'
                      )}>{device.risk_level || 'low'}</span>
                    </div>
                  </div>
                </div>
                {device.is_honeypot && (
                  <span className="absolute top-4 right-4 badge bg-pink-500/12 text-pink-400">HONEYPOT</span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
