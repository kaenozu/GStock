
import fs from 'fs';
import path from 'path';

// --- Types ---

type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Professional' | 'Institutional';
type InvestmentStyle = 'Day Trader' | 'Swing Trader' | 'Long-term Investor' | 'Quant' | 'Gambler';
type TechSavviness = 'Low' | 'Medium' | 'High';

interface Persona {
    id: number;
    age: number;
    occupation: string;
    experience: ExperienceLevel;
    style: InvestmentStyle;
    techSavviness: TechSavviness;
    assets: number; // in JPY
}

interface Feedback {
    personaId: number;
    category: 'Feature Request' | 'UX/UI' | 'Performance' | 'Bug' | 'Other';
    content: string;
    sentiment: 'Positive' | 'Neutral' | 'Negative';
}

// --- Generators ---

const Occupations = ['Engineer', 'Student', 'Salaryman', 'Doctor', 'Retired', 'Finance Pro', 'Artist', 'Freelancer'];

function getRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generatePersona(id: number): Persona {
    const age = Math.floor(Math.random() * 60) + 18; // 18-78
    const experience: ExperienceLevel =
        age < 25 ? (Math.random() > 0.8 ? 'Intermediate' : 'Beginner') :
            age > 50 ? (Math.random() > 0.5 ? 'Professional' : 'Beginner') :
                getRandomElement(['Beginner', 'Intermediate', 'Professional', 'Beginner'] as ExperienceLevel[]);
    // skewed towards beginner

    const style: InvestmentStyle = getRandomElement(['Day Trader', 'Swing Trader', 'Long-term Investor', 'Quant', 'Gambler']);

    // Wealth distribution (log-normal approximation)
    const baseWealth = 1000000; // 1M JPY
    const wealth = Math.floor(baseWealth * Math.pow(10, Math.random() * 3));

    return {
        id,
        age,
        occupation: getRandomElement(Occupations),
        experience,
        style,
        techSavviness: getRandomElement(['Low', 'Medium', 'High']),
        assets: wealth
    };
}

// --- Simulation Logic ---

