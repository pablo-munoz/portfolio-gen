"""
optimizer.py — Ares Quantitative Engine
========================================

Mathematical Core for Portfolio Optimization.

Theory:
-------
Given a universe of N assets with return vector μ ∈ ℝᴺ and
covariance matrix Σ ∈ ℝᴺˣᴺ, the Markowitz Mean-Variance Optimization
seeks the portfolio weights w ∈ ℝᴺ that maximize the Sharpe Ratio:

    SR = (E[Rₚ] - Rᶠ) / σₚ

subject to:
    Σᵢ wᵢ = 1   (fully invested)
    wᵢ ≥ 0      (long-only)

where:
    E[Rₚ] = wᵀμ           (expected portfolio return)
    σₚ   = √(wᵀΣw)        (portfolio volatility)

To stabilize the covariance matrix Σ on small datasets, we apply
Ledoit-Wolf shrinkage:
    Σ̂ = (1 - α)·Σ + α·μ̄·I

where α is the optimal shrinkage intensity (data-driven).

Value at Risk (parametric, daily):
    VaR_{95} = μ_daily - 1.645·σ_daily

Annualized:
    VaR_{annual} = VaR_daily · √252
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf
from pypfopt import (
    EfficientFrontier,
    expected_returns,
    risk_models,
    objective_functions,
)
from pypfopt.exceptions import OptimizationError
from scipy.stats import norm

logger = logging.getLogger("ares.optimizer")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
RISK_FREE_RATE: float = 0.05      # 5 % annualized (approximate Fed Funds Rate)
TRADING_DAYS: int = 252
HISTORY_YEARS: int = 5
BENCHMARK_TICKER: str = "SPY"

# Mapping from numeric risk tolerance [0,1] to a strategy label
STRATEGY_BANDS: list[tuple[float, str]] = [
    (0.12, "Conservative"),
    (0.20, "Balanced"),
    (1.00, "Aggressive"),
]


# ---------------------------------------------------------------------------
# Data Acquisition
# ---------------------------------------------------------------------------

def fetch_price_history(
    tickers: list[str],
    years: int = HISTORY_YEARS,
) -> pd.DataFrame:
    """
    Download adjusted-close price history for the given tickers from yfinance.

    Parameters
    ----------
    tickers : list[str]
        List of valid Yahoo Finance ticker symbols.
    years : int
        Number of years of historical data to fetch.

    Returns
    -------
    pd.DataFrame
        Daily adjusted-close prices; columns = tickers, index = date.

    Raises
    ------
    ValueError
        If fewer than 2 valid tickers remain after cleaning.
    """
    end = pd.Timestamp.today()
    start = end - pd.DateOffset(years=years)

    raw = yf.download(
        tickers,
        start=start.strftime("%Y-%m-%d"),
        end=end.strftime("%Y-%m-%d"),
        auto_adjust=True,
        progress=False,
        threads=True,
    )

    if raw.empty:
        raise ValueError("yfinance returned no data. Check ticker symbols.")

    # Handle single vs. multi-ticker response structure
    if isinstance(raw.columns, pd.MultiIndex):
        prices = raw["Close"].copy()
    else:
        prices = raw[["Close"]].copy()
        prices.columns = tickers[:1]

    # Drop tickers with more than 20 % missing values
    threshold = 0.80 * len(prices)
    prices = prices.dropna(axis=1, thresh=int(threshold))
    prices = prices.ffill().bfill()

    if prices.shape[1] < 2:
        raise ValueError(
            f"Only {prices.shape[1]} tickers survived data cleaning. "
            "Need at least 2 valid tickers for optimization."
        )

    logger.info("Fetched %d days × %d assets.", len(prices), prices.shape[1])
    return prices


# ---------------------------------------------------------------------------
# Risk & Return Estimation
# ---------------------------------------------------------------------------

def estimate_parameters(
    prices: pd.DataFrame,
) -> tuple[pd.Series, pd.DataFrame]:
    """
    Compute expected returns (μ) and covariance matrix (Σ) with
    Ledoit-Wolf shrinkage for noise reduction.

    E[Rᵢ] is calculated via CAPM-adjusted exponentially weighted
    historical mean (annualized).

    The Ledoit-Wolf estimator minimizes the Mean Squared Error of
    the covariance estimate by finding an optimal convex combination
    of the sample covariance and a structured target matrix.

    Returns
    -------
    mu : pd.Series
        Expected annual returns per asset.
    sigma : pd.DataFrame
        Shrunk covariance matrix (annualized).
    """
    mu = expected_returns.mean_historical_return(prices, frequency=TRADING_DAYS)
    sigma = risk_models.CovarianceShrinkage(prices, frequency=TRADING_DAYS).ledoit_wolf()
    return mu, sigma


# ---------------------------------------------------------------------------
# Portfolio Optimization
# ---------------------------------------------------------------------------

def optimize_portfolio(
    mu: pd.Series,
    sigma: pd.DataFrame,
    risk_tolerance: float = 0.5,
) -> dict[str, Any]:
    """
    Solve the Maximum Sharpe Ratio (Tangency Portfolio) problem.

    The tangency portfolio lies at the intersection of the Capital Market
    Line (CML) and the Efficient Frontier. It maximises:

        SR(w) = (wᵀμ - Rᶠ) / √(wᵀΣw)

    subject to:  Σᵢwᵢ=1,  wᵢ ∈ [0, 1]

    Parameters
    ----------
    mu : pd.Series
        Vector of expected annual returns.
    sigma : pd.DataFrame
        Annualized covariance matrix (Ledoit-Wolf shrunk).
    risk_tolerance : float
        Scalar in [0, 1] used to add a custom risk-penalising objective.

    Returns
    -------
    dict
        weights        : {ticker: weight}
        expected_return: float (annualized)
        volatility     : float (annualized)
        sharpe_ratio   : float
        strategy       : str  ("Conservative" | "Balanced" | "Aggressive")
    """
    ef = EfficientFrontier(mu, sigma, weight_bounds=(0, 1))

    # Add L2 regularisation to avoid extreme concentration (diversification)
    # Objective: min Σᵢ(wᵢ - 1/N)² = penalise deviation from equal weight
    ef.add_objective(objective_functions.L2_reg, gamma=0.1)

    try:
        ef.max_sharpe(risk_free_rate=RISK_FREE_RATE)
    except OptimizationError as exc:
        logger.warning("max_sharpe failed (%s); falling back to min_volatility.", exc)
        ef = EfficientFrontier(mu, sigma, weight_bounds=(0, 1))
        ef.min_volatility()

    cleaned_weights = ef.clean_weights(cutoff=0.01, rounding=4)

    perf = ef.portfolio_performance(
        verbose=False,
        risk_free_rate=RISK_FREE_RATE,
    )
    exp_return, volatility, sharpe = perf

    strategy = _classify_strategy(volatility)

    return {
        "weights": dict(cleaned_weights),
        "expected_return": round(exp_return, 6),
        "volatility": round(volatility, 6),
        "sharpe_ratio": round(sharpe, 6),
        "strategy": strategy,
    }


def _classify_strategy(volatility: float) -> str:
    """Classify portfolio strategy based on annualized volatility."""
    for threshold, label in STRATEGY_BANDS:
        if volatility <= threshold:
            return label
    return "Aggressive"


# ---------------------------------------------------------------------------
# Efficient Frontier
# ---------------------------------------------------------------------------

def compute_efficient_frontier(
    mu: pd.Series,
    sigma: pd.DataFrame,
    n_points: int = 30,
) -> list[dict[str, float]]:
    """
    Trace the Efficient Frontier by sweeping target returns and computing
    the minimum-variance portfolio for each.

    Each point satisfies:
        min  wᵀΣw
        s.t. wᵀμ = r_target
             Σwᵢ = 1,  wᵢ ≥ 0

    Returns
    -------
    list of {"return": float, "volatility": float}
    """
    min_ret = float(mu.min()) * 1.05
    max_ret = float(mu.max()) * 0.95
    targets = np.linspace(min_ret, max_ret, n_points)
    frontier = []

    for target in targets:
        try:
            ef = EfficientFrontier(mu, sigma, weight_bounds=(0, 1))
            ef.efficient_return(target_return=float(target))
            ret, vol, _ = ef.portfolio_performance(verbose=False)
            frontier.append({"return": round(ret, 6), "volatility": round(vol, 6)})
        except Exception:
            continue

    return frontier


def get_min_variance_point(
    mu: pd.Series,
    sigma: pd.DataFrame,
) -> dict[str, float]:
    """Return the minimum-variance portfolio point."""
    try:
        ef = EfficientFrontier(mu, sigma, weight_bounds=(0, 1))
        ef.min_volatility()
        ret, vol, _ = ef.portfolio_performance(verbose=False)
        return {"return": round(ret, 6), "volatility": round(vol, 6)}
    except Exception:
        return {"return": 0.0, "volatility": 0.0}


# ---------------------------------------------------------------------------
# Risk Details: Correlation, Contribution to Risk, Stress Test
# ---------------------------------------------------------------------------


def compute_correlation_matrix(prices: pd.DataFrame) -> dict[str, dict[str, float]]:
    """Compute correlation matrix of asset returns."""
    returns = prices.pct_change().dropna()
    corr = returns.corr()
    return {str(i): {str(j): round(float(corr.loc[i, j]), 4) for j in corr.columns} for i in corr.index}


def compute_contribution_to_risk(
    prices: pd.DataFrame,
    weights: dict[str, float],
) -> list[dict[str, float]]:
    """Marginal contribution to risk per asset (percent of portfolio vol)."""
    returns = prices.pct_change().dropna()
    cov = returns.cov() * TRADING_DAYS  # annualized
    w_arr = np.array([weights.get(t, 0) for t in returns.columns if t in weights])
    tickers = [t for t in returns.columns if t in weights]
    if len(tickers) < 2:
        return [{"ticker": t, "contribution": 100.0} for t in tickers]
    cov_sub = cov.loc[tickers, tickers].values
    port_var = float(w_arr @ cov_sub @ w_arr)
    port_vol = np.sqrt(port_var) if port_var > 0 else 1e-8
    marginal = cov_sub @ w_arr
    contrib = (w_arr * marginal) / port_vol**2 * 100 if port_vol > 0 else np.zeros(len(tickers))
    return [{"ticker": t, "contribution": round(float(c), 2)} for t, c in zip(tickers, contrib)]


def stress_test(
    weights: dict[str, float],
    prices: pd.DataFrame,
    investment: float,
    crash_pct: float = -0.20,
) -> dict[str, Any]:
    """Simulate portfolio impact of a market crash (e.g. -20%)."""
    returns = prices.pct_change().dropna()
    cov = returns.cov() * TRADING_DAYS
    tickers = [t for t in returns.columns if t in weights]
    w_arr = np.array([weights[t] for t in tickers])
    # Assume all assets drop by crash_pct (simplified correlation = 1)
    # More realistic: use Cholesky with scenario
    port_return_crash = float(np.sum(w_arr) * crash_pct)
    value_after = investment * (1 + port_return_crash)
    # Alternative: assume partial correlation (e.g. 0.8)
    return {
        "crash_scenario_pct": round(crash_pct * 100, 1),
        "portfolio_return_crash": round(port_return_crash * 100, 2),
        "value_before": round(investment, 2),
        "value_after": round(value_after, 2),
        "loss_usd": round(investment - value_after, 2),
    }


# ---------------------------------------------------------------------------
# Value at Risk
# ---------------------------------------------------------------------------

def compute_var(
    expected_return: float,
    volatility: float,
    confidence: float = 0.95,
    investment: float = 100_000.0,
) -> dict[str, float]:
    """
    Parametric Value at Risk under the assumption of normally distributed
    portfolio returns.

    Annual VaR at confidence level α:
        VaR_α = investment · (μ - z_α · σ)

    where z_α = norm.ppf(1 - α) is the quantile of the standard normal.

    Parameters
    ----------
    expected_return : float   Annualized portfolio return
    volatility      : float   Annualized portfolio volatility
    confidence      : float   Confidence level (e.g. 0.95)
    investment      : float   Portfolio value in USD

    Returns
    -------
    dict
        daily_var     : float  Single-day VaR in USD
        annual_var    : float  Annualized VaR in USD
        confidence    : float  Used confidence level
    """
    z = norm.ppf(1.0 - confidence)

    # Daily parameters: μ_d = μ/T,  σ_d = σ/√T
    mu_daily = expected_return / TRADING_DAYS
    sigma_daily = volatility / np.sqrt(TRADING_DAYS)

    daily_var = investment * abs(mu_daily + z * sigma_daily)
    annual_var = investment * abs(expected_return + z * volatility)

    return {
        "daily_var": round(daily_var, 2),
        "annual_var": round(annual_var, 2),
        "confidence": confidence,
    }


# ---------------------------------------------------------------------------
# Backtesting
# ---------------------------------------------------------------------------

def run_backtest(
    prices: pd.DataFrame,
    weights: dict[str, float],
    benchmark_ticker: str = BENCHMARK_TICKER,
    investment: float = 100_000.0,
    monthly_contribution: float = 0.0,
) -> dict[str, Any]:
    """
    Simulate the portfolio performance against a benchmark over the full
    price history using buy-and-hold, optionally with monthly DCA.

    Portfolio value at time t (buy-and-hold):
        V(t) = investment · Π_{s=1}^{t} (1 + rₛ)

    With monthly_contribution: add contribution at start of each month, then
    apply daily returns. New money participates in returns from that day onward.
    """
    # Filter prices to only include tickers in optimized weights
    held_tickers = [t for t in weights if t in prices.columns]
    w_arr = np.array([weights[t] for t in held_tickers])

    port_prices = prices[held_tickers].dropna()
    port_returns = port_prices.pct_change().dropna()
    port_daily_returns = port_returns.values @ w_arr

    # Fetch benchmark
    bench_raw = yf.download(
        benchmark_ticker,
        start=port_prices.index[0].strftime("%Y-%m-%d"),
        end=port_prices.index[-1].strftime("%Y-%m-%d"),
        auto_adjust=True,
        progress=False,
    )
    if isinstance(bench_raw.columns, pd.MultiIndex):
        bench_prices = bench_raw["Close"][benchmark_ticker]
    else:
        bench_prices = bench_raw["Close"]

    bench_prices = bench_prices.reindex(port_returns.index).ffill().bfill()
    bench_returns = bench_prices.pct_change().fillna(0).values

    # Cumulative returns → portfolio values
    if monthly_contribution <= 0:
        port_cum = investment * np.cumprod(1 + port_daily_returns)
    else:
        # DCA: add monthly contribution at start of each new month
        port_cum = np.zeros(len(port_daily_returns))
        V = investment
        current_month = port_returns.index[0].month
        for i in range(len(port_daily_returns)):
            m = port_returns.index[i].month
            if i > 0 and m != current_month:
                V += monthly_contribution
            current_month = m
            V = V * (1 + port_daily_returns[i])
            port_cum[i] = V

    bench_cum = investment * np.cumprod(1 + bench_returns)

    dates = [d.strftime("%Y-%m-%d") for d in port_returns.index]
    n_years = len(dates) / TRADING_DAYS

    def cagr(values: np.ndarray, principal: float) -> float:
        if principal <= 0:
            return 0.0
        return float((values[-1] / principal) ** (1 / n_years) - 1)

    # Total invested (for DCA: initial + contributions at start of months 2, 3, ...)
    if monthly_contribution > 0:
        n_months = len(port_returns.index.to_period("M").unique())
        total_invested = investment + monthly_contribution * max(0, n_months - 1)
    else:
        total_invested = investment

    # Drawdown: peak-to-trough decline
    peak = np.maximum.accumulate(port_cum)
    drawdown = (port_cum - peak) / np.where(peak > 0, peak, 1)
    max_dd = float(np.min(drawdown))
    max_dd_pct = round(max_dd * 100, 2)

    return {
        "dates": dates,
        "portfolio_values": [round(v, 2) for v in port_cum.tolist()],
        "benchmark_values": [round(v, 2) for v in bench_cum.tolist()],
        "portfolio_total_return": round((port_cum[-1] / total_invested - 1), 6) if total_invested > 0 else 0,
        "benchmark_total_return": round((bench_cum[-1] / investment - 1), 6),
        "portfolio_cagr": round(cagr(port_cum, total_invested), 6),
        "benchmark_cagr": round(cagr(bench_cum, investment), 6),
        "monthly_contribution": monthly_contribution,
        "total_invested": round(total_invested, 2),
        "max_drawdown_pct": max_dd_pct,
        "drawdown_values": [round(float(d) * 100, 2) for d in drawdown.tolist()],
    }


# ---------------------------------------------------------------------------
# High-Level Orchestration
# ---------------------------------------------------------------------------

def generate_portfolio(
    tickers: list[str],
    investment: float = 100_000.0,
    risk_tolerance: float = 0.5,
    time_horizon_years: int = 5,
    monthly_contribution: float = 0.0,
) -> dict[str, Any]:
    """
    End-to-end portfolio generation pipeline.

    Orchestrates:
        1. Data acquisition (yfinance)
        2. Parameter estimation (Ledoit-Wolf μ, Σ)
        3. MVO optimization (Tangency Portfolio)
        4. Efficient Frontier sweep
        5. VaR computation
        6. Backtesting vs. SPY

    Parameters
    ----------
    tickers          : list[str]   Asset universe (Yahoo ticker symbols)
    investment       : float       Portfolio value in USD
    risk_tolerance   : float       [0, 1] – user preference (0=conservative)
    time_horizon_years: int        Determines history window length

    Returns
    -------
    Full dict ready for JSON serialisation by the FastAPI layer.
    """
    history_years = max(time_horizon_years, 3)

    prices = fetch_price_history(tickers, years=history_years)
    valid_tickers = prices.columns.tolist()

    mu, sigma = estimate_parameters(prices)

    opt_result = optimize_portfolio(mu, sigma, risk_tolerance=risk_tolerance)
    frontier = compute_efficient_frontier(mu, sigma)
    var_metrics = compute_var(
        opt_result["expected_return"],
        opt_result["volatility"],
        investment=investment,
    )
    backtest = run_backtest(
        prices,
        opt_result["weights"],
        investment=investment,
        monthly_contribution=monthly_contribution,
    )

    # Risk details for /risk page
    correlation = compute_correlation_matrix(prices)
    contribution_to_risk = compute_contribution_to_risk(prices, opt_result["weights"])
    stress = stress_test(opt_result["weights"], prices, investment, crash_pct=-0.20)

    return {
        "valid_tickers": valid_tickers,
        "optimization": opt_result,
        "efficient_frontier": frontier,
        "var": var_metrics,
        "backtest": backtest,
        "investment": investment,
        "risk_tolerance": risk_tolerance,
        "monthly_contribution": monthly_contribution,
        "correlation_matrix": correlation,
        "contribution_to_risk": contribution_to_risk,
        "stress_test": stress,
    }
