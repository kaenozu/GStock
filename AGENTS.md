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
- Client components: Start with `'use client'` directive
- Define prop interfaces: `interface ComponentProps { ... }`
- Use CSS Modules: `import styles from './Component.module.css'`
- Prefer functional components with hooks
- Destructure props in function signature

### API Routes (App Router)
- Location: `src/app/api/[route]/route.ts`
- Export named handlers: `export const GET = ...`, `export const POST = ...`
- Use middleware: `withAuth`, `withStockCache`, `rateLimit`
- Validate input early and return 400/429/500 responses
- Use `NextRequest`, `NextResponse` types from `next/server`

### File Organization
- `src/types/` - Type definitions
- `src/lib/` - Core business logic (api, agents, accuracy, trading)
- `src/components/` - React components organized by feature
- `src/hooks/` - Custom React hooks
- `src/app/api/` - Next.js API routes
- `src/app/` - App Router pages and layouts

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
