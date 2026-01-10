import React from 'react';
import { Globe, Star } from 'lucide-react';

interface MarketRankingItem {
  symbol: string;
  profit: number;
  winRate: number;
  confidence: number;
  price: number;
  updatedAt: number;
}

interface MarketRankingProps {
  sortedRanking: MarketRankingItem[];
  watchlist: { symbol: string }[];
  onSymbolClick: (symbol: string) => void;
  onToggleWatchlist: (symbol: string) => void;
  styles: Record<string, string>;
}

export const MarketRanking: React.FC<MarketRankingProps> = ({
  sortedRanking,
  watchlist,
  onSymbolClick,
  onToggleWatchlist,
  styles
}) => {
  return (
    <div className={styles.allStocksContainer}>
      <div className={styles.allStocksHeader}>
        <Globe size={14} /> AI推奨ポートフォリオ (期待値順)
      </div>
      <div className={styles.allStocksGrid}>
        {sortedRanking.map((item) => {
          const symbol = item.symbol;
          const isAnalyzed = item.profit !== -999;
          const isWatched = watchlist.some(w => w.symbol === symbol);
          
          return (
            <div key={symbol} className={styles.stockCard} style={{ order: isAnalyzed ? 0 : 1 }}>
              <div
                className={styles.stockName}
                onClick={() => onSymbolClick(symbol)}
              >
                <div>{symbol}</div>
                {isAnalyzed && (
                  <div style={{ fontSize: '0.7rem', color: item.profit > 0 ? '#10b981' : '#ef4444' }}>
                    Exp: {item.profit > 0 ? '+' : ''}{item.profit}%
                  </div>
                )}
              </div>
              <button
                className={`${styles.addWatchButton} ${isWatched ? styles.watched : ''}`}
                onClick={() => onToggleWatchlist(symbol)}
              >
                <Star size={14} fill={isWatched ? "currentColor" : "none"} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarketRanking;
