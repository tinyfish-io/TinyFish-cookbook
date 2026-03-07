import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { AppState, AppAction, ConceptAgentState } from '@/types';

// Initial state
const initialState: AppState = {
  phase: 'input',
  userInput: null,
  searchQueries: [],
  searchResults: [],
  agents: {},
  logs: [],
  startedAt: null,
  completedAt: null,
};

// Reducer function
function discoveryReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'START_DISCOVERY':
      return {
        ...initialState,
        phase: 'generating_queries',
        userInput: action.payload.userInput,
        startedAt: Date.now(),
        logs: [],
      };

    case 'QUERIES_GENERATED':
      return {
        ...state,
        phase: 'searching',
        searchQueries: action.payload.queries,
      };

    case 'SEARCH_COMPLETE':
      return {
        ...state,
        phase: 'extracting',
        searchResults: action.payload.results,
      };

    case 'AGENT_CONNECTING': {
      const { id, url, platform } = action.payload;
      const newAgent: ConceptAgentState = {
        id,
        url,
        platform,
        status: 'connecting',
        currentStep: 'Initializing agent...',
        steps: [],
        startedAt: Date.now(),
      };

      return {
        ...state,
        agents: {
          ...state.agents,
          [id]: newAgent,
        },
      };
    }

    case 'AGENT_STEP': {
      const { id, step } = action.payload;
      const agent = state.agents[id];
      if (!agent) return state;

      // Infer status from step message
      const status = inferAgentStatus(step);

      return {
        ...state,
        agents: {
          ...state.agents,
          [id]: {
            ...agent,
            status,
            currentStep: step,
            steps: [
              ...agent.steps,
              {
                message: step,
                timestamp: Date.now(),
              },
            ],
          },
        },
      };
    }

    case 'AGENT_STREAMING_URL': {
      const { id, streamingUrl } = action.payload;
      const agent = state.agents[id];
      if (!agent) return state;

      return {
        ...state,
        agents: {
          ...state.agents,
          [id]: {
            ...agent,
            streamingUrl,
          },
        },
      };
    }

    case 'AGENT_COMPLETE': {
      const { id, result } = action.payload;
      const agent = state.agents[id];
      if (!agent) return state;

      const updatedAgents = {
        ...state.agents,
        [id]: {
          ...agent,
          status: 'complete' as const,
          result,
          completedAt: Date.now(),
        },
      };

      // Check if all agents are done (complete or error)
      const allAgentsDone = Object.values(updatedAgents).every(
        (a) => a.status === 'complete' || a.status === 'error'
      );

      return {
        ...state,
        agents: updatedAgents,
        phase: allAgentsDone ? 'complete' : state.phase,
        completedAt: allAgentsDone ? Date.now() : state.completedAt,
      };
    }

    case 'AGENT_ERROR': {
      const { id, error } = action.payload;
      const agent = state.agents[id];
      if (!agent) return state;

      const updatedAgents = {
        ...state.agents,
        [id]: {
          ...agent,
          status: 'error' as const,
          error,
          completedAt: Date.now(),
        },
      };

      // Check if all agents are done (complete or error)
      const allAgentsDone = Object.values(updatedAgents).every(
        (a) => a.status === 'complete' || a.status === 'error'
      );

      return {
        ...state,
        agents: updatedAgents,
        phase: allAgentsDone ? 'complete' : state.phase,
        completedAt: allAgentsDone ? Date.now() : state.completedAt,
      };
    }

    case 'ADD_LOG':
      return {
        ...state,
        logs: [...state.logs, action.payload],
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// Helper function to infer agent status from step message
function inferAgentStatus(step: string): ConceptAgentState['status'] {
  const s = step.toLowerCase();

  if (s.includes('connect') || s.includes('initializ')) return 'connecting';
  if (s.includes('navigat') || s.includes('opening') || s.includes('visit'))
    return 'navigating';
  if (
    s.includes('extract') ||
    s.includes('read') ||
    s.includes('analyz') ||
    s.includes('pars')
  )
    return 'extracting';

  return 'navigating'; // default
}

// Context
const DiscoveryContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider component
export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(discoveryReducer, initialState);

  return (
    <DiscoveryContext.Provider value={{ state, dispatch }}>
      {children}
    </DiscoveryContext.Provider>
  );
}

// Custom hook to use the context
export function useDiscoveryContext() {
  const context = useContext(DiscoveryContext);
  if (!context) {
    throw new Error(
      'useDiscoveryContext must be used within a DiscoveryProvider'
    );
  }
  return context;
}
