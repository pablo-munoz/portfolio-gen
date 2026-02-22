"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import type { PortfolioData, PortfolioRequest } from "@/types/portfolio";

interface PortfolioState {
    portfolioData: PortfolioData | null;
    lastRequest: PortfolioRequest | null;
    isLoading: boolean;
    error: string | null;
}

interface PortfolioContextValue extends PortfolioState {
    setPortfolioData: (data: PortfolioData | null) => void;
    setLastRequest: (req: PortfolioRequest | null) => void;
    runOptimization: (req: PortfolioRequest) => Promise<void>;
    clearError: () => void;
    addTickerToBuilder: (ticker: string) => void;
    pendingTickers: string[];
    clearPendingTickers: () => void;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
    const [portfolioData, setPortfolioDataState] = useState<PortfolioData | null>(null);
    const [lastRequest, setLastRequestState] = useState<PortfolioRequest | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingTickers, setPendingTickers] = useState<string[]>([]);

    const setPortfolioData = useCallback((data: PortfolioData | null) => {
        setPortfolioDataState(data);
        setError(null);
    }, []);

    const setLastRequest = useCallback((req: PortfolioRequest | null) => {
        setLastRequestState(req);
    }, []);

    const clearError = useCallback(() => setError(null), []);

    const addTickerToBuilder = useCallback((ticker: string) => {
        const t = ticker.trim().toUpperCase();
        if (t) {
            setPendingTickers((prev) => (prev.includes(t) ? prev : [...prev, t]));
        }
    }, []);

    const clearPendingTickers = useCallback(() => setPendingTickers([]), []);

    const runOptimization = useCallback(async (req: PortfolioRequest) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/portfolio/optimize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.detail ?? `Request failed: ${res.status}`);
            }
            if (json.success && json.data) {
                setPortfolioDataState(json.data);
                setLastRequestState(req);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Optimization failed");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const value = useMemo<PortfolioContextValue>(
        () => ({
            portfolioData,
            lastRequest,
            isLoading,
            error,
            setPortfolioData,
            setLastRequest,
            runOptimization,
            clearError,
            addTickerToBuilder,
            pendingTickers,
            clearPendingTickers,
        }),
        [
            portfolioData,
            lastRequest,
            isLoading,
            error,
            setPortfolioData,
            setLastRequest,
            runOptimization,
            clearError,
            addTickerToBuilder,
            pendingTickers,
            clearPendingTickers,
        ]
    );

    return (
        <PortfolioContext.Provider value={value}>
            {children}
        </PortfolioContext.Provider>
    );
}

export function usePortfolio() {
    const ctx = useContext(PortfolioContext);
    if (!ctx) {
        throw new Error("usePortfolio must be used within PortfolioProvider");
    }
    return ctx;
}
