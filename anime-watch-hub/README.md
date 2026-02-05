# Anime Watch Hub



**Live** : [https://v0-animefinder.vercel.app/](https://v0-animefinder.vercel.app/)



Anime Watch Hub helps users find exactly where a specific anime is available to stream by orchestrating intelligent platform discovery and real-time availability verification. It uses the Gemini API to identify likely streaming platforms and the TinyFish API to dispatch parallel web agents that browse those sites (Crunchyroll, Netflix, Hulu, etc.) to confirm if the title is currently in their catalog.



## Demo

https://github.com/user-attachments/assets/5425211a-43b9-40c1-b5f7-8451c7549931





## TinyFish API Usage



The application employs a two-stage process. After getting search URLs from Gemini, it calls the TinyFish SSE endpoint for each platform simultaneously to verify the anime's presence:



```typescript

const response = await fetch("https://mino.ai/v1/automation/run-sse", {

     method: "POST",

     headers: {

       "X-API-Key": process.env.MINO\_API\_KEY,

       "Content-Type": "application/json",

     },

     body: JSON.stringify({

       url: platform.searchUrl,

       goal: `You are checking if the anime "${animeTitle}" is available to stream on ${platformName}.



STEP 1 - HANDLE POPUPS:

Dismiss any cookie banners, login prompts, or modal dialogs.



STEP 2 - SEARCH:

If a search box is visible, search for "${animeTitle}".



STEP 3 - ANALYZE SEARCH RESULTS:

\- Check if "${animeTitle}" or a very close match appears

\- Verify it is the anime series, not related content



STEP 4 - RETURN RESULT:

{

     "available": true/false,

     "watchUrl": "URL if available",

     "message": "Brief description of what was found"

}`,

     }),

});



```



The app processes the SSE stream to show live browser status updates and provides a "Live View" link via the ```STREAMING\_URL``` event.



## How to Run

**Prerequisites**

- Node.js 18+

- A Gemini API Key

- A TinyFish API Key (\[get one here](https://accounts.mino.ai/sign-in?redirect\_url=https%3A%2F%2Fmino.ai%2Fapi-keys))



**Setup** 

1. Install dependencies:

```bash

  cd anime-watch-hub
  npm install

```

2. Configure Environment: Create a ```.env.local``` file in the root directory:

 ```bash

  GEMINI\_API\_KEY=your\_gemini\_api\_key
  MINO\_API\_KEY=your\_tinyfish\_api\_key

 ```

3. Launch Development Server:

```bash

  npm run dev

```

4. Access the App: Navigate to http://localhost:3000



## Architecture Diagram



The system follows a two-stage orchestration pattern to ensure high accuracy and real-time data:



```mermaid

graph TD

       User((User)) -->|Search Title| FE\[Next.js App]

       FE -->|Stage 1: Platform Discovery| Gemini\[Gemini API]

       Gemini -->|Returns Search URLs| FE

       

       subgraph TinyFish\_Agents \[Stage 2: Verification]

           FE -->|POST /run-sse| API\[Mino API]

           API --> A1\[Agent: Crunchyroll]

           API --> A2\[Agent: Netflix]

           API --> A3\[Agent: Hulu]

       end

       

       A1 -.->|Real-time Events| FE

       A2 -.->|Real-time Events| FE

       A3 -.->|Real-time Events| FE

       

       FE -->|Update UI| User

