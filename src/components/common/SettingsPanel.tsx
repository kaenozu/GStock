'use client';

import React, { useState } from 'react';
import { Settings, X, Type, Volume2 } from 'lucide-react';
import { useSettings, FontSize } from '@/hooks/useSettings';
import { useSoundSystem } from '@/hooks/useSoundSystem';
import styles from './SettingsPanel.module.css';

export const SettingsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, setFontSize } = useSettings();
  const { enabled, toggleSound } = useSoundSystem();

  const fontSizeOptions: { value: FontSize; label: string }[] = [
    { value: 'small', label: '小' },
    { value: 'medium', label: '中' },
    { value: 'large', label: '大' },
  ];

  return (
    <>
      <button
        className={styles.settingsButton}
        onClick={() => setIsOpen(true)}
        aria-label="設定"
      >
        <Settings size={18} />
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div className={styles.panel} onClick={e => e.stopPropagation()}>
            <div className={styles.header}>
              <h3>設定</h3>
              <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <Type size={16} />
                <span>文字サイズ</span>
              </div>
              <div className={styles.fontSizeOptions}>
                {fontSizeOptions.map(option => (
                  <button
                    key={option.value}
                    className={`${styles.fontSizeButton} ${settings.fontSize === option.value ? styles.active : ''}`}
                    onClick={() => setFontSize(option.value)}
                  >
                    <span style={{ fontSize: option.value === 'small' ? '12px' : option.value === 'large' ? '18px' : '14px' }}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
              <div className={styles.preview}>
                プレビュー: この文字サイズで表示されます
              </div>

              <div className={styles.sectionTitle} style={{ marginTop: '1.5rem' }}>
                <Volume2 size={16} />
                <span>サウンド設定</span>
              </div>
              <div style={{ padding: '0 0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>効果音を有効にする</span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={toggleSound}
                    style={{ accentColor: 'var(--accent-cyan)', transform: 'scale(1.2)' }}
                  />
                </label>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  約定時や重要なシグナル発生時に音で通知します
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsPanel;
