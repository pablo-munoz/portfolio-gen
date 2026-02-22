"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart2, Shield, TrendingDown } from "lucide-react";
import {
    Bar,
    BarChart,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatCurrency } from "@/lib/utils";
import { RiskMetricsPanel } from "@/components/portfolio/PortfolioVisualizer";
import { PageHeader } from "@/components/layout/PageHeader";

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
                <Shield size={28} style={{ color: "var(--accent-secondary)" }} />
            </div>
            <div className="text-center">
                <p className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    No portfolio data yet
                </p>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                    Generate a portfolio first to view risk metrics.
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

const HEAT_COLORS = ["#22d3ee", "#34d399", "#a78bfa", "#f97316", "#fb7185"];

function CorrelationHeatmap({ matrix }: { matrix: Record<string, Record<string, number>> }) {
    const tickers = Object.keys(matrix);
    if (tickers.length === 0) return null;

    const data = tickers.flatMap((t1) =>
        tickers.map((t2) => ({
            x: t1,
            y: t2,
            value: matrix[t1]?.[t2] ?? 0,
        }))
    );

    const getColor = (v: number) => {
        const idx = Math.min(4, Math.max(0, Math.floor((v + 1) * 2.5)));
        return HEAT_COLORS[idx];
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs mono">
                <thead>
                    <tr>
                        <th style={{ padding: "0.5rem", color: "var(--text-muted)" }} />
                        {tickers.map((t) => (
                            <th key={t} style={{ padding: "0.5rem", color: "var(--text-muted)", minWidth: 48 }}>
                                {t}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {tickers.map((t1) => (
                        <tr key={t1}>
                            <td style={{ padding: "0.5rem", color: "var(--text-muted)", fontWeight: 600 }}>
                                {t1}
                            </td>
                            {tickers.map((t2) => {
                                const v = matrix[t1]?.[t2] ?? 0;
                                return (
                                    <td
                                        key={t2}
                                        style={{
                                            padding: "0.5rem",
                                            background: `${getColor(v)}22`,
                                            color: "var(--text-primary)",
                                            borderRadius: 4,
                                            textAlign: "center",
                                        }}
                                    >
                                        {v.toFixed(2)}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function RiskPage() {
    const { portfolioData } = usePortfolio();

    if (!portfolioData) {
        return (
            <div className="flex flex-col" style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
                <PageHeader title="Risk Analysis" subtitle="Correlation, VaR & stress testing" />
                <NoDataState />
            </div>
        );
    }

    const { correlation_matrix, contribution_to_risk, stress_test: stress } = portfolioData;

    return (
        <div className="flex flex-col" style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
            <PageHeader
                title="Risk Analysis"
                subtitle="Correlation matrix, contribution to risk, stress testing"
                status={{ label: "yfinance connected", active: true }}
            />

            <motion.main
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 overflow-y-auto p-8"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart2 size={16} style={{ color: "var(--accent-primary)" }} />
                            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                                Correlation Matrix
                            </h3>
                        </div>
                        {correlation_matrix && Object.keys(correlation_matrix).length > 0 ? (
                            <CorrelationHeatmap matrix={correlation_matrix} />
                        ) : (
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                No correlation data available.
                            </p>
                        )}
                    </div>

                    <div className="card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart2 size={16} style={{ color: "var(--accent-primary)" }} />
                            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                                Contribution to Risk
                            </h3>
                        </div>
                        {contribution_to_risk && contribution_to_risk.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart
                                    data={contribution_to_risk.sort((a, b) => b.contribution - a.contribution)}
                                    layout="vertical"
                                    margin={{ top: 0, right: 20, left: 50, bottom: 0 }}
                                >
                                    <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                                    <YAxis type="category" dataKey="ticker" tick={{ fill: "var(--text-muted)", fontSize: 10 }} width={40} />
                                    <Tooltip
                                        formatter={(v: number) => [`${v.toFixed(1)}%`, "Contribution"]}
                                        contentStyle={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: 8 }}
                                    />
                                    <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                                        {contribution_to_risk.map((_, i) => (
                                            <Cell key={i} fill={HEAT_COLORS[i % HEAT_COLORS.length]} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                No contribution data available.
                            </p>
                        )}
                    </div>
                </div>

                {stress && (
                    <div className="card p-6 mt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingDown size={16} style={{ color: "#fb7185" }} />
                            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                                Stress Test: Black Swan (−20% Market Crash)
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                            <div className="metric-tile">
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Scenario</p>
                                <p className="text-lg font-bold mono" style={{ color: "#fb7185" }}>{stress.crash_scenario_pct}%</p>
                            </div>
                            <div className="metric-tile">
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Portfolio Impact</p>
                                <p className="text-lg font-bold mono" style={{ color: "#fb7185" }}>{stress.portfolio_return_crash}%</p>
                            </div>
                            <div className="metric-tile">
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Value Before</p>
                                <p className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>{formatCurrency(stress.value_before)}</p>
                            </div>
                            <div className="metric-tile">
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Value After</p>
                                <p className="text-lg font-bold mono" style={{ color: "var(--text-primary)" }}>{formatCurrency(stress.value_after)}</p>
                            </div>
                            <div className="metric-tile">
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Estimated Loss</p>
                                <p className="text-lg font-bold mono" style={{ color: "#fb7185" }}>{formatCurrency(stress.loss_usd)}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="card p-6 mt-6">
                    <RiskMetricsPanel data={portfolioData} />
                </div>
            </motion.main>
        </div>
    );
}
