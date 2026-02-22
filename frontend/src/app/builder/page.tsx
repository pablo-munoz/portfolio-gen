"use client";

import { motion } from "framer-motion";

import { usePortfolio } from "@/context/PortfolioContext";
import type { PortfolioRequest } from "@/types/portfolio";

import { PageHeader } from "@/components/layout/PageHeader";
import { PortfolioForm } from "@/components/portfolio/PortfolioForm";

export default function BuilderPage() {
    const { runOptimization, isLoading, error, pendingTickers, clearPendingTickers } = usePortfolio();

    return (
        <div className="flex flex-col" style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
            <PageHeader
                title="Portfolio Builder"
                subtitle="Configure parameters and generate optimal weights"
                status={{ label: "yfinance connected", active: true }}
            />

            <motion.main
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 overflow-y-auto"
                style={{ padding: "2rem", maxWidth: "520px", margin: "0 auto" }}
            >
                <PortfolioForm
                    onSubmit={(req: PortfolioRequest) => runOptimization(req)}
                    isLoading={isLoading}
                    error={error}
                    mergeTickers={pendingTickers}
                    onMergeComplete={clearPendingTickers}
                />
            </motion.main>
        </div>
    );
}
