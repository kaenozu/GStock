# GStock - Agent Guidelines

## Build, Lint, Test Commands

### Development
- `npm run dev` - Start development server (Next.js)
- `npm run build` - Production build
- `npm start` - Start production server

### Linting
- `npm run lint` - Run ESLint

### Testing
- `npm test` - Run all tests (Vitest)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Open Vitest UI
- `npm run test:load` - Run load tests
- `npm run test:performance` - Run performance tests

#### Running Single Test
Use Vitest filter flags:
- `npm test -t "test name"` - Run tests matching name pattern
- `npm test --run path/to/test.test.ts` - Run specific test file
- `npm test path/to/test.test.ts -t "specific test"` - Combine file and name filter

#### E2E Testing
- `npm test:e2e` - Run Playwright E2E tests
- `npm test:e2e:ui` - Open Playwright UI
- `npm test:e2e:headed` - Run E2E tests with visible browser

Always run lint after making changes: `npm run lint`

## Code Style Guidelines

### Imports
- Third-party imports first, then local imports
- Use absolute imports with `@/*` alias (configured in tsconfig.json)
- Example:
  ```ts
  import { SMA, RSI } from 'technicalindicators';
  import { StockDataPoint } from '@/types/market';
  import { calculateScore } from '@/lib/api/prediction-engine';
  ```

### Formatting & TypeScript
- TypeScript strict mode enabled - always use explicit types
- React Compiler enabled (no manual memoization needed)
- Use `React.FC` for function components with TypeScript interfaces
- Prefer `const` over `let`; use `let` only when reassignment is necessary
- ESLint rules: Some downgraded to warnings during refactoring
- `@typescript-eslint/no-explicit-any`: warn - prefer specific types
- `@typescript-eslint/no-misused-promises`: off - async patterns tolerated

### Naming Conventions
- **Components**: PascalCase - `StockChart`, `Skeleton`
- **Functions**: camelCase - `calculateScore`, `updateBestTrade`
- **Constants**: UPPER_SNAKE_CASE for primitives, PascalCase for objects
  - `MAX_RETRIES = 3`
  - `DEFAULT_CHART_SETTINGS = { ... }`
- **Types/Interfaces**: PascalCase - `StockDataPoint`, `AnalysisResult`
- **Type Aliases for Enums**: PascalCase union types - `'BULLISH' | 'BEARISH' | 'NEUTRAL'`
- **Files**: PascalCase for components, camelCase for utilities - `StockChart.tsx`, `prediction-engine.ts`

### Error Handling
- Always use try-catch in async operations
- Type-check errors: `error instanceof Error`
- Use console.error for debugging with descriptive prefixes: `[ComponentName] Error: ...`
- For API routes: Return NextResponse with appropriate status codes
- Graceful degradation in data fetching (fallback patterns shown in api/stock/route.ts)
- In loops with error handling, use `continue` to skip failed iterations

### Testing
- Use Vitest with `describe`, `it`, `expect`
- Co-locate tests with source files: `filename.test.ts`
- Mock data defined at test file level as constants
- Test both success and error cases
- Handle empty/edge cases explicitly

### React Components
Start with `'use client'`; define prop interfaces; use CSS Modules; prefer functional components with hooks; destructure props

### API Routes (App Router)
Location: `src/app/api/[route]/route.ts`; export named handlers: `GET`, `POST`; use middleware; validate input early

### File Organization
`src/types/` - Type definitions; `src/lib/` - Core logic (api, agents, accuracy, trading); `src/components/` - React components; `src/hooks/` - Custom hooks; `src/app/api/` - API routes; `src/app/` - Pages/layouts

### Language
- Code comments and identifiers in English
- Some Japanese comments exist (legacy) - prefer English for new code
- User-facing text: Japanese (this is a Japanese application)

## Technology Stack
- **Framework**: Next.js 16.1.1 (App Router)
- **UI**: React 19.2.3
- **Styling**: Tailwind CSS v4
- **Charts**: Lightweight Charts, Recharts
- **Testing**: Vitest
- **Technical Analysis**: technicalindicators library

## Agent Implementation Guidelines

### Agent Interface
All agents must implement the `Agent` interface from `src/lib/agents/types.ts`
Required: `id`, `name`, `role`, `analyze(data, regime?)` returning `AgentResult`

### Agent Roles
`CHAIRMAN` - Final decision maker; `TREND` - Follows market trends; `REVERSAL` - Identifies oversold/overbought; `VOLATILE` - Detects volatility; `MULTI_TIMEFRAME` - Cross-timeframe consensus

### Scoring System
Score-based: positive = bullish, negative = bearish; thresholds: `>=30` = BUY, `<=-30` = SELL
Provide descriptive reason strings explaining decisions

### Technical Indicators
Use `technicalindicators` library; custom indicators in `src/lib/api/indicators/`
Handle insufficient data gracefully; signals return: `'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL'`

## Test Data Generation Guidelines

### Market Realism
Continuous trends cause RSI extremes; include pullbacks (30-70 range)
Add noise: `price *= 1 + (Math.random() - 0.5) * volatility`
Example: `price *= 1.002; if (i % 7 === 0) price *= 0.99;`

## Local Storage Usage

Always check for browser context: `if (typeof window === 'undefined') return;`
Use try-catch for quota exceeded errors
Project key prefix: `gstock_` (e.g., `gstock_predictions`, `gstock_last_logged`)

## Pull Request Guidelines

### Commits
Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
Japanese commit messages; reference issues: `Closes #1` or `Refs #123`

### PR Body Template (Japanese)
```markdown
## 概要
簡潔な説明

## 実装内容
- 項目1
- 項目2

## 検証
- ✅ Lint通過、全テストパス (X/X)、TSコンパイル成功
```

### Before Merging
`npm test` (all pass), `npm run lint` (0 errors), single file: `npm test path/to/test.test.ts`
