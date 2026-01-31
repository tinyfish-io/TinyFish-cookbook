"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import type {
  QAState,
  QAAction,
  Project,
  TestCase,
  TestRun,
  TestResult,
  QASettings,
  GeneratedTest,
} from '@/types';
import { generateId } from './utils';

const defaultSettings: QASettings = {
  defaultTimeout: 60000,
  parallelLimit: 3,
  browserProfile: 'lite',
  proxyEnabled: false,
};

const initialState: QAState = {
  projects: [],
  currentProjectId: null,
  testCases: {},
  testRuns: {},
  settings: defaultSettings,
  activeTestRun: null,
  lastUpdated: null,
  isFirstLoad: true,
};

function reducer(state: QAState, action: QAAction): QAState {
  switch (action.type) {
    case 'CREATE_PROJECT':
      return {
        ...state,
        projects: [...state.projects, action.payload],
        testCases: { ...state.testCases, [action.payload.id]: [] },
        testRuns: { ...state.testRuns, [action.payload.id]: [] },
        lastUpdated: Date.now(),
      };

    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        ),
        lastUpdated: Date.now(),
      };

    case 'DELETE_PROJECT': {
      const { [action.payload]: removedTests, ...remainingTests } = state.testCases;
      const { [action.payload]: removedRuns, ...remainingRuns } = state.testRuns;
      void removedTests;
      void removedRuns;
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.payload),
        testCases: remainingTests,
        testRuns: remainingRuns,
        currentProjectId: state.currentProjectId === action.payload ? null : state.currentProjectId,
        lastUpdated: Date.now(),
      };
    }

    case 'SET_CURRENT_PROJECT':
      return {
        ...state,
        currentProjectId: action.payload,
      };

    case 'CREATE_TEST_CASE': {
      const projectId = action.payload.projectId;
      const existingTests = state.testCases[projectId] || [];
      return {
        ...state,
        testCases: {
          ...state.testCases,
          [projectId]: [...existingTests, action.payload],
        },
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, testCount: existingTests.length + 1 } : p
        ),
        lastUpdated: Date.now(),
      };
    }

    case 'CREATE_TEST_CASES_BULK': {
      if (action.payload.length === 0) return state;
      const projectId = action.payload[0].projectId;
      const existingTests = state.testCases[projectId] || [];
      return {
        ...state,
        testCases: {
          ...state.testCases,
          [projectId]: [...existingTests, ...action.payload],
        },
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, testCount: existingTests.length + action.payload.length } : p
        ),
        lastUpdated: Date.now(),
      };
    }

    case 'UPDATE_TEST_CASE': {
      const { id, projectId, updates } = action.payload;
      const tests = state.testCases[projectId] || [];
      return {
        ...state,
        testCases: {
          ...state.testCases,
          [projectId]: tests.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        },
        lastUpdated: Date.now(),
      };
    }

    case 'DELETE_TEST_CASE': {
      const { id, projectId } = action.payload;
      const tests = state.testCases[projectId] || [];
      const newTests = tests.filter((t) => t.id !== id);
      return {
        ...state,
        testCases: {
          ...state.testCases,
          [projectId]: newTests,
        },
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, testCount: newTests.length } : p
        ),
        lastUpdated: Date.now(),
      };
    }

    case 'START_TEST_RUN':
      return {
        ...state,
        activeTestRun: action.payload,
        projects: state.projects.map((p) =>
          p.id === action.payload.projectId
            ? { ...p, lastRunStatus: 'running', lastRunAt: Date.now() }
            : p
        ),
        lastUpdated: Date.now(),
      };

    case 'UPDATE_TEST_RESULT': {
      if (!state.activeTestRun || state.activeTestRun.id !== action.payload.runId) {
        return state;
      }

      const existingResultIndex = state.activeTestRun.results.findIndex(
        (r) => r.testCaseId === action.payload.result.testCaseId
      );

      let newResults: TestResult[];
      if (existingResultIndex >= 0) {
        newResults = [...state.activeTestRun.results];
        newResults[existingResultIndex] = action.payload.result;
      } else {
        newResults = [...state.activeTestRun.results, action.payload.result];
      }

      const passed = newResults.filter((r) => r.status === 'passed').length;
      const failed = newResults.filter((r) => r.status === 'failed' || r.status === 'error').length;

      return {
        ...state,
        activeTestRun: {
          ...state.activeTestRun,
          results: newResults,
          passed,
          failed,
        },
        lastUpdated: Date.now(),
      };
    }

    case 'COMPLETE_TEST_RUN': {
      if (!state.activeTestRun || state.activeTestRun.id !== action.payload.runId) {
        return state;
      }

      // Use finalResults if provided (avoids timing issues), otherwise fall back to state
      const resultsToUse = action.payload.finalResults || state.activeTestRun.results;

      // Recalculate passed/failed counts from the results we're using
      const passed = resultsToUse.filter((r: TestResult) => r.status === 'passed').length;
      const failed = resultsToUse.filter((r: TestResult) => r.status === 'failed' || r.status === 'error').length;

      const completedRun: TestRun = {
        ...state.activeTestRun,
        results: resultsToUse,
        passed,
        failed,
        status: action.payload.status,
        completedAt: Date.now(),
      };

      const projectId = completedRun.projectId;
      const existingRuns = state.testRuns[projectId] || [];

      const lastRunStatus: 'passed' | 'failed' =
        completedRun.failed > 0 ? 'failed' : 'passed';

      const updatedTestCases = { ...state.testCases };
      if (updatedTestCases[projectId]) {
        updatedTestCases[projectId] = updatedTestCases[projectId].map((tc) => {
          const result = completedRun.results.find((r) => r.testCaseId === tc.id);
          if (result) {
            return {
              ...tc,
              status: result.status === 'passed' ? 'passed' : result.status === 'failed' ? 'failed' : tc.status,
              lastRunResult: result,
            } as TestCase;
          }
          return tc;
        });
      }

      return {
        ...state,
        activeTestRun: null,
        testRuns: {
          ...state.testRuns,
          [projectId]: [completedRun, ...existingRuns].slice(0, 50),
        },
        testCases: updatedTestCases,
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, lastRunStatus, lastRunAt: Date.now() } : p
        ),
        lastUpdated: Date.now(),
      };
    }

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        lastUpdated: Date.now(),
      };

    case 'LOAD_STATE':
      return {
        ...action.payload,
        isFirstLoad: false,
      };

    case 'SET_FIRST_LOAD':
      return {
        ...state,
        isFirstLoad: action.payload,
      };

    case 'RESET':
      return {
        ...initialState,
        lastUpdated: Date.now(),
      };

    default:
      return state;
  }
}

