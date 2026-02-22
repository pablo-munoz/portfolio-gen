import { ApiResponse, PortfolioRequest, TickerUniverse } from "@/types/portfolio";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? `Request failed: ${res.status}`);
    }

    return res.json() as Promise<T>;
}

export const portfolioApi = {
    optimize: (payload: PortfolioRequest): Promise<ApiResponse> =>
        apiFetch<ApiResponse>("/api/portfolio/optimize", {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    marketData: (tickers: string[]): Promise<{ tickers: Array<{ ticker: string; name: string; price: number; change_pct: number; volume?: number; market_cap?: number; pe_ratio?: number; sparkline?: number[] }> }> =>
        apiFetch(`/api/market-data?tickers=${encodeURIComponent(tickers.join(","))}`),

    suggestTickers: (sector?: string): Promise<TickerUniverse> =>
        apiFetch<TickerUniverse>(
            `/api/tickers/suggest${sector ? `?sector=${sector}` : ""}`
        ),
};
