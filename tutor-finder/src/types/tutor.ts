export interface Tutor {
  id: string;
  tutorName: string;
  examsTaught: string[];
  subjects: string[];
  teachingMode: string | null;
  location: string | null;
  experience: string | null;
  qualifications: string | null;
  pricing: string | null;
  pastResults: string | null;
  contactMethod: string | null;
  profileLink: string | null;
  sourceWebsite: string;
}

export interface AgentStatus {
  id: string;
  websiteName: string;
  websiteUrl: string;
  streamingUrl: string | null;
  status: 'searching' | 'complete' | 'error';
  message: string;
  tutors: Tutor[];
}

export type ExamType = 
  | 'SAT'
  | 'ACT'
  | 'AP'
  | 'GRE'
  | 'GMAT'
  | 'TOEFL/IELTS'
  | 'JEE/NEET'
  | 'Olympiads';

export interface SearchState {
  exam: ExamType | null;
  location: string;
  isSearching: boolean;
  isDiscovering: boolean;
  agents: AgentStatus[];
  tutors: Tutor[];
  selectedTutorIds: Set<string>;
}
