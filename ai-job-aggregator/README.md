@"
# 🎯 AI Job Aggregator

**GitHub Repo:** [https://github.com/YashNandamuru/ai-job-aggregator](https://github.com/YashNandamuru/ai-job-aggregator)

---

## What it does

AI Job Aggregator searches **6 job boards in parallel** using TinyFish web agents. Instead of manually checking LinkedIn, Indeed, Wellfound, YC Jobs, Levels.fyi, and Glassdoor one by one, this tool searches them all simultaneously and aggregates results in real-time.

---

## Demo

[View Demo Video](YOUR_YOUTUBE_OR_DRIVE_LINK)

---

## Code Snippet

\`\`\`python
async with httpx.AsyncClient() as client:
    async with client.stream(
        "POST",
        "https://agent.tinyfish.ai/v1/automation/run-sse",
        headers={
            "X-API-Key": TINYFISH_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "url": "https://www.linkedin.com/jobs/search/?keywords=AI+Engineer",
            "goal": "Extract job listings with title, company, location, salary, URL. Return as JSON.",
            "timeout": 300000,
        },
    ) as response:
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                event = json.loads(line[6:])
\`\`\`

---

## How to Run

### Backend
\`\`\`bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
echo "TINYFISH_API_KEY=your_key" > .env
uvicorn app.main:app --reload --port 8000
\`\`\`

### Frontend
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

Open http://localhost:5173

---

## Architecture

\`\`\`
React Frontend (Vite + Tailwind)
        │ SSE Stream
        ▼
FastAPI Backend
        │ Parallel requests
        ▼
TinyFish Web Agents
  ├── LinkedIn
  ├── Indeed
  ├── Wellfound
  ├── YC Jobs
  ├── Levels.fyi
  └── Glassdoor
\`\`\`

---

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** FastAPI, Python, HTTPX
- **Web Automation:** TinyFish API
"@ | Out-File -FilePath ai-job-aggregator\README.md -Encoding utf8