"use client";

import {
    Activity,
    BarChart2,
    BrainCircuit,
    CheckCircle2,
    ChevronRight,
    Cpu,
    LineChart,
    PieChart,
    Shield,
    Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

import { usePortfolio } from "@/context/PortfolioContext";
import { formatCurrency, formatPercent, STRATEGY_CONFIG } from "@/lib/utils";
import type { PortfolioData, PortfolioRequest } from "@/types/portfolio";

import { PageHeader } from "@/components/layout/PageHeader";
import { PortfolioForm } from "@/components/portfolio/PortfolioForm";
import {
    AllocationChart,
    BacktestChart,
    EfficientFrontierChart,
    RiskMetricsPanel,
} from "@/components/portfolio/PortfolioVisualizer";
import { StrategyBadge } from "@/components/portfolio/StrategyBadge";

function SectionHeader({
    icon: Icon,
    title,
    subtitle,
}: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
}) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                    background: "rgba(99,102,241,0.12)",
                    border: "1px solid rgba(99,102,241,0.22)",
                }}
            >
                <Icon size={16} style={{ color: "var(--accent-primary)" }} />
            </div>
            <div>
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}

function EmptyState() {
    const steps = [
        { icon: Cpu, text: "Configure your parameters in the form panel" },
        { icon: BrainCircuit, text: "MVO engine fetches live price data via yfinance" },
        { icon: BarChart2, text: "Ledoit-Wolf covariance → Tangency portfolio" },
        { icon: Activity, text: "5-year backtest vs. SPY + VaR risk analytics" },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center"
            style={{ minHeight: "calc(100vh - 80px)", padding: "3rem 2rem" }}
        >
            <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
                style={{
                    background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(79,70,229,0.08))",
                    border: "1px solid rgba(99,102,241,0.28)",
                }}
            >
                <BrainCircuit size={36} style={{ color: "var(--accent-secondary)" }} />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-center" style={{ color: "var(--text-primary)" }}>
                Ready to Optimize
            </h2>
            <p className="text-sm text-center mb-12" style={{ color: "var(--text-secondary)", maxWidth: 420 }}>
                Configure your portfolio in the left panel and click Generate Portfolio.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-md">
                {steps.map(({ icon: Icon, text }, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                        <Icon size={14} style={{ color: "var(--accent-primary)" }} />
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{text}</p>
                        <ChevronRight size={14} className="ml-auto" style={{ color: "var(--text-muted)" }} />
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

function LoadingState() {
    const stages = ["Fetching price data…", "Computing Ledoit-Wolf covariance…", "Solving Tangency Portfolio…", "Running backtest…"];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center gap-8" style={{ minHeight: "calc(100vh - 80px)" }}>
            <div className="loading-ring" />
            <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Running Optimization Pipeline</p>
            <div className="flex flex-col gap-1.5">
                {stages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                        <CheckCircle2 size={13} style={{ color: "var(--accent-emerald)" }} />
                        <p className="text-xs mono" style={{ color: "var(--text-muted)" }}>{stage}</p>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

function PortfolioResults({ data }: { data: PortfolioData }) {
    const { optimization: opt, investment } = data;
    const stratConfig = STRATEGY_CONFIG[opt.strategy];

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
            <div className="p-6 rounded-2xl flex items-center justify-between gap-6" style={{ background: `linear-gradient(135deg, ${stratConfig.color}12, ${stratConfig.color}06, transparent)`, border: `1px solid ${stratConfig.color}30` }}>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Optimal Strategy</p>
                    <StrategyBadge strategy={opt.strategy} size="lg" />
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", maxWidth: 320 }}>{stratConfig.description}</p>
                </div>
                <div className="text-right pl-6" style={{ borderLeft: `1px solid ${stratConfig.color}20` }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Portfolio Value</p>
                    <p className="text-3xl font-bold mono" style={{ color: "var(--text-primary)" }}>{formatCurrency(investment)}</p>
                    <p className="text-sm font-medium mt-1 mono" style={{ color: stratConfig.color }}>+{formatPercent(opt.expected_return)} expected p.a.</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Expected Return", value: formatPercent(opt.expected_return), sub: "Annualized μ", color: "#34d399" },
                    { label: "Sharpe Ratio", value: opt.sharpe_ratio.toFixed(3), sub: "Risk-adjusted return", color: opt.sharpe_ratio > 1 ? "#34d399" : opt.sharpe_ratio > 0.5 ? "#fbbf24" : "#fb7185" },
                    { label: "Volatility", value: formatPercent(opt.volatility), sub: "Annualized σ", color: "#a78bfa" },
                ].map(({ label, value, sub, color }) => (
                    <div key={label} className="metric-tile" style={{ textAlign: "center" }}>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
                        <p className="text-2xl font-bold mono mt-2 mb-1" style={{ color }}>{value}</p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-5">
                <div className="card p-6">
                    <SectionHeader icon={PieChart} title="Allocation" subtitle="Optimal portfolio weights" />
                    <AllocationChart weights={opt.weights} investment={investment} />
                </div>
                <div className="card p-6">
                    <SectionHeader icon={Shield} title="Risk Metrics" subtitle="Parametric VaR @ 95% confidence" />
                    <RiskMetricsPanel data={data} />
                </div>
            </div>

            <div className="card p-6">
                <EfficientFrontierChart data={data} />
            </div>

            <div className="card p-6">
                <SectionHeader
                    icon={LineChart}
                    title="5-Year Backtest"
                    subtitle={
                        data.monthly_contribution && data.monthly_contribution > 0
                            ? `Buy-and-hold + ${formatCurrency(data.monthly_contribution)}/mo DCA vs. SPY starting at ${formatCurrency(data.investment)}`
                            : `Buy-and-hold portfolio vs. SPY starting at ${formatCurrency(data.investment)}`
                    }
                />
                <BacktestChart backtest={data.backtest} investment={data.investment} />
            </div>

            <div className="flex flex-wrap items-center gap-2 px-1 pb-2" style={{ color: "var(--text-muted)" }}>
                <Sparkles size={12} />
                <span className="text-xs">Tickers optimized:</span>
                {data.valid_tickers.map((t) => (
                    <span key={t} className="mono text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                        {t}
                    </span>
                ))}
            </div>
        </motion.div>
    );
}

export default function DashboardPage() {
    const { portfolioData, isLoading, error, runOptimization } = usePortfolio();

    const handleSubmit = (req: PortfolioRequest) => {
        runOptimization(req);
    };

    return (
        <div className="flex flex-col" style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
            <PageHeader
                title="Portfolio Dashboard"
                subtitle="Mean-Variance Optimization · Ledoit-Wolf Covariance · Real-Time Data"
                status={{ label: "yfinance connected", active: true }}
            />

            <div className="flex flex-1 overflow-hidden">
                <aside className="shrink-0 overflow-y-auto" style={{ width: "420px", borderRight: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
                    <div className="p-7">
                        <PortfolioForm
                            onSubmit={handleSubmit}
                            isLoading={isLoading}
                            error={error}
                        />
                    </div>
                </aside>

                <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg-base)" }}>
                    <div style={{ padding: "2rem 2.5rem", maxWidth: "1200px" }}>
                        {isLoading && <LoadingState />}
                        {!isLoading && portfolioData && <PortfolioResults data={portfolioData} />}
                        {!isLoading && !portfolioData && <EmptyState />}
                    </div>
                </main>
            </div>
        </div>
    );
}
