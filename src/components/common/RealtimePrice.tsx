/**
 * RealtimePrice Component
 * @description リアルタイム価格表示（アニメーション付き）
 * @module components/common/RealtimePrice
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface RealtimePriceProps {
    /** 価格 */
    price: number;
    /** 前回の価格（変化表示用） */
    previousPrice?: number;
    /** 通貨記号 */
    currency?: string;
    /** サイズ */
    size?: 'sm' | 'md' | 'lg';
    /** アニメーションを有効にするか */
    animate?: boolean;
}

/** サイズ設定 */
const SIZE_CONFIG = {
    sm: { fontSize: '0.875rem', iconSize: 12 },
    md: { fontSize: '1.125rem', iconSize: 14 },
    lg: { fontSize: '1.5rem', iconSize: 18 },
};

/**
 * リアルタイム価格表示コンポーネント
 */
export const RealtimePrice: React.FC<RealtimePriceProps> = ({
    price,
    previousPrice,
    currency = '$',
    size = 'md',
    animate = true,
}) => {
    const [flash, setFlash] = useState<'up' | 'down' | null>(null);
    const prevPriceRef = useRef(price);
    const config = SIZE_CONFIG[size];

    useEffect(() => {
        if (!animate) return;

        const prev = previousPrice ?? prevPriceRef.current;
        if (price > prev) {
            setFlash('up');
        } else if (price < prev) {
            setFlash('down');
        }

        prevPriceRef.current = price;

        const timer = setTimeout(() => setFlash(null), 500);
        return () => clearTimeout(timer);
    }, [price, previousPrice, animate]);

    const change = previousPrice ? price - previousPrice : 0;
    const changePercent = previousPrice ? ((price - previousPrice) / previousPrice) * 100 : 0;
    const isPositive = change >= 0;

    const flashColor = flash === 'up' ? '#10b981' : flash === 'down' ? '#ef4444' : 'inherit';
    const changeColor = isPositive ? '#10b981' : '#ef4444';

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
            }}
        >
            <span
                style={{
                    fontSize: config.fontSize,
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    color: flash ? flashColor : 'inherit',
                    transition: 'color 0.2s ease',
                    backgroundColor: flash ? `${flashColor}20` : 'transparent',
                    padding: '2px 4px',
                    borderRadius: '4px',
                }}
            >
                {currency}{price.toFixed(2)}
            </span>

            {previousPrice !== undefined && change !== 0 && (
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontSize: `calc(${config.fontSize} * 0.75)`,
                        color: changeColor,
                    }}
                >
                    {isPositive ? (
                        <TrendingUp size={config.iconSize} aria-hidden="true" />
                    ) : (
                        <TrendingDown size={config.iconSize} aria-hidden="true" />
                    )}
                    <span>
                        {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
                    </span>
                </span>
            )}
        </div>
    );
};

export default RealtimePrice;
