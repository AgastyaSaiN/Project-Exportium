import React from 'react';
import { useBackToClose } from '../utils/useBackToClose';

/**
 * The chat settings page for the phone app. Deliberately plain: a top bar that never moves, one scrolling
 * area under it, and flat rows. No overlay, no sticky parts, no shadows, no animations, so there is nothing
 * for the phone to get wrong. The desktop app keeps its own dialog.
 */

export const isPhoneApp = (): boolean => typeof document !== 'undefined' && document.documentElement.classList.contains('native-mobile');

/** Colours for the selected state of a control; full class names so Tailwind can see them. */
export interface SettingsAccent { solid: string; border: string }
export const ACCENTS = {
    green: { solid: 'bg-green-500', border: 'border-green-500' },
    sky: { solid: 'bg-sky-500', border: 'border-sky-500' },
    pink: { solid: 'bg-pink-500', border: 'border-pink-500' },
    yellow: { solid: 'bg-yellow-400', border: 'border-yellow-400' },
} satisfies Record<string, SettingsAccent>;

interface PhoneSettingsPageProps {
    title: string;
    onClose: () => void;
    /** Force the dark look (the Snapchat viewer is always dark). */
    dark?: boolean;
    children: React.ReactNode;
}

export const PhoneSettingsPage: React.FC<PhoneSettingsPageProps> = ({ title, onClose, dark, children }) => {
    useBackToClose(onClose);
    return (
    <div className={dark ? 'dark' : ''}>
        <div
            className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 28px)', paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        >
            <div className="flex-none flex items-center gap-3 px-2 h-14 border-b border-slate-200 dark:border-slate-700">
                <button type="button" onClick={onClose} aria-label="Back" className="w-11 h-11 flex items-center justify-center rounded-full text-slate-800 dark:text-slate-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                </button>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
        </div>
    </div>
    );
};

/** A section title, with an optional line of explanation under it. */
export const SettingsHeading: React.FC<{ hint?: string; children: React.ReactNode }> = ({ hint, children }) => (
    <div className="px-4 pt-6 pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</h3>
        {hint && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
);

/** One option of a pick-one list: an optional picture, a name, and a radio circle. */
export const SettingsChoice: React.FC<{ title: string; subtitle?: string; leading?: React.ReactNode; selected: boolean; onSelect: () => void; accent: SettingsAccent }> = ({ title, subtitle, leading, selected, onSelect, accent }) => (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-200 dark:border-slate-700">
        {leading}
        <span className="flex-1 min-w-0">
            <span className="block font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</span>
            {subtitle && <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</span>}
        </span>
        <span className={`flex-none w-6 h-6 rounded-full border-2 flex items-center justify-center ${selected ? accent.border : 'border-slate-300 dark:border-slate-600'}`}>
            {selected && <span className={`w-3 h-3 rounded-full ${accent.solid}`} />}
        </span>
    </button>
);

/** A label with an on/off switch. */
export const SettingsSwitch: React.FC<{ label: string; checked: boolean; onChange: (next: boolean) => void; accent: SettingsAccent }> = ({ label, checked, onChange, accent }) => (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left border-b border-slate-200 dark:border-slate-700">
        <span className="font-semibold text-slate-900 dark:text-slate-100">{label}</span>
        <span className={`flex-none relative w-12 h-7 rounded-full ${checked ? accent.solid : 'bg-slate-300 dark:bg-slate-600'}`}>
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white ${checked ? 'translate-x-5' : ''}`} />
        </span>
    </button>
);
