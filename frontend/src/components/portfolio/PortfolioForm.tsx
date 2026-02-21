"use client";

import { useState } from "react";
import {
    AlertCircle,
    ChevronDown,
    Clock,
    DollarSign,
    Loader2,
    Plus,
    Search,
    Send,
    X,
} from "lucide-react";
import { PortfolioRequest } from "@/types/portfolio";

// ── Default ticker universe grouped by sector ──────────────
const TICKER_UNIVERSE: Record<string, string[]> = {
    Technology: ["AAPL", "MSFT", "GOOGL", "NVDA", "META", "AMD", "AVGO", "TSM"],
    Finance: ["JPM", "BAC", "GS", "V", "MA", "BLK", "MS", "WFC"],
    Healthcare: ["JNJ", "UNH", "PFE", "MRK", "ABBV", "LLY", "TMO", "ABT"],
    Energy: ["XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO"],
    Consumer: ["AMZN", "TSLA", "HD", "MCD", "NKE", "SBUX", "TGT", "COST"],
    ETFs: ["SPY", "QQQ", "VTI", "GLD", "TLT", "VNQ", "IWM", "EFA"],
};

function getRiskInfo(value: number): { label: string; color: string } {
    if (value <= 0.12) return { label: "Very Conservative", color: "#22d3ee" };
    if (value <= 0.37) return { label: "Conservative", color: "#34d399" };
    if (value <= 0.62) return { label: "Balanced", color: "#a78bfa" };
    if (value <= 0.87) return { label: "Aggressive", color: "#fbbf24" };
    return { label: "Very Aggressive", color: "#f97316" };
}

interface PortfolioFormProps {
    onSubmit: (request: PortfolioRequest) => void;
    isLoading: boolean;
    error?: string | null;
}