interface QAContextType {
  state: QAState;
  dispatch: React.Dispatch<QAAction>;
  // Project actions
  createProject: (name: string, websiteUrl: string, description?: string) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  // Test case actions
  createTestCase: (projectId: string, title: string, description: string, expectedOutcome: string) => TestCase;
  createTestCasesBulk: (projectId: string, tests: GeneratedTest[]) => TestCase[];
  updateTestCase: (id: string, projectId: string, updates: Partial<TestCase>) => void;
  deleteTestCase: (id: string, projectId: string) => void;
  // Test run actions
  startTestRun: (projectId: string, testCaseIds: string[]) => TestRun;
  updateTestResult: (runId: string, result: TestResult) => void;
  completeTestRun: (runId: string, status: 'completed' | 'failed' | 'cancelled', finalResults?: TestResult[]) => void;
  // Settings
  updateSettings: (settings: Partial<QASettings>) => void;
  // Helpers
  getCurrentProject: () => Project | null;
  getTestCasesForProject: (projectId: string) => TestCase[];
  getTestRunsForProject: (projectId: string) => TestRun[];
  reset: () => void;
}

const QAContext = createContext<QAContextType | undefined>(undefined);

const STORAGE_KEY = 'qa-tester-state';

export function QAProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!parsed.settings) {
            parsed.settings = defaultSettings;
          }
          dispatch({ type: 'LOAD_STATE', payload: parsed });
        } catch (e) {
          console.error('Failed to load saved state:', e);
        }
      } else {
        dispatch({ type: 'SET_FIRST_LOAD', payload: false });
      }
    }
  }, []);

  // Save state to localStorage on change (debounced)
  useEffect(() => {
    if (typeof window !== 'undefined' && state.lastUpdated && !state.isFirstLoad) {
      // Debounce saves to avoid excessive writes
      const saveTimeout = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }, 300);
      
      return () => clearTimeout(saveTimeout);
    }
  }, [state]);

  // Project actions
  const createProject = useCallback((name: string, websiteUrl: string, description?: string): Project => {
    const project: Project = {
      id: generateId(),
      name,
      websiteUrl,
      description,
      createdAt: Date.now(),
      lastRunStatus: 'never_run',
      testCount: 0,
    };
    dispatch({ type: 'CREATE_PROJECT', payload: project });
    return project;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id, updates } });
  }, []);

  const deleteProject = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PROJECT', payload: id });
  }, []);

  const setCurrentProject = useCallback((id: string | null) => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: id });
  }, []);

  // Test case actions - simplified
  const createTestCase = useCallback((
    projectId: string,
    title: string,
    description: string,
    expectedOutcome: string
  ): TestCase => {
    const testCase: TestCase = {
      id: generateId(),
      projectId,
      title,
      description,
      expectedOutcome,
      status: 'pending',
      createdAt: Date.now(),
    };
    dispatch({ type: 'CREATE_TEST_CASE', payload: testCase });
    return testCase;
  }, []);

  // Bulk create test cases from AI-generated tests
  const createTestCasesBulk = useCallback((
    projectId: string,
    tests: GeneratedTest[]
  ): TestCase[] => {
    const now = Date.now();
    const testCases: TestCase[] = tests.map((test, index) => ({
      id: generateId() + `-${index}`,
      projectId,
      title: test.title,
      description: test.description,
      expectedOutcome: test.expectedOutcome,
      status: 'pending' as const,
      createdAt: now + index, // Ensure unique timestamps for ordering
    }));
    dispatch({ type: 'CREATE_TEST_CASES_BULK', payload: testCases });
    return testCases;
  }, []);

  const updateTestCase = useCallback((id: string, projectId: string, updates: Partial<TestCase>) => {
    dispatch({ type: 'UPDATE_TEST_CASE', payload: { id, projectId, updates } });
  }, []);

  const deleteTestCase = useCallback((id: string, projectId: string) => {
    dispatch({ type: 'DELETE_TEST_CASE', payload: { id, projectId } });
  }, []);

  // Test run actions
  const startTestRun = useCallback((projectId: string, testCaseIds: string[]): TestRun => {
    const run: TestRun = {
      id: generateId(),
      projectId,
      startedAt: Date.now(),
      status: 'running',
      totalTests: testCaseIds.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      results: [],
    };
    dispatch({ type: 'START_TEST_RUN', payload: run });
    return run;
  }, []);

  const updateTestResult = useCallback((runId: string, result: TestResult) => {
    dispatch({ type: 'UPDATE_TEST_RESULT', payload: { runId, result } });
  }, []);

  const completeTestRun = useCallback((runId: string, status: 'completed' | 'failed' | 'cancelled', finalResults?: TestResult[]) => {
    dispatch({ type: 'COMPLETE_TEST_RUN', payload: { runId, status, finalResults } });
  }, []);

  // Settings
  const updateSettings = useCallback((settings: Partial<QASettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  // Helpers
  const getCurrentProject = useCallback((): Project | null => {
    if (!state.currentProjectId) return null;
    return state.projects.find((p) => p.id === state.currentProjectId) || null;
  }, [state.currentProjectId, state.projects]);

  const getTestCasesForProject = useCallback((projectId: string): TestCase[] => {
    return state.testCases[projectId] || [];
  }, [state.testCases]);

  const getTestRunsForProject = useCallback((projectId: string): TestRun[] => {
    return state.testRuns[projectId] || [];
  }, [state.testRuns]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const value: QAContextType = {
    state,
    dispatch,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    createTestCase,
    createTestCasesBulk,
    updateTestCase,
    deleteTestCase,
    startTestRun,
    updateTestResult,
    completeTestRun,
    updateSettings,
    getCurrentProject,
    getTestCasesForProject,
    getTestRunsForProject,
    reset,
  };

  return (
    <QAContext.Provider value={value}>
      {children}
    </QAContext.Provider>
  );
}

export function useQA() {
  const context = useContext(QAContext);
  if (context === undefined) {
    throw new Error('useQA must be used within a QAProvider');
  }
  return context;
}
