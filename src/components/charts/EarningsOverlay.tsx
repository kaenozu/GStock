'use client';
import React, { useState } from 'react';
import styles from './EarningsOverlay.module.css';

export interface EarningsMarker {
    date: string;  // YYYY-MM-DD
    x: number;     // pixel position
    label: string;
    tooltip: string;
}

interface EarningsOverlayProps {
    markers: EarningsMarker[];
    chartHeight: number;
}

export const EarningsOverlay: React.FC<EarningsOverlayProps> = ({ markers, chartHeight }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (!markers || markers.length === 0) return null;

    return (
        <div className={styles.overlay}>
            {markers.map((marker, idx) => (
                <div
                    key={marker.date}
                    className={styles.marker}
                    style={{
                        left: `${marker.x}px`,
                        top: `${chartHeight - 60}px`,
                    }}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                >
                    <div className={styles.icon}>E</div>
                    {hoveredIndex === idx && (
                        <div className={styles.tooltip}>
                            <div className={styles.tooltipHeader}>📅 Earnings</div>
                            <div className={styles.tooltipDate}>{marker.date}</div>
                            <div className={styles.tooltipContent}>{marker.tooltip}</div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
