"use client";

import {
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { PortfolioData } from "@/types/portfolio";
import { CHART_COLORS, formatCurrency, formatPercent } from "@/lib/utils";
import { Activity, BarChart2, TrendingDown } from "lucide-react";

// ── Allocation Donut Chart ─────────────────────────────────
interface AllocationChartProps {
    weights: Record<string, number>;
    investment: number;
}

const DonutTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
        <div
            className="custom-tooltip"
            style={{
                background: "var(--bg-panel)",
                border: "1px solid var(--border-default)",
                borderRadius: 8,
                padding: "0.65rem 0.9rem",
            }}
        >
            <p className="font-bold mono text-sm" style={{ color: "var(--text-primary)" }}>
                {d.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {formatPercent(d.value)} allocation
            </p>
            <p className="text-xs mono" style={{ color: d.payload.fill }}>
                {formatCurrency(d.payload.dollarValue)}
            </p>
        </div>
    );
};

export function AllocationChart({ weights, investment }: AllocationChartProps) {
    const data = Object.entries(weights)
        .filter(([, w]) => w > 0.001)
        .sort((a, b) => b[1] - a[1])
        .map(([ticker, weight], i) => ({
            name: ticker,
            value: weight,
            dollarValue: weight * investment,
            fill: CHART_COLORS[i % CHART_COLORS.length],
        }));

    return (
        <div className="flex flex-col gap-4">
            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                    <Legend
                        wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                        formatter={(value, entry: any) => (
                            <span style={{ color: "var(--text-secondary)" }}>
                                {value}{" "}
                                <span style={{ color: entry.color, fontFamily: "monospace" }}>
                                    {formatPercent(entry.payload.value)}
                                </span>
                            </span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Allocation table */}
            <div className="flex flex-col gap-1">
                {data.map((row) => (
                    <div key={row.name} className="flex items-center gap-3">
                        <div
                            className="w-2 h-2 rounded-sm shrink-0"
                            style={{ background: row.fill }}
                        />
                        <span className="text-xs mono font-medium flex-1" style={{ color: "var(--text-primary)" }}>
                            {row.name}
                        </span>
                        <span className="text-xs mono" style={{ color: "var(--text-secondary)" }}>
                            {formatPercent(row.value)}
                        </span>
                        <span className="text-xs mono" style={{ color: "var(--text-muted)" }}>
                            {formatCurrency(row.dollarValue)}
                        </span>
                        <div
                            className="h-1.5 rounded-full"
                            style={{
                                width: `${Math.max(row.value * 200, 4)}px`,
                                background: row.fill,
                                opacity: 0.7,
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Backtest Line Chart ────────────────────────────────────

const BacktestTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div
            style={{
                background: "var(--bg-panel)",
                border: "1px solid var(--border-default)",
                borderRadius: 8,
                padding: "0.65rem 0.9rem",
                fontSize: "0.75rem",
            }}
        >
            <p style={{ color: "var(--text-muted)", marginBottom: 4 }}>{label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} style={{ color: p.color, fontFamily: "monospace" }}>
                    {p.name}: {formatCurrency(p.value)}
                </p>
            ))}
        </div>
    );
};

interface BacktestChartProps {
    backtest: PortfolioData["backtest"];
    investment: number;
}

export function BacktestChart({ backtest, investment }: BacktestChartProps) {
    // Downsample to ~120 points for performance
    const step = Math.max(1, Math.floor(backtest.dates.length / 120));
    const chartData = backtest.dates
        .filter((_, i) => i % step === 0)
        .map((date, i) => ({
            date,
            Portfolio: backtest.portfolio_values[i * step],
            "SPY Benchmark": backtest.benchmark_values[i * step],
        }));

    const portReturn = backtest.portfolio_total_return;
    const benchReturn = backtest.benchmark_total_return;
    const isOutperforming = portReturn > benchReturn;

    return (
        <div className="flex flex-col gap-4">
            {/* Performance summary */}
            {backtest.total_invested != null && backtest.total_invested > investment && (
                <p className="text-xs" style={{ color: "var(--text-muted)", marginBottom: 4 }}>
                    Total invested: {formatCurrency(backtest.total_invested)} (initial {formatCurrency(investment)} + {formatCurrency(backtest.total_invested - investment)} in DCA)
                </p>
            )}
            <div className="grid grid-cols-2 gap-3">
                {[
                    {
                        label: "Ares Portfolio",
                        cagr: backtest.portfolio_cagr,
                        total: backtest.portfolio_total_return,
                        color: "#818cf8",
                    },
                    {
                        label: "SPY Benchmark",
                        cagr: backtest.benchmark_cagr,
                        total: backtest.benchmark_total_return,
                        color: "#94a3b8",
                    },
                ].map(({ label, cagr, total, color }) => (
                    <div
                        key={label}
                        className="metric-tile"
                        style={{ borderColor: `${color}28` }}
                    >
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {label}
                        </p>
                        <p className="text-lg font-bold mono" style={{ color }}>
                            {formatPercent(total)}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {formatPercent(cagr)} CAGR
                        </p>
                    </div>
                ))}
            </div>

            {/* Outperformance badge */}
            <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                style={{
                    background: isOutperforming ? "rgba(52,211,153,0.08)" : "rgba(251,113,133,0.08)",
                    border: `1px solid ${isOutperforming ? "rgba(52,211,153,0.2)" : "rgba(251,113,133,0.2)"}`,
                    color: isOutperforming ? "#34d399" : "#fb7185",
                }}
            >
                {isOutperforming ? (
                    <Activity size={13} />
                ) : (
                    <TrendingDown size={13} />
                )}
                {isOutperforming
                    ? `Outperforms SPY by ${formatPercent(portReturn - benchReturn)}`
                    : `Underperforms SPY by ${formatPercent(benchReturn - portReturn)}`}
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis
                        dataKey="date"
                        tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tickFormatter={(d) => d.slice(0, 7)}
                    />
                    <YAxis
                        tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        width={52}
                    />
                    <Tooltip content={<BacktestTooltip />} />
                    <ReferenceLine
                        y={investment}
                        stroke="var(--border-default)"
                        strokeDasharray="4 4"
                    />
                    <Line
                        type="monotone"
                        dataKey="SPY Benchmark"
                        stroke="#64748b"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="5 3"
                    />
                    <Line
                        type="monotone"
                        dataKey="Portfolio"
                        stroke="#818cf8"
                        strokeWidth={2}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// ── Risk Metrics Panel ─────────────────────────────────────
interface RiskPanelProps {
    data: PortfolioData;
}

export function RiskMetricsPanel({ data }: RiskPanelProps) {
    const { optimization: opt, var: varData } = data;

    const metrics = [
        {
            label: "Expected Return",
            value: formatPercent(opt.expected_return),
            color: "#34d399",
            sub: "Annualized",
        },
        {
            label: "Volatility",
            value: formatPercent(opt.volatility),
            color: opt.volatility < 0.15 ? "#22d3ee" : opt.volatility < 0.25 ? "#a78bfa" : "#f97316",
            sub: "Annualized σ",
        },
        {
            label: "Sharpe Ratio",
            value: opt.sharpe_ratio.toFixed(3),
            color: opt.sharpe_ratio > 1 ? "#34d399" : opt.sharpe_ratio > 0.5 ? "#fbbf24" : "#fb7185",
            sub: "Risk-adjusted return",
        },
        {
            label: "Daily VaR 95%",
            value: formatCurrency(varData.daily_var),
            color: "#fb7185",
            sub: "Max expected daily loss",
        },
        {
            label: "Annual VaR 95%",
            value: formatCurrency(varData.annual_var),
            color: "#f97316",
            sub: "Max expected annual loss",
        },
    ];

    return (
        <div className="flex flex-col gap-2">
            {metrics.map(({ label, value, color, sub }) => (
                <div
                    key={label}
                    className="metric-tile flex-row items-center justify-between"
                    style={{ flexDirection: "row" }}
                >
                    <div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                            {sub}
                        </p>
                    </div>
                    <p
                        className="text-lg font-bold mono"
                        style={{ color }}
                    >
                        {value}
                    </p>
                </div>
            ))}
        </div>
    );
}

// ── Efficient Frontier Plot ────────────────────────────────
interface FrontierChartProps {
    data: PortfolioData;
}

export function EfficientFrontierChart({ data }: FrontierChartProps) {
    const { efficient_frontier, optimization: opt } = data;

    const chartData = efficient_frontier.map((p) => ({
        volatility: parseFloat((p.volatility * 100).toFixed(2)),
        return: parseFloat((p.return * 100).toFixed(2)),
    }));

    const tangencyPoint = {
        volatility: parseFloat((opt.volatility * 100).toFixed(2)),
        return: parseFloat((opt.expected_return * 100).toFixed(2)),
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={14} style={{ color: "var(--accent-primary)" }} />
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    Efficient Frontier — Risk vs. Return Trade-off
                </p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <XAxis
                        dataKey="volatility"
                        tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                        label={{ value: "Volatility →", position: "insideBottomRight", offset: -4, fill: "var(--text-muted)", fontSize: 10 }}
                    />
                    <YAxis
                        dataKey="return"
                        tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                        width={40}
                    />
                    <Tooltip
                        formatter={(v: number) => [`${v}%`, ""]}
                        contentStyle={{
                            background: "var(--bg-panel)",
                            border: "1px solid var(--border-default)",
                            borderRadius: 8,
                            fontSize: 11,
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="return"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={false}
                    />
                    {/* Tangency portfolio marker */}
                    <ReferenceLine
                        x={tangencyPoint.volatility}
                        stroke="#fbbf24"
                        strokeDasharray="4 2"
                        strokeWidth={1.5}
                        label={{
                            value: "Tangency ★",
                            position: "top",
                            fill: "#fbbf24",
                            fontSize: 10,
                            fontFamily: "monospace",
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
