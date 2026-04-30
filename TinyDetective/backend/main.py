"""FastAPI entrypoint for the counterfeit research MVP."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

if __package__ in {None, ""}:
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))

import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from models.case_schemas import (
    SellerCaseCreateRequest,
    SellerCaseListItem,
    SellerCaseResponse,
)
from models.schemas import (
    InvestigationCreateRequest,
    InvestigationListItem,
    InvestigationResponse,
)
from services.investigation_orchestrator import InvestigationOrchestrator
from services.investigation_store import InvestigationStore
from services.logging_config import LOG_PATH, configure_logging
from services.seller_case_orchestrator import SellerCaseOrchestrator
from services.settings import settings


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
logger = configure_logging()

app = FastAPI(
    title="TinyDetective Counterfeit Research MVP",
    version="0.1.0",
    description="Agent-based counterfeit investigation workflow scaffold.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

store = InvestigationStore()
orchestrator = InvestigationOrchestrator(store=store)
seller_case_orchestrator = SellerCaseOrchestrator(store=store)

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


async def recover_unfinished_investigations() -> None:
    for investigation in await store.list_active():
        asyncio.create_task(orchestrator.run_investigation(investigation.investigation_id))


async def recover_unfinished_cases() -> None:
    for seller_case in await store.list_active_cases():
        asyncio.create_task(seller_case_orchestrator.run_case(seller_case.case_id))


@app.on_event("startup")
async def startup() -> None:
    await recover_unfinished_investigations()
    await recover_unfinished_cases()


@app.get("/", include_in_schema=False)
async def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "favicon.svg", media_type="image/svg+xml")


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "tinyfish_enabled": "true" if settings.tinyfish_enabled else "false",
        "openai_enabled": "true" if settings.openai_enabled else "false",
    }


@app.get("/config")
async def config() -> dict[str, object]:
    return {
        "brand_landing_page_url": settings.brand_landing_page_url,
        "ecommerce_store_urls": settings.ecommerce_store_urls,
        "tinyfish_browser_profile": settings.tinyfish_browser_profile,
        "openai_enabled": settings.openai_enabled,
        "openai_triage_model": settings.openai_triage_model,
        "openai_reasoning_model": settings.openai_reasoning_model,
        "openai_shortlist_limit": settings.openai_shortlist_limit,
        "log_path": str(LOG_PATH),
    }


@app.get("/investigations", response_model=list[InvestigationListItem])
async def list_investigations(limit: int = Query(default=12, ge=1, le=100)) -> list[InvestigationListItem]:
    return await store.list_recent(limit=limit)


@app.post("/investigate", response_model=InvestigationResponse)
async def investigate(payload: InvestigationCreateRequest) -> InvestigationResponse:
    investigation = await store.create(payload)
    logger.info("Investigation queued: %s", investigation.investigation_id)
    asyncio.create_task(orchestrator.run_investigation(investigation.investigation_id))
    return investigation


@app.get("/investigation/{investigation_id}", response_model=InvestigationResponse)
async def get_investigation(investigation_id: str) -> InvestigationResponse:
    investigation = await store.get(investigation_id)
    if investigation is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation


@app.get("/cases", response_model=list[SellerCaseListItem])
async def list_cases(limit: int = Query(default=12, ge=1, le=100)) -> list[SellerCaseListItem]:
    return await store.list_recent_cases(limit=limit)


@app.post("/cases", response_model=SellerCaseResponse)
async def create_case(payload: SellerCaseCreateRequest) -> SellerCaseResponse:
    investigation = await store.get(payload.investigation_id)
    if investigation is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    seller_case = await store.create_case(payload)
    logger.info("Seller case queued: %s", seller_case.case_id)
    asyncio.create_task(seller_case_orchestrator.run_case(seller_case.case_id))
    return seller_case


@app.get("/cases/{case_id}", response_model=SellerCaseResponse)
async def get_case(case_id: str) -> SellerCaseResponse:
    seller_case = await store.get_case(case_id)
    if seller_case is None:
        raise HTTPException(status_code=404, detail="Seller case not found")
    return seller_case


def run() -> None:
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    run()
