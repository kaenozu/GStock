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
  activeTab?: string; // Controlled
  onTabChange?: (tabId: string) => void; // Controlled
}

export const TabPanel: React.FC<TabPanelProps> = ({
  tabs,
  children,
  defaultTab,
  className = '',
  activeTab: controlledActiveTab,
  onTabChange
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || tabs[0]?.id);

  const isControlled = controlledActiveTab !== undefined;
  const activeTab = isControlled ? controlledActiveTab : internalActiveTab;

  const handleTabChange = (tabId: string) => {
    if (!isControlled) {
      setInternalActiveTab(tabId);
    }
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className={`${styles.tabPanel} ${className}`}>
      <div className={styles.tabHeader}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => handleTabChange(tab.id)}
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
