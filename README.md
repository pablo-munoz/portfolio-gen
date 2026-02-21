# Ares — AI Portfolio Engine

## Monorepo Structure
```
portfolio-gen/
├── frontend/     # Next.js 15 · TypeScript · Tailwind · Recharts
└── backend/      # FastAPI · PyPortfolioOpt · yfinance · Pandas
```

## Quick Start

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:3000

## Mathematical Core
- **Mean-Variance Optimization (MVO)** — Tangency Portfolio via Max Sharpe
- **Ledoit-Wolf Shrinkage** — Noise-reduced covariance estimation
- **Efficient Frontier** — 30-point risk/return sweep
- **Value at Risk (VaR 95%)** — Parametric, daily & annual
- **Buy-and-Hold Backtest** — vs. SPY benchmark over the selected horizon
