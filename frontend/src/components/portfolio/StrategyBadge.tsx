"use client";

import { STRATEGY_CONFIG } from "@/lib/utils";
import { Shield, TrendingUp, Zap } from "lucide-react";

const ICONS = {
    Conservative: Shield,
    Balanced: TrendingUp,
    Aggressive: Zap,
} as const;

interface StrategyBadgeProps {
    strategy: "Conservative" | "Balanced" | "Aggressive";
    size?: "sm" | "md" | "lg";
}

export function StrategyBadge({ strategy, size = "md" }: StrategyBadgeProps) {
    const config = STRATEGY_CONFIG[strategy];
    const Icon = ICONS[strategy];

    const sizes = {
        sm: { icon: 12, fontSize: "0.7rem", padding: "0.2rem 0.55rem" },
        md: { icon: 14, fontSize: "0.8rem", padding: "0.3rem 0.75rem" },
        lg: { icon: 18, fontSize: "1rem", padding: "0.5rem 1.1rem" },
    };

    const s = sizes[size];

    return (
        <span
            className="inline-flex items-center gap-1.5 font-bold rounded-md"
            style={{
                background: config.bg.replace("bg-", ""),
                border: `1px solid`,
                borderColor: config.border.replace("border-", ""),
                color: config.color,
                fontSize: s.fontSize,
                padding: s.padding,
                // Use CSS custom properties approach via inline style
                backgroundColor: config.color + "18",
                borderColor: config.color + "40",
                letterSpacing: "0.04em",
            }}
        >
            <Icon size={s.icon} />
            {strategy.toUpperCase()}
        </span>
    );
}
