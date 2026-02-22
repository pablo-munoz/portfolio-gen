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

from optimizer import (
    generate_portfolio,
    fetch_price_history,
    estimate_parameters,
    compute_efficient_frontier,
    run_backtest,
    compute_correlation_matrix,
    compute_contribution_to_risk,
    stress_test,
)

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
        ge=100,
        le=1_000_000_000,
        description="Investment amount in USD",
    )
    monthly_contribution: float | None = Field(
        default=0,
        ge=0,
        le=1_000_000,
        description="Optional monthly reinvestment in USD (0 = buy-and-hold only)",
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
            monthly_contribution=request.monthly_contribution or 0,
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


@app.get("/api/frontier", tags=["Portfolio"])
async def get_frontier(
    tickers: str,
    time_horizon_years: int = 5,
) -> dict[str, Any]:
    """Return efficient frontier points for plotting."""
    symbol_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if len(symbol_list) < 2:
        raise HTTPException(status_code=422, detail="At least 2 tickers required")
    try:
        years = max(time_horizon_years, 3)
        prices = fetch_price_history(symbol_list, years=years)
        mu, sigma = estimate_parameters(prices)
        frontier = compute_efficient_frontier(mu, sigma, n_points=50)
        return {"frontier": frontier}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/backtest", tags=["Portfolio"])
async def get_backtest(
    tickers: str,
    investment: float = 100_000.0,
    monthly_contribution: float = 0.0,
    time_horizon_years: int = 5,
) -> dict[str, Any]:
    """Return historical backtest data."""
    symbol_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if len(symbol_list) < 2:
        raise HTTPException(status_code=422, detail="At least 2 tickers required")
    try:
        result = generate_portfolio(
            tickers=symbol_list,
            investment=investment,
            risk_tolerance=0.5,
            time_horizon_years=time_horizon_years,
            monthly_contribution=monthly_contribution,
        )
        return {"backtest": result["backtest"], "investment": result["investment"]}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/risk-details", tags=["Portfolio"])
async def get_risk_details(
    tickers: str,
    investment: float = 100_000.0,
    time_horizon_years: int = 5,
) -> dict[str, Any]:
    """Return correlation matrix, contribution to risk, stress test."""
    symbol_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if len(symbol_list) < 2:
        raise HTTPException(status_code=422, detail="At least 2 tickers required")
    try:
        result = generate_portfolio(
            tickers=symbol_list,
            investment=investment,
            risk_tolerance=0.5,
            time_horizon_years=time_horizon_years,
        )
        return {
            "correlation_matrix": result.get("correlation_matrix", {}),
            "contribution_to_risk": result.get("contribution_to_risk", []),
            "stress_test": result.get("stress_test", {}),
            "var": result.get("var", {}),
        }
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/market-data", tags=["Market"])
async def market_data(tickers: str) -> dict[str, Any]:
    """
    Fetch live market data for a comma-separated list of tickers.
    Returns price, change %, volume, market cap, PE for each ticker.
    """
    import yfinance as yf

    symbol_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not symbol_list:
        return {"tickers": []}

    result: list[dict[str, Any]] = []
    for sym in symbol_list[:20]:  # cap at 20
        try:
            t = yf.Ticker(sym)
            info = t.info
            hist = t.history(period="7d")
            price = info.get("currentPrice") or info.get("regularMarketPrice") or (float(hist["Close"].iloc[-1]) if not hist.empty else 0)
            prev = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else price
            change_pct = ((price - prev) / prev * 100) if prev and prev != 0 else 0
            sparkline = hist["Close"].tolist() if not hist.empty else []
            result.append({
                "ticker": sym,
                "name": info.get("shortName", sym),
                "price": round(price, 2),
                "change_pct": round(change_pct, 2),
                "volume": info.get("volume"),
                "market_cap": info.get("marketCap"),
                "pe_ratio": info.get("trailingPE"),
                "sparkline": [round(float(x), 2) for x in sparkline[-20:]],
            })
        except Exception:
            continue

    return {"tickers": result}


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
