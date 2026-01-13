
import React, { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export interface TourStep {
    targetId: string;
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
    {
        targetId: 'tour-signal-card',
        title: 'AI Signal Card',
        content: 'ここがGStockの心臓部です。AIによる売買シグナル、信頼度、そして判断根拠を確認できます。',
        position: 'right'
    },
    {
        targetId: 'tour-chart-panel',
        title: 'Advanced Chart',
        content: 'リアルタイム価格とテクニカル指標を表示します。「EARNINGS」マーカーで決算日もチェック可能です。',
        position: 'left'
    },
    {
        targetId: 'tour-neural-monitor',
        title: 'Neural Monitor',
        content: 'AIの「思考」を可視化したものです。市場環境の変化や、AIが何に注目しているかがわかります。',
        position: 'right'
    },
    {
        targetId: 'tour-controls',
        title: 'Control Center',
        content: '模擬取引(Paper)と本番(Live)の切り替えや、自動売買(Auto)のON/OFFはここから行います。',
        position: 'bottom'
    }
];

export const OnboardingTour: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [style, setStyle] = useState<React.CSSProperties>({});

    // Initialize
    useEffect(() => {
        const seenPlugin = localStorage.getItem('gstock_tour_seen');
        if (!seenPlugin) {
            // Delay start to allow render
            setTimeout(() => setIsActive(true), 1000);
        }
    }, []);

    // Update Highlight Position
    useEffect(() => {
        if (!isActive) return;

        const step = TOUR_STEPS[currentStep];
        const element = document.getElementById(step.targetId);

        if (element) {
            const rect = element.getBoundingClientRect();
            const padding = 8;

            // Highlight Style
            setStyle({
                top: rect.top - padding,
                left: rect.left - padding,
                width: rect.width + (padding * 2),
                height: rect.height + (padding * 2),
            });

            // Scroll into view
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentStep, isActive]);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            endTour();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const endTour = () => {
        setIsActive(false);
        localStorage.setItem('gstock_tour_seen', 'true');
    };

    if (!isActive) return null;

    const activeStep = TOUR_STEPS[currentStep];

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px] transition-all duration-500" />

            {/* Spotlight Hole (Visual Only - handled by overlaying div) */}
            <div
                className="fixed z-[91] border-2 border-cyan-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] box-content transition-all duration-300 ease-in-out pointer-events-none"
                style={style}
            />

            {/* Tooltip Card */}
            <div
                className="fixed z-[95] bg-slate-900 border border-cyan-500/50 rounded-xl p-5 w-80 shadow-2xl transition-all duration-300"
                style={{
                    top: (style.top as number) + (style.height as number) + 16, // Default to bottom for simplicity
                    left: (style.left as number),
                }}
            >
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-cyan-400 font-bold text-lg">{activeStep.title}</h3>
                    <button onClick={endTour} className="text-slate-500 hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                    {activeStep.content}
                </p>

                <div className="flex justify-between items-center">
                    <div className="flex gap-1">
                        {TOUR_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${i === currentStep ? 'bg-cyan-400' : 'bg-slate-700'}`}
                            />
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-700"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={handleNext}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 flex items-center gap-1"
                        >
                            {currentStep === TOUR_STEPS.length - 1 ? '完了' : '次へ'}
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
