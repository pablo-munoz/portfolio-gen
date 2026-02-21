import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            colors: {
                ares: {
                    base: "#070b14",
                    surface: "#0c1220",
                    panel: "#111827",
                    hover: "#1a2438",
                    accent: "#6366f1",
                    secondary: "#818cf8",
                },
            },
            animation: {
                "fade-up": "fadeUp 0.35s ease both",
                "pulse-glow": "pulse-glow 2s ease-in-out infinite",
                "spin-slow": "spin-slow 2s linear infinite",
            },
            keyframes: {
                fadeUp: {
                    "0%": { opacity: "0", transform: "translateY(12px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "pulse-glow": {
                    "0%, 100%": { boxShadow: "0 0 6px rgba(99, 102, 241, 0.3)" },
                    "50%": { boxShadow: "0 0 18px rgba(99, 102, 241, 0.6)" },
                },
                "spin-slow": {
                    to: { transform: "rotate(360deg)" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
