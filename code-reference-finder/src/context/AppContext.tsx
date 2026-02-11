'use client';

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { AppState, AppAction, ReferenceAgentState } from '@/lib/types';

const initialState: AppState = {
  phase: 'input',
  userCode: null,
  analysis: null,
  searchQueries: [],
  searchResults: [],
  agents: {},
  startedAt: null,
  completedAt: null,
};

function allAgentsDone(agents: Record<string, ReferenceAgentState>): boolean {
  const entries = Object.values(agents);
  if (entries.length === 0) return false;
  return entries.every((a) => a.status === 'complete' || a.status === 'error');
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'START_ANALYSIS':
      return {
        ...initialState,
        phase: 'analyzing',
        userCode: action.payload.code,
        startedAt: Date.now(),
      };

    case 'ANALYSIS_COMPLETE':
      return {
        ...state,
        phase: 'searching',
        analysis: action.payload.analysis,
        searchQueries: action.payload.queries,
      };

    case 'SEARCH_COMPLETE':
      return {
        ...state,
        phase: 'extracting',
        searchResults: action.payload.results,
      };

    case 'AGENT_CONNECTING': {
      const agent: ReferenceAgentState = {
        id: action.payload.id,
        url: action.payload.url,
        platform: action.payload.platform,
        status: 'connecting',
        currentStep: 'Connecting to agent...',
        steps: [],
        startedAt: Date.now(),
      };
      return {
        ...state,
        agents: { ...state.agents, [action.payload.id]: agent },
      };
    }

    case 'AGENT_STEP': {
      const existing = state.agents[action.payload.id];
      if (!existing) return state;
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.payload.id]: {
            ...existing,
            status: existing.platform === 'stackoverflow' ? 'reasoning' : 'navigating',
            currentStep: action.payload.step,
            steps: [
              ...existing.steps,
              { message: action.payload.step, timestamp: Date.now() },
            ],
          },
        },
      };
    }

    case 'AGENT_STREAMING_URL': {
      const existing = state.agents[action.payload.id];
      if (!existing) return state;
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.payload.id]: {
            ...existing,
            streamingUrl: action.payload.streamingUrl,
          },
        },
      };
    }

    case 'AGENT_COMPLETE': {
      const existing = state.agents[action.payload.id];
      if (!existing) return state;
      const updatedAgents = {
        ...state.agents,
        [action.payload.id]: {
          ...existing,
          status: 'complete' as const,
          currentStep: 'Done',
          result: action.payload.result,
          completedAt: Date.now(),
        },
      };
      return {
        ...state,
        agents: updatedAgents,
        phase: allAgentsDone(updatedAgents) ? 'complete' : state.phase,
        completedAt: allAgentsDone(updatedAgents) ? Date.now() : state.completedAt,
      };
    }

    case 'AGENT_ERROR': {
      const existing = state.agents[action.payload.id];
      if (!existing) return state;
      const updatedAgents = {
        ...state.agents,
        [action.payload.id]: {
          ...existing,
          status: 'error' as const,
          currentStep: 'Failed',
          error: action.payload.error,
          completedAt: Date.now(),
        },
      };
      return {
        ...state,
        agents: updatedAgents,
        phase: allAgentsDone(updatedAgents) ? 'complete' : state.phase,
        completedAt: allAgentsDone(updatedAgents) ? Date.now() : state.completedAt,
      };
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
}
