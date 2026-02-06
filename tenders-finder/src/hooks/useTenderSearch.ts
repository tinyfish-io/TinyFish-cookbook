import { useState, useCallback, useRef } from 'react';
import { Sector, Tender, AgentState, TenderSearchState } from '@/types/tender';

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function useTenderSearch() {
  const [state, setState] = useState<TenderSearchState>({
    isSearching: false,
    selectedSector: null,
    agents: [],
    tenders: [],
    selectedTenders: new Set(),
  });

  const abortControllersRef = useRef<AbortController[]>([]);

  const createAgentsFromLinks = (links: string[]): AgentState[] => {
    return links.map((url, index) => {
      // Extract domain name for display
      let name = 'Unknown Site';
      try {
        const urlObj = new URL(url);
        name = urlObj.hostname.replace('www.', '');
      } catch {
        name = url.substring(0, 30);
      }
      
      return {
        id: `agent-${index}`,
        url: url,
        name: name,
        status: 'pending' as const,
        message: 'Waiting to start...',
        tenders: [],
      };
    });
  };

  const startSearch = useCallback(async (sector: Sector, links: string[]) => {
    // Initialize agents from provided links
    const initialAgents = createAgentsFromLinks(links);
    
    setState(prev => ({
      ...prev,
      isSearching: true,
      selectedSector: sector,
      agents: initialAgents,
      tenders: [],
      selectedTenders: new Set(),
    }));

    // Clear any existing abort controllers
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current = [];

    // Launch all agents in parallel with SSE streaming
    const agentPromises = links.map(async (url, index) => {
      const agentId = `agent-${index}`;
      const abortController = new AbortController();
      abortControllersRef.current.push(abortController);
      
      try {
        // Update agent to connecting
        setState(prev => ({
          ...prev,
          agents: prev.agents.map(a => 
            a.id === agentId 
              ? { ...a, status: 'connecting' as const, message: 'Connecting to Mino...' }
              : a
          ),
        }));

        // Use fetch with SSE streaming
        const response = await fetch(`${SUPABASE_URL}/functions/v1/mino-tender-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ 
            sector,
            url: url,
            agentId,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  // Handle streaming URL - show live preview immediately
                  if (data.type === 'STREAMING_URL' && data.streamingUrl) {
                    console.log(`Agent ${agentId} received streaming URL:`, data.streamingUrl);
                    setState(prev => ({
                      ...prev,
                      agents: prev.agents.map(a => 
                        a.id === agentId 
                          ? { 
                              ...a, 
                              status: 'searching' as const, 
                              message: 'Browsing website...',
                              streamingUrl: data.streamingUrl,
                            }
                          : a
                      ),
                    }));
                  }

                  // Handle status updates
                  if (data.type === 'STATUS' && data.message) {
                    setState(prev => ({
                      ...prev,
                      agents: prev.agents.map(a => 
                        a.id === agentId 
                          ? { ...a, message: data.message }
                          : a
                      ),
                    }));
                  }

                  // Handle completion with tenders
                  if (data.type === 'COMPLETE' && data.tenders) {
                    const newTenders: Tender[] = data.tenders.map((t: any) => ({
                      id: generateId(),
                      tenderTitle: t['Tender Title'] || t.tenderTitle || 'Unknown',
                      tenderId: t['Tender ID'] || t.tenderId || 'N/A',
                      issuingAuthority: t['Issuing Authority'] || t.issuingAuthority || 'Unknown',
                      countryRegion: t['Country / Region'] || t.countryRegion || 'Singapore',
                      tenderType: t['Tender Type'] || t.tenderType || 'N/A',
                      publicationDate: t['Publication Date'] || t.publicationDate || 'N/A',
                      submissionDeadline: t['Submission Deadline'] || t.submissionDeadline || 'N/A',
                      tenderStatus: t['Tender Status'] || t.tenderStatus || 'Open',
                      officialTenderUrl: t['Official Tender URL'] || t.officialTenderUrl || url,
                      briefDescription: t['Brief Description'] || t.briefDescription || 'No description',
                      eligibilityCriteria: t['Eligibility Criteria'] || t.eligibilityCriteria || 'See tender',
                      industryCategory: t['Industry / Category'] || t.industryCategory || sector,
                      sourceUrl: url,
                    }));

                    setState(prev => ({
                      ...prev,
                      tenders: [...prev.tenders, ...newTenders],
                      agents: prev.agents.map(a => 
                        a.id === agentId 
                          ? { 
                              ...a, 
                              status: 'complete' as const, 
                              message: `Found ${newTenders.length} tenders`,
                              tenders: newTenders,
                            }
                          : a
                      ),
                    }));
                  }

                  // Handle errors
                  if (data.type === 'ERROR') {
                    setState(prev => ({
                      ...prev,
                      agents: prev.agents.map(a => 
                        a.id === agentId 
                          ? { 
                              ...a, 
                              status: 'error' as const, 
                              message: data.error || 'Unknown error',
                            }
                          : a
                      ),
                    }));
                  }

                  // Handle done
                  if (data.type === 'DONE') {
                    setState(prev => ({
                      ...prev,
                      agents: prev.agents.map(a => 
                        a.id === agentId && a.status === 'searching'
                          ? { 
                              ...a, 
                              status: 'complete' as const, 
                              message: 'Search complete',
                            }
                          : a
                      ),
                    }));
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          console.log(`Agent ${agentId} aborted`);
          return;
        }
        console.error(`Agent ${agentId} error:`, error);
        setState(prev => ({
          ...prev,
          agents: prev.agents.map(a => 
            a.id === agentId 
              ? { 
                  ...a, 
                  status: 'error' as const, 
                  message: error instanceof Error ? error.message : 'Unknown error',
                }
              : a
          ),
        }));
      }
    });

    // Wait for all agents to complete
    await Promise.allSettled(agentPromises);

    setState(prev => ({
      ...prev,
      isSearching: false,
    }));
  }, []);

  const toggleTenderSelection = useCallback((tenderId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedTenders);
      if (newSelected.has(tenderId)) {
        newSelected.delete(tenderId);
      } else {
        newSelected.add(tenderId);
      }
      return { ...prev, selectedTenders: newSelected };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedTenders: new Set() }));
  }, []);

  const resetSearch = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current = [];
    setState({
      isSearching: false,
      selectedSector: null,
      agents: [],
      tenders: [],
      selectedTenders: new Set(),
    });
  }, []);

  return {
    ...state,
    startSearch,
    toggleTenderSelection,
    clearSelection,
    resetSearch,
  };
}
