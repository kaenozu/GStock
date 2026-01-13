'use client';

import React, { useState } from 'react';
import { Key, Check, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';
import styles from './ApiKeySettingsPanel.module.css';

export const ApiKeySettingsPanel: React.FC = () => {
    const { apiKeys, isLoading, error, saveApiKeys, validateApiKey, hasApiKey, clearKeys } = useApiKey();
    
    const [finnhubKey, setFinnhubKey] = useState(apiKeys.finnhubApiKey || '');
    const [alphaVantageKey, setAlphaVantageKey] = useState(apiKeys.alphaVantageApiKey || '');
    const [showFinnhub, setShowFinnhub] = useState(false);
    const [showAlpha, setShowAlpha] = useState(false);
    const [validating, setValidating] = useState(false);
    const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleSave = async () => {
        setValidating(true);
        setValidationStatus('idle');

        let isValid = true;

        if (finnhubKey) {
            const valid = await validateApiKey('finnhub', finnhubKey);
            if (!valid) {
                isValid = false;
                setValidationStatus('error');
            }
        }

        if (alphaVantageKey) {
            const valid = await validateApiKey('alphaVantage', alphaVantageKey);
            if (!valid) {
                isValid = false;
                setValidationStatus('error');
            }
        }

        if (isValid) {
            const success = await saveApiKeys({
                finnhubApiKey: finnhubKey || undefined,
                alphaVantageApiKey: alphaVantageKey || undefined
            });

            if (success) {
                setValidationStatus('success');
            }
        }

        setValidating(false);
    };

    const handleValidate = async (provider: 'finnhub' | 'alphaVantage', key: string) => {
        if (!key) {
            setValidationStatus('idle');
            return;
        }

        setValidating(true);
        const valid = await validateApiKey(provider, key);
        setValidationStatus(valid ? 'success' : 'error');
        setValidating(false);
    };

    const handleClear = () => {
        if (confirm('すべてのAPIキーを削除しますか？')) {
            clearKeys();
            setFinnhubKey('');
            setAlphaVantageKey('');
            setValidationStatus('idle');
        }
    };

    if (isLoading) {
        return (
            <div className={styles.panel}>
                <div className={styles.loading}>
                    <Loader2 className={styles.spinner} size={24} />
                    <span>ロード中...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <h2 className={styles.title}>
                    <Key className={styles.icon} size={20} />
                    APIキー設定
                </h2>
                {validationStatus === 'success' && (
                    <div className={styles.statusSuccess}>
                        <Check size={16} />
                        保存完了
                    </div>
                )}
                {validationStatus === 'error' && (
                    <div className={styles.statusError}>
                        <X size={16} />
                        エラー
                    </div>
                )}
            </div>

            {error && (
                <div className={styles.error}>
                    {error}
                </div>
            )}

            <div className={styles.content}>
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Finnhub API</h3>
                    <div className={styles.field}>
                        <label className={styles.label}>APIキー</label>
                        <div className={styles.inputGroup}>
                            <input
                                type={showFinnhub ? 'text' : 'password'}
                                className={styles.input}
                                placeholder='Finnhub APIキーを入力'
                                value={finnhubKey}
                                onChange={(e) => setFinnhubKey(e.target.value)}
                                disabled={validating}
                            />
                            <button
                                className={styles.toggleButton}
                                onClick={() => setShowFinnhub(!showFinnhub)}
                                type="button"
                            >
                                {showFinnhub ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className={styles.help}>
                            <a href="https://finnhub.io/register" target="_blank" rel="noopener noreferrer">
                                APIキーを取得する（無料）
                            </a>
                        </p>
                    </div>
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Alpha Vantage API</h3>
                    <div className={styles.field}>
                        <label className={styles.label}>APIキー</label>
                        <div className={styles.inputGroup}>
                            <input
                                type={showAlpha ? 'text' : 'password'}
                                className={styles.input}
                                placeholder='Alpha Vantage APIキーを入力'
                                value={alphaVantageKey}
                                onChange={(e) => setAlphaVantageKey(e.target.value)}
                                disabled={validating}
                            />
                            <button
                                className={styles.toggleButton}
                                onClick={() => setShowAlpha(!showAlpha)}
                                type="button"
                            >
                                {showAlpha ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className={styles.help}>
                            <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer">
                                APIキーを取得する（無料）
                            </a>
                        </p>
                    </div>
                </div>

                <div className={styles.actions}>
                    <button
                        className={styles.saveButton}
                        onClick={handleSave}
                        disabled={validating || (!finnhubKey && !alphaVantageKey)}
                    >
                        {validating ? (
                            <>
                                <Loader2 size={18} className={styles.spinner} />
                                検証中...
                            </>
                        ) : (
                            '保存'
                        )}
                    </button>
                    
                    <button
                        className={styles.clearButton}
                        onClick={handleClear}
                        disabled={validating}
                    >
                        クリア
                    </button>
                </div>

                <div className={styles.info}>
                    <p className={styles.infoText}>
                        💡 APIキーは暗号化されてブラウザのローカルストレージに保存されます。
                        サーバーには送信されません。
                    </p>
                </div>
            </div>
        </div>
    );
};
