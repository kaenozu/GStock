import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/llm/gemini';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';

const finnhub = new FinnhubProvider();

export async function POST(req: NextRequest) {
    try {
        const { symbol } = await req.json();

        if (!symbol) {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        // 1. Fetch News
        const newsItems = await finnhub.fetchCompanyNews(symbol);

        if (newsItems.length === 0) {
            return NextResponse.json({
                sentiment: 'NEUTRAL',
                score: 50,
                summary: 'No recent news found for this stock.'
            });
        }

        // 2. Prepare context for LLM (Take top 10 most recent)
        const recentNews = newsItems.slice(0, 10).map((item: any) => {
            return `- ${item.headline} (${new Date(item.datetime * 1000).toLocaleDateString()}): ${item.summary}`;
        }).join('\n');

        // 3. Analyze with Gemini
        const analysis = await geminiService.analyzeSentiment(symbol, recentNews);

        return NextResponse.json(analysis);

    } catch (error: any) {
        console.error('News Analysis Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
