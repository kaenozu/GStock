import React from 'react';
import { History } from 'lucide-react';
import styles from '@/app/page.module.css';
import { TradeHistoryItem } from '@/types/market';

interface HistoryPanelProps {
    history: TradeHistoryItem[];
}

export const HistoryPanel: React.FC<HistoryPanelProps> = React.memo(function HistoryPanel({ history }) {
    if (history.length === 0) return null;

    return (
        <div className={styles.historySection}>
            <div className={styles.historyTitle}>
                <History size={14} /> 最近のスキャン履歴
            </div>
            <div className={styles.historyList}>
                {history.map((item, idx) => (
                    <div key={idx} className={styles.historyItem}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span className={`${styles.historyTag} ${styles[`tag${item.type}`]}`}>{item.type}</span>
                            <strong>{item.symbol}</strong>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                            {item.time} | 確信度: {item.confidence}%
                        </div>
                    </div>
                ))}
            </div>
        </div>
);
});