export function PortfolioForm({ onSubmit, isLoading, error }: PortfolioFormProps) {
    const [investment, setInvestment] = useState<string>("100000");
    const [riskTolerance, setRiskTolerance] = useState<number>(0.5);
    const [timeHorizon, setTimeHorizon] = useState<number>(5);
    const [selectedTickers, setSelectedTickers] = useState<string[]>([
        "AAPL", "MSFT", "GOOGL", "NVDA", "JPM", "JNJ", "AMZN",
    ]);
    const [customTicker, setCustomTicker] = useState<string>("");
    const [openSector, setOpenSector] = useState<string | null>("Technology");

    const riskInfo = getRiskInfo(riskTolerance);

    const toggleTicker = (ticker: string) =>
        setSelectedTickers((prev) =>
            prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker]
        );

    const addCustomTicker = () => {
        const t = customTicker.trim().toUpperCase();
        if (t && !selectedTickers.includes(t)) setSelectedTickers((p) => [...p, t]);
        setCustomTicker("");
    };

    const removeTicker = (ticker: string) =>
        setSelectedTickers((prev) => prev.filter((t) => t !== ticker));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const inv = parseFloat(investment.replace(/,/g, ""));
        if (isNaN(inv) || inv < 1000 || selectedTickers.length < 2) return;
        onSubmit({
            tickers: selectedTickers,
            investment: inv,
            risk_tolerance: riskTolerance,
            time_horizon_years: timeHorizon,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-7">

            {/* ── Header ───────────────────────────────── */}
            <div>
                <p
                    className="text-xs font-bold uppercase tracking-widest mb-1"
                    style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}
                >
                    Configuration
                </p>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                    Build Portfolio
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    Set your parameters and select assets for optimization.
                </p>
            </div>

            {/* ── Investment Amount ─────────────────────── */}
            <div className="flex flex-col gap-2">
                <label
                    htmlFor="investment-amount"
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                >
                    Investment Amount
                </label>
                <div className="relative">
                    <DollarSign
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--text-muted)" }}
                    />
                    <input
                        id="investment-amount"
                        type="number"
                        className="input"
                        style={{ paddingLeft: "2.25rem", fontSize: "1rem", fontFamily: "'JetBrains Mono', monospace" }}
                        value={investment}
                        onChange={(e) => setInvestment(e.target.value)}
                        min={1000}
                        max={1_000_000_000}
                        step={1000}
                        placeholder="100,000"
                        required
                    />
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Minimum $1,000 · Maximum $1B
                </p>
            </div>

            {/* ── Risk Tolerance ────────────────────────── */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <label
                        htmlFor="risk-tolerance"
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        Risk Tolerance
                    </label>
                    <span
                        className="text-xs font-bold mono px-3 py-1 rounded-lg"
                        style={{
                            background: `${riskInfo.color}15`,
                            color: riskInfo.color,
                            border: `1px solid ${riskInfo.color}35`,
                        }}
                    >
                        {riskInfo.label} · {riskTolerance.toFixed(2)}
                    </span>
                </div>
                <input
                    id="risk-tolerance"
                    type="range"
                    min={0} max={1} step={0.01}
                    value={riskTolerance}
                    onChange={(e) => setRiskTolerance(parseFloat(e.target.value))}
                    style={{
                        background: `linear-gradient(to right, ${riskInfo.color} ${riskTolerance * 100}%, var(--bg-hover) ${riskTolerance * 100}%)`,
                    }}
                />
                <div className="flex justify-between text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    <span>Conservative</span>
                    <span>Aggressive</span>
                </div>
            </div>

            {/* ── Time Horizon ──────────────────────────── */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Clock size={14} style={{ color: "var(--text-muted)" }} />
                    <label className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                        Time Horizon
                    </label>
                    <span
                        className="ml-auto text-sm font-bold mono"
                        style={{ color: "var(--accent-secondary)" }}
                    >
                        {timeHorizon} {timeHorizon === 1 ? "Year" : "Years"}
                    </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {[1, 3, 5, 10, 20].map((y) => (
                        <button
                            key={y}
                            type="button"
                            onClick={() => setTimeHorizon(y)}
                            className="btn"
                            style={{
                                padding: "0.5rem 0",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                borderRadius: "10px",
                                background: timeHorizon === y ? "rgba(99,102,241,0.18)" : "var(--bg-panel)",
                                border: `1px solid ${timeHorizon === y ? "var(--border-strong)" : "var(--border-subtle)"}`,
                                color: timeHorizon === y ? "var(--accent-secondary)" : "var(--text-secondary)",
                                transition: "all 0.15s ease",
                            }}
                        >
                            {y}Y
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Asset Universe ────────────────────────── */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                        Asset Universe
                    </label>
                    <span
                        className="text-xs mono font-medium px-2 py-0.5 rounded-lg"
                        style={{
                            background: selectedTickers.length >= 2
                                ? "rgba(52,211,153,0.1)"
                                : "rgba(251,113,133,0.1)",
                            color: selectedTickers.length >= 2
                                ? "var(--accent-emerald)"
                                : "var(--accent-rose)",
                            border: `1px solid ${selectedTickers.length >= 2 ? "rgba(52,211,153,0.2)" : "rgba(251,113,133,0.2)"}`,
                        }}
                    >
                        {selectedTickers.length} selected
                    </span>
                </div>

                {/* Selected tickers chips */}
                {selectedTickers.length > 0 && (
                    <div className="ticker-chips">
                        {selectedTickers.map((t) => (
                            <span
                                key={t}
                                className="ticker-chip selected"
                                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                            >
                                {t}
                                <X
                                    size={10}
                                    style={{ cursor: "pointer", opacity: 0.6 }}
                                    onClick={() => removeTicker(t)}
                                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                                />
                            </span>
                        ))}
                    </div>
                )}

                {/* Custom ticker add */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search
                            size={13}
                            className="absolute left-3 top-1/2 -translate-y-1/2"
                            style={{ color: "var(--text-muted)" }}
                        />
                        <input
                            id="custom-ticker"
                            type="text"
                            className="input mono"
                            style={{ paddingLeft: "2.2rem", fontSize: "0.875rem" }}
                            placeholder="Add ticker (e.g. TSLA)"
                            value={customTicker}
                            onChange={(e) => setCustomTicker(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTicker())}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={addCustomTicker}
                        disabled={!customTicker.trim()}
                        className="btn btn-ghost"
                        style={{ padding: "0 1rem", borderRadius: "10px" }}
                    >
                        <Plus size={15} />
                    </button>
                </div>

                {/* Sector accordion */}
                <div className="flex flex-col gap-2 mt-1">
                    {Object.entries(TICKER_UNIVERSE).map(([sector, tickers]) => {
                        const selectedCount = tickers.filter((t) => selectedTickers.includes(t)).length;
                        const isOpen = openSector === sector;
                        return (
                            <div
                                key={sector}
                                className="rounded-xl overflow-hidden"
                                style={{ border: "1px solid var(--border-subtle)" }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenSector(isOpen ? null : sector)}
                                    className="w-full flex items-center justify-between px-4 py-3"
                                    style={{
                                        background: isOpen ? "var(--bg-hover)" : "var(--bg-panel)",
                                        transition: "background 0.15s ease",
                                    }}
                                >
                                    <span
                                        className="text-sm font-semibold"
                                        style={{ color: isOpen ? "var(--text-primary)" : "var(--text-secondary)" }}
                                    >
                                        {sector}
                                    </span>
                                    <div className="flex items-center gap-2.5">
                                        {selectedCount > 0 && (
                                            <span
                                                className="text-xs mono font-bold px-1.5 py-0.5 rounded"
                                                style={{
                                                    background: "rgba(99,102,241,0.15)",
                                                    color: "var(--accent-secondary)",
                                                }}
                                            >
                                                {selectedCount}
                                            </span>
                                        )}
                                        <span className="text-xs mono" style={{ color: "var(--text-muted)" }}>
                                            {tickers.length}
                                        </span>
                                        <ChevronDown
                                            size={14}
                                            style={{
                                                color: "var(--text-muted)",
                                                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                                transition: "transform 0.2s ease",
                                            }}
                                        />
                                    </div>
                                </button>
                                {isOpen && (
                                    <div
                                        className="p-3 ticker-chips"
                                        style={{ background: "var(--bg-base)", borderTop: "1px solid var(--border-subtle)" }}
                                    >
                                        {tickers.map((ticker) => (
                                            <span
                                                key={ticker}
                                                className={`ticker-chip ${selectedTickers.includes(ticker) ? "selected" : ""}`}
                                                onClick={() => toggleTicker(ticker)}
                                            >
                                                {ticker}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Error ─────────────────────────────────── */}
            {error && (
                <div
                    className="flex items-start gap-3 p-4 rounded-xl"
                    style={{
                        background: "rgba(251,113,133,0.07)",
                        border: "1px solid rgba(251,113,133,0.2)",
                        color: "#fb7185",
                    }}
                >
                    <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* ── Submit ────────────────────────────────── */}
            <button
                id="optimize-btn"
                type="submit"
                disabled={selectedTickers.length < 2 || isLoading}
                className="btn btn-primary w-full"
                style={{ padding: "0.85rem", fontSize: "0.9rem", borderRadius: "12px" }}
            >
                {isLoading ? (
                    <>
                        <Loader2 size={16} className="animate-spin" />
                        Running Optimization…
                    </>
                ) : (
                    <>
                        <Send size={15} />
                        Generate Portfolio
                    </>
                )}
            </button>

            {selectedTickers.length < 2 && (
                <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    Select at least 2 tickers to proceed.
                </p>
            )}
        </form>
    );
}
