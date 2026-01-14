import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || '';

// Define the interface for the analysis result
export interface SentimentAnalysis {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    score: number; // 0 to 100
    summary: string;
}

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        if (!API_KEY) {
            console.warn('GEMINI_API_KEY is not set. Gemini Service will fail if called.');
        }
        this.genAI = new GoogleGenerativeAI(API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }

    async analyzeSentiment(symbol: string, newsText: string): Promise<SentimentAnalysis> {
        if (!API_KEY) {
            // Mock response if no key for dev/demo purposes
            return {
                sentiment: 'NEUTRAL',
                score: 50,
                summary: 'API Key missing. Returning neutral placeholder.'
            }
        }

        const prompt = `
      You are a senior financial analyst.
      Analyze the following recent news headlines/summaries for the stock ticker "${symbol}".
      
      News Data:
      """
      ${newsText}
      """
      
      Task:
      - Determine the overall market sentiment for this stock based on the news.
      - specificy sentiment as 'BULLISH', 'BEARISH', or 'NEUTRAL'.
      - Assign a confidence score from 0 (Extremely Bearish) to 100 (Extremely Bullish), where 50 is Neutral.
      - Provide a concise 1-sentence summary of the key driver.

      Output strictly valid JSON with the following structure:
      {
        "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
        "score": number,
        "summary": "string"
      }
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean up markdown code blocks if present
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

            const data = JSON.parse(jsonString) as SentimentAnalysis;
            return data;
        } catch (error) {
            console.error('Gemini Analysis Failed:', error);
            // Fallback
            return {
                sentiment: 'NEUTRAL',
                score: 50,
                summary: 'Failed to analyze news data.'
            };
        }
    }
}

export const geminiService = new GeminiService();
