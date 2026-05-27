"""
main.py — GitPaid FastAPI server
Serves the static frontend and the /api/search SSE endpoint.
"""
from __future__ import annotations

import json
import os
import traceback
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from agents import run_search
from models import SearchRequest

load_dotenv()

app = FastAPI(title="GitPaid", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve static dir relative to this file
BASE_DIR = Path(__file__).resolve().parent
static_dir = BASE_DIR / "static"
static_dir.mkdir(exist_ok=True)


# Serve static assets (styles.css, app.js)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/", response_class=HTMLResponse)
async def index():
    html_path = static_dir / "index.html"
    print(f"[GitPaid] Frontend path: {html_path}  exists={html_path.exists()}")
    if html_path.exists():
        return HTMLResponse(html_path.read_text(encoding="utf-8"))
    return HTMLResponse(f"<h1>Frontend not found</h1><p>Expected: {html_path}</p>")


@app.post("/api/search")
async def search(req: SearchRequest):
    """SSE endpoint — streams typed events as each agent completes."""
    api_key = os.getenv("TINYFISH_API_KEY", "").strip()
    print(f"[GitPaid] Search: stack={req.stack!r} keywords={req.keywords!r} min={req.min_amount}")
    print(f"[GitPaid] API key set: {bool(api_key)}  length={len(api_key)}")

    if not api_key:
        async def _no_key():
            msg = "TINYFISH_API_KEY is not set. Add it to a .env file in the gitpaid folder."
            print(f"[GitPaid] ERROR: {msg}")
            yield f"data: {json.dumps({'type': 'error', 'message': msg})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return StreamingResponse(_no_key(), media_type="text/event-stream")

    async def _stream():
        try:
            async for event in run_search(req.stack, req.keywords, req.min_amount):
                etype = event.get("type", "?")
                extra = ""
                if "count" in event:
                    extra = f" count={event['count']}"
                if etype == "tier2_status":
                    extra = f" phase={event.get('phase')}"
                if etype == "agent_error":
                    extra = f" err={event.get('error')}"
                print(f"[GitPaid]  -> {etype}{extra}")
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            print(f"[GitPaid] Stream exception: {e}")
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/health")
async def health():
    api_key = os.getenv("TINYFISH_API_KEY", "").strip()
    return {
        "status": "ok",
        "api_key_configured": bool(api_key),
        "api_key_preview": (api_key[:6] + "...") if api_key else "NOT SET",
        "env_file_exists": (BASE_DIR / ".env").exists(),
        "index_html_exists": (static_dir / "index.html").exists(),
    }


@app.get("/api/test-agent")
async def test_agent():
    """Single-agent smoke test using the official TinyFish Python SDK."""
    from tinyfish import AsyncTinyFish, CompleteEvent, RunStatus
    if not os.getenv("TINYFISH_API_KEY"):
        return {"ok": False, "error": "TINYFISH_API_KEY not set"}
    try:
        async with AsyncTinyFish() as client:
            async with client.agent.stream(
                url="https://algora.io/bounties",
                goal='Return the page title as JSON: {"title": "string value here"}',
            ) as stream:
                async for event in stream:
                    if isinstance(event, CompleteEvent):
                        return {"ok": True, "status": str(event.status), "result": event.result_json}
        return {"ok": False, "error": "Stream ended without CompleteEvent"}
    except Exception as e:
        return {"ok": False, "error": str(e), "trace": traceback.format_exc()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
