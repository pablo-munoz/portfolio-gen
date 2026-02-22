"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatCurrency } from "@/lib/utils";
import { BacktestChart } from "@/components/portfolio/PortfolioVisualizer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Layers } from "lucide-react";

function NoDataState() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-6"
            style={{ minHeight: "calc(100vh - 200px)", padding: "3rem" }}
        >
            <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
            >
                <Layers size={28} style={{ color: "var(--accent-secondary)" }} />
            </div>
            <div className="text-center">
                <p className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    No portfolio data yet
                </p>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                    Generate a portfolio first to view backtest results.
                </p>
                <Link
                    href="/builder"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium"
                    style={{ background: "rgba(99,102,241,0.2)", color: "var(--accent-secondary)", border: "1px solid rgba(99,102,241,0.4)" }}
                >
                    Go to Portfolio Builder
                </Link>
            </div>
        </motion.div>
    );
}

export default function BacktestingPage() {
    const { portfolioData } = usePortfolio();

    if (!portfolioData) {
        return (
            <div className="flex flex-col" style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
                <PageHeader title="Backtesting" subtitle="Historical performance" />
                <NoDataState />
            </div>
        );
    }

    const { backtest, investment } = portfolioData;
    const step = Math.max(1, Math.floor(backtest.dates.length / 150));
    const areaData = backtest.dates
        .filter((_, i) => i % step === 0)
        .map((date, i) => ({
            date,
            Portfolio: backtest.portfolio_values[i * step],
            "SPY Benchmark": backtest.benchmark_values[i * step],
        }));

    return (
        <div className="flex flex-col" style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
            <PageHeader
                title="Backtesting"
                subtitle={
                    portfolioData.monthly_contribution && portfolioData.monthly_contribution > 0
                        ? `Buy-and-hold + ${formatCurrency(portfolioData.monthly_contribution)}/mo DCA vs. SPY`
                        : "Buy-and-hold portfolio vs. SPY"
                }
                status={{ label: "yfinance connected", active: true }}
            />

            <motion.main
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 overflow-y-auto p-8"
            >
                {backtest.max_drawdown_pct != null && (
                    <div className="card p-4 mb-6 flex items-center gap-4">
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>Max Drawdown</span>
                        <span className="text-xl font-bold mono" style={{ color: "#fb7185" }}>
                            {backtest.max_drawdown_pct.toFixed(1)}%
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            Peak-to-trough decline over backtest period
                        </span>
                    </div>
                )}

                <div className="card p-6 mb-6">
                    <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                        Growth of ${investment >= 1000 ? `${(investment / 1000).toFixed(0)}k` : investment} over selected horizon
                    </p>
                    <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={areaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="benchGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#64748b" stopOpacity={0.2} />
                                    <stop offset="100%" stopColor="#64748b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                                tickFormatter={(d) => d.slice(0, 7)}
                            />
                            <YAxis
                                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                                width={50}
                            />
                            <Tooltip
                                formatter={(v: number) => [formatCurrency(v), ""]}
                                contentStyle={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: 8 }}
                            />
                            <Area type="monotone" dataKey="SPY Benchmark" stroke="#64748b" fill="url(#benchGrad)" strokeWidth={1.5} />
                            <Area type="monotone" dataKey="Portfolio" stroke="#818cf8" fill="url(#portGrad)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="card p-6">
                    <BacktestChart backtest={backtest} investment={investment} />
                </div>
            </motion.main>
        </div>
    );
}
