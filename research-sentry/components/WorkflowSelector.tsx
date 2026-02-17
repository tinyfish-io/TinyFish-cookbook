'use client';

import { useState } from 'react';
import { WORKFLOWS, ResearchWorkflow, WorkflowStep } from '@/lib/workflows';
import { Play, CheckCircle, Circle, ChevronRight, FileText, Loader2, ArrowRight } from 'lucide-react';

export default function WorkflowSelector() {
    const [activeWorkflow, setActiveWorkflow] = useState<ResearchWorkflow | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<{ [stepId: string]: string }>({});

    const startWorkflow = (workflow: ResearchWorkflow) => {
        setActiveWorkflow(workflow);
        setCurrentStepIndex(0);
        setResults({});
    };

    const executeStep = async () => {
        if (!activeWorkflow) return;

        setIsProcessing(true);
        const step = activeWorkflow.steps[currentStepIndex];

        // Simulate AI processing for the step
        setTimeout(() => {
            setResults(prev => ({
                ...prev,
                [step.id]: `AI generated result for step "${step.title}". In a real implementation, this would call GPT-4 with context.`
            }));
            setIsProcessing(false);
            if (currentStepIndex < activeWorkflow.steps.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
            }
        }, 2000);
    };

    if (activeWorkflow) {
        return (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-4xl mx-auto shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{activeWorkflow.name}</h2>
                        <p className="text-slate-400">{activeWorkflow.description}</p>
                    </div>
                    <button
                        onClick={() => setActiveWorkflow(null)}
                        className="text-slate-500 hover:text-white transition-colors"
                    >
                        Exit Workflow
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Steps List */}
                    <div className="space-y-4">
                        {activeWorkflow.steps.map((step, idx) => (
                            <div
                                key={step.id}
                                className={`
                    p-4 rounded-xl border transition-all
                    ${idx === currentStepIndex
                                        ? 'bg-purple-900/20 border-purple-500/50 shadow-lg shadow-purple-900/20'
                                        : idx < currentStepIndex
                                            ? 'bg-slate-800/50 border-slate-700 opacity-70'
                                            : 'bg-slate-900 border-slate-800 opacity-50'
                                    }
                  `}
                            >
                                <div className="flex items-center gap-3">
                                    {idx < currentStepIndex ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs
                        ${idx === currentStepIndex ? 'border-purple-400 text-purple-400' : 'border-slate-600 text-slate-600'}
                      `}>
                                            {idx + 1}
                                        </div>
                                    )}
                                    <h3 className={`font-medium ${idx === currentStepIndex ? 'text-white' : 'text-slate-300'}`}>
                                        {step.title}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Active Step Content */}
                    <div className="md:col-span-2 bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50 min-h-[400px] flex flex-col">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin text-purple-400" /> : <ChevronRight className="w-5 h-5 text-purple-400" />}
                                {activeWorkflow.steps[currentStepIndex].title}
                            </h3>
                            <p className="text-slate-300 mb-6">{activeWorkflow.steps[currentStepIndex].description}</p>

                            {/* Previous Results */}
                            <div className="space-y-4">
                                {Object.entries(results).map(([id, result]) => {
                                    const step = activeWorkflow.steps.find(s => s.id === id);
                                    return (
                                        <div key={id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">{step?.title} Result</h4>
                                            <p className="text-slate-300 text-sm font-mono">{result}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-700/50 flex justify-end">
                            <button
                                onClick={executeStep}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                            >
                                {isProcessing ? 'Processing...' : currentStepIndex === activeWorkflow.steps.length - 1 ? 'Finish Workflow' : 'Run Next Step'}
                                {!isProcessing && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Research Workflows</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {WORKFLOWS.map((workflow) => (
                    <div
                        key={workflow.id}
                        className="group bg-slate-900/50 border border-slate-700 rounded-2xl p-6 hover:border-purple-500/50 transition-all hover:bg-slate-800"
                    >
                        <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{workflow.name}</h3>
                        <p className="text-slate-400 text-sm mb-6 min-h-[40px]">{workflow.description}</p>

                        <button
                            onClick={() => startWorkflow(workflow)}
                            className="w-full py-3 bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-purple-900/20"
                        >
                            <Play className="w-4 h-4" /> Start Workflow
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
