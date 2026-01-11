import { Agent, AgentResult } from './types';
import { StockDataPoint, MarketRegime } from '@/types/market';

export class NewsSentimentAgent implements Agent {
    id = 'news_sentiment_agent';
    name = 'News Sentiment Analyzer';
    role: Agent['role'] = 'SENTIMENT';

    private positiveKeywords = [
        'beat', 'exceeds', 'strong', 'growth', 'rise', 'increase', 'surge',
        'rally', 'bullish', 'upward', 'positive', 'optimistic', 'record',
        'breakthrough', 'innovation', 'partnership', 'expansion', 'profit',
        'gain', 'outperform', 'upgrade', 'recommend', 'buy'
    ];

    private negativeKeywords = [
        'miss', 'below', 'weak', 'decline', 'fall', 'decrease', 'drop',
        'plunge', 'bearish', 'downward', 'negative', 'pessimistic', 'concern',
        'risk', 'challenge', 'struggle', 'loss', 'underperform', 'downgrade',
        'sell', 'recession', 'inflation', 'rate hike', 'cut', 'layoff'
    ];

    analyze(data: StockDataPoint[], marketRegime?: MarketRegime, newsData?: string[]): AgentResult {
        if (!newsData || newsData.length === 0) {
            return this.neutralResult("No news data available");
        }

        let score = 0;
        const reasons: string[] = [];
        let totalKeywords = 0;

        newsData.forEach((news, index) => {
            const newsLower = news.toLowerCase();
            let newsScore = 0;
            const newsKeywords: string[] = [];

            this.positiveKeywords.forEach(keyword => {
                if (newsLower.includes(keyword)) {
                    newsScore += 1;
                    newsKeywords.push(keyword);
                    totalKeywords++;
                }
            });

            this.negativeKeywords.forEach(keyword => {
                if (newsLower.includes(keyword)) {
                    newsScore -= 1;
                    newsKeywords.push(keyword);
                    totalKeywords++;
                }
            });

            if (newsScore !== 0) {
                const sentiment = newsScore > 0 ? 'positive' : 'negative';
                reasons.push(`News ${index + 1}: ${sentiment} (${newsScore}, ${newsKeywords.join(', ')})`);
                score += newsScore;
            }
        });

        if (totalKeywords === 0) {
            return this.neutralResult("No sentiment keywords found in news");
        }

        const avgScore = score / Math.max(newsData.length, 1);
        const confidence = Math.min(Math.abs(avgScore) * 10, 100);

        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

        if (avgScore >= 1.5) {
            signal = 'BUY';
            sentiment = 'BULLISH';
        } else if (avgScore <= -1.5) {
            signal = 'SELL';
            sentiment = 'BEARISH';
        }

        return {
            name: this.name,
            role: this.role,
            signal,
            confidence,
            reason: reasons.join('; ') || "Mixed sentiment in news",
            sentiment
        };
    }

    private neutralResult(reason: string): AgentResult {
        return {
            name: this.name,
            role: this.role,
            signal: 'HOLD',
            confidence: 0,
            reason,
            sentiment: 'NEUTRAL'
        };
    }

    getPositiveKeywords(): string[] {
        return [...this.positiveKeywords];
    }

    getNegativeKeywords(): string[] {
        return [...this.negativeKeywords];
    }

    addPositiveKeyword(keyword: string): void {
        this.positiveKeywords.push(keyword.toLowerCase());
    }

    addNegativeKeyword(keyword: string): void {
        this.negativeKeywords.push(keyword.toLowerCase());
    }
}
