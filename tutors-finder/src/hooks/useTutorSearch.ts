import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ExamType, Tutor, AgentStatus, SearchState } from '@/types/tutor';

export function useTutorSearch() {
  const [state, setState] = useState<SearchState>({
    exam: null,
    location: '',
    isSearching: false,
    isDiscovering: false,
    agents: [],
    tutors: [],
    selectedTutorIds: new Set(),
  });

  const setExam = (exam: ExamType | null) => {
    setState((prev) => ({ ...prev, exam }));
  };

  const toggleTutorSelection = (tutorId: string) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedTutorIds);
      if (newSelected.has(tutorId)) {
        newSelected.delete(tutorId);
      } else {
        newSelected.add(tutorId);
      }
      return { ...prev, selectedTutorIds: newSelected };
    });
  };

  const resetSearch = () => {
    setState({
      exam: null,
      location: '',
      isSearching: false,
      isDiscovering: false,
      agents: [],
      tutors: [],
      selectedTutorIds: new Set(),
    });
  };

  const startSearch = useCallback(async (exam: ExamType, location: string) => {
    setState((prev) => ({
      ...prev,
      location,
      isSearching: true,
      isDiscovering: true,
      agents: [],
      tutors: [],
      selectedTutorIds: new Set(),
    }));

    try {
      // Step 1: Discover websites using Gemini
      console.log('Discovering websites for', exam, 'in', location);
      const { data: discoverData, error: discoverError } = await supabase.functions.invoke(
        'discover-tutor-websites',
        { body: { exam, location } }
      );

      if (discoverError) {
        console.error('Discover error:', discoverError);
        throw discoverError;
      }

      const websites: { name: string; url: string }[] = discoverData?.websites || [];
      console.log('Discovered websites:', websites);

      if (websites.length === 0) {
        setState((prev) => ({
          ...prev,
          isSearching: false,
          isDiscovering: false,
        }));
        return;
      }

      // Initialize agents
      const initialAgents: AgentStatus[] = websites.map((site, index) => ({
        id: `agent-${index}`,
        websiteName: site.name,
        websiteUrl: site.url,
        streamingUrl: null,
        status: 'searching',
        message: 'Starting search...',
        tutors: [],
      }));

      setState((prev) => ({
        ...prev,
        isDiscovering: false,
        agents: initialAgents,
      }));

      // Step 2: Launch Mino agents in parallel using SSE
      const agentPromises = websites.map(async (site, index) => {
        const agentId = `agent-${index}`;

        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-tutors-mino`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                websiteUrl: site.url,
                websiteName: site.name,
                exam,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No reader');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const data = JSON.parse(jsonStr);

                // Update agent status
                setState((prev) => ({
                  ...prev,
                  agents: prev.agents.map((a) =>
                    a.id === agentId
                      ? {
                          ...a,
                          streamingUrl: data.streamingUrl || a.streamingUrl,
                          status: data.type === 'COMPLETE' ? 'complete' : 'searching',
                          message: data.message || a.message,
                        }
                      : a
                  ),
                }));

                // Add tutors when complete
                if (data.type === 'COMPLETE' && data.resultJson?.tutors) {
                  const newTutors: Tutor[] = data.resultJson.tutors.map(
                    (t: any, i: number) => ({
                      id: `${agentId}-tutor-${i}`,
                      tutorName: t.tutorName || 'Unknown',
                      examsTaught: t.examsTaught || [],
                      subjects: t.subjects || [],
                      teachingMode: t.teachingMode || null,
                      location: t.location || null,
                      experience: t.experience || null,
                      qualifications: t.qualifications || null,
                      pricing: t.pricing || null,
                      pastResults: t.pastResults || null,
                      contactMethod: t.contactMethod || null,
                      profileLink: t.profileLink || null,
                      sourceWebsite: t.sourceWebsite || site.name,
                    })
                  );

                  setState((prev) => ({
                    ...prev,
                    tutors: [...prev.tutors, ...newTutors],
                    agents: prev.agents.map((a) =>
                      a.id === agentId ? { ...a, tutors: newTutors, status: 'complete' } : a
                    ),
                  }));
                }
              } catch (e) {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        } catch (error) {
          console.error(`Agent ${agentId} error:`, error);
          setState((prev) => ({
            ...prev,
            agents: prev.agents.map((a) =>
              a.id === agentId
                ? { ...a, status: 'error', message: 'Search failed' }
                : a
            ),
          }));
        }
      });

      await Promise.allSettled(agentPromises);

      setState((prev) => ({ ...prev, isSearching: false }));
    } catch (error) {
      console.error('Search error:', error);
      setState((prev) => ({
        ...prev,
        isSearching: false,
        isDiscovering: false,
      }));
    }
  }, []);

  return {
    state,
    setExam,
    startSearch,
    toggleTutorSelection,
    resetSearch,
  };
}
