'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { AlertService, AlertSettings } from '@/lib/alerts';
import styles from './AlertSettingsPanel.module.css';

export const AlertSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<AlertSettings>(AlertService.getSettings());
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default'>('default');
  
  useEffect(() => {
    const checkPermission = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermissionStatus(Notification.permission);
      }
    };
    checkPermission();
  }, []);
  
  const handleRequestPermission = async () => {
    const granted = await AlertService.requestPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };
  
  const handleToggleEnabled = () => {
    const newEnabled = !settings.enabled;
    setSettings(prev => ({ ...prev, enabled: newEnabled }));
    AlertService.saveSettings({ enabled: newEnabled });
  };
  
  const handleToggleSound = () => {
    const newSound = !settings.soundEnabled;
    setSettings(prev => ({ ...prev, soundEnabled: newSound }));
    AlertService.saveSettings({ soundEnabled: newSound });
  };
  
  const handleConfidenceChange = (value: number) => {
    setSettings(prev => ({ ...prev, minConfidence: value }));
    AlertService.saveSettings({ minConfidence: value });
  };
  
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Bell size={16} />
        <span>アラート設定</span>
      </div>
      
      {permissionStatus === 'default' && (
        <button onClick={handleRequestPermission} className={styles.permissionBtn}>
          🔔 通知を許可する
        </button>
      )}
      
      {permissionStatus === 'denied' && (
        <div className={styles.denied}>
          ⚠️ 通知がブロックされています。ブラウザ設定で許可してください。
        </div>
      )}
      
      {permissionStatus === 'granted' && (
        <div className={styles.settings}>
          <div className={styles.row}>
            <span>アラート</span>
            <button 
              onClick={handleToggleEnabled}
              className={`${styles.toggle} ${settings.enabled ? styles.on : styles.off}`}
            >
              {settings.enabled ? <Bell size={14} /> : <BellOff size={14} />}
              {settings.enabled ? 'ON' : 'OFF'}
            </button>
          </div>
          
          <div className={styles.row}>
            <span>サウンド</span>
            <button 
              onClick={handleToggleSound}
              className={`${styles.toggle} ${settings.soundEnabled ? styles.on : styles.off}`}
              disabled={!settings.enabled}
            >
              {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {settings.soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          
          <div className={styles.sliderRow}>
            <span>最小信頼度: {settings.minConfidence}%</span>
            <input
              type="range"
              min="40"
              max="90"
              step="5"
              value={settings.minConfidence}
              onChange={(e) => handleConfidenceChange(parseInt(e.target.value))}
              disabled={!settings.enabled}
              className={styles.slider}
            />
          </div>
        </div>
      )}
    </div>
  );
};