function interview(persona: Persona): Feedback {
    // Logic to determine feedback based on persona

    // 1. Beginners often struggle with UI complexity or jargon
    if (persona.experience === 'Beginner') {
        if (Math.random() > 0.6) {
            return {
                personaId: persona.id,
                category: 'UX/UI',
                content: '専門用語が多すぎて難しい。「RSI」とか「MACD」とか解説がほしい。',
                sentiment: 'Negative'
            };
        }
        if (Math.random() > 0.6) {
            return {
                personaId: persona.id,
                category: 'Feature Request',
                content: 'チュートリアルモードか、初心者向けのガイドツアーがもっと充実してほしい。',
                sentiment: 'Neutral'
            };
        }
    }

    // 2. Day Traders want speed, hotkeys, and real-time data
    if (persona.style === 'Day Trader') {
        if (Math.random() > 0.5) {
            return {
                personaId: persona.id,
                category: 'Feature Request',
                content: '板情報（気配値）が見たい。歩み値もないとデイトレできない。',
                sentiment: 'Negative'
            };
        }
        if (Math.random() > 0.5) {
            return {
                personaId: persona.id,
                category: 'Feature Request',
                content: 'キーボードショートカットで発注できるようにしてほしい。クリックだと遅い。',
                sentiment: 'Neutral'
            };
        }
    }

    // 3. Long-term investors care about dividends and tax
    if (persona.style === 'Long-term Investor') {
        if (Math.random() > 0.5) {
            return {
                personaId: persona.id,
                category: 'Feature Request',
                content: '配当金の管理機能が足りない。予想配当利回りと権利落ち日をカレンダーで見たい。',
                sentiment: 'Neutral'
            };
        }
        if (Math.random() > 0.5) {
            return {
                personaId: persona.id,
                category: 'Feature Request',
                content: '確定申告用に、年間の損益報告書をPDFで出力する機能が必須。',
                sentiment: 'Negative'
            };
        }
    }

    // 4. Quants want API and backtesting power
    if (persona.style === 'Quant' || persona.techSavviness === 'High') {
        if (Math.random() > 0.5) {
            return {
                personaId: persona.id,
                category: 'Feature Request',
                content: 'Python APIを提供してほしい。自作のアルゴリズムを接続したい。',
                sentiment: 'Neutral'
            };
        }
        if (Math.random() > 0.5) {
            return {
                personaId: persona.id,
                category: 'Feature Request',
                content: 'バックテストのデータをCSVでエクスポートさせてほしい。詳細な分析をしたい。',
                sentiment: 'Neutral'
            };
        }
    }

    // 5. General / Mobile / Social
    const rand = Math.random();
    if (rand < 0.1) {
        return {
            personaId: persona.id,
            category: 'Feature Request',
            content: 'スマホアプリ版（Native）がないと通知に気づかない。プッシュ通知がもっとリッチだといい。',
            sentiment: 'Negative'
        };
    }
    if (rand < 0.2) {
        return {
            personaId: persona.id,
            category: 'Feature Request',
            content: '暗号資産（クリプト）も同じ画面で管理したい。株だけだと不便。',
            sentiment: 'Neutral'
        };
    }
    if (rand < 0.3) {
        return {
            personaId: persona.id,
            category: 'Feature Request',
            content: '他のユーザーが何を買ってるか知りたい。ランキングとかSNS機能がほしい。',
            sentiment: 'Neutral'
        };
    }
    if (rand < 0.4) {
        return {
            personaId: persona.id,
            category: 'Feature Request',
            content: '米国株の取り扱い銘柄をもっと増やしてほしい。',
            sentiment: 'Neutral'
        };
    }

    // Default fallback
    return {
        personaId: persona.id,
        category: 'Other',
        content: '全体的に良いけど、もっとAIの判断根拠を言葉で説明してほしい。なぜ買ったのかわからないときがある。',
        sentiment: 'Positive'
    };
}

// --- Main Execution ---

async function main() {
    console.log('Generating 1000 user personas...');
    const personas: Persona[] = [];
    for (let i = 0; i < 1000; i++) {
        personas.push(generatePersona(i));
    }

    console.log('Conducting interviews...');
    const feedbackList: Feedback[] = [];
    for (const p of personas) {
        feedbackList.push(interview(p));
    }

    // Aggregation
    const feedbackCounts: Record<string, number> = {};

    feedbackList.forEach(f => {
        const key = f.content; // Group by exact text for now (simplified clustering)
        feedbackCounts[key] = (feedbackCounts[key] || 0) + 1;
    });

    // Sort by frequency
    const sortedFeedback = Object.entries(feedbackCounts).sort((a, b) => b[1] - a[1]);

    console.log('\n=== SIMULATION RESULTS ===');
    console.log(`Total Interviewed: ${personas.length}`);

    console.log('\n--- Demographics ---');
    const styleCounts: Record<string, number> = {};
    personas.forEach(p => styleCounts[p.style] = (styleCounts[p.style] || 0) + 1);
    console.log('Investment Styles:', styleCounts);

    const expCounts: Record<string, number> = {};
    personas.forEach(p => expCounts[p.experience] = (expCounts[p.experience] || 0) + 1);
    console.log('Experience Levels:', expCounts);

    console.log('\n--- Top 10 Requested Features / Complaints ---');
    sortedFeedback.slice(0, 10).forEach(([content, count], index) => {
        console.log(`${index + 1}. [${count} votes] ${content}`);
    });

    // Write detailed report
    const reportPath = path.join(process.cwd(), 'user_simulation_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        demographics: { styleCounts, expCounts },
        topFeedback: sortedFeedback.slice(0, 20).map(([c, n]) => ({ content: c, count: n })),
        rawFeedbackSample: feedbackList.slice(0, 50)
    }, null, 2));
    console.log(`\nDetailed report saved to ${reportPath}`);
}

main().catch(console.error);
