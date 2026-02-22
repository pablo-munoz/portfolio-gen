"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { usePortfolio } from "@/context/PortfolioContext";
import { portfolioApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Wallet, Plus, Search } from "lucide-react";

const WATCHLIST_KEY = "ares_watchlist_tickers";

function Sparkline({ data }: { data: number[] }) {
    if (!data || data.length < 2) return <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const chartData = data.map((v, i) => ({ v: ((v - min) / range) * 40 + 5, i }));
    const isUp = data[data.length - 1] >= data[0];
    return (
        <div style={{ width: 80, height: 32 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <Line type="monotone" dataKey="v" stroke={isUp ? "#34d399" : "#fb7185"} strokeWidth={1.5} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function WatchlistPage() {
    const { addTickerToBuilder } = usePortfolio();
    const [tickers, setTickers] = useState<string[]>(() => {
        if (typeof window === "undefined") return ["AAPL", "MSFT", "GOOGL", "NVDA", "AMZN"];
        try {
            const s = localStorage.getItem(WATCHLIST_KEY);
            if (s) {
                const arr = JSON.parse(s);
                return Array.isArray(arr) ? arr : ["AAPL", "MSFT", "GOOGL", "NVDA", "AMZN"];
            }
        } catch {}
        return ["AAPL", "MSFT", "GOOGL", "NVDA", "AMZN"];
    });
    const [marketData, setMarketData] = useState<Array<{ ticker: string; name: string; price: number; change_pct: number; volume?: number; market_cap?: number; pe_ratio?: number; sparkline?: number[] }>>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");

    const fetchData = useCallback(async () => {
        if (tickers.length === 0) {
            setMarketData([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await portfolioApi.marketData(tickers);
            setMarketData(res.tickers || []);
        } catch {
            setMarketData([]);
        } finally {
            setLoading(false);
        }
    }, [tickers.join(",")]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    useEffect(() => {
        try {
            localStorage.setItem(WATCHLIST_KEY, JSON.stringify(tickers));
        } catch {}
    }, [tickers]);

    const addTicker = () => {
        const t = searchInput.trim().toUpperCase();
        if (t && !tickers.includes(t)) {
            setTickers((prev) => [...prev, t]);
            setSearchInput("");
        }
    };

    const removeTicker = (t: string) => {
        setTickers((prev) => prev.filter((x) => x !== t));
    };

    return (
        <div className="flex flex-col" style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
            <PageHeader
                title="Watchlist"
                subtitle="Live prices · Add to Portfolio"
                status={{ label: "yfinance connected", active: true }}
            />

            <motion.main
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 overflow-y-auto p-8"
            >
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                        <input
                            type="text"
                            className="input w-full"
                            style={{ paddingLeft: "2.5rem" }}
                            placeholder="Add ticker (e.g. TSLA)"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === "Enter" && addTicker()}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={addTicker}
                        disabled={!searchInput.trim()}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add
                    </button>
                </div>

                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full" style={{ borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <th className="text-left py-4 px-4 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Ticker</th>
                                    <th className="text-left py-4 px-4 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Price</th>
                                    <th className="text-left py-4 px-4 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>24h Change</th>
                                    <th className="text-left py-4 px-4 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>7d Trend</th>
                                    <th className="text-left py-4 px-4 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Market Cap</th>
                                    <th className="text-left py-4 px-4 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>PE</th>
                                    <th className="text-right py-4 px-4 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && marketData.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                                            Loading market data…
                                        </td>
                                    </tr>
                                ) : marketData.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                                            Add tickers to your watchlist.
                                        </td>
                                    </tr>
                                ) : (
                                    marketData.map((row) => (
                                        <tr
                                            key={row.ticker}
                                            className="border-b border-solid"
                                            style={{ borderColor: "var(--border-subtle)" }}
                                        >
                                            <td className="py-4 px-4">
                                                <div>
                                                    <span className="font-semibold mono" style={{ color: "var(--text-primary)" }}>{row.ticker}</span>
                                                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{row.name}</p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 mono font-medium" style={{ color: "var(--text-primary)" }}>{formatCurrency(row.price)}</td>
                                            <td className="py-4 px-4">
                                                <span
                                                    className="mono font-medium"
                                                    style={{ color: row.change_pct >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}
                                                >
                                                    {row.change_pct >= 0 ? "+" : ""}{row.change_pct.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <Sparkline data={row.sparkline || []} />
                                            </td>
                                            <td className="py-4 px-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                                                {row.market_cap != null ? formatCurrency(row.market_cap) : "—"}
                                            </td>
                                            <td className="py-4 px-4 mono text-sm" style={{ color: "var(--text-secondary)" }}>
                                                {row.pe_ratio != null ? row.pe_ratio.toFixed(1) : "—"}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <Link
                                                    href="/builder"
                                                    onClick={() => addTickerToBuilder(row.ticker)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                                                    style={{ background: "rgba(99,102,241,0.2)", color: "var(--accent-secondary)", border: "1px solid rgba(99,102,241,0.3)" }}
                                                >
                                                    <Plus size={12} />
                                                    Add to Portfolio
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTicker(row.ticker)}
                                                    className="ml-2 text-xs"
                                                    style={{ color: "var(--text-muted)" }}
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.main>
        </div>
    );
}
