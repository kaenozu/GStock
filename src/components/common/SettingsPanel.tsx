'use client';
 
import React, { useState } from 'react';
import { Settings, X, Type, Key, Palette, Database } from 'lucide-react';
import { useSettings, FontSize } from '@/hooks/useSettings';
import { ThemeToggle } from './ThemeToggle';
import { ApiKeySettingsPanel } from './ApiKeySettingsPanel';
import { DataManager } from './DataManager';
import styles from './SettingsPanel.module.css';
 
type Tab = 'general' | 'theme' | 'api' | 'data';
 
export const SettingsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('general');
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

            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'general' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('general')}
              >
                全般
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'theme' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('theme')}
              >
                <Palette size={14} />
                テーマ
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'api' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('api')}
              >
                <Key size={14} />
                APIキー
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'data' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('data')}
              >
                <Database size={14} />
                データ
              </button>
            </div>

            <div className={styles.content}>
              {activeTab === 'general' && (
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
              )}

              {activeTab === 'theme' && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>
                    <Palette size={16} />
                    <span>カラーテーマ</span>
                  </div>
                  <div className={styles.themeSection}>
                    <ThemeToggle />
                    <p className={styles.description}>
                      ライトモード、ダークモード、またはシステム設定に従います。
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'api' && (
                <ApiKeySettingsPanel />
              )}

              {activeTab === 'data' && (
                <DataManager />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
 
export default SettingsPanel;
