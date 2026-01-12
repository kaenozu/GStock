/**
 * SymbolSearch - 銀柄検索コンポーネント
 * @description ティッカーシンボルで銀柄を検索
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Search, X, Plus, TrendingUp, Clock } from 'lucide-react';
import styles from './SymbolSearch.module.css';

/** 人気の銀柄リスト */
const POPULAR_SYMBOLS = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'AMD', name: 'AMD Inc.' },
    { symbol: 'NFLX', name: 'Netflix Inc.' },
    { symbol: 'COIN', name: 'Coinbase Global' },
    { symbol: 'UBER', name: 'Uber Technologies' },
    { symbol: 'SPOT', name: 'Spotify Technology' },
    { symbol: 'SQ', name: 'Block Inc.' },
    { symbol: 'PYPL', name: 'PayPal Holdings' },
    { symbol: 'CRM', name: 'Salesforce Inc.' },
    { symbol: 'INTC', name: 'Intel Corp.' },
    { symbol: 'BA', name: 'Boeing Co.' },
    { symbol: 'DIS', name: 'Walt Disney Co.' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase' },
];

interface SymbolSearchProps {
    onSelect: (symbol: string) => void;
    watchlist: string[];
    onAddToWatchlist: (symbol: string) => void;
    recentSearches?: string[];
}

export const SymbolSearch: React.FC<SymbolSearchProps> = ({
    onSelect,
    watchlist,
    onAddToWatchlist,
    recentSearches = []
}) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 検索結果のフィルタリング
    const filteredSymbols = useMemo(() => {
        if (!query.trim()) {
            return POPULAR_SYMBOLS.slice(0, 10);
        }
        
        const lowerQuery = query.toLowerCase();
        return POPULAR_SYMBOLS.filter(
            s => s.symbol.toLowerCase().includes(lowerQuery) ||
                 s.name.toLowerCase().includes(lowerQuery)
        ).slice(0, 10);
    }, [query]);

    // クリック外で閉じる
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // キーボードナビゲーション
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        } else if (e.key === 'Enter' && query.trim()) {
            // 入力されたシンボルを直接選択
            const upperSymbol = query.toUpperCase().trim();
            onSelect(upperSymbol);
            setQuery('');
            setIsOpen(false);
        }
    }, [query, onSelect]);

    const handleSelect = useCallback((symbol: string) => {
        onSelect(symbol);
        setQuery('');
        setIsOpen(false);
    }, [onSelect]);

    const handleAddToWatchlist = useCallback((e: React.MouseEvent, symbol: string) => {
        e.stopPropagation();
        onAddToWatchlist(symbol);
    }, [onAddToWatchlist]);

    const clearQuery = useCallback(() => {
        setQuery('');
        inputRef.current?.focus();
    }, []);

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.inputWrapper}>
                <Search className={styles.searchIcon} size={16} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="銀柄を検索 (AAPL, NVDA...)"
                    className={styles.input}
                    aria-label="銀柄検索"
                    autoComplete="off"
                />
                {query && (
                    <button
                        className={styles.clearButton}
                        onClick={clearQuery}
                        aria-label="クリア"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {isOpen && (
                <div className={styles.dropdown}>
                    {/* 最近の検索 */}
                    {recentSearches.length > 0 && !query && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <Clock size={12} />
                                <span>最近の検索</span>
                            </div>
                            <div className={styles.recentList}>
                                {recentSearches.slice(0, 5).map(symbol => (
                                    <button
                                        key={symbol}
                                        className={styles.recentItem}
                                        onClick={() => handleSelect(symbol)}
                                    >
                                        {symbol}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 検索結果 */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <TrendingUp size={12} />
                            <span>{query ? '検索結果' : '人気の銀柄'}</span>
                        </div>
                        <ul className={styles.resultList}>
                            {filteredSymbols.map(({ symbol, name }) => (
                                <li
                                    key={symbol}
                                    className={styles.resultItem}
                                    onClick={() => handleSelect(symbol)}
                                >
                                    <div className={styles.symbolInfo}>
                                        <span className={styles.symbol}>{symbol}</span>
                                        <span className={styles.name}>{name}</span>
                                    </div>
                                    <button
                                        className={`${styles.addButton} ${watchlist.includes(symbol) ? styles.added : ''}`}
                                        onClick={(e) => handleAddToWatchlist(e, symbol)}
                                        aria-label={watchlist.includes(symbol) ? 'ウォッチリストに追加済み' : 'ウォッチリストに追加'}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 直接入力のヒント */}
                    {query && (
                        <div className={styles.hint}>
                            Enterキーで「{query.toUpperCase()}」を直接検索
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SymbolSearch;
