# GStock: Grand Unified Roadmap (The Council's Decree)

*Ratified by the Council of Ten (Alpha, Omega, Trader, Quant, Hacker, et al.)*

## 🧭 Philosophy
> **Alpha (Visionary)**: "We have awakened the eye (Regime) and the reflex (Auto-Tuning). Now we build the brain."
> **Trader (Pragmatist)**: "Real data only. No toys. We trade to win."
> **Omega (Guardian)**: "Complexity implies risk. The Council must vote to ensure safety."

---

## ✅ Phase 1: The Foundation (UI & Stability)
**Status: Complete**
- [x] **Neural Monitor v2.0**: Graphical visualization of AI logic.
- [x] **Refactored Dashboard**: `SignalCard`, `SignalGrid` architecture.
- [x] **CI/CD Pipeline**: 100% Type Safety & Test Coverage.

## ✅ Phase 4: Cognitive Awakening (The Eye)
**Status: Complete**
- [x] **Market Regime Detector**:
    - Identifies `BULL`, `BEAR`, `SIDEWAYS`, `VOLATILE`, `SQUEEZE`.
- [x] **Real-Data Hardening**:
    - **Yahoo Finance v8 Proxy**: Replaced unreliable APIs with robust raw fetch.
    - **Mock Data Elimination**: Fallback only.

## ✅ Phase 5: Adaptive Autonomy (The Reflex)
**Status: Complete**
- [x] **Auto-Tuning Engine**:
    - **Regime-Aware Grid Search**:
        - *Volatile*: Defensive (Buy > 80%).
        - *Bull*: Aggressive (Buy > 55%).
    - Automatic parameter optimization based on historical backtest.

---

## ✅ Phase 7: The Council of Algorithms (The Brain)
**Status: Complete**
- [x] **Agent Specialization**: Trend, Reversal, Volatility.
- [x] **Consensus Logic**: Weighted Voting System.

## ✅ Phase 8: The Iron Dome (Execution)
**Status: Complete**
- [x] **Circuit Breakers**: Safety Locks.
- [x] **Paper Trading Engine**: Virtual Portfolio.
- [x] **Dashboard V2**: Componentized & Stabilized UI.

## ✅ Phase 10: Deep Backtesting (Strategy Explorer)
**Status: Complete**
- [x] **Historic Data Loader**: Fetch & Cache 1-5 years of data.
- [x] **Agent Arena**: Pit agents against each other.
- [x] **Deep Analysis**: Drawdown, Sharpe Ratio, Profit Factor.

## 💤 Phase 11: Omni-Channel Notifications
**Status: Skipped (User Decision)**
- [ ] Webhook Integration.

## ✅ Phase 14: Data Reliability (The Sensory System)
**Status: Complete**
- [x] **Hybrid Provider System**: Finnhub (API) + Yahoo (Fallback).
- [x] **Smart Caching**: `withStockCache` middleware for reduced API usage.
- [x] **Broker Integration readiness**: Clean `StockProvider` architecture.

## ✅ Phase 13: Live Execution Bridge (The Hand)
**Status: Complete**
- [x] **Broker Adapter Pattern**: Interface for generic execution.
- [x] **Alpaca Integration**: Live/Paper trading capability via REST API.
- [x] **Switch**: Toggle between `Internal Paper` and `Alpaca`.

## ✅ Phase 15: Fundamental Intelligence (The Third Eye)
**Status: Complete**
- [x] **Fundamental Agent**: Analysis of EPS, Revenue, and P/E.
- [x] **Financials Panel**: Dashboard display of key metrics.

## ✅ Phase 17: Earnings Tracker (The Oracle)
**Status: Complete**
- [x] **Earnings Panel**: Display next earnings date with countdown.
- [x] **Historical EPS**: Show past 4 quarters of EPS actual vs estimate.
- [x] **Surprise Indicator**: Visual indicator for beat/miss.
- [x] **Finnhub Integration**: Real earnings data with mock fallback.

## ✅ Phase 18: Prediction Accuracy System (The Mirror)
**Status: Complete**
- [x] **AccuracyPanel**: Display hit rate, bullish/bearish accuracy.
- [x] **PredictionLogger**: Store predictions for later evaluation.
- [x] **AccuracyCalculator**: Compute metrics (hit rate, calibration, regime breakdown).
- [x] **Confidence Calibration**: Compare predicted confidence vs actual accuracy.
- [x] **Regime Analysis**: Track accuracy by market regime (BULL, BEAR, VOLATILE, etc.).

## ✅ Phase 19: The Nervous System (Automation & Alerts)
**Status: Complete**
- [x] **Prediction Auto-Recording**: Automatic logging on signal generation.
- [x] **Auto-Evaluation**: Evaluate pending predictions on page load.
- [x] **Browser Notifications**: Alert on BUY/SELL signal changes.
- [x] **Alert Settings Panel**: Configure notifications (on/off, sound, min confidence).
- [x] **Duplicate Prevention**: Skip same symbol/day recordings.

## 🔄 Phase 20A: Stabilization Sprint
**Status: In Progress**
- [x] **UI/UX Tabbed Layout**: Right panel reorganized into Market/Trade/Config tabs.
- [x] **Mobile Responsive**: Tab icons on mobile, improved layout.
- [x] **Security Audit**: API keys confirmed in environment variables.
- [x] **Skeleton Loaders**: Loading states for SignalCard, TradingPanel, FinancialsPanel.
- [x] **Toast Notifications**: Error/success feedback using Sonner library.
- [x] **Japanese Stock Fix**: `validateSymbol()` updated for numeric prefixes (7203.T, 9984.T).
- [ ] **Accuracy Data Collection**: 2-week observation period.
- [ ] **Error Logging Enhancement**: Centralized error collection.

## 📋 Phase 20B: Intelligence Expansion (Pending)
**Timeline: After 2-week data collection**
- [ ] **Insider Sentiment**: Track CEO/CFO buying activity (SEC Form 4).
- [ ] **WebSocket Support**: Real-time data streaming.
- [ ] **Model Tuning**: Based on accuracy analysis.

## 🌌 Phase 16: G-DAO (Infinite Scale)
**Timeline: 2028+**
- [ ] **Strategy Staking**: Tokenized strategy bets.

---
> *Status Update: The system runs on Real Data + Algorithms. No LLMs are currently planned to ensure maximum speed and reliability.*
