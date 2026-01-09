import React from 'react';
import { Search, Bell, Globe } from 'lucide-react';
import styles from './Header.module.css';

const Header = () => {
    return (
        <header className={styles.header}>
            <div className={styles.searchBar}>
                <Search size={18} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="銘柄名、コードで検索..."
                    className={styles.searchInput}
                />
                <div className={styles.searchShortcut}>/</div>
            </div>

            <div className={styles.actions}>
                <div className={styles.marketStatus}>
                    <div className={styles.statusDot}></div>
                    <span>市場開場中</span>
                </div>

                <button className={styles.iconButton}>
                    <Globe size={20} />
                </button>

                <button className={styles.iconButton}>
                    <div className={styles.notificationBadge}></div>
                    <Bell size={20} />
                </button>
            </div>
        </header>
    );
};

export default Header;
