import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        // Yahoo Finance Query API v8 (Chart API) を直接利用
        // range: 6mo (6ヶ月分), interval: 1d
        const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=6mo`;

        console.log(`Fetching Yahoo Finance data for ${symbol}: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Yahoo Finance API responded with status ${response.status}`);
        }

        const data = await response.json();
        const result = data.chart.result[0];

        if (!result) {
            throw new Error('No data found in Yahoo Finance response');
        }

        const timestamps = result.timestamp;
        const quote = result.indicators.quote[0];

        if (!timestamps || !quote) {
            // 取引データがない場合（休日など）
            return NextResponse.json([]);
        }

        // Alpha Vantage形式 (StockDataPoint[]) に変換
        const formattedData = timestamps.map((ts: number, index: number) => {
            // データの欠損チェック
            if (quote.open[index] === null) return null;

            return {
                // UNIX timestamp (sec) -> ISO Date string (YYYY-MM-DD)
                time: new Date(ts * 1000).toISOString().split('T')[0],
                open: requestRound(quote.open[index]),
                high: requestRound(quote.high[index]),
                low: requestRound(quote.low[index]),
                close: requestRound(quote.close[index]),
            };
        }).filter((item: any) => item !== null);

        // 新しい順（降順）にソート（APIは古い順で来る）
        formattedData.reverse();

        return NextResponse.json(formattedData);

    } catch (error) {
        console.error(`Yahoo Finance Direct API Error for ${symbol}:`, error);
        return NextResponse.json({ error: 'Failed to fetch data', details: String(error) }, { status: 500 });
    }
}

// 小数点2位で丸めるヘルパー
function requestRound(num: number): number {
    return Math.round(num * 100) / 100;
}
