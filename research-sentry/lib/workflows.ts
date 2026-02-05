import { ResearchPaper } from './types';

export interface WorkflowStep {
    id: string;
    title: string;
    description: string;
    action: 'search' | 'analyze' | 'generate' | 'review';
    promptTemplate?: string;
    completed?: boolean;
    result?: string;
}

export interface ResearchWorkflow {
    id: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
}

export const WORKFLOWS: ResearchWorkflow[] = [
    {
        id: 'literature-review',
        name: 'Literature Review Assistant',
        description: 'Systematic review of a topic identifying key themes and gaps',
        steps: [
            {
                id: '1',
                title: 'Broad Search',
                description: 'Find seminal papers on the topic',
                action: 'search'
            },
            {
                id: '2',
                title: 'Thematic Analysis',
                description: 'Categorize papers by methodology and findings',
                action: 'analyze',
                promptTemplate: 'Analyze these papers and group them by key themes: {papers}'
            },
            {
                id: '3',
                title: 'Gap Identification',
                description: 'Find missing areas in current research',
                action: 'generate',
                promptTemplate: 'Based on these papers, what research questions remain unanswered? {papers}'
            },
            {
                id: '4',
                title: 'Review Outline',
                description: 'Generate a structure for the literature review',
                action: 'generate'
            }
        ]
    },
    {
        id: 'hypothesis-gen',
        name: 'Hypothesis Generator',
        description: 'Generate novel research hypotheses based on existing literature',
        steps: [
            {
                id: '1',
                title: 'Problem Definition',
                description: 'Identify the core problem space',
                action: 'search'
            },
            {
                id: '2',
                title: 'Cross-Pollination',
                description: 'Find methods from adjacent fields',
                action: 'search'
            },
            {
                id: '3',
                title: 'Hypothesis Synthesis',
                description: 'Combine problems with novel methods',
                action: 'generate',
                promptTemplate: 'Propose 3 novel hypotheses combining: {papers}'
            }
        ]
    },
    {
        id: 'critique',
        name: 'Paper Critique',
        description: 'Deep dive analysis of a specific paper\'s validity',
        steps: [
            {
                id: '1',
                title: 'Methodology Check',
                description: 'Verify statistical and experimental soundness',
                action: 'analyze'
            },
            {
                id: '2',
                title: 'Reproducibility Assessment',
                description: 'Evaluate if enough detail is provided',
                action: 'analyze'
            },
            {
                id: '3',
                title: 'Counter-Evidence Search',
                description: 'Find papers that contradict findings',
                action: 'search'
            }
        ]
    }
];
