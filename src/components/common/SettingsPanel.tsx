'use client';

import React, { useState } from 'react';
import { Settings, X, Type } from 'lucide-react';
import { useSettings, FontSize } from '@/hooks/useSettings';
import styles from './SettingsPanel.module.css';

export const SettingsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, setFontSize } = useSettings();

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
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsPanel;
