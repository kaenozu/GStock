'use client';

import { useState, useCallback, useEffect } from 'react';
import { Download, Upload, Trash2, Database } from 'lucide-react';
import { AnalysisHistoryService } from '@/lib/storage/AnalysisHistoryService';
import { StorageManager } from '@/lib/storage/StorageManager';
import styles from './DataManager.module.css';

export const DataManager: React.FC = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [storageStats, setStorageStats] = useState({
        totalSize: 0,
        totalSizeFormatted: '',
        usagePercentage: 0,
        limitExceeded: false
    });

    useEffect(() => {
        const loadStats = async () => {
            const stats = await StorageManager.getStorageStats();
            setStorageStats(stats);
        };
        loadStats();
    }, []);

    const stats = AnalysisHistoryService.getStats();

    const handleExport = useCallback(async () => {
        setIsExporting(true);
        setMessage(null);

        try {
            const json = AnalysisHistoryService.exportToJson();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gstock_analysis_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setMessage({ type: 'success', text: '履歴データをエクスポートしました' });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'エクスポートに失敗しました';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setIsExporting(false);
        }
    }, []);

    const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setMessage(null);

        try {
            const text = await file.text();
            const success = AnalysisHistoryService.importFromJson(text);

            if (success) {
                setMessage({ type: 'success', text: '履歴データをインポートしました' });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setMessage({ type: 'error', text: 'インポートに失敗しました。無効なJSONファイルです。' });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'インポートに失敗しました';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setIsImporting(false);
            event.target.value = '';
        }
    }, []);

    const handleClear = useCallback(() => {
        if (confirm('すべての履歴データを削除しますか？この操作は取り消せません。')) {
            AnalysisHistoryService.clearAll();
            setMessage({ type: 'success', text: '履歴データをクリアしました' });
            setTimeout(() => setMessage(null), 3000);
        }
    }, []);

    const handleClearCache = useCallback(async () => {
        if (confirm('キャッシュをクリアしますか？')) {
            StorageManager.cleanupOldEntries();
            const newStats = await StorageManager.getStorageStats();
            setStorageStats(newStats);
            setMessage({ type: 'success', text: 'キャッシュをクリアしました' });
            setTimeout(() => setMessage(null), 3000);
        }
    }, []);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>
                    <Database className={styles.icon} size={20} />
                    データ管理
                </h2>
            </div>

            <div className={styles.content}>
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>履歴データ</h3>
                    <div className={styles.stats}>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>総件数</span>
                            <span className={styles.statValue}>{stats.totalEntries}</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>銘柄数</span>
                            <span className={styles.statValue}>{stats.uniqueSymbols.length}</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>容量</span>
                            <span className={styles.statValue}>
                                {(stats.storageSize / 1024).toFixed(1)} KB
                            </span>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button
                            className={styles.primaryButton}
                            onClick={handleExport}
                            disabled={isExporting || stats.totalEntries === 0}
                        >
                            {isExporting ? (
                                <>
                                    <span className={styles.spinner} />
                                    エクスポート中...
                                </>
                            ) : (
                                <>
                                    <Download size={18} />
                                    エクスポート
                                </>
                            )}
                        </button>

                        <label className={styles.fileInputButton}>
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                disabled={isImporting}
                                className={styles.fileInput}
                            />
                            <Upload size={18} />
                            {isImporting ? 'インポート中...' : 'インポート'}
                        </label>

                        <button
                            className={styles.dangerButton}
                            onClick={handleClear}
                            disabled={stats.totalEntries === 0}
                        >
                            <Trash2 size={18} />
                            クリア
                        </button>
                    </div>
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>ストレージ管理</h3>
                    <div className={styles.storageInfo}>
                        <p className={styles.infoText}>
                            ローカルストレージ容量: {storageStats.totalSizeFormatted} / 5 MB
                        </p>
                        <p className={styles.infoText}>
                            使用率: {storageStats.usagePercentage.toFixed(1)}%
                        </p>
                    </div>

                    <button
                        className={styles.secondaryButton}
                        onClick={handleClearCache}
                    >
                        古いデータをクリーンアップ
                    </button>
                </div>
            </div>

            {message && (
                <div className={`${styles.message} ${styles[message.type]}`}>
                    {message.text}
                </div>
            )}
        </div>
    );
};
