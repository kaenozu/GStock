/**
 * Onboarding - 初回ユーザー向けガイド
 * @description アプリの使い方をステップバイステップで説明
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Zap, BarChart3, Shield, Bell, Rocket } from 'lucide-react';
import styles from './Onboarding.module.css';

interface OnboardingStep {
    icon: React.ReactNode;
    title: string;
    description: string;
    tips: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        icon: <Zap size={32} />,
        title: 'GStockへようこそ！',
        description: 'AI駆動の株式分析ツールです。複数のAIエージェントが市場を分析し、売買シグナルを提供します。',
        tips: [
            '左パネルでAIの判断を確認',
            '中央のチャートで価格推移を分析',
            '右パネルで取引・設定を管理'
        ]
    },
    {
        icon: <BarChart3 size={32} />,
        title: 'AIシグナルの見方',
        description: '「強い買い」「強い売り」などのシグナルは、複数のAIエージェントの合議結果です。',
        tips: [
            'RSI: 30以下は売られ過ぎ、70以上は買われ過ぎ',
            'ADX: 25以上は強いトレンド',
            '信頼度: 70%以上が高信頼シグナル'
        ]
    },
    {
        icon: <Shield size={32} />,
        title: 'ペーパートレード',
        description: 'まずは仮想資金で練習しましょう。実際のお金は一切動きません。',
        tips: [
            'Tradeタブで模擬取引が可能',
            '初期資金100万円でスタート',
            '実績を確認してから実弾へ'
        ]
    },
    {
        icon: <Bell size={32} />,
        title: 'アラート設定',
        description: '重要なシグナルを見逃さないよう、通知を設定できます。',
        tips: [
            'Configタブでアラートを設定',
            'ブラウザ通知を許可してください',
            '信頼度閾値でフィルタリング可能'
        ]
    },
    {
        icon: <Rocket size={32} />,
        title: 'さあ、始めましょう！',
        description: '準備が整いました。まずは気になる銀柄をウォッチリストに追加してみましょう。',
        tips: [
            '☆ボタンでウォッチリストに追加',
            'スキャンは自動で実行されます',
            'いつでもこのガイドを再表示できます'
        ]
    }
];

const STORAGE_KEY = 'gstock-onboarding-completed';

interface OnboardingProps {
    forceShow?: boolean;
    onComplete?: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ forceShow = false, onComplete }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (forceShow) {
            setIsVisible(true);
            return;
        }
        
        // ローカルストレージで初回かどうか確認
        const completed = localStorage.getItem(STORAGE_KEY);
        if (!completed) {
            setIsVisible(true);
        }
    }, [forceShow]);

    const handleClose = useCallback(() => {
        setIsVisible(false);
        localStorage.setItem(STORAGE_KEY, 'true');
        onComplete?.();
    }, [onComplete]);

    const handleNext = useCallback(() => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleClose();
        }
    }, [currentStep, handleClose]);

    const handlePrev = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const handleSkip = useCallback(() => {
        handleClose();
    }, [handleClose]);

    if (!isVisible) return null;

    const step = ONBOARDING_STEPS[currentStep];
    const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <button
                    className={styles.closeButton}
                    onClick={handleSkip}
                    aria-label="閉じる"
                >
                    <X size={20} />
                </button>

                <div className={styles.content}>
                    <div className={styles.iconWrapper}>
                        {step.icon}
                    </div>

                    <h2 className={styles.title}>{step.title}</h2>
                    <p className={styles.description}>{step.description}</p>

                    <ul className={styles.tips}>
                        {step.tips.map((tip, index) => (
                            <li key={index} className={styles.tip}>
                                <span className={styles.tipBullet}>✓</span>
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className={styles.footer}>
                    <div className={styles.progress}>
                        {ONBOARDING_STEPS.map((_, index) => (
                            <div
                                key={index}
                                className={`${styles.dot} ${index === currentStep ? styles.dotActive : ''} ${index < currentStep ? styles.dotCompleted : ''}`}
                            />
                        ))}
                    </div>

                    <div className={styles.actions}>
                        <button
                            className={styles.skipButton}
                            onClick={handleSkip}
                        >
                            スキップ
                        </button>

                        <div className={styles.navButtons}>
                            {currentStep > 0 && (
                                <button
                                    className={styles.navButton}
                                    onClick={handlePrev}
                                >
                                    <ChevronLeft size={16} />
                                    前へ
                                </button>
                            )}
                            <button
                                className={`${styles.navButton} ${styles.primaryButton}`}
                                onClick={handleNext}
                            >
                                {isLastStep ? '始める' : '次へ'}
                                {!isLastStep && <ChevronRight size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/** オンボーディングをリセット（再表示用） */
export const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY);
};

export default Onboarding;
