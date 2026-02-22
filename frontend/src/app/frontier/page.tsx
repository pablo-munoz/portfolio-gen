"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart2 } from "lucide-react";
import {
    Scatter,
    ScatterChart,
    XAxis,
    YAxis,
    ZAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatPercent } from "@/lib/utils";
import { EfficientFrontierChart } from "@/components/portfolio/PortfolioVisualizer";
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
                <BarChart2 size={28} style={{ color: "var(--accent-secondary)" }} />
            </div>
            <div className="text-center">
                <p className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    No portfolio data yet
                </p>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                    Generate a portfolio first to view the Efficient Frontier.
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

export default function FrontierPage() {
    const { portfolioData } = usePortfolio();

    if (!portfolioData) {
        return (
            <div className="flex flex-col" style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
                <PageHeader title="Efficient Frontier" subtitle="Risk vs. Return trade-off" />
                <NoDataState />
            </div>
        );
    }

    const { efficient_frontier, optimization } = portfolioData;
    const scatterData = efficient_frontier.map((p) => ({
        volatility: p.volatility * 100,
        return: p.return * 100,
        size: 60,
    }));
    const tangencyPoint = {
        volatility: optimization.volatility * 100,
        return: optimization.expected_return * 100,
    };
    const minVolPoint = efficient_frontier.reduce((a, b) =>
        a.volatility < b.volatility ? a : b
    );
    const minVolX = minVolPoint.volatility * 100;

    return (
        <div className="flex flex-col" style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
            <PageHeader title="Efficient Frontier" subtitle="Risk vs. Return trade-off" status={{ label: "yfinance connected", active: true }} />

            <motion.main
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 overflow-y-auto p-8"
            >
                <div className="card p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart2 size={16} style={{ color: "var(--accent-primary)" }} />
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            Interactive scatter — {scatterData.length} portfolio combinations
                        </p>
                    </div>
                    <ResponsiveContainer width="100%" height={420}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <XAxis
                                type="number"
                                dataKey="volatility"
                                name="Volatility"
                                unit="%"
                                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                                tickFormatter={(v) => `${v.toFixed(1)}%`}
                            />
                            <YAxis
                                type="number"
                                dataKey="return"
                                name="Return"
                                unit="%"
                                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                                tickFormatter={(v) => `${v.toFixed(1)}%`}
                            />
                            <ZAxis type="number" dataKey="size" range={[40, 120]} />
                            <Tooltip
                                cursor={{ strokeDasharray: "3 3" }}
                                formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                            />
                            <ReferenceLine
                                x={tangencyPoint.volatility}
                                stroke="#fbbf24"
                                strokeDasharray="4 2"
                                label={{ value: "Max Sharpe ★", position: "top", fill: "#fbbf24" }}
                            />
                            <ReferenceLine
                                x={minVolX}
                                stroke="#22d3ee"
                                strokeDasharray="4 2"
                                label={{ value: "Min Vol", position: "top", fill: "#22d3ee" }}
                            />
                            <Scatter
                                name="Efficient Frontier"
                                data={scatterData}
                                fill="#6366f1"
                                fillOpacity={0.6}
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                    <div className="flex gap-6 mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span><strong style={{ color: "#fbbf24" }}>★ Max Sharpe</strong> — Optimal risk-adjusted</span>
                        <span><strong style={{ color: "#22d3ee" }}>Min Vol</strong> — Lowest volatility</span>
                    </div>
                </div>

                <div className="card p-6">
                    <EfficientFrontierChart data={portfolioData} />
                </div>
            </motion.main>
        </div>
    );
}
