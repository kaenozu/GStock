import React from 'react';
import {
    LayoutDashboard,
    TrendingUp,
    Newspaper,
    Settings,
    Search,
    Star,
    Zap
} from 'lucide-react';
import styles from './Sidebar.module.css';

const Sidebar = () => {
    const menuItems = [
        { icon: <LayoutDashboard size={20} />, label: 'ダッシュボード', active: true },
        { icon: <TrendingUp size={20} />, label: '株価予想', active: false },
        { icon: <Star size={20} />, label: 'ウォッチリスト', active: false },
        { icon: <Newspaper size={20} />, label: 'マーケットニュース', active: false },
    ];

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logoContainer}>
                <div className={styles.logoIcon}>
                    <Zap size={24} fill="var(--accent-cyan)" color="var(--accent-cyan)" />
                </div>
                <span className={styles.logoText}>GSTOCK</span>
            </div>

            <nav className={styles.nav}>
                <div className={styles.sectionLabel}>MENU</div>
                {menuItems.map((item, index) => (
                    <div
                        key={index}
                        className={`${styles.navItem} ${item.active ? styles.active : ''}`}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </div>
                ))}
            </nav>

            <div className={styles.bottomNav}>
                <div className={styles.navItem}>
                    <Settings size={20} />
                    <span>設定</span>
                </div>
                <div className={styles.userProfile}>
                    <div className={styles.avatar}>ゲスト</div>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>ゲストユーザー</div>
                        <div className={styles.userRole}>フリープラン</div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
