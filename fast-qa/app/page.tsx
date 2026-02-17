"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQA } from '@/lib/qa-context';
import { useTestExecution } from '@/lib/hooks';
import {
  DashboardLayout,
  ProjectCard,
  ProjectDialog,
  TestCaseEditor,
  TestCaseList,
  TestCaseDetail,
  TestExecutionGrid,
  TestResultsTable,
  SettingsPanel,
  AITestGenerator,
} from '@/components/qa';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  ArrowLeft,
  Play,
  Square,
  Loader2,
  CheckCircle2,
  XCircle,
  TestTube2,
  Sparkles,
} from 'lucide-react';
import type { Project, TestCase, GeneratedTest } from '@/types';

type TabType = 'projects' | 'tests' | 'execution' | 'history' | 'settings';
type TestCreationMode = 'choice' | 'manual' | 'ai';

export default function DashboardPage() {
  const {
    state,
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
  } = useQA();

  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [testCaseToDelete, setTestCaseToDelete] = useState<{ id: string; projectId: string } | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [testCreationMode, setTestCreationMode] = useState<TestCreationMode | null>(null);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | undefined>();
  const [viewingTestCase, setViewingTestCase] = useState<TestCase | null>(null);

  const currentProject = getCurrentProject();
  const testCases = useMemo(
    () => currentProject ? getTestCasesForProject(currentProject.id) : [],
    [currentProject, getTestCasesForProject]
  );
  const testRuns = currentProject ? getTestRunsForProject(currentProject.id) : [];

  // Track synced results to avoid infinite loops
  const syncedResultsRef = useRef<Map<string, string>>(new Map());

  // Track active test run ID in a ref to avoid stale closure issues
  const activeTestRunIdRef = useRef<string | null>(null);

  // Keep the ref in sync with state
  useEffect(() => {
    activeTestRunIdRef.current = state.activeTestRun?.id || null;
  }, [state.activeTestRun?.id]);

  // Test execution hook
  const {
    isExecuting,
    resultsMap,
    executeTests,
    cancelExecution,
    skipTest,
  } = useTestExecution((finalResults) => {
    // On complete callback - use ref to get current activeTestRun ID
    const runId = activeTestRunIdRef.current;
    if (runId) {
      // Pass final results directly to completeTestRun to avoid timing issues
      const resultsArray = finalResults ? Array.from(finalResults.values()) : [];
      completeTestRun(runId, 'completed', resultsArray);
    }
  });

  // Update test results in context as they come in (only sync changed results)
  useEffect(() => {
    if (state.activeTestRun && resultsMap.size > 0) {
      resultsMap.forEach((result) => {
        // Create a hash of the result status to detect changes
        const resultKey = `${result.testCaseId}-${result.status}-${result.completedAt || ''}`;
        const lastSynced = syncedResultsRef.current.get(result.testCaseId);

        if (lastSynced !== resultKey) {
          syncedResultsRef.current.set(result.testCaseId, resultKey);
          updateTestResult(state.activeTestRun!.id, result);
        }
      });
    }
  }, [resultsMap, state.activeTestRun, updateTestResult]);

  // Clear synced results when test run ends
  useEffect(() => {
    if (!state.activeTestRun) {
      syncedResultsRef.current.clear();
    }
  }, [state.activeTestRun]);

  // Handle tab changes
  const handleTabChange = useCallback((tab: TabType) => {
    if (tab === 'projects') {
      setCurrentProject(null);
    }
    setActiveTab(tab);
    setTestCreationMode(null);
    setViewingTestCase(null);
  }, [setCurrentProject]);

  // View test case detail
  const handleViewTestCase = useCallback((testCase: TestCase) => {
    setViewingTestCase(testCase);
    setTestCreationMode(null);
  }, []);

  // Project handlers
  const handleCreateProject = useCallback((name: string, websiteUrl: string, description?: string) => {
    const project = createProject(name, websiteUrl, description);
    setCurrentProject(project.id);
    setActiveTab('tests');
  }, [createProject, setCurrentProject]);

  const handleEditProject = useCallback((project: Project) => {
    setEditingProject(project);
    setProjectDialogOpen(true);
  }, []);

  const handleUpdateProject = useCallback((name: string, websiteUrl: string, description?: string) => {
    if (editingProject) {
      updateProject(editingProject.id, { name, websiteUrl, description });
      setEditingProject(undefined);
    } else {
      handleCreateProject(name, websiteUrl, description);
    }
  }, [editingProject, updateProject, handleCreateProject]);

  const handleDeleteProject = useCallback((id: string) => {
    setProjectToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteProject = useCallback(() => {
    if (projectToDelete) {
      deleteProject(projectToDelete);
      setProjectToDelete(null);
      setDeleteConfirmOpen(false);
    }
  }, [projectToDelete, deleteProject]);

  const handleSelectProject = useCallback((project: Project) => {
    setCurrentProject(project.id);
    setActiveTab('tests');
  }, [setCurrentProject]);

  // Test case handlers
  const handleSaveTestCase = useCallback((testCase: Pick<TestCase, 'title' | 'description' | 'expectedOutcome' | 'status'>) => {
    if (!currentProject) return;

    if (editingTestCase) {
      updateTestCase(editingTestCase.id, currentProject.id, testCase);
    } else {
      createTestCase(currentProject.id, testCase.title, testCase.description, testCase.expectedOutcome);
    }
    setTestCreationMode(null);
    setEditingTestCase(undefined);
  }, [currentProject, editingTestCase, createTestCase, updateTestCase]);

  const handleEditTestCase = useCallback((testCase: TestCase) => {
    setEditingTestCase(testCase);
    setTestCreationMode('manual');
  }, []);

  const handleAddGeneratedTests = useCallback((tests: GeneratedTest[]) => {
    if (!currentProject) return;
    createTestCasesBulk(currentProject.id, tests);
    setTestCreationMode(null);
  }, [currentProject, createTestCasesBulk]);

  const handleDeleteTestCase = useCallback((testCase: TestCase) => {
    setTestCaseToDelete({ id: testCase.id, projectId: testCase.projectId });
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteTestCase = useCallback(() => {
    if (testCaseToDelete) {
      deleteTestCase(testCaseToDelete.id, testCaseToDelete.projectId);
      setTestCaseToDelete(null);
      setDeleteConfirmOpen(false);
    }
  }, [testCaseToDelete, deleteTestCase]);

  // Test execution handlers
  const handleRunTests = useCallback(async () => {
    if (!currentProject || selectedTestIds.size === 0) return;

    const testsToRun = testCases.filter((tc) => selectedTestIds.has(tc.id));
    startTestRun(currentProject.id, testsToRun.map((tc) => tc.id));
    setActiveTab('execution');

    await executeTests(testsToRun, currentProject.websiteUrl, state.settings.parallelLimit);
  }, [currentProject, selectedTestIds, testCases, startTestRun, executeTests, state.settings.parallelLimit]);

  const handleRunSingleTest = useCallback(async (testCase: TestCase) => {
    if (!currentProject) return;

    setSelectedTestIds(new Set([testCase.id]));
    startTestRun(currentProject.id, [testCase.id]);
    setActiveTab('execution');

    await executeTests([testCase], currentProject.websiteUrl, 1);
  }, [currentProject, startTestRun, executeTests]);

  const handleStopTests = useCallback(() => {
    cancelExecution();
    if (state.activeTestRun) {
      // Pass current results when cancelling so partial progress is saved
      const currentResults = Array.from(resultsMap.values());
      completeTestRun(state.activeTestRun.id, 'cancelled', currentResults);
    }
  }, [cancelExecution, state.activeTestRun, completeTestRun, resultsMap]);

  // Clear all data
  const handleClearData = useCallback(() => {
    if (window.confirm('Are you sure you want to delete all data? This cannot be undone.')) {
      reset();
      localStorage.removeItem('qa-tester-state');
    }
  }, [reset]);

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'projects':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Your Projects</h2>
                <p className="text-muted-foreground">
                  Select a project to manage test cases or create a new one
                </p>
              </div>
              <Button onClick={() => {
                setEditingProject(undefined);
                setProjectDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>

            {state.projects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TestTube2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first project to start testing
                  </p>
                  <Button onClick={() => setProjectDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {state.projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    testCases={getTestCasesForProject(project.id)}
                    onSelect={() => handleSelectProject(project)}
                    onEdit={() => handleEditProject(project)}
                    onDelete={() => handleDeleteProject(project.id)}
                    onRunTests={async () => {
                      handleSelectProject(project);
                      const projectTests = getTestCasesForProject(project.id);
                      if (projectTests.length === 0) return;
                      startTestRun(project.id, projectTests.map(t => t.id));
                      setActiveTab('execution');
                      await executeTests(projectTests, project.websiteUrl, state.settings.parallelLimit);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'tests':
        if (!currentProject) {
          return (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Select a project first</p>
              <Button onClick={() => setActiveTab('projects')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Projects
              </Button>
            </div>
          );
        }

        // Show test case detail view
        if (viewingTestCase) {
          // Get fresh test case data (in case results updated)
          const freshTestCase = testCases.find(tc => tc.id === viewingTestCase.id) || viewingTestCase;
          return (
            <TestCaseDetail
              testCase={freshTestCase}
              onBack={() => setViewingTestCase(null)}
              onEdit={() => {
                setEditingTestCase(freshTestCase);
                setTestCreationMode('manual');
                setViewingTestCase(null);
              }}
              onRun={() => {
                handleRunSingleTest(freshTestCase);
                setViewingTestCase(null);
              }}
            />
          );
        }

        // Show choice dialog for new test creation
        if (testCreationMode === 'choice') {
          return (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setTestCreationMode(null)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h2 className="text-2xl font-semibold">Create Test Case</h2>
                  <p className="text-muted-foreground">Choose how you want to create your test</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
                <Card
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setTestCreationMode('manual')}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Manual Test
                    </CardTitle>
                    <CardDescription>
                      Write a single test case with title, description, and expected outcome
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Best for adding specific individual tests when you know exactly what to test.
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setTestCreationMode('ai')}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      AI-Generated Tests
                    </CardTitle>
                    <CardDescription>
                      Paste requirements or user stories to generate multiple tests automatically
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Best for quickly creating comprehensive test suites from documentation.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        }

        // Show manual test editor
        if (testCreationMode === 'manual') {
          return (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => {
                  setTestCreationMode(editingTestCase ? null : 'choice');
                  setEditingTestCase(undefined);
                }}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
              <TestCaseEditor
                testCase={editingTestCase}
                websiteUrl={currentProject.websiteUrl}
                onSave={handleSaveTestCase}
                onCancel={() => {
                  setTestCreationMode(null);
                  setEditingTestCase(undefined);
                }}
              />
            </div>
          );
        }

        // Show AI test generator
        if (testCreationMode === 'ai') {
          return (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setTestCreationMode('choice')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h2 className="text-2xl font-semibold">AI Test Generator</h2>
                  <p className="text-muted-foreground">
                    Paste your requirements, user stories, or any text to generate test cases automatically
                  </p>
                </div>
              </div>

              <AITestGenerator
                websiteUrl={currentProject.websiteUrl}
                onAddTests={handleAddGeneratedTests}
              />
            </div>
          );
        }

        // Show test list (default view)
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">{currentProject.name}</h2>
                <p className="text-muted-foreground">{currentProject.websiteUrl}</p>
              </div>
              {selectedTestIds.size > 0 && (
                <Button onClick={handleRunTests} disabled={isExecuting}>
                  {isExecuting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run {selectedTestIds.size} Tests
                    </>
                  )}
                </Button>
              )}
            </div>

            <TestCaseList
              testCases={testCases}
              selectedIds={selectedTestIds}
              onSelectionChange={setSelectedTestIds}
              onSelect={handleViewTestCase}
              onEdit={handleEditTestCase}
              onDelete={handleDeleteTestCase}
              onRun={handleRunSingleTest}
              onCreateNew={() => setTestCreationMode('choice')}
            />
          </div>
        );

      case 'execution':
        const selectedTests = testCases.filter((tc) => selectedTestIds.has(tc.id));
        const summary = state.activeTestRun
          ? {
              total: state.activeTestRun.totalTests,
              passed: state.activeTestRun.passed,
              failed: state.activeTestRun.failed,
            }
          : { total: 0, passed: 0, failed: 0 };

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Test Execution</h2>
                <p className="text-muted-foreground">
                  {isExecuting ? 'Running tests...' : 'View test execution results'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Summary badges */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">{summary.passed}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-500">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium">{summary.failed}</span>
                  </div>
                </div>

                {isExecuting ? (
                  <Button variant="destructive" onClick={handleStopTests}>
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                ) : selectedTestIds.size > 0 ? (
                  <Button onClick={handleRunTests}>
                    <Play className="mr-2 h-4 w-4" />
                    Run Again
                  </Button>
                ) : null}
              </div>
            </div>

            <TestExecutionGrid
              testCases={selectedTests}
              results={resultsMap}
              isRunning={isExecuting}
              onSkipTest={skipTest}
            />
          </div>
        );

      case 'history':
        if (!currentProject) {
          return (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Select a project to view history</p>
              <Button onClick={() => setActiveTab('projects')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Projects
              </Button>
            </div>
          );
        }

        const latestRun = testRuns[0];

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Test History</h2>
              <p className="text-muted-foreground">
                View past test runs and results for {currentProject.name}
              </p>
            </div>

            {testRuns.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No test runs yet. Run some tests to see results here.
                  </p>
                </CardContent>
              </Card>
            ) : latestRun ? (
              <TestResultsTable
                testCases={testCases}
                results={latestRun.results}
                projectUrl={currentProject.websiteUrl}
              />
            ) : null}
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Settings</h2>
              <p className="text-muted-foreground">
                Configure test execution and browser settings
              </p>
            </div>

            <SettingsPanel
              settings={state.settings}
              onSettingsChange={updateSettings}
              onClearData={handleClearData}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <DashboardLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        projectName={currentProject?.name}
      >
        {renderContent()}
      </DashboardLayout>

      {/* Project Dialog */}
      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={(open) => {
          setProjectDialogOpen(open);
          if (!open) setEditingProject(undefined);
        }}
        project={editingProject}
        onSave={handleUpdateProject}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {projectToDelete
                ? 'This will permanently delete the project and all its test cases.'
                : 'This will permanently delete this test case.'}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setProjectToDelete(null);
              setTestCaseToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (projectToDelete) {
                  confirmDeleteProject();
                } else if (testCaseToDelete) {
                  confirmDeleteTestCase();
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
