'use client';

import React, { useState } from 'react';
import styles from './TabPanel.module.css';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabPanelProps {
  tabs: Tab[];
  children: React.ReactNode[];
  defaultTab?: string;
  className?: string;
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  tabs,
  children,
  defaultTab,
  className = '',
  activeTabId,
  onTabChange,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || tabs[0]?.id);
  
  // 外部制御または内部制御
  const activeTab = activeTabId ?? internalActiveTab;
  const setActiveTab = (tabId: string) => {
    setInternalActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className={`${styles.tabPanel} ${className}`}>
      <div className={styles.tabHeader}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.icon && <span className={styles.tabIcon}>{tab.icon}</span>}
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.tabContent} role="tabpanel">
        {children[activeIndex] || null}
      </div>
    </div>
  );
};
