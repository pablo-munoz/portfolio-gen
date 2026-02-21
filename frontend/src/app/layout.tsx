import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Ares — AI Portfolio Engine",
  description:
    "Real-time AI-powered portfolio generation and risk management. Mean-Variance Optimization, Efficient Frontier, and VaR analytics.",
  keywords: ["portfolio", "optimization", "finance", "investment", "risk management"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          <Sidebar />
          <main className="main-layout">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
