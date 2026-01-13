'use client';

import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    width?: string;
    height?: string;
    borderRadius?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = '1rem',
    borderRadius = '4px',
    className = '',
    style,
    ...props
}) => {
    return (
        <div
            className={`${styles.skeleton} ${className}`}
            style={{ width, height, borderRadius, ...style }}
            {...props}
        />
    );
};

// Pre-built skeleton patterns
export const SkeletonText: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
    <div className={styles.skeletonGroup}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                width={i === lines - 1 ? '60%' : '100%'}
                height="0.875rem"
            />
        ))}
    </div>
);

export const SkeletonCard: React.FC = () => (
    <div className={styles.skeletonCard}>
        <Skeleton height="1.5rem" width="40%" />
        <Skeleton height="3rem" width="100%" />
        <SkeletonText lines={2} />
    </div>
);

export const SkeletonChart: React.FC = () => (
    <div className={styles.skeletonChart}>
        <Skeleton height="100%" width="100%" borderRadius="8px" />
    </div>
);

export const SkeletonList: React.FC<{ items?: number }> = ({ items = 5 }) => (
    <div className={styles.skeletonList}>
        {Array.from({ length: items }).map((_, i) => (
            <div key={i} className={styles.skeletonListItem}>
                <Skeleton width="2rem" height="2rem" borderRadius="50%" />
                <div style={{ flex: 1 }}>
                    <Skeleton width="60%" height="0.875rem" />
                    <Skeleton width="40%" height="0.75rem" />
                </div>
            </div>
        ))}
    </div>
);
