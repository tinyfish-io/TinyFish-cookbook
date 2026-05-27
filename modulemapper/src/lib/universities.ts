export interface UniversityProfile {
  subreddits: string[]
  courseplatform: { name: string; urlTemplate: string } | null
  officialTemplate: string | null
  country: string
}

const UNIVERSITY_PROFILES: Record<string, UniversityProfile> = {
  'nus': {
    subreddits: ['nus', 'SGExams', 'singapore'],
    courseplatform: { name: 'NUSMods', urlTemplate: 'https://nusmods.com/modules/{code}' },
    officialTemplate: 'https://nusmods.com/modules/{code}/information',
    country: 'SG'
  },
  'national university of singapore': {
    subreddits: ['nus', 'SGExams', 'singapore'],
    courseplatform: { name: 'NUSMods', urlTemplate: 'https://nusmods.com/modules/{code}' },
    officialTemplate: 'https://nusmods.com/modules/{code}/information',
    country: 'SG'
  },
  'ntu': {
    subreddits: ['ntu', 'SGExams', 'singapore'],
    courseplatform: { name: 'NTU Course Review', urlTemplate: 'https://www.ntu.edu.sg/education/undergraduate-programme/courses/{code}' },
    officialTemplate: null,
    country: 'SG'
  },
  'nanyang technological university': {
    subreddits: ['ntu', 'SGExams', 'singapore'],
    courseplatform: null,
    officialTemplate: null,
    country: 'SG'
  },
  'harvard': {
    subreddits: ['harvard', 'ApplyingToCollege', 'college'],
    courseplatform: { name: 'Harvard Course Reviews', urlTemplate: 'https://www.harvardcrimson.com/topic/courses/' },
    officialTemplate: 'https://courses.harvard.edu/search?q={code}',
    country: 'US'
  },
  'mit': {
    subreddits: ['mit', 'ApplyingToCollege', 'college'],
    courseplatform: { name: 'Courseroad', urlTemplate: 'https://courseroad.mit.edu/' },
    officialTemplate: 'https://student.mit.edu/catalog/search.cgi?search={code}',
    country: 'US'
  },
  'stanford': {
    subreddits: ['stanford', 'ApplyingToCollege', 'college'],
    courseplatform: { name: 'Stanford Carta', urlTemplate: 'https://carta.stanford.edu/course/{code}' },
    officialTemplate: 'https://exploredegrees.stanford.edu/search/?q={code}',
    country: 'US'
  },
  'oxford': {
    subreddits: ['oxford', 'UniUK', 'uniuk'],
    courseplatform: null,
    officialTemplate: 'https://www.ox.ac.uk/admissions/undergraduate/courses/course-listing',
    country: 'UK'
  },
  'cambridge': {
    subreddits: ['cambridge', 'UniUK', 'uniuk'],
    courseplatform: null,
    officialTemplate: 'https://www.undergraduate.study.cam.ac.uk/courses',
    country: 'UK'
  },
  'imperial': {
    subreddits: ['imperialcollege', 'UniUK'],
    courseplatform: null,
    officialTemplate: null,
    country: 'UK'
  },
  'ucl': {
    subreddits: ['ucl', 'UniUK'],
    courseplatform: null,
    officialTemplate: null,
    country: 'UK'
  },
  'toronto': {
    subreddits: ['uoft', 'UofT'],
    courseplatform: { name: 'UofT Course Evals', urlTemplate: 'https://course-evals.utoronto.ca/' },
    officialTemplate: 'https://artsci.calendar.utoronto.ca/search-courses?course_keyword={code}',
    country: 'CA'
  },
  'university of toronto': {
    subreddits: ['uoft', 'UofT'],
    courseplatform: { name: 'UofT Course Evals', urlTemplate: 'https://course-evals.utoronto.ca/' },
    officialTemplate: 'https://artsci.calendar.utoronto.ca/search-courses?course_keyword={code}',
    country: 'CA'
  },
  'melbourne': {
    subreddits: ['unimelb', 'australia'],
    courseplatform: null,
    officialTemplate: 'https://handbook.unimelb.edu.au/search?query={code}',
    country: 'AU'
  },
  'iit': {
    subreddits: ['iit', 'JEENEETards', 'india'],
    courseplatform: null,
    officialTemplate: null,
    country: 'IN'
  },
  'nyu': {
    subreddits: ['nyu', 'college'],
    courseplatform: null,
    officialTemplate: 'https://courses.nyu.edu/search?query={code}',
    country: 'US'
  },
  'ucla': {
    subreddits: ['ucla', 'college'],
    courseplatform: { name: 'Bruinwalk', urlTemplate: 'https://www.bruinwalk.com/search/?q={code}' },
    officialTemplate: 'https://registrar.ucla.edu/Academics/Course-Descriptions',
    country: 'US'
  },
  'uc berkeley': {
    subreddits: ['berkeley', 'college'],
    courseplatform: { name: 'Berkeley Course Guide', urlTemplate: 'https://guide.berkeley.edu/courses/' },
    officialTemplate: 'https://classes.berkeley.edu/search/class/?q={code}',
    country: 'US'
  },
  'smu': {
    subreddits: ['smusingapore', 'SGExams', 'singapore'],
    courseplatform: null,
    officialTemplate: null,
    country: 'SG'
  },
}

export function getUniversityProfile(university: string, courseCode: string): {
  subreddits: string[]
  courseplatformUrl: string | null
  courseplatformName: string | null
  officialUrl: string | null
  rmpQuery: string
  blogQuery: string
} {
  const key = university.toLowerCase().trim()
  let profile: UniversityProfile | null = null

  for (const [k, v] of Object.entries(UNIVERSITY_PROFILES)) {
    if (key.includes(k) || k.includes(key)) {
      profile = v
      break
    }
  }

  const uniSlug = university.toLowerCase().replace(/\s+/g, '')
  const subreddits = profile?.subreddits ?? [uniSlug, 'college', 'university']

  const courseplatformUrl = profile?.courseplatform
    ? profile.courseplatform.urlTemplate.replace('{code}', courseCode)
    : null

  const courseplatformName = profile?.courseplatform?.name ?? null

  const officialUrl = profile?.officialTemplate
    ? profile.officialTemplate.replace('{code}', courseCode)
    : null

  const rmpQuery = `${courseCode} ${university}`
  const blogQuery = `${courseCode} ${university} course review`

  return { subreddits, courseplatformUrl, courseplatformName, officialUrl, rmpQuery, blogQuery }
}
