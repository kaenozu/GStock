# GStock - AI-Powered Trading Platform

GStock is an advanced stock trading platform powered by multiple AI agents, real-time data analysis, and intelligent portfolio management.

## Features

### Core Trading Features
- **Multi-Agent AI Analysis**: 10+ specialized AI agents analyzing market data
- **Real-Time Price Updates**: WebSocket integration with Finnhub API
- **Technical Indicators**: RSI, MACD, Bollinger Bands, ADX, Stochastic, CCI
- **Market Regime Detection**: Automatic bull/bear/sideways market identification
- **Backtesting**: Historical strategy testing with detailed metrics
- **Auto-Trade**: Paper trading and live trading execution

### Portfolio Management
- **Advanced Analytics**: VaR, Sharpe Ratio, Sortino Ratio, Calmar Ratio
- **Automated Rebalancing**: Smart portfolio rebalancing with tax optimization
- **Tax-Loss Harvesting**: Automated tax-efficient loss harvesting
- **Exposure Analysis**: Sector and geographic exposure tracking
- **Performance Reporting**: Comprehensive performance reports with export options
- **Custom Strategy Builder**: Build and backtest custom trading strategies

### Risk Management
- **Real-Time Risk Monitoring**: Portfolio health tracking with alerts
- **Position Sizing**: Risk-adjusted position sizing
- **Stop Loss/Take Profit**: Automated risk management
- **Concentration Alerts**: Multi-level warning system
- **Enhanced Risk Dashboard**: Advanced risk metrics and controls

### User Experience
- **Comprehensive Glossary**: 28+ financial terms with categorization
- **Onboarding System**: Interactive first-time user guide
- **Responsive Design**: Mobile-optimized interface
- **Dark Mode**: Theme customization
- **Multi-Language Support**: Japanese UI with English codebase

## Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, or pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Vercel Web Push (optional)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key

# Firebase (optional)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gstock.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gstock
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gstock.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef1234567890
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Finnhub API (required for real-time data)
FINNHUB_API_KEY=your_finnhub_api_key
```

### Deployment

#### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

#### Custom Server Deployment
For WebSocket support (real-time data):
1. Deploy to Railway/Fly.io/Heroku
2. Set `FINNHUB_API_KEY` in environment variables
3. Configure custom domain (optional)

## Documentation

- [ROADMAP.md](ROADMAP.md) - Development roadmap and feature planning
- [AGENTS.md](AGENTS.md) - AI agent implementation guidelines
- [PORTFOLIO_SYSTEM.md](PORTFOLIO_SYSTEM.md) - Portfolio management documentation

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

## Contributing

Contributions are welcome! Please follow the guidelines in [AGENTS.md](AGENTS.md).

## License

MIT License - see LICENSE file for details.
