"use client";

import {
    BarChart3,
    BrainCircuit,
    ChevronRight,
    Layers,
    LineChart,
    Settings,
    Shield,
    TrendingUp,
    Wallet,
    Zap,
} from "lucide-react";

const NAV_ITEMS = [
    { icon: TrendingUp, label: "Dashboard", active: true },
    { icon: BarChart3, label: "Portfolio Builder", active: false },
    { icon: LineChart, label: "Efficient Frontier", active: false },
    { icon: Shield, label: "Risk Analysis", active: false },
    { icon: Layers, label: "Backtesting", active: false },
    { icon: Wallet, label: "Watchlist", active: false },
];

const MARKET_STATS = [
    { label: "S&P 500", ticker: "SPY", change: "+0.82%", up: true },
    { label: "NASDAQ", ticker: "QQQ", change: "+1.14%", up: true },
    { label: "VIX", ticker: "^VIX", change: "−2.30%", up: false },
];

export function Sidebar() {
    return (
        <aside className="sidebar">
            {/* ── Logo ─────────────────────────────── */}
            <div
                className="px-6 py-5"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                            boxShadow: "0 0 20px rgba(99,102,241,0.45)",
                        }}
                    >
                        <BrainCircuit size={18} className="text-white" />
                    </div>
                    <div>
                        <p
                            className="font-bold tracking-widest text-xs uppercase"
                            style={{ color: "var(--text-primary)", letterSpacing: "0.12em" }}
                        >
                            ARES
                        </p>
                        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                            Portfolio Engine v1.0
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Live markets ─────────────────────── */}
            <div className="px-6 py-3 flex items-center gap-2.5">
                <div className="dot-live" />
                <span className="text-xs font-semibold" style={{ color: "var(--accent-emerald)" }}>
                    Markets Open
                </span>
                <span
                    className="ml-auto text-xs mono font-medium px-2 py-0.5 rounded"
                    style={{
                        background: "rgba(52,211,153,0.1)",
                        color: "var(--accent-emerald)",
                        border: "1px solid rgba(52,211,153,0.2)",
                    }}
                >
                    NYSE
                </span>
            </div>

            <div className="divider mx-5" />

            {/* ── Navigation ───────────────────────── */}
            <div className="px-4 pt-1 pb-2">
                <p
                    className="px-2 mb-2 text-xs font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}
                >
                    Navigation
                </p>
                <nav className="flex flex-col gap-1">
                    {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
                        <div key={label} className={`sidebar-item ${active ? "active" : ""}`}>
                            <Icon size={16} style={{ flexShrink: 0 }} />
                            <span>{label}</span>
                            {active && (
                                <ChevronRight
                                    size={13}
                                    className="ml-auto opacity-40"
                                    style={{ color: "var(--accent-secondary)" }}
                                />
                            )}
                        </div>
                    ))}
                </nav>
            </div>

            {/* ── Quick Stats ──────────────────────── */}
            <div className="mx-4 mt-2">
                <div
                    className="p-4 rounded-xl"
                    style={{
                        background: "var(--bg-panel)",
                        border: "1px solid var(--border-subtle)",
                    }}
                >
                    <p
                        className="text-xs font-bold uppercase tracking-wider mb-3"
                        style={{ color: "var(--text-muted)", letterSpacing: "0.09em" }}
                    >
                        Market Snapshot
                    </p>
                    <div className="flex flex-col gap-3">
                        {MARKET_STATS.map(({ label, ticker, change, up }) => (
                            <div key={label} className="flex items-center justify-between">
                                <div>
                                    <p
                                        className="text-sm font-semibold"
                                        style={{ color: "var(--text-primary)" }}
                                    >
                                        {label}
                                    </p>
                                    <p
                                        className="text-xs mono"
                                        style={{ color: "var(--text-muted)" }}
                                    >
                                        {ticker}
                                    </p>
                                </div>
                                <span
                                    className="text-sm font-bold mono"
                                    style={{
                                        color: up ? "var(--accent-emerald)" : "var(--accent-rose)",
                                    }}
                                >
                                    {change}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Spacer ───────────────────────────── */}
            <div className="flex-1" />

            {/* ── Bottom ───────────────────────────── */}
            <div className="divider mx-5" />
            <div className="px-4 pb-5">
                <div className="sidebar-item">
                    <Settings size={16} style={{ flexShrink: 0 }} />
                    <span>Settings</span>
                </div>
                <div className="mt-3 px-2 flex items-center gap-2">
                    <Zap size={12} style={{ color: "var(--accent-amber)", flexShrink: 0 }} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Powered by PyPortfolioOpt
                    </span>
                </div>
            </div>
        </aside>
    );
}
