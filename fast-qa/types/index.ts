// Project types
export interface Project {
  id: string;
  name: string;
  websiteUrl: string;
  description?: string;
  createdAt: number;
  lastRunStatus?: 'passed' | 'failed' | 'running' | 'never_run';
  lastRunAt?: number;
  testCount?: number;
}

// Simplified Test case types
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface TestCase {
  id: string;
  projectId: string;
  title: string;
  description: string; // Natural language test description
  expectedOutcome: string;
  status: TestStatus;
  createdAt: number;
  lastRunResult?: TestResult;
}

// Test execution types
export interface TestResult {
  id: string;
  testCaseId: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'error';
  startedAt: number;
  completedAt?: number;
  duration?: number;
  currentStep?: number;
  totalSteps?: number;
  currentStepDescription?: string;
  streamingUrl?: string;
  error?: string;
  reason?: string; // Explanation of why the test passed or failed
  steps?: string[]; // All steps taken during test execution
  extractedData?: Record<string, unknown>;
}

// Test run types (batch execution)
export interface TestRun {
  id: string;
  projectId: string;
  startedAt: number;
  completedAt?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResult[];
}

// Settings types
export interface QASettings {
  defaultTimeout: number; // ms
  parallelLimit: number; // max concurrent tests
  browserProfile: 'lite' | 'stealth';
  proxyEnabled: boolean;
  proxyCountry?: 'US' | 'GB' | 'CA' | 'DE' | 'FR' | 'JP' | 'AU';
}

// Bulk test generation types
export interface GeneratedTest {
  title: string;
  description: string;
  expectedOutcome: string;
}

export interface BulkGenerateRequest {
  rawText: string;
  websiteUrl: string;
}

export interface BulkGenerateResponse {
  tests: GeneratedTest[];
}

// SSE Event types
export type TestEventType =
  | 'test_start'
  | 'streaming_url'
  | 'step_progress'
  | 'step_complete'
  | 'test_complete'
  | 'test_error'
  | 'all_complete';

export interface TestEvent {
  type: TestEventType;
  testCaseId: string;
  timestamp: number;
  data?: {
    streamingUrl?: string;
    currentStep?: number;
    totalSteps?: number;
    stepDescription?: string;
    status?: TestStatus;
    error?: string;
    result?: TestResult;
  };
}

export interface AllCompleteEvent {
  type: 'all_complete';
  timestamp: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

// Bug report types
export interface BugReport {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;
  environment?: string;
  additionalNotes?: string;
}

// State types for context
export interface QAState {
  projects: Project[];
  currentProjectId: string | null;
  testCases: Record<string, TestCase[]>; // keyed by projectId
  testRuns: Record<string, TestRun[]>; // keyed by projectId
  settings: QASettings;
  activeTestRun: TestRun | null;
  lastUpdated: number | null;
  isFirstLoad: boolean;
}

// Action types for reducer
export type QAAction =
  | { type: 'CREATE_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: { id: string; updates: Partial<Project> } }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_CURRENT_PROJECT'; payload: string | null }
  | { type: 'CREATE_TEST_CASE'; payload: TestCase }
  | { type: 'CREATE_TEST_CASES_BULK'; payload: TestCase[] }
  | { type: 'UPDATE_TEST_CASE'; payload: { id: string; projectId: string; updates: Partial<TestCase> } }
  | { type: 'DELETE_TEST_CASE'; payload: { id: string; projectId: string } }
  | { type: 'START_TEST_RUN'; payload: TestRun }
  | { type: 'UPDATE_TEST_RESULT'; payload: { runId: string; result: TestResult } }
  | { type: 'COMPLETE_TEST_RUN'; payload: { runId: string; status: 'completed' | 'failed' | 'cancelled'; finalResults?: TestResult[] } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<QASettings> }
  | { type: 'LOAD_STATE'; payload: QAState }
  | { type: 'SET_FIRST_LOAD'; payload: boolean }
  | { type: 'RESET' };
