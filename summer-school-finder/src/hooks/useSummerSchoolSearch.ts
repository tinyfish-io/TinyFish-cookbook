import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SearchFormData, SummerSchool, AgentStatus } from '@/types/summer-school';

export function useSummerSchoolSearch() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [results, setResults] = useState<SummerSchool[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseMinoResult = (resultJson: any): SummerSchool | null => {
    if (!resultJson?.summerSchools || resultJson.summerSchools.length === 0) {
      return null;
    }

    const school = resultJson.summerSchools[0];
    return {
      programName: school["Program Name"] || '',
      institution: school["Institution"] || '',
      location: school["Location"] || '',
      dates: school["Dates"] || '',
      duration: school["Duration"] || '',
      targetAge: school["Target Age / Grade"] || '',
      programType: school["Program Type / Focus"] || '',
      tuitionFees: school["Tuition / Fees"] || '',
      applicationDeadline: school["Application Deadline"] || '',
      officialUrl: school["Official Program URL"] || '',
      briefDescription: school["Brief Description"] || '',
      eligibilityCriteria: school["Eligibility Criteria"] || '',
      notes: school["Notes / Special Requirements"] || '',
    };
  };

  const runMinoAgentWithStreaming = async (url: string, agentId: string, searchData: SearchFormData) => {
    const goal = `TASK: Extract summer school program details for ${searchData.programType} programs in ${searchData.location} for ${searchData.targetAge || 'students'}.

RULES:
1) Focus only on the relevant program information for the specified criteria.
2) Stay on the page and do not click any other link until extremely necessary.
3) Read the information carefully to extract accurate details.
4) Avoid unnecessary navigation; be fast and efficient.
5) If information is not visible, note it as "Not specified".

Return JSON: {
  "summerSchools": [
    {
      "Program Name": "",
      "Institution": "",
      "Location": "",
      "Dates": "",
      "Duration": "",
      "Target Age / Grade": "",
      "Program Type / Focus": "",
      "Tuition / Fees": "",
      "Application Deadline": "",
      "Official Program URL": "",
      "Brief Description": "",
      "Eligibility Criteria": "",
      "Notes / Special Requirements": ""
    }
  ]
}`;

    try {
      setAgents(prev => prev.map(a => 
        a.id === agentId ? { ...a, status: 'running', message: 'Starting browser agent...' } : a
      ));

      // Call the SSE endpoint directly for streaming
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/mino-search-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ url, goal }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

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

              if (data.streamingUrl) {
                setAgents(prev => prev.map(a => 
                  a.id === agentId ? { ...a, streamingUrl: data.streamingUrl, message: 'Browser connected...' } : a
                ));
              }

              if (data.type === 'STATUS' && data.message) {
                setAgents(prev => prev.map(a => 
                  a.id === agentId ? { ...a, message: data.message } : a
                ));
              }

              if (data.type === 'COMPLETE' && data.resultJson) {
                const school = parseMinoResult(data.resultJson);
                if (school && school.programName) {
                  setResults(prev => [...prev, school]);
                  setAgents(prev => prev.map(a => 
                    a.id === agentId ? { ...a, status: 'completed', message: 'Found program details', result: school } : a
                  ));
                } else {
                  setAgents(prev => prev.map(a => 
                    a.id === agentId ? { ...a, status: 'completed', message: 'No program details found' } : a
                  ));
                }
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Mark as completed if not already
      setAgents(prev => prev.map(a => 
        a.id === agentId && a.status === 'running' ? { ...a, status: 'completed', message: 'Search completed' } : a
      ));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setAgents(prev => prev.map(a => 
        a.id === agentId ? { ...a, status: 'error', message: errorMessage, error: errorMessage } : a
      ));
    }
  };

  const search = useCallback(async (searchData: SearchFormData) => {
    setIsSearching(true);
    setError(null);
    setResults([]);
    setAgents([]);

    try {
      // First, discover URLs using AI
      const discoverResponse = await supabase.functions.invoke('discover-schools', {
        body: searchData,
      });

      if (discoverResponse.error) {
        throw new Error(discoverResponse.error.message);
      }

      const urls: string[] = discoverResponse.data?.urls || [];

      if (urls.length === 0) {
        setError('No summer school programs found for your search criteria. Try adjusting your filters.');
        setIsSearching(false);
        return;
      }

      // Create agent statuses
      const newAgents: AgentStatus[] = urls.map((url, idx) => ({
        id: `agent-${idx}-${Date.now()}`,
        url,
        status: 'pending',
        message: 'Waiting to start...',
      }));

      setAgents(newAgents);

      // Run all agents in parallel with streaming
      await Promise.all(
        newAgents.map(agent => runMinoAgentWithStreaming(agent.url, agent.id, searchData))
      );

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setAgents([]);
    setError(null);
  }, []);

  return {
    agents,
    results,
    isSearching,
    error,
    search,
    clearResults,
  };
}
