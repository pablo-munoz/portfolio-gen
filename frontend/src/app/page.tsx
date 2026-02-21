"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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

import { portfolioApi } from "@/lib/api";
import { formatCurrency, formatPercent, STRATEGY_CONFIG } from "@/lib/utils";
import type { PortfolioData, PortfolioRequest } from "@/types/portfolio";

import { PortfolioForm } from "@/components/portfolio/PortfolioForm";
import {
  AllocationChart,
  BacktestChart,
  EfficientFrontierChart,
  RiskMetricsPanel,
} from "@/components/portfolio/PortfolioVisualizer";
import { StrategyBadge } from "@/components/portfolio/StrategyBadge";

// ── Section header ─────────────────────────────────────────
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

// ── Empty / placeholder state ──────────────────────────────
function EmptyState() {
  const steps = [
    { icon: Cpu, text: "Configure your parameters in the form panel" },
    { icon: BrainCircuit, text: "MVO engine fetches live price data via yfinance" },
    { icon: BarChart2, text: "Ledoit-Wolf covariance → Tangency portfolio" },
    { icon: Activity, text: "5-year backtest vs. SPY + VaR risk analytics" },
  ];

  return (
    <div
      className="flex flex-col items-center justify-center animate-fade-up"
      style={{ minHeight: "calc(100vh - 80px)", padding: "3rem 2rem" }}
    >
      {/* Glowing icon */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(79,70,229,0.08))",
          border: "1px solid rgba(99,102,241,0.28)",
          boxShadow: "0 0 60px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <BrainCircuit size={36} style={{ color: "var(--accent-secondary)" }} />
      </div>

      <h2
        className="text-2xl font-bold mb-3 text-center"
        style={{ color: "var(--text-primary)" }}
      >
        Ready to Optimize
      </h2>
      <p
        className="text-sm text-center mb-12"
        style={{ color: "var(--text-secondary)", maxWidth: 420, lineHeight: 1.7 }}
      >
        Configure your portfolio parameters in the left panel and click{" "}
        <strong style={{ color: "var(--accent-secondary)" }}>Generate Portfolio</strong>{" "}
        to run the full Mean-Variance Optimization pipeline.
      </p>

      {/* Pipeline steps */}
      <div className="flex flex-col gap-3 w-full max-w-md">
        {steps.map(({ icon: Icon, text }, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4 rounded-xl"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              animationDelay: `${i * 60}ms`,
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(99,102,241,0.1)" }}
            >
              <Icon size={14} style={{ color: "var(--accent-primary)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {text}
            </p>
            <ChevronRight
              size={14}
              className="ml-auto shrink-0"
              style={{ color: "var(--text-muted)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Loading state ──────────────────────────────────────────
function LoadingState() {
  const stages = [
    "Fetching historical price data…",
    "Estimating expected returns (μ)…",
    "Computing Ledoit-Wolf covariance (Σ)…",
    "Solving Tangency Portfolio via MVO…",
    "Computing Efficient Frontier…",
    "Calculating Value at Risk (VaR)…",
    "Running 5-year backtest vs. SPY…",
  ];

  return (
    <div
      className="flex flex-col items-center justify-center animate-fade-up gap-8"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <div className="loading-ring" />
      <div className="flex flex-col gap-1.5 items-center">
        <p className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Running Optimization Pipeline
        </p>
        {stages.map((stage, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <CheckCircle2 size={13} style={{ color: "var(--accent-emerald)" }} />
            <p className="text-xs mono" style={{ color: "var(--text-muted)" }}>
              {stage}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Portfolio results ──────────────────────────────────────
function PortfolioResults({ data }: { data: PortfolioData }) {
  const { optimization: opt, investment } = data;
  const stratConfig = STRATEGY_CONFIG[opt.strategy];

  return (
    <div className="flex flex-col gap-6 animate-fade-up">

      {/* ── Hero strategy banner ──────────────── */}
      <div
        className="p-6 rounded-2xl flex items-center justify-between gap-6"
        style={{
          background: `linear-gradient(135deg, ${stratConfig.color}12, ${stratConfig.color}06, transparent)`,
          border: `1px solid ${stratConfig.color}30`,
          boxShadow: `0 0 48px ${stratConfig.color}08`,
        }}
      >
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Optimal Strategy
          </p>
          <StrategyBadge strategy={opt.strategy} size="lg" />
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)", maxWidth: 320, lineHeight: 1.65 }}
          >
            {stratConfig.description}
          </p>
        </div>
        <div
          className="text-right shrink-0 pl-6"
          style={{ borderLeft: `1px solid ${stratConfig.color}20` }}
        >
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            Portfolio Value
          </p>
          <p className="text-3xl font-bold mono" style={{ color: "var(--text-primary)" }}>
            {formatCurrency(investment)}
          </p>
          <p
            className="text-sm font-medium mt-1 mono"
            style={{ color: stratConfig.color }}
          >
            +{formatPercent(opt.expected_return)} expected p.a.
          </p>
        </div>
      </div>

      {/* ── KPI metrics row ──────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Expected Return",
            value: formatPercent(opt.expected_return),
            sub: "Annualized μ",
            color: "#34d399",
          },
          {
            label: "Sharpe Ratio",
            value: opt.sharpe_ratio.toFixed(3),
            sub: "Risk-adjusted return",
            color: opt.sharpe_ratio > 1 ? "#34d399" : opt.sharpe_ratio > 0.5 ? "#fbbf24" : "#fb7185",
          },
          {
            label: "Volatility",
            value: formatPercent(opt.volatility),
            sub: "Annualized σ",
            color: "#a78bfa",
          },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="metric-tile" style={{ textAlign: "center" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {label}
            </p>
            <p className="text-2xl font-bold mono mt-2 mb-1" style={{ color }}>
              {value}
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Allocation + Risk side by side ────── */}
      <div className="grid grid-cols-2 gap-5">
        <div className="card p-6">
          <SectionHeader
            icon={PieChart}
            title="Allocation"
            subtitle="Optimal portfolio weights"
          />
          <AllocationChart weights={opt.weights} investment={investment} />
        </div>
        <div className="card p-6">
          <SectionHeader
            icon={Shield}
            title="Risk Metrics"
            subtitle="Parametric VaR @ 95% confidence"
          />
          <RiskMetricsPanel data={data} />
        </div>
      </div>

      {/* ── Efficient Frontier ───────────────── */}
      <div className="card p-6">
        <EfficientFrontierChart data={data} />
      </div>

      {/* ── Backtest ─────────────────────────── */}
      <div className="card p-6">
        <SectionHeader
          icon={LineChart}
          title="5-Year Backtest"
          subtitle="Buy-and-hold portfolio vs. SPY starting at $100,000"
        />
        <BacktestChart backtest={data.backtest} />
      </div>

      {/* ── Tickers footnote ─────────────────── */}
      <div
        className="flex flex-wrap items-center gap-2 px-1 pb-2"
        style={{ color: "var(--text-muted)" }}
      >
        <Sparkles size={12} />
        <span className="text-xs">Tickers optimized:</span>
        {data.valid_tickers.map((t) => (
          <span
            key={t}
            className="mono text-xs px-2 py-0.5 rounded-md"
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────
export default function DashboardPage() {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);

  const mutation = useMutation({
    mutationFn: (req: PortfolioRequest) => portfolioApi.optimize(req),
    onSuccess: (res) => {
      if (res.success) setPortfolioData(res.data);
    },
  });

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh", background: "var(--bg-base)" }}>

      {/* ── Top bar ────────────────────────── */}
      <header
        className="flex items-center justify-between px-8 py-4 shrink-0"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          height: "68px",
        }}
      >
        <div>
          <h1
            className="text-lg font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Portfolio Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Mean-Variance Optimization · Ledoit-Wolf Covariance · Real-Time Data
          </p>
        </div>
        <div
          className="flex items-center gap-2.5 px-4 py-2 rounded-xl"
          style={{
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.18)",
          }}
        >
          <div className="dot-live" />
          <span className="text-sm font-medium" style={{ color: "var(--accent-emerald)" }}>
            yfinance connected
          </span>
        </div>
      </header>

      {/* ── Body: form left + results right ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: form panel — fixed width, scrollable */}
        <aside
          className="shrink-0 overflow-y-auto"
          style={{
            width: "420px",
            borderRight: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
          }}
        >
          <div className="p-7">
            <PortfolioForm
              onSubmit={(req) => mutation.mutate(req)}
              isLoading={mutation.isPending}
              error={mutation.isError ? (mutation.error as Error).message : null}
            />
          </div>
        </aside>

        {/* Right: results panel — scrollable */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ background: "var(--bg-base)" }}
        >
          <div style={{ padding: "2rem 2.5rem", maxWidth: "1200px" }}>
            {mutation.isPending && <LoadingState />}
            {!mutation.isPending && portfolioData && (
              <PortfolioResults data={portfolioData} />
            )}
            {!mutation.isPending && !portfolioData && <EmptyState />}
          </div>
        </main>
      </div>
    </div>
  );
}
