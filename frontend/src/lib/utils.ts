import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: compact ? "compact" : "standard",
        maximumFractionDigits: compact ? 1 : 0,
    }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDecimal(value: number, decimals = 4): string {
    return value.toFixed(decimals);
}

export const STRATEGY_CONFIG = {
    Conservative: {
        color: "#22d3ee",
        bg: "bg-cyan-500/10",
        text: "text-cyan-400",
        border: "border-cyan-500/30",
        description: "Capital preservation focus. Low volatility, steady growth.",
    },
    Balanced: {
        color: "#a78bfa",
        bg: "bg-violet-500/10",
        text: "text-violet-400",
        border: "border-violet-500/30",
        description: "Optimized risk-adjusted returns. Diversified allocation.",
    },
    Aggressive: {
        color: "#f97316",
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        border: "border-orange-500/30",
        description: "Maximum growth potential. Elevated volatility accepted.",
    },
} as const;

// Palette for donut chart sectors – institutional dark palette
export const CHART_COLORS = [
    "#818cf8", // indigo
    "#34d399", // emerald
    "#f472b6", // pink
    "#fb923c", // orange
    "#60a5fa", // blue
    "#facc15", // amber
    "#a78bfa", // violet
    "#4ade80", // green
    "#f87171", // red
    "#38bdf8", // sky
];
