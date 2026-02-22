// TypeScript interfaces for all API responses
// These mirror the Pydantic schemas in main.py / optimizer.py

export interface AssetWeight {
    ticker: string;
    weight: number;
    dollarValue: number;
}

export interface OptimizationResult {
    weights: Record<string, number>;
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
    strategy: "Conservative" | "Balanced" | "Aggressive";
}

export interface FrontierPoint {
    return: number;
    volatility: number;
}

export interface VaRMetrics {
    daily_var: number;
    annual_var: number;
    confidence: number;
}

export interface BacktestResult {
    dates: string[];
    portfolio_values: number[];
    benchmark_values: number[];
    portfolio_total_return: number;
    benchmark_total_return: number;
    portfolio_cagr: number;
    benchmark_cagr: number;
    monthly_contribution?: number;
    total_invested?: number;
    max_drawdown_pct?: number;
    drawdown_values?: number[];
}

export interface RiskDetails {
    correlation_matrix?: Record<string, Record<string, number>>;
    contribution_to_risk?: { ticker: string; contribution: number }[];
    stress_test?: {
        crash_scenario_pct: number;
        portfolio_return_crash: number;
        value_before: number;
        value_after: number;
        loss_usd: number;
    };
}

export interface MarketTicker {
    ticker: string;
    name: string;
    price: number;
    change_pct: number;
    volume?: number;
    market_cap?: number;
    pe_ratio?: number;
    sparkline?: number[];
}

export interface PortfolioData {
    valid_tickers: string[];
    optimization: OptimizationResult;
    efficient_frontier: FrontierPoint[];
    var: VaRMetrics;
    backtest: BacktestResult;
    investment: number;
    risk_tolerance: number;
    monthly_contribution?: number;
    correlation_matrix?: Record<string, Record<string, number>>;
    contribution_to_risk?: { ticker: string; contribution: number }[];
    stress_test?: {
        crash_scenario_pct: number;
        portfolio_return_crash: number;
        value_before: number;
        value_after: number;
        loss_usd: number;
    };
}

export interface ApiResponse {
    success: boolean;
    data: PortfolioData;
}

export interface PortfolioRequest {
    tickers: string[];
    investment: number;
    risk_tolerance: number;
    time_horizon_years: number;
    excluded_sectors?: string[];
    monthly_contribution?: number;
}

export interface TickerUniverse {
    universe: Record<string, string[]>;
}
