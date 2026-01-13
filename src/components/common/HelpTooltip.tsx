
import React from 'react';
import { HelpCircle } from 'lucide-react';
import { GlossaryKey, GLOSSARY } from '@/lib/i18n/glossary';

interface HelpTooltipProps {
    termKey: GlossaryKey;
    children?: React.ReactNode;
    iconSize?: number;
    className?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
    termKey,
    children,
    iconSize = 14,
    className = ""
}) => {
    const definition = GLOSSARY[termKey];
    const [isVisible, setIsVisible] = React.useState(false);

    if (!definition) return <>{children}</>;

    return (
        <div
            className={`relative inline-flex items-center gap-1 cursor-help group ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onClick={() => setIsVisible(!isVisible)} // Mobile friendly tap
        >
            {children}
            {!children && (
                <HelpCircle
                    size={iconSize}
                    className="text-slate-500 hover:text-cyan-400 transition-colors"
                />
            )}

            {/* Tooltip Popup */}
            <div className={`
        absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 
        bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50
        transition-all duration-200 pointer-events-none
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}>
                <div className="text-cyan-400 font-bold text-xs mb-1">
                    {definition.term}
                </div>
                <div className="text-slate-300 text-xs mb-2 leading-relaxed">
                    {definition.description}
                </div>
                <div className="text-emerald-400/80 text-[10px] bg-emerald-900/20 p-1.5 rounded border border-emerald-900/50">
                    💡 {definition.implication}
                </div>

                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-8 border-transparent border-t-slate-700" />
            </div>
        </div>
    );
};
