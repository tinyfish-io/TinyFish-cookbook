import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { AppState, AppAction, AgentStatus } from '@/types';

const initialState: AppState = {
  phase: 'input',
  searchParams: null,
  agents: {},
  searchStartedAt: null,
  searchCompletedAt: null,
};

function inferStatus(step: string): AgentStatus {
  const s = step.toLowerCase();
  if (s.includes('search') || s.includes('map') || s.includes('navigat')) return 'searching_maps';
  if (s.includes('review')) return 'reading_reviews';
  if (s.includes('menu') || s.includes('image') || s.includes('photo')) return 'checking_menu';
  return 'analyzing';
}

function updateAgent(state: AppState, id: string, updates: Partial<AppState['agents'][string]>): AppState {
  const agent = state.agents[id];
  if (!agent) return state;
  return {
    ...state,
    agents: {
      ...state.agents,
      [id]: { ...agent, ...updates },
    },
  };
}

function searchReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'START_SEARCH':
      return {
        phase: 'searching',
        searchParams: action.payload,
        agents: {},
        searchStartedAt: Date.now(),
        searchCompletedAt: null,
      };

    case 'AGENT_CONNECTING':
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.payload.id]: {
            id: action.payload.id,
            restaurantName: action.payload.restaurantName,
            status: 'connecting',
            currentStep: 'Connecting to agent...',
            steps: [],
            startedAt: Date.now(),
          },
        },
      };

    case 'AGENT_STEP': {
      const agent = state.agents[action.payload.id];
      if (!agent) return state;
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.payload.id]: {
            ...agent,
            currentStep: action.payload.step,
            status: inferStatus(action.payload.step),
            steps: [...agent.steps, { message: action.payload.step, timestamp: Date.now() }],
          },
        },
      };
    }

    case 'AGENT_STREAMING_URL':
      return updateAgent(state, action.payload.id, {
        streamingUrl: action.payload.streamingUrl,
      });

    case 'AGENT_COMPLETE': {
      const updated = updateAgent(state, action.payload.id, {
        status: 'complete',
        currentStep: 'Analysis complete',
        result: action.payload.result,
        completedAt: Date.now(),
      });
      // Record all-done timestamp but stay in 'searching' phase
      // The UI renders results incrementally regardless of phase
      const allDone = Object.values(updated.agents).every(
        a => a.status === 'complete' || a.status === 'error'
      );
      if (allDone && Object.keys(updated.agents).length > 0) {
        return { ...updated, searchCompletedAt: Date.now() };
      }
      return updated;
    }

    case 'AGENT_ERROR': {
      const updated = updateAgent(state, action.payload.id, {
        status: 'error',
        error: action.payload.error,
        completedAt: Date.now(),
      });
      const allDone = Object.values(updated.agents).every(
        a => a.status === 'complete' || a.status === 'error'
      );
      if (allDone && Object.keys(updated.agents).length > 0) {
        return { ...updated, searchCompletedAt: Date.now() };
      }
      return updated;
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

const SearchContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(searchReducer, initialState);
  return (
    <SearchContext.Provider value={{ state, dispatch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }
  return context;
}
