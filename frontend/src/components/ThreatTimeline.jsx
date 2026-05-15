import { useState } from 'react';
import { useScrollReveal, usePolling } from '../hooks';
import { getIncidents, triggerDemo } from '../api';
import './ThreatTimeline.css';

const SEVERITY_CONFIG = {
  CRITICAL: { color: 'var(--red)', bg: 'var(--red-dim)', icon: '🚨' },
  HIGH: { color: 'var(--orange)', bg: 'var(--orange-dim)', icon: '🔴' },
  MEDIUM: { color: 'var(--yellow)', bg: 'var(--yellow-dim)', icon: '🟡' },
  LOW: { color: 'var(--green)', bg: 'var(--green-dim)', icon: '🟢' },
};

export default function ThreatTimeline() {
  const [ref, visible] = useScrollReveal(0.05);
  const { data: incidents, refresh } = usePolling(getIncidents, 5000);
  const [expanded, setExpanded] = useState({});
  const [demoMode, setDemoMode] = useState(null);

  const handleDemo = async (mode) => {
    setDemoMode(mode);
    await triggerDemo(mode);
    setTimeout(() => { setDemoMode(null); refresh(); }, 2000);
  };

  const formatTime = (ts) => {
    if (!ts) return '--:--:--';
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString();
  };

  const list = incidents && Array.isArray(incidents) ? incidents : [];

  return (
    <section id="threats" className="section threats-section" ref={ref}>
      <div className="container">
        <div className={`section-header reveal ${visible ? 'visible' : ''}`}>
          <span className="section-tag mono">THREAT INTELLIGENCE</span>
          <h2 className="section-title">Threat <span className="gradient-text">Monitor</span></h2>
          <p className="section-desc">Autonomous detection, LLM reasoning, and real-time response</p>
        </div>

        <div className={`demo-controls reveal ${visible ? 'visible' : ''}`} style={{transitionDelay:'0.15s'}}>
          <span className="demo-label mono">SIMULATE ATTACK:</span>
          {['honeytoken', 'port_scan', 'brute_force', 'lateral_movement'].map(mode => (
            <button key={mode} className="demo-btn" onClick={() => handleDemo(mode)} disabled={!!demoMode}>
              {demoMode === mode ? <span className="spinner" /> : null}
              {mode.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="timeline">
          {list.length === 0 && (
            <div className="timeline-empty glass-card">
              <p>🛡️ No threats detected. Trigger a demo attack above to see the autonomous pipeline in action.</p>
            </div>
          )}
          {list.map((inc, i) => {
            const plan = inc.plan || {};
            const ta = plan.threat_assessment || {};
            const sev = SEVERITY_CONFIG[ta.severity] || SEVERITY_CONFIG.MEDIUM;
            const isExpanded = expanded[i];
            return (
              <div key={i} className={`timeline-item reveal ${visible ? 'visible' : ''}`} style={{transitionDelay:`${0.1*i}s`}}>
                <div className="timeline-line">
                  <div className="timeline-dot" style={{background:sev.color, boxShadow:`0 0 12px ${sev.color}`}} />
                </div>
                <div className="timeline-card glass-card" onClick={() => setExpanded(p => ({...p, [i]: !p[i]}))}>
                  <div className="timeline-card-header">
                    <div className="tl-left">
                      <span className="tl-severity mono" style={{color:sev.color, background:sev.bg}}>
                        {sev.icon} {ta.severity || 'UNKNOWN'}
                      </span>
                      <span className="tl-type">{ta.attack_type || inc.trigger || 'Unknown'}</span>
                    </div>
                    <span className="tl-time mono">{formatTime(inc.ts)}</span>
                  </div>

                  {ta.reasoning && (
                    <div className="tl-reasoning">
                      <span className="reasoning-label mono">AI REASONING:</span>
                      <p>{ta.reasoning}</p>
                    </div>
                  )}

                  {plan.homeowner_summary && (
                    <div className="tl-summary">
                      <p>{plan.homeowner_summary}</p>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="tl-expanded">
                      {plan.lateral_movement_prediction && (
                        <div className="tl-detail-block">
                          <span className="detail-block-title mono">LATERAL MOVEMENT PREDICTION</span>
                          <div className="detail-items">
                            <span>Targets: {(plan.lateral_movement_prediction.next_targets || []).join(', ')}</span>
                            <span>Vector: {plan.lateral_movement_prediction.attack_vector}</span>
                            <span>ETA: {plan.lateral_movement_prediction.time_estimate}</span>
                          </div>
                        </div>
                      )}
                      {(plan.action_plan || []).length > 0 && (
                        <div className="tl-detail-block">
                          <span className="detail-block-title mono">ACTION PLAN</span>
                          <div className="action-steps">
                            {plan.action_plan.map((step, j) => (
                              <div key={j} className="action-step">
                                <span className="step-num mono">#{step.step}</span>
                                <span className="step-agent mono">{step.agent}</span>
                                <span className="step-action">{step.action}</span>
                                <span className="step-priority mono" style={{color: step.priority === 'IMMEDIATE' ? 'var(--red)' : step.priority === 'HIGH' ? 'var(--orange)' : 'var(--yellow)'}}>{step.priority}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {inc.outcome && Array.isArray(inc.outcome) && inc.outcome.length > 0 && (
                        <div className="tl-detail-block">
                          <span className="detail-block-title mono">EXECUTION RESULTS</span>
                          <div className="action-steps">
                            {inc.outcome.map((r, j) => (
                              <div key={j} className="action-step">
                                <span className={`step-status ${r.status}`}>{r.status === 'ok' ? '✅' : '❌'}</span>
                                <span className="step-agent mono">{r.agent}/{r.action}</span>
                                <span className="step-detail">{typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail).slice(0,80)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <span className="expand-hint mono">{isExpanded ? '▲ COLLAPSE' : '▼ EXPAND DETAILS'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
