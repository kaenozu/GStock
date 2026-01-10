import React from 'react';
import { FlaskConical } from 'lucide-react';
import { BacktestResult } from '@/types/market';

interface BacktestPanelProps {
  result: BacktestResult | null;
  onRunBacktest: () => void;
  canRunBacktest: boolean;
}

export const BacktestPanel: React.FC<BacktestPanelProps> = ({ result, onRunBacktest, canRunBacktest }) => {
  // バックテスト実行ボタン
  if (!result && canRunBacktest) {
    return (
      <button
        onClick={onRunBacktest}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 16px',
          borderRadius: '20px',
          color: 'var(--accent-cyan)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '0 auto 1.5rem',
          fontSize: '0.8rem',
          fontWeight: 600
        }}
      >
        <FlaskConical size={14} /> バックテストを実行 (Beta)
      </button>
    );
  }

  // バックテスト結果表示
  if (!result) return null;

  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      padding: '1.5rem',
      borderRadius: '16px',
      marginBottom: '2rem',
      border: '1px solid var(--accent-cyan)',
      width: '100%'
    }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FlaskConical size={14} /> バックテスト結果 (過去100日)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>純利益</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: result.profit >= 0 ? '#10b981' : '#ef4444' }}>
            {result.profit >= 0 ? '+' : ''}{result.profitPercent}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>勝率</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>
            {result.winRate}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>トレード数</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
            {result.trades}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>最終残高</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
            ${result.finalBalance.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BacktestPanel;
