/**
 * Tooltip - ツールチップコンポーネント
 * @description ホバー時に説明を表示
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './Tooltip.module.css';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 300
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const showTooltip = useCallback(() => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    }, [delay]);

    const hideTooltip = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={styles.container}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}
            {isVisible && (
                <div
                    className={`${styles.tooltip} ${styles[position]}`}
                    role="tooltip"
                >
                    {content}
                    <div className={styles.arrow} />
                </div>
            )}
        </div>
    );
};

/**
 * TermWithTooltip - 用語にツールチップを付けるコンポーネント
 */
const TERM_DEFINITIONS: Record<string, string> = {
    'シャープレシオ': 'リスク調整後リターン。1以上なら良好。2以上なら優秀。',
    '分散度': 'ポートフォリオの分散度合い。1に近いほど分散されている。',
    'RSI': '相対力指数。30以下は売られ過ぎ、70以上は買われ過ぎ。',
    'ADX': '平均方向性指数。25以上は強いトレンドを示す。',
    '信頼度': 'AIがこのシグナルにどれだけ自信があるかを示す。',
};

interface TermWithTooltipProps {
    term: string;
    children: React.ReactNode;
}

export const TermWithTooltip: React.FC<TermWithTooltipProps> = ({ term, children }) => {
    const definition = TERM_DEFINITIONS[term] || `${term}についての説明`;
    return (
        <Tooltip content={definition}>
            <span style={{ borderBottom: '1px dotted var(--text-muted)', cursor: 'help' }}>
                {children}
            </span>
        </Tooltip>
    );
};

export default Tooltip;
