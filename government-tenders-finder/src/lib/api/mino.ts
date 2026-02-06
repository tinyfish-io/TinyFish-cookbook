import { supabase } from '@/integrations/supabase/client';
import { Sector, AgentState, Tender } from '@/types/tender';

export const TENDER_SOURCES = [
  { name: 'GeBIZ', url: 'https://www.gebiz.gov.sg/' },
  { name: 'Tenders On Time', url: 'https://www.tendersontime.com/singapore-tenders/' },
  { name: 'Bid Detail', url: 'https://www.biddetail.com/singapore-tenders' },
  { name: 'Tenders Info', url: 'https://www.tendersinfo.com/global-singapore-tenders.php' },
  { name: 'Global Tenders', url: 'https://www.globaltenders.com/government-tenders-singapore' },
  { name: 'GeBIZ Opportunities', url: 'https://www.gebiz.gov.sg/ptn/opportunity/BOListing.xhtml?origin=menu' },
  { name: 'Tender Board', url: 'https://www.tenderboard.biz/vendor/tender-opportunities/' },
];

export type MinoEventHandler = {
  onAgentUpdate: (agentId: string, update: Partial<AgentState>) => void;
  onTenderFound: (tender: Tender) => void;
  onAgentComplete: (agentId: string) => void;
  onError: (agentId: string, error: string) => void;
};

export async function startTenderSearch(
  sector: Sector,
  handlers: MinoEventHandler
): Promise<void> {
  const response = await supabase.functions.invoke('mino-tender-search', {
    body: { sector },
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  // The edge function returns SSE-like data
  // We'll process the response data
  const data = response.data;
  
  if (data && data.agents) {
    for (const agent of data.agents) {
      handlers.onAgentUpdate(agent.id, agent);
      
      if (agent.tenders && agent.tenders.length > 0) {
        for (const tender of agent.tenders) {
          handlers.onTenderFound(tender);
        }
      }
      
      if (agent.status === 'complete' || agent.status === 'error') {
        handlers.onAgentComplete(agent.id);
      }
    }
  }
}

export function createInitialAgents(): AgentState[] {
  return TENDER_SOURCES.map((source, index) => ({
    id: `agent-${index}`,
    url: source.url,
    name: source.name,
    status: 'pending' as const,
    message: 'Waiting to start...',
    tenders: [],
  }));
}
