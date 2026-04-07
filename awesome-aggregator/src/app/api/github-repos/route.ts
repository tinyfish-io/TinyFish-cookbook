import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const KNOWN_REPOS: Record<string, string[]> = {
  'machine-learning': [
    'https://github.com/josephmisiti/awesome-machine-learning',
    'https://github.com/ChristosChristofidis/awesome-deep-learning',
    'https://github.com/eugeneyan/applied-ml',
    'https://github.com/academic/awesome-datascience',
    'https://github.com/visenger/awesome-mlops',
    'https://github.com/bharathgs/Awesome-pytorch-list',
    'https://github.com/krzjoa/awesome-python-data-science',
    'https://github.com/awesomedata/awesome-public-datasets',
  ],
  'react': [
    'https://github.com/enaqx/awesome-react',
    'https://github.com/brillout/awesome-react-components',
    'https://github.com/unicodeveloper/awesome-nextjs',
    'https://github.com/jaredpalmer/awesome-react-render-props',
    'https://github.com/rehooks/awesome-react-hooks',
    'https://github.com/streamich/react-use',
    'https://github.com/alan2207/bulletproof-react',
  ],
  'rust': [
    'https://github.com/rust-unofficial/awesome-rust',
    'https://github.com/analysis-tools-dev/awesome-static-analysis',
    'https://github.com/transparencies/awesome-graphql',
    'https://github.com/not-fl3/awesome-rust-gamedev',
    'https://github.com/flosse/rust-web-framework-comparison',
    'https://github.com/dbrgn/tealdeer',
    'https://github.com/awesome-rust-com/awesome-rust',
  ],
  'devops': [
    'https://github.com/wmariuss/awesome-devops',
    'https://github.com/AcalephStorage/awesome-devops',
    'https://github.com/awesome-lists/awesome-bash',
    'https://github.com/avelino/awesome-go',
    'https://github.com/veggiemonk/awesome-docker',
    'https://github.com/ramitsurana/awesome-kubernetes',
    'https://github.com/kahun/awesome-sysadmin',
  ],
  'python': [
    'https://github.com/vinta/awesome-python',
    'https://github.com/krzjoa/awesome-python-data-science',
    'https://github.com/trananhkma/fucking-awesome-python',
    'https://github.com/pawl/awesome-etl',
    'https://github.com/ml-tooling/best-of-ml-python',
    'https://github.com/realpython/list-of-python-api-wrappers',
    'https://github.com/ujjwalkarn/DataSciencePython',
  ],
  'kubernetes': [
    'https://github.com/ramitsurana/awesome-kubernetes',
    'https://github.com/tomhuang12/awesome-k8s-resources',
    'https://github.com/veggiemonk/awesome-docker',
    'https://github.com/nubenetes/awesome-kubernetes',
    'https://github.com/wsargent/docker-cheat-sheet',
    'https://github.com/collabnix/kubetools',
    'https://github.com/ContainerSolutions/k8s-deployment-strategies',
  ],
  'ai-tools': [
    'https://github.com/steven2358/awesome-generative-ai',
    'https://github.com/e2b-dev/awesome-ai-agents',
    'https://github.com/Hannibal046/Awesome-LLM',
    'https://github.com/tensorchord/Awesome-LLMOps',
    'https://github.com/f/awesome-chatgpt-prompts',
    'https://github.com/humanloop/awesome-chatgpt',
    'https://github.com/underlines/awesome-marketing-datascience',
  ],
  'go': [
    'https://github.com/avelino/awesome-go',
    'https://github.com/uhub/awesome-go',
    'https://github.com/mkchoi212/paper-code',
    'https://github.com/gocn/awesome-go-cn',
    'https://github.com/gostor/awesome-go-storage',
    'https://github.com/golang-standards/project-layout',
    'https://github.com/dgryski/awesome-go-perf',
  ],
  'typescript': [
    'https://github.com/dzharii/awesome-typescript',
    'https://github.com/typescript-cheatsheets/react',
    'https://github.com/orta/typescript-notes',
    'https://github.com/semlinker/awesome-typescript',
    'https://github.com/labs42io/clean-code-typescript',
    'https://github.com/total-typescript/beginners-typescript',
    'https://github.com/millsp/ts-toolbelt',
  ],
  'docker': [
    'https://github.com/veggiemonk/awesome-docker',
    'https://github.com/jessfraz/dockerfiles',
    'https://github.com/wsargent/docker-cheat-sheet',
    'https://github.com/docker/awesome-compose',
    'https://github.com/collabnix/dockerlabs',
    'https://github.com/bkeepers/dotenv',
    'https://github.com/nicholasdille/docker-tools',
  ],
  'security': [
    'https://github.com/sbilly/awesome-security',
    'https://github.com/vitalysim/Awesome-Hacking-Resources',
    'https://github.com/ashishb/android-security-awesome',
    'https://github.com/paragonie/awesome-appsec',
    'https://github.com/enaqx/awesome-pentest',
    'https://github.com/carpedm20/awesome-hacking',
    'https://github.com/plenpassenger/awesome-network-analysis',
  ],
}

function dedupeRepos(repos: string[]): string[] {
  const seen: Record<string, boolean> = {}
  const result: string[] = []
  for (let i = 0; i < repos.length; i++) {
    if (!seen[repos[i]]) {
      seen[repos[i]] = true
      result.push(repos[i])
    }
  }
  return result
}

async function searchGitHub(topic: string): Promise<string[]> {
  const queries = [`awesome-${topic}`, `awesome ${topic}`]
  const results: string[] = []
  const seenNames: Record<string, boolean> = {}

  for (let qi = 0; qi < queries.length; qi++) {
    try {
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(queries[qi] + ' in:name,description')}&sort=stars&order=desc&per_page=12`,
        { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'awesome-aggregator' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      const items = data.items || []
      for (let i = 0; i < items.length; i++) {
        const url = items[i].html_url as string
        const name = items[i].full_name as string
        const desc = (items[i].description || '') as string
        if (!seenNames[name] && (name.toLowerCase().includes('awesome') || desc.toLowerCase().includes('curated'))) {
          seenNames[name] = true
          results.push(url)
        }
      }
    } catch (e) {
      console.error('GitHub search error:', e)
    }
  }

  return results.slice(0, 10)
}

export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get('topic')?.toLowerCase().trim()
  if (!topic) {
    return Response.json({ error: 'Missing topic' }, { status: 400 })
  }

  const keys = Object.keys(KNOWN_REPOS)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (topic === key || topic.includes(key) || key.includes(topic)) {
      const repos = KNOWN_REPOS[key]
      if (repos.length >= 7) return Response.json({ repos: repos.slice(0, 10), source: 'curated' })
      const extra = await searchGitHub(topic)
      const combined = dedupeRepos(repos.concat(extra)).slice(0, 10)
      return Response.json({ repos: combined, source: 'curated' })
    }
  }

  const repos = await searchGitHub(topic)
  if (repos.length === 0) {
    return Response.json({ error: 'No awesome repos found for this topic' }, { status: 404 })
  }

  return Response.json({ repos: repos.slice(0, 10), source: 'github-search' })
}
