"use client";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    status?: { label: string; active: boolean };
}

export function PageHeader({ title, subtitle, status }: PageHeaderProps) {
    return (
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
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {status && (
                <div
                    className="flex items-center gap-2.5 px-4 py-2 rounded-xl"
                    style={{
                        background: status.active
                            ? "rgba(52,211,153,0.08)"
                            : "rgba(148,163,184,0.08)",
                        border: `1px solid ${status.active ? "rgba(52,211,153,0.18)" : "rgba(148,163,184,0.18)"}`,
                    }}
                >
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{
                            background: status.active ? "#34d399" : "#94a3b8",
                            boxShadow: status.active ? "0 0 8px #34d399" : undefined,
                        }}
                    />
                    <span
                        className="text-sm font-medium"
                        style={{
                            color: status.active ? "var(--accent-emerald)" : "var(--text-muted)",
                        }}
                    >
                        {status.label}
                    </span>
                </div>
            )}
        </header>
    );
}
