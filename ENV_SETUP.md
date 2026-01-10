# Environment Variables Setup

## 🚀 Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` with your values:**
   ```env
   API_KEY=your-production-api-key
   NODE_ENV=production
   SKIP_AUTH=false
   ```

## 🔑 API Key Generation

Generate a secure API key:
```bash
# Using openssl
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📋 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|----------|-----------|
| `API_KEY` | Authentication key for API endpoints | - | ✅ Production |
| `NODE_ENV` | Environment mode | `development` | ❌ |
| `SKIP_AUTH` | Skip authentication in dev | `false` | ❌ |
| `ALPHA_VANTAGE_API_KEY` | External data API key | - | ❌ |
| `STOCK_RATE_LIMIT` | Stock API requests/minute | `100` | ❌ |
| `TRADE_RATE_LIMIT` | Trade API requests/minute | `50` | ❌ |
| `BACKTEST_RATE_LIMIT` | Backtest API requests/minute | `20` | ❌ |

## 🏗️ Environment Modes

### Development
```env
NODE_ENV=development
SKIP_AUTH=false  # Set to 'true' to completely skip auth
API_KEY=dev-key-12345
```

### Production
```env
NODE_ENV=production
SKIP_AUTH=false  # Must be 'false' for security
API_KEY=your-super-secure-production-key
```

## 🔒 Security Notes

- **Never commit `.env.local` to version control**
- **Use strong, random API keys**
- **Rotate API keys regularly**
- **Use different keys for different environments**

## 🚦 Rate Limiting

Default rate limits by endpoint:
- `/api/stock`: 100 requests/minute
- `/api/trade`: 50 requests/minute  
- `/api/backtest-history`: 20 requests/minute

## 📝 Deployment

### Vercel
Set environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add each variable with appropriate values
3. Redeploy

### Docker
```bash
docker run -e API_KEY=your-key -e NODE_ENV=production gstock
```

## 🔍 Validation

The application will validate required environment variables on startup and fail fast if critical ones are missing.