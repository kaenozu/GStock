
import { NewsSentimentAgent } from './src/lib/agents/NewsSentimentAgent';

const agent = new NewsSentimentAgent();
const newsData = [
    "Company reports strong earnings growth, beating expectations",
    "Tech sector sees significant growth in Q4",
    "Analysts upgrade stock rating to buy",
    "Positive regulatory environment supports business expansion"
];

// Mock data (not used for news analysis but required by interface)
const data = Array.from({ length: 50 }, (_, i) => ({
    time: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: 100, high: 105, low: 95, close: 102
}));

const result = agent.analyze(data, undefined, newsData);
console.log("Final Result:", result);
