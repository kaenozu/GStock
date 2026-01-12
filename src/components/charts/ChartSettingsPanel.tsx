'use client';

import React from 'react';
import styles from './ChartSettingsPanel.module.css';
import { ChartSettings } from '@/types/market';

interface ChartSettingsPanelProps {
    settings: ChartSettings;
    onSettingsChange: (settings: ChartSettings) => void;
    onClose?: () => void;
}

export const ChartSettingsPanel: React.FC<ChartSettingsPanelProps> = ({ settings, onSettingsChange, onClose }) => {
    const handleToggle = (key: keyof ChartSettings) => {
        onSettingsChange({
            ...settings,
            [key]: !settings[key as keyof ChartSettings]
        });
    };

    const handleReset = () => {
        onSettingsChange({
            showSMA20: true,
            showSMA50: true,
            showBollingerBands: false,
            showPredictions: false
        });
    };

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <h3>チャート設定</h3>
                {onClose && (
                    <button className={styles.closeButton} onClick={onClose}>
                        ✕
                    </button>
                )}
            </div>
            
            <div className={styles.content}>
                <div className={styles.section}>
                    <h4>移動平均線</h4>
                    
                    <label className={styles.toggle}>
                        <input
                            type="checkbox"
                            checked={settings.showSMA20}
                            onChange={() => handleToggle('showSMA20')}
                        />
                        <span className={styles.toggleLabel}>SMA 20日</span>
                        <span className={styles.toggleIndicator} />
                    </label>

                    <label className={styles.toggle}>
                        <input
                            type="checkbox"
                            checked={settings.showSMA50}
                            onChange={() => handleToggle('showSMA50')}
                        />
                        <span className={styles.toggleLabel}>SMA 50日</span>
                        <span className={styles.toggleIndicator} />
                    </label>
                </div>

                <div className={styles.section}>
                    <h4>ボラティリティ</h4>
                    
                    <label className={styles.toggle}>
                        <input
                            type="checkbox"
                            checked={settings.showBollingerBands}
                            onChange={() => handleToggle('showBollingerBands')}
                        />
                        <span className={styles.toggleLabel}>ボリンジャーバンド</span>
                        <span className={styles.toggleIndicator} />
                    </label>
                </div>

                <div className={styles.section}>
                    <h4>予測</h4>
                    
                    <label className={styles.toggle}>
                        <input
                            type="checkbox"
                            checked={settings.showPredictions}
                            onChange={() => handleToggle('showPredictions')}
                        />
                        <span className={styles.toggleLabel}>AI予測ライン</span>
                        <span className={styles.toggleIndicator} />
                    </label>
                </div>

                <div className={styles.actions}>
                    <button className={styles.resetButton} onClick={handleReset}>
                        デフォルトに戻す
                    </button>
                </div>
            </div>
        </div>
    );
};
