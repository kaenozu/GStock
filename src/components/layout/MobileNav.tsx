import React from 'react';
import { Activity, BarChart2, Database, Zap } from 'lucide-react';

export type MobileTab = 'signal' | 'chart' | 'market' | 'trade';

interface MobileNavProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange }) => {
    const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
        { id: 'signal', label: 'Signal', icon: <Activity size={20} /> },
        { id: 'chart', label: 'Chart', icon: <BarChart2 size={20} /> },
        { id: 'market', label: 'Market', icon: <Database size={20} /> },
        { id: 'trade', label: 'Trade', icon: <Zap size={20} /> },
    ];

    return (
        <div className="mobile-nav-container">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                    >
                        <div className="icon-wrapper">
                            {tab.icon}
                        </div>
                        <span className="label">{tab.label}</span>
                    </button>
                );
            })}

            <style jsx>{`
        .mobile-nav-container {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 60px; /* Safe area padding added in global or via env() */
          background: rgba(5, 7, 10, 0.95);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255,255,255,0.1);
          display: flex; /* Flex by default, media query in page to hide on desktop */
          justify-content: space-around;
          align-items: center;
          padding-bottom: env(safe-area-inset-bottom);
          z-index: 50;
        }

        .mobile-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: #64748b;
          padding: 8px 0;
          transition: all 0.2s;
        }

        .mobile-nav-item.active {
          color: var(--accent-cyan);
        }

        .mobile-nav-item.active .icon-wrapper {
            transform: translateY(-2px);
        }

        .label {
            font-size: 10px;
            margin-top: 2px;
            font-weight: 500;
        }
        
        /* Desktop Hide Logic will be handled in page module or global css */
        @media (min-width: 769px) {
            .mobile-nav-container {
                display: none;
            }
        }
      `}</style>
        </div>
    );
};
