
import React from 'react';
import { Zap, Play, Pause, Layers } from 'lucide-react';
import styles from '@/app/page.module.css'; // Reusing existing styles for now
import { ConnectionStatusIndicator } from '@/components/common/ConnectionStatus';
import { SettingsPanel } from '@/components/common/SettingsPanel';
import { ConnectionStatus } from '@/lib/websocket';

interface DashboardHeaderProps {
    isLive: boolean;
    isPaused: boolean;
    isAutoTrading: boolean;
    showIndicators: boolean;
    wsEnabled: boolean;
    wsStatus: ConnectionStatus;
    wsError: string | null;
    onToggleLive: () => void;
    onTogglePaused: () => void;
    onToggleIndicators: () => void;
    onToggleAuto: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    isLive,
    isPaused,
    isAutoTrading,
    showIndicators,
    wsEnabled,
    wsStatus,
    wsError,
    onToggleLive,
    onTogglePaused,
    onToggleIndicators,
    onToggleAuto,
}) => {
    return (
        <header className={styles.header}>
            <div className={styles.title}>
                <Zap className={styles.icon} />
                <h1>GStock Prime {isLive && <span style={{ color: '#ef4444', fontSize: '0.6rem', verticalAlign: 'top', border: '1px solid #ef4444', padding: '2px 4px', borderRadius: '4px', marginLeft: '4px' }}>LIVE</span>}</h1>
            </div>
            <div className={styles.controls}>
                {/* Mode Switch (Live/Paper) */}
                <button
                    onClick={onToggleLive}
                    style={{
                        background: isLive ? '#ef4444' : 'rgba(16, 185, 129, 0.1)',
                        border: `1px solid ${isLive ? '#ef4444' : '#10b981'}`,
                        color: isLive ? '#fff' : '#10b981',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        marginRight: '1rem'
                    }}
                >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: isLive ? '#fff' : '#10b981', boxShadow: isLive ? '0 0 10px #fff' : 'none' }}></div>
                    {isLive ? '本番稼働' : '模擬取引'}
                </button>

                <div id="tour-controls" className="flex gap-2">
                    <button
                        onClick={onTogglePaused}
                        className={`${styles.button} ${isPaused ? styles.paused : ''} `}
                    >
                        {isPaused ? <Play size={16} /> : <Pause size={16} />}
                        {isPaused ? '再開' : '停止'}
                    </button>
                    <button
                        onClick={onToggleIndicators}
                        className={`${styles.button} ${showIndicators ? styles.active : ''} `}
                    >
                        <Layers size={16} />
                        指標
                    </button>
                    <button
                        onClick={onToggleAuto}
                        className={`${styles.button} ${isAutoTrading ? styles.active : ''} `}
                        id="tour-auto-btn" // Added ID for tour targeting
                        style={{ borderColor: isAutoTrading ? '#a855f7' : undefined, color: isAutoTrading ? '#a855f7' : undefined }}
                    >
                        <Zap size={16} />
                        Auto
                    </button>
                </div>
                <SettingsPanel />
                {wsEnabled && (
                    <ConnectionStatusIndicator
                        status={wsStatus}
                        error={wsError}
                        compact
                    />
                )}
            </div>
        </header>
    );
};
