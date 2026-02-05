export interface SearchCriteria {
    topic: string;
    keywords: string[];
    dateRange?: { from?: string; to?: string };
    sources: SourceType[];
    maxResults: number;
    fullPrompt?: string;
}

export type SourceType = 'arxiv' | 'pubmed' | 'semantic_scholar' | 'google_scholar' | 'ieee' | 'ssrn' | 'core' | 'doaj';

export interface ResearchPaper {
    id: string;
    title: string;
    authors: string[];
    abstract: string;
    publishedDate: string;
    source: string;
    url: string;
    pdfUrl?: string;
    citations?: number;
    doi?: string;
}

export interface SearchResult {
    query: string;
    papers: ResearchPaper[];
    totalFound: number;
    transcript?: string;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    relatedPapers?: ResearchPaper[];
}

export interface ConversationState {
    messages: Message[];
    isThinking: boolean;
}
