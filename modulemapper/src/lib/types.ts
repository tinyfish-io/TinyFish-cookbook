export interface DiscoveryResult {
  subreddits: string[]
  courseplatform: { name: string; url: string } | null
  officialpage: string | null
  rmp_query: string
  blog_query: string
}

export interface AgentResult {
  source: string
  url: string
  reviews: string[]
  raw_text: string
  status: 'done' | 'error' | 'empty'
}

export interface ReviewCard {
  text: string
  source: string
  sentiment: 'positive' | 'negative' | 'mixed'
  date: string
}

export interface CourseVerdict {
  score: number
  verdict: string
  summary: string
  difficulty: number
  workload: number
  hoursPerWeek: string
  hasExam: boolean
  examDifficulty: string
  averageGrade: string
  gradingPattern: string
  assessment: string
  attendance: string
  whatYouLearn: string[]
  tags: { label: string; color: 'blue' | 'green' | 'amber' | 'red' }[]
  bestFor: string
  notGreatIf: string
  reviews: ReviewCard[]
  totalReviews: number
  sourceCounts: Record<string, number>
}
