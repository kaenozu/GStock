import React, { useState, useEffect } from 'react';

interface OnboardingState {
    showOnboarding: boolean;
    currentStep: number;
    completedSteps: string[];
}

export function UserOnboarding() {
    const [state, setState] = useState<OnboardingState>({
        showOnboarding: false,
        currentStep: 0,
        completedSteps: [],
    });

    const steps = [
        {
            title: 'ようこそ、GStockへ',
            description: 'AI株価予測ツールを活用して、より賢い投資を始めましょう。',
            icon: '🚀',
            action: '始める',
        },
        {
            title: 'シグナルを理解する',
            description: 'AI分析に基づく売買シグナルを確認し、信頼度を理解しましょう。',
            icon: '📊',
            action: '確認する',
        },
        {
            title: 'バックテストを試す',
            description: '過去のデータを使って、AI予測の精度をテストしてみましょう。',
            icon: '📈',
            action: 'テストする',
        },
        {
            title: 'ポートフォリオを管理する',
            description: 'あなたの保有株を追跡し、リスクを分散させましょう。',
            icon: '💼',
            action: '管理する',
        },
        {
            title: '通知を設定する',
            description: '重要なシグナルを見逃さないように、プッシュ通知を有効にしましょう。',
            icon: '🔔',
            action: '設定する',
        },
    ];

    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
        if (!hasSeenOnboarding) {
            setState(prev => ({ ...prev, showOnboarding: true }));
        }
    }, []);

    const handleNext = () => {
        const currentStepObj = steps[state.currentStep];
        setState(prev => ({
            ...prev,
            completedSteps: [...prev.completedSteps, currentStepObj.title],
            currentStep: Math.min(state.currentStep + 1, steps.length - 1),
        }));
    };

    const handleSkip = () => {
        localStorage.setItem('hasSeenOnboarding', 'true');
        localStorage.setItem('lastSeenOnboarding', Date.now().toString());
        setState(prev => ({ ...prev, showOnboarding: false }));
    };

    const handleComplete = () => {
        localStorage.setItem('hasSeenOnboarding', 'true');
        localStorage.setItem('lastSeenOnboarding', Date.now().toString());
        setState(prev => ({ ...prev, showOnboarding: false }));
    };

    if (!state.showOnboarding) {
        return null;
    }

    const currentStepObj = steps[state.currentStep];
    const progress = ((state.currentStep + 1) / steps.length) * 100;

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-modal">
                <button className="close-button" onClick={handleSkip}>
                    ✕
                </button>

                <div className="onboarding-content">
                    <div className="onboarding-header">
                        <div className="step-indicator">
                            ステップ {state.currentStep + 1} / {steps.length}
                        </div>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="onboarding-icon">
                        {currentStepObj.icon}
                    </div>

                    <h2 className="onboarding-title">
                        {currentStepObj.title}
                    </h2>

                    <p className="onboarding-description">
                        {currentStepObj.description}
                    </p>

                    <div className="onboarding-steps">
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                className={`onboarding-step ${index === state.currentStep ? 'active' : ''} ${index < state.currentStep ? 'completed' : ''}`}
                            >
                                <div className="step-number">{index + 1}</div>
                                <div className="step-title">{step.title}</div>
                            </div>
                        ))}
                    </div>

                    <div className="onboarding-actions">
                        <button className="skip-button" onClick={handleSkip}>
                            スキップ
                        </button>

                        {state.currentStep < steps.length - 1 ? (
                            <button className="next-button" onClick={handleNext}>
                                {currentStepObj.action}
                            </button>
                        ) : (
                            <button className="complete-button" onClick={handleComplete}>
                                開始する
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .onboarding-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(8px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }

                .onboarding-modal {
                    background: var(--bg-primary);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    padding: 40px;
                    max-width: 600px;
                    width: 90%;
                    box-shadow: var(--glass-shadow);
                }

                .close-button {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    font-size: 24px;
                    cursor: pointer;
                    transition: color var(--transition-fast);
                }

                .close-button:hover {
                    color: var(--text-primary);
                }

                .onboarding-content {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .onboarding-header {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .step-indicator {
                    font-size: 14px;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background: var(--bg-tertiary);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: var(--accent-blue);
                    border-radius: 4px;
                    transition: width var(--transition-normal);
                }

                .onboarding-icon {
                    font-size: 64px;
                    text-align: center;
                }

                .onboarding-title {
                    font-size: 28px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }

                .onboarding-description {
                    font-size: 16px;
                    color: var(--text-secondary);
                    line-height: 1.6;
                    margin: 0;
                }

                .onboarding-steps {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .onboarding-step {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    border-radius: 8px;
                    transition: background var(--transition-fast);
                }

                .onboarding-step.active {
                    background: var(--bg-tertiary);
                }

                .onboarding-step.completed {
                    opacity: 0.6;
                }

                .step-number {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--accent-blue);
                    color: white;
                    border-radius: 50%;
                    font-weight: 600;
                    font-size: 14px;
                }

                .step-title {
                    font-size: 14px;
                    color: var(--text-primary);
                    font-weight: 500;
                }

                .onboarding-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    margin-top: 12px;
                }

                .skip-button {
                    padding: 12px 24px;
                    background: transparent;
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }

                .skip-button:hover {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }

                .next-button {
                    padding: 12px 32px;
                    background: var(--accent-blue);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 16px;
                    transition: all var(--transition-fast);
                }

                .next-button:hover {
                    background: var(--accent-primary-dark);
                    transform: translateY(-2px);
                    box-shadow: var(--glow-blue);
                }

                .complete-button {
                    padding: 12px 32px;
                    background: var(--accent-cyan);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 16px;
                    transition: all var(--transition-fast);
                }

                .complete-button:hover {
                    background: var(--accent-primary);
                    transform: translateY(-2px);
                    box-shadow: var(--glow-cyan);
                }

                @media (max-width: 768px) {
                    .onboarding-modal {
                        padding: 24px;
                        max-width: 95%;
                    }

                    .onboarding-title {
                        font-size: 22px;
                    }

                    .onboarding-description {
                        font-size: 14px;
                    }

                    .onboarding-icon {
                        font-size: 48px;
                    }

                    .onboarding-actions {
                        flex-direction: column;
                    }

                    .next-button,
                    .complete-button,
                    .skip-button {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}