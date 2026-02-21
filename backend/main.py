"""
main.py — Ares FastAPI Application
====================================
Routing layer. Business logic lives entirely in optimizer.py.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from optimizer import generate_portfolio

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("ares.api")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Ares Portfolio Engine",
    description="Real-Time AI Portfolio Generation & Risk Management API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------

class PortfolioRequest(BaseModel):
    """Input parameters for portfolio generation."""

    tickers: list[str] = Field(
        ...,
        min_length=2,
        max_length=30,
        description="List of Yahoo Finance ticker symbols",
        example=["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "JPM", "JNJ"],
    )
    investment: float = Field(
        default=100_000.0,
        ge=1_000,
        le=1_000_000_000,
        description="Investment amount in USD",
    )
    risk_tolerance: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Risk tolerance – 0 = conservative, 1 = aggressive",
    )
    time_horizon_years: int = Field(
        default=5,
        ge=1,
        le=30,
        description="Investment time horizon in years",
    )
    excluded_sectors: list[str] = Field(
        default_factory=list,
        description="Sectors to exclude (informational; pre-filter tickers before sending)",
    )

    @field_validator("tickers")
    @classmethod
    def normalize_tickers(cls, v: list[str]) -> list[str]:
        return [t.strip().upper() for t in v if t.strip()]


# ---------------------------------------------------------------------------
# Middleware — request timing
# ---------------------------------------------------------------------------

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    response.headers["X-Process-Time"] = f"{duration:.4f}s"
    return response


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", tags=["System"])
async def health_check() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "version": "1.0.0"}


@app.post("/api/portfolio/optimize", tags=["Portfolio"])
async def optimize(request: PortfolioRequest) -> dict[str, Any]:
    """
    Generate an optimized portfolio.

    Executes the full Ares pipeline:
    - Fetch historical price data
    - Estimate μ and Σ (Ledoit-Wolf)
    - Solve Max-Sharpe optimization
    - Compute VaR, Efficient Frontier, and 5-year Backtest vs SPY
    """
    logger.info(
        "Optimization request: tickers=%s | investment=$%.0f | risk=%.2f | horizon=%dy",
        request.tickers,
        request.investment,
        request.risk_tolerance,
        request.time_horizon_years,
    )

    try:
        result = generate_portfolio(
            tickers=request.tickers,
            investment=request.investment,
            risk_tolerance=request.risk_tolerance,
            time_horizon_years=request.time_horizon_years,
        )
        return {"success": True, "data": result}

    except ValueError as exc:
        logger.warning("Validation error during optimization: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    except Exception as exc:
        logger.exception("Unexpected error during optimization: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Optimization failed: {exc}. Check ticker symbols and try again.",
        ) from exc


@app.get("/api/tickers/suggest", tags=["Portfolio"])
async def suggest_tickers(sector: str | None = None) -> dict[str, Any]:
    """
    Returns a curated list of popular tickers grouped by sector,
    optionally filtered by sector name.
    """
    universe: dict[str, list[str]] = {
        "Technology": ["AAPL", "MSFT", "GOOGL", "NVDA", "META", "AMD", "AVGO", "TSM"],
        "Finance": ["JPM", "BAC", "GS", "V", "MA", "BLK", "MS", "WFC"],
        "Healthcare": ["JNJ", "UNH", "PFE", "MRK", "ABBV", "LLY", "TMO", "ABT"],
        "Energy": ["XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO"],
        "Consumer": ["AMZN", "TSLA", "HD", "MCD", "NKE", "SBUX", "TGT", "COST"],
        "Industrials": ["BA", "CAT", "GE", "MMM", "HON", "UPS", "LMT", "RTX"],
        "ETFs": ["SPY", "QQQ", "VTI", "GLD", "TLT", "VNQ", "IWM", "EFA"],
    }

    if sector:
        sector_cap = sector.capitalize()
        filtered = {k: v for k, v in universe.items() if k == sector_cap}
        return {"universe": filtered}

    return {"universe": universe}
