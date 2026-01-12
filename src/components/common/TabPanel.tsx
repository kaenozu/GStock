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
}

export const TabPanel: React.FC<TabPanelProps> = ({
  tabs,
  children,
  defaultTab,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

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
