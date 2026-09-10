"""FastAPI application entry point for the Assessment Auditor backend.

Wires CORS (for the Vite dev origin, configurable via env), loads the JSON demo
data at startup, and mounts the API routers under ``/api``. No database, no
auth, no external/LLM services.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.data_store import get_store

# Configurable CORS origins for the Vite dev server. Comma-separated env var
# CORS_ALLOW_ORIGINS overrides the default single origin.
_DEFAULT_ORIGIN = "http://localhost:5173"
_origins_env = os.getenv("CORS_ALLOW_ORIGINS", _DEFAULT_ORIGIN)
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]

@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Fail fast at startup if the JSON data cannot be loaded/validated.
    get_store()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Assessment Auditor API",
    description=(
        "Deterministic, explainable engine that audits assessment items: "
        "how well each item separates competing misconception states, its "
        "diagnostic blind spots, and the best repair candidate. "
        "SIH 2026, Team Cyber Sentinels, PS 26207."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
def root() -> dict:
    return {
        "service": "assessment-auditor",
        "docs": "/docs",
        "api": "/api",
    }
