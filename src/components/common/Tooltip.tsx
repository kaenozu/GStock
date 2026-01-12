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
    // Reset position when visibility changes or position prop changes
    if (!isVisible) return;
    
    // Use requestAnimationFrame to defer position calculation
    const frame = requestAnimationFrame(() => {
      if (!tooltipRef.current || !containerRef.current) return;
      
      const tooltip = tooltipRef.current.getBoundingClientRect();
      const container = containerRef.current.getBoundingClientRect();
      
      // Adjust position if tooltip goes off screen
      let newPosition = position;
      if (position === 'top' && container.top - tooltip.height < 10) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && container.bottom + tooltip.height > window.innerHeight - 10) {
        newPosition = 'top';
      }
      
      if (newPosition !== actualPosition) {
        setActualPosition(newPosition);
      }
    });
    
    return () => cancelAnimationFrame(frame);
  }, [isVisible, position, actualPosition]);

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
  // テクニカル指標
  RSI: 'RSI（相対力指数）: 0-100の範囲で買われ過ぎ・売られ過ぎを判断。70以上は買われ過ぎ、30以下は売られ過ぎ。',
  ADX: 'ADX（平均方向性指数）: トレンドの強さを測定。25以上で強いトレンド、20以下で弱いトレンド。',
  
  // バックテスト指標
  'シャープレシオ': 'リスク調整後リターン。高いほどリスクに対してリターンが良い。1以上が良好、2以上は優秀。',
  'ボラティリティ': '価格変動の大きさ。高いほどリスクが高いがリターンの機会も。',
  '最大DD': '最大ドローダウン。ピークからの最大下落率。-20%以下が理想。',
  '年率リターン': '1年間に換算したリターン率。異なる期間の成績を比較可能に。',
  
  // ポートフォリオ
  '分散度': 'ポートフォリオの分散度合い。高いほどリスクが分散されている。60%以上が推奨。',
  'リバランス': 'ポートフォリオの配分を目標に近づける調整。乖離が大きいとリスクが偏る。',
  '目標': '理想的な資産配分比率。戦略によって異なる。',
  '模擬取引': '実際のお金を使わない練習用取引モード。',
  
  // AIシグナル
  '信頼度': 'AIが判断した取引シグナルの確信度。0-100%で表示。',
  '市場状態': '現在の市場のトレンド状態。上昇/下落/横ばい/不安定など。',
  '評議会の声': '複数のAIエージェントの合議結果。トレンド・リバーサル・ボラティリティ各エージェントが投票。',
  
  // 財務指標
  'P/E': 'P/Eレシオ（株価収益率）: 株価÷EPS。15-20が平均的。低いと割安、高いと割高の可能性。',
  'EPS': 'EPS（1株当たり利益）: 純利益÷発行済株式数。高いほど収益性が高い。',
  'ROE': 'ROE（自己資本利益率）: 株主資本に対する利益率。15%以上が優良。',
  'Market Cap': '時価総額: 企業の市場価値。株価×発行済株式数。',
  '52W High': '52週高値: 過去1年間の最高値。現在価格との比較に使用。',
  '52W Low': '52週安値: 過去1年間の最安値。現在価格との比較に使用。',
  'Revenue Growth': '売上高成長率: 前年比での売上高の伸び。10%以上で成長企業。',
  'EPS Growth': 'EPS成長率: 1株当たり利益の成長率。15%以上が優良。',
  
  // 決算関連
  '決算日': '企業が四半期/通期の業績を発表する日。株価が大きく動くことが多い。',
  'EPS予想': 'アナリストが予想する1株当たり利益。実績との比較で株価が動く。',
  'サプライズ': '決算発表時の実績と予想の差。ポジティブ=予想超え、ネガティブ=予想未達。',
  'MSPR': 'MSPR（インサイダーセンチメント）: 内部者の売買動向。正の値は買い越し、負は売り越し。',
  
  // ETF
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
