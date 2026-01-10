import React from 'react';
import { Star, Globe } from 'lucide-react';
import styles from '@/app/page.module.css';
import { WatchListItem } from '@/types/market';

interface WatchListProps {
    watchlist: WatchListItem[];
    allSymbols: string[];
    onSelectSymbol: (symbol: string) => void;
    onToggleWatch: (symbol: string) => void;
}

export const WatchList: React.FC<WatchListProps> = React.memo(({ watchlist, allSymbols, onSelectSymbol, onToggleWatch }) => {
    return (
        <div className={styles.watchlistContainer}>
            <div className={styles.watchlistTitle}>
                <Star size={12} fill="currentColor" /> ウォッチリスト
            </div>

            {/* Watchlist Items */}
            {watchlist.length > 0 ? (
                <div className={styles.watchlistGrid}>
                    {watchlist.map((item) => (
                        <div key={item.symbol} className={styles.watchItem} onClick={() => onSelectSymbol(item.symbol)}>
                            <div className={styles.watchSymbol}>{item.symbol}</div>
                            <div className={styles.watchStats}>
                                <span>${item.price.toFixed(2)}</span>
                                <span className={item.sentiment === 'BULLISH' ? styles.bullText : item.sentiment === 'BEARISH' ? styles.bearText : ''}>
                                    {item.sentiment === 'BULLISH' ? '▲' : item.sentiment === 'BEARISH' ? '▼' : '-'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem', textAlign: 'center' }}>
                    ウォッチリストは空です
                </div>
            )}

            {/* Global Market List */}
            <div className={styles.allStocksHeader} style={{ marginTop: '2rem' }}>
                <Globe size={14} /> 全監視銘柄リスト
            </div>
            <div className={styles.allStocksGrid}>
                {allSymbols.map((symbol) => {
                    const isWatched = watchlist.some(w => w.symbol === symbol);
                    return (
                        <div key={symbol} className={styles.stockCard}>
                            <div
                                className={styles.stockName}
                                onClick={() => onSelectSymbol(symbol)}
                            >
                                {symbol}
                            </div>
                            <button
                                className={`${styles.addWatchButton} ${isWatched ? styles.watched : ''}`}
                                onClick={() => onToggleWatch(symbol)}
                            >
                                <Star size={14} fill={isWatched ? "currentColor" : "none"} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
);
});
