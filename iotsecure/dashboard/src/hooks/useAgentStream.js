import { useMemo } from 'react';

export function useAgentStream(agentStatuses, systemLog) {
  const agents = useMemo(() => {
    const agentList = ['discovery', 'profiler', 'threat_detector', 'deception', 'response'];
    return agentList.map(id => ({
      id,
      ...agentStatuses[id],
      status: agentStatuses[id]?.status || 'idle',
      task: agentStatuses[id]?.task || agentStatuses[id]?.current_task || '',
    }));
  }, [agentStatuses]);

  const activeAgent = useMemo(() => {
    return agents.find(a => a.status === 'running')?.id || null;
  }, [agents]);

  const recentA2A = useMemo(() => {
    return (systemLog || [])
      .filter(l => l.msg && l.msg.includes('[A2A]'))
      .slice(0, 10);
  }, [systemLog]);

  return { agents, activeAgent, recentA2A };
}
