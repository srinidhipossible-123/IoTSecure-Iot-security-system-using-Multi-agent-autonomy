import { useState } from 'react';
import { useScrollReveal, usePolling } from '../hooks';
import { getTraces } from '../api';
import './AgentTraces.css';

const STATUS_ICONS = { success: '🟢', error: '🔴', running: '🟡' };
const AGENT_COLORS = {
  'orchestrator': 'var(--violet)',
  'deception': 'var(--cyan)',
  'firewall': 'var(--orange)',
  'response': 'var(--red)',
  'notifier': 'var(--green)',
  'honeytoken': 'var(--yellow)',
  'baseline': '#6366f1',
};

export default function AgentTraces() {
  const [ref, visible] = useScrollReveal(0.05);
  const { data: traces } = usePolling(getTraces, 4000);
  const [filter, setFilter] = useState('all');
  const [expandedIdx, setExpandedIdx] = useState(null);

  const list = traces || [];
  const agentNames = [...new Set(list.map(t => t.span?.split('.')[0]))].filter(Boolean);
  const filtered = filter === 'all' ? list : list.filter(t => t.span?.startsWith(filter));

  const getColor = (span) => {
    const agent = span?.split('.')[0] || '';
    return AGENT_COLORS[agent] || 'var(--text-muted)';
  };

  return (
    <section id="traces" className="section traces-section" ref={ref}>
      <div className="container">
        <div className={`section-header reveal ${visible ? 'visible' : ''}`}>
          <span className="section-tag mono">OBSERVABILITY</span>
          <h2 className="section-title">Agent <span className="gradient-text">Traces</span></h2>
          <p className="section-desc">Every agent decision, tool call, and outcome — fully observable</p>
        </div>

        <div className={`trace-filters reveal ${visible ? 'visible' : ''}`} style={{transitionDelay:'0.1s'}}>
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          {agentNames.map(a => (
            <button key={a} className={`filter-btn ${filter === a ? 'active' : ''}`} onClick={() => setFilter(a)}
              style={filter === a ? {borderColor: getColor(a), color: getColor(a)} : {}}>
              {a}
            </button>
          ))}
        </div>

        <div className="trace-list">
          {filtered.length === 0 && (
            <div className="trace-empty glass-card">
              <p>📡 No traces yet. Trigger an attack demo to see agent execution traces in real-time.</p>
            </div>
          )}
          {filtered.map((trace, i) => {
            const color = getColor(trace.span);
            const isExpanded = expandedIdx === i;
            return (
              <div key={i} className={`trace-row glass-card reveal ${visible ? 'visible' : ''}`}
                style={{transitionDelay:`${0.03*i}s`}}
                onClick={() => setExpandedIdx(isExpanded ? null : i)}>
                <div className="trace-row-main">
                  <span className="trace-status">{STATUS_ICONS[trace.status] || '⚪'}</span>
                  <span className="trace-span mono" style={{color}}>{trace.span}</span>
                  <span className="trace-duration mono">
                    {trace.duration_ms != null ? `${trace.duration_ms}ms` : '...'}
                  </span>
                  <span className="trace-time mono">{trace.ts_start_human || '--'}</span>
                </div>
                {isExpanded && (
                  <div className="trace-detail">
                    {trace.error && <div className="trace-error mono">ERROR: {trace.error}</div>}
                    {trace.input_summary && (
                      <div className="trace-block">
                        <span className="trace-block-label mono">INPUT</span>
                        <pre className="trace-json mono">{JSON.stringify(trace.input_summary, null, 2)}</pre>
                      </div>
                    )}
                    {trace.output && (
                      <div className="trace-block">
                        <span className="trace-block-label mono">OUTPUT</span>
                        <pre className="trace-json mono">{JSON.stringify(trace.output, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
