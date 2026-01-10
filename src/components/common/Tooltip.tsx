'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './Tooltip.module.css';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && containerRef.current) {
      const tooltip = tooltipRef.current.getBoundingClientRect();
      const container = containerRef.current.getBoundingClientRect();
      
      // Adjust position if tooltip goes off screen
      if (position === 'top' && container.top - tooltip.height < 10) {
        setActualPosition('bottom');
      } else if (position === 'bottom' && container.bottom + tooltip.height > window.innerHeight - 10) {
        setActualPosition('top');
      } else {
        setActualPosition(position);
      }
    }
  }, [isVisible, position]);

  return (
    <span
      ref={containerRef}
      className={styles.container}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`${styles.tooltip} ${styles[actualPosition]}`}
          role="tooltip"
        >
          {content}
          <div className={styles.arrow} />
        </div>
      )}
    </span>
  );
};

// Pre-defined tooltips for financial terms
export const TERM_DEFINITIONS: Record<string, string> = {
  RSI: 'RSI（相対力指数）: 0-100の範囲で買われ過ぎ・売られ過ぎを判断。70以上は買われ過ぎ、30以下は売られ過ぎ。',
  ADX: 'ADX（平均方向性指数）: トレンドの強さを測定。25以上で強いトレンド、20以下で弱いトレンド。',
  'シャープレシオ': 'リスク調整後リターン。高いほどリスクに対してリターンが良い。1以上が良好、2以上は優秀。',
  '分散度': 'ポートフォリオの分散度合い。高いほどリスクが分散されている。60%以上が推奨。',
  '信頼度': 'AIが判断した取引シグナルの確信度。0-100%で表示。',
  '市場状態': '現在の市場のトレンド状態。上昇/下落/横ばい/不安定など。',
  '評議会の声': '複数のAIエージェントの合議結果。トレンド・リバーサル・ボラティリティ各エージェントが投票。',
  'リバランス': 'ポートフォリオの配分を目標に近づける調整。乖離が大きいとリスクが偏る。',
  '模擬取引': '実際のお金を使わない練習用取引モード。',
  '目標': '理想的な資産配分比率。戦略によって異なる。',
  'VTI': '米国全株式市場ETF。約4000銘柄に分散投資。',
  'QQQ': 'NASDAQ100指数連動ETF。テクノロジー株中心。',
  'BND': '米国総合債券ETF。安定した値動きが特徴。',
  'GLD': '金価格連動ETF。インフレヘッジや安全資産として。',
  'VWO': '新興国株式ETF。中国・インド等の成長市場に投資。',
};

// Helper component for term with tooltip
export const TermWithTooltip: React.FC<{ term: string; children?: React.ReactNode }> = ({ term, children }) => {
  const definition = TERM_DEFINITIONS[term];
  if (!definition) return <span>{children || term}</span>;
  
  return (
    <Tooltip content={definition}>
      <span className={styles.termHighlight}>{children || term}</span>
    </Tooltip>
  );
};

export default Tooltip;
