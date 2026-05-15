import { motion } from 'framer-motion';
import { GitBranch, Activity } from 'lucide-react';

const NODES = [
  { id: 'discovery', label: 'Discovery', x: 80, y: 70, phase: 'discover' },
  { id: 'profiler', label: 'Profiler', x: 220, y: 70, phase: 'profile' },
  { id: 'threat_detector', label: 'Threat', x: 360, y: 70, phase: 'analyse' },
  { id: 'deception', label: 'Deception', x: 300, y: 160, phase: 'deceive' },
  { id: 'response', label: 'Response', x: 440, y: 160, phase: 'respond' },
  { id: 'idle', label: 'Idle', x: 80, y: 160, phase: 'idle' },
];

const EDGES = [
  { from: 'discovery', to: 'profiler' },
  { from: 'profiler', to: 'threat_detector' },
  { from: 'threat_detector', to: 'deception', dashed: true },
  { from: 'threat_detector', to: 'response', dashed: true },
  { from: 'deception', to: 'response' },
  { from: 'response', to: 'idle' },
  { from: 'idle', to: 'discovery' },
];

function getNodePos(id) { return NODES.find(n => n.id === id) || { x: 0, y: 0 }; }

export default function OrchestratorGraph({ agentStatuses, currentPhase, iteration }) {
  const activePhase = currentPhase || 'idle';

  return (
    <div className="glass-card">
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-9 h-9 rounded-[12px] bg-purple-500/10 border border-purple-500/12 flex items-center justify-center">
          <GitBranch className="w-[18px] h-[18px] text-purple-400" />
        </div>
        <div>
          <h2 className="section-title">Orchestrator Graph</h2>
          <span className="section-subtitle">LangGraph flow visualization</span>
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Phase:</span>
            <span className="text-cyan-400 font-semibold">{activePhase}</span>
          </div>
          <span className="badge bg-purple-500/12 text-purple-400">Iter {iteration || 0}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-6">
        <svg viewBox="0 0 540 220" className="w-full h-auto">
          {EDGES.map((edge, i) => {
            const from = getNodePos(edge.from);
            const to = getNodePos(edge.to);
            return (
              <g key={i}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke="rgba(148,163,184,0.06)" strokeWidth="1.5"
                  strokeDasharray={edge.dashed ? "4 4" : "none"} />
                <motion.line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 16"
                  animate={{ strokeDashoffset: [0, -20] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  opacity={0.2} />
              </g>
            );
          })}
          {NODES.map(node => {
            const isActive = agentStatuses[node.id]?.status === 'running' || activePhase === node.phase;
            const isError = agentStatuses[node.id]?.status === 'error';
            return (
              <g key={node.id}>
                {isActive && (
                  <motion.circle cx={node.x} cy={node.y} r="30" fill="none"
                    stroke="#06b6d4" strokeWidth="1.5"
                    animate={{ r: [30, 36, 30], opacity: [0.1, 0.4, 0.1] }}
                    transition={{ duration: 1.5, repeat: Infinity }} />
                )}
                <circle cx={node.x} cy={node.y} r="26"
                  fill={isActive ? 'rgba(6,182,212,0.06)' : isError ? 'rgba(239,68,68,0.06)' : 'rgba(148,163,184,0.02)'}
                  stroke={isActive ? 'rgba(6,182,212,0.35)' : isError ? 'rgba(239,68,68,0.25)' : 'rgba(148,163,184,0.06)'}
                  strokeWidth="1.5" />
                <text x={node.x} y={node.y} textAnchor="middle" dy="0.35em"
                  fill={isActive ? '#67e8f9' : '#94a3b8'} fontSize="8" fontWeight="600">
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
