/**
 * Major cities for location suggestions (global)
 */
export const MAJOR_CITIES = [
  // Global
  "Remote",

  // Asia Pacific
  "Singapore",
  "Hong Kong",
  "Tokyo, Japan",
  "Sydney, Australia",
  "Melbourne, Australia",
  "Bangalore, India",
  "Mumbai, India",
  "Shanghai, China",
  "Seoul, South Korea",

  // Europe
  "London, UK",
  "Berlin, Germany",
  "Amsterdam, Netherlands",
  "Paris, France",
  "Dublin, Ireland",
  "Zurich, Switzerland",
  "Stockholm, Sweden",

  // North America
  "San Francisco, CA",
  "New York, NY",
  "Los Angeles, CA",
  "Seattle, WA",
  "Austin, TX",
  "Boston, MA",
  "Toronto, Canada",
  "Vancouver, Canada",
];

/**
 * Common tech skills for suggestions
 */
export const COMMON_SKILLS = [
  // Programming Languages
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "C#",
  "Go",
  "Rust",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",

  // Frontend
  "React",
  "Vue.js",
  "Angular",
  "Next.js",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "SASS",

  // Backend
  "Node.js",
  "Express",
  "Django",
  "FastAPI",
  "Spring Boot",
  "Rails",
  "GraphQL",
  "REST APIs",

  // Databases
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "DynamoDB",

  // Cloud & DevOps
  "AWS",
  "GCP",
  "Azure",
  "Docker",
  "Kubernetes",
  "Terraform",
  "CI/CD",
  "Jenkins",
  "GitHub Actions",

  // Data & ML
  "SQL",
  "Pandas",
  "NumPy",
  "TensorFlow",
  "PyTorch",
  "Machine Learning",
  "Data Analysis",

  // Soft Skills
  "Leadership",
  "Communication",
  "Problem Solving",
  "Team Collaboration",
  "Project Management",
  "Agile",
  "Scrum",
];

/**
 * Seniority level descriptions
 */
export const SENIORITY_LEVELS = {
  entry: {
    label: "Entry Level",
    description: "0-2 years of experience",
    yearsRange: [0, 2],
  },
  mid: {
    label: "Mid Level",
    description: "3-5 years of experience",
    yearsRange: [3, 5],
  },
  senior: {
    label: "Senior",
    description: "5-8 years of experience",
    yearsRange: [5, 8],
  },
  lead: {
    label: "Lead / Staff",
    description: "8+ years of experience",
    yearsRange: [8, 15],
  },
  executive: {
    label: "Executive",
    description: "Director / VP level",
    yearsRange: [10, 30],
  },
} as const;

/**
 * Resume parsing prompts
 */
export const AI_PROMPTS = {
  RESUME_PARSE: `Parse this resume and extract the following information in JSON format:
{
  "fullName": "string - full name of the candidate",
  "email": "string - email address",
  "phone": "string or null - phone number if found",
  "location": "string - city, state or location",
  "currentTitle": "string - current or most recent job title",
  "yearsExperience": "number - estimated total years of experience",
  "skills": ["array of strings - top 10 technical and soft skills"],
  "industries": ["array of strings - industries worked in"],
  "education": "string - highest education level and field",
  "preferredTitles": ["array of 3-5 strings - job titles they would likely apply for"],
  "seniorityLevel": "entry | mid | senior | lead | executive",
  "summary": "string - 2-sentence professional summary"
}

Be accurate and extract only what's explicitly stated or can be reasonably inferred.`,

  GENERATE_SEARCH_URLS: `Based on this candidate profile, generate job search URLs for the best job boards for their location and industry. Return a JSON array where each item has:
{
  "boardName": "name of the job board",
  "searchUrl": "direct URL to search results with appropriate keywords, location, and filters"
}

Choose 10-15 of the BEST job boards for the candidate's location. Include:
- Regional/local job boards relevant to their country (e.g., JobStreet for SE Asia, Naukri for India, Reed for UK)
- Global boards like LinkedIn with regional domains where applicable
- Industry-specific boards if relevant (tech, startup, remote work sites)

Use the candidate's preferred titles, skills, and location preferences to construct relevant search queries.`,

  JOB_MATCH: `Analyze how well this job matches the candidate profile. Return JSON:
{
  "matchScore": number 0-100,
  "matchExplanation": "1-2 sentence explanation of the match",
  "keyStrengths": ["up to 3 bullet points of why this is a good match"],
  "potentialConcerns": ["up to 2 bullet points of potential gaps"],
  "isReach": boolean - true if slightly senior but worth trying,
  "isPerfectFit": boolean - true if strong match on all criteria
}

Consider: title alignment, skills match, experience level fit, location/remote preferences, salary fit.`,

  COVER_LETTER: `Write a compelling, personalized cover letter for this job application. The letter should:
- Be 3-4 paragraphs long
- Open with a strong hook relevant to the company/role
- Highlight 2-3 specific qualifications that match the job requirements
- Show enthusiasm for the company and role
- End with a clear call to action
- Sound natural and personable, not generic

Do not use placeholder text like [Company Name] - use the actual names provided.`,
};

/**
 * Mino scraping goal template
 */
export const MINO_SCRAPE_GOAL = `Navigate to this job search results page. Extract the first 20 job listings shown. For each job, extract:
- title: job title
- company: company name
- location: job location
- salary: salary range if displayed (null if not shown)
- postedDate: when the job was posted (convert relative dates like "2 days ago" to YYYY-MM-DD format based on today's date)
- remoteStatus: "remote", "hybrid", or "onsite" based on any tags shown
- description: brief job description or first few sentences
- fullUrl: the direct link to the full job posting

Return as a JSON array of job objects. Focus on jobs posted in the last 48 hours if filtering is available.`;
