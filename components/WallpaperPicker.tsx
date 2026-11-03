import React from 'react';
import { WALLPAPERS, presetValue, wallpaperStyle } from '../utils/wallpapers';
import type { Wallpaper, WallpaperTone } from '../utils/wallpapers';

interface WallpaperPickerProps {
    /** The current value: `wp:<id>`, an uploaded image, or null for the plain background. */
    value: string | null;
    onChange: (value: string | null) => void;
    /** Absent where uploading an image is not offered. */
    onUpload?: () => void;
    /** Ring colour of the selected swatch, as a full Tailwind class. */
    ringClass?: string;
    /** The app's tint and the current theme, so the swatches look like what they will give. */
    tone?: WallpaperTone;
    dark?: boolean;
}

/** Wallpaper swatches for a chat's settings: the textures, the colours, none, or an image of your own. */
const WallpaperPicker: React.FC<WallpaperPickerProps> = ({ value, onChange, onUpload, ringClass = 'ring-sky-500', tone, dark }) => {
    const swatch = (active: boolean) => `relative h-16 rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden transition ${active ? `ring-2 ring-offset-2 dark:ring-offset-slate-800 ${ringClass}` : 'hover:scale-105'}`;
    const isUpload = !!value && !value.startsWith('wp:');
    const plainButton = 'bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300';

    const group = (name: Wallpaper['group']) => (
        <>
            <p className="col-span-3 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{name === 'Texture' ? 'Textures' : 'Colours'}</p>
            {WALLPAPERS.filter(wallpaper => wallpaper.group === name).map(wallpaper => (
                <button
                    type="button"
                    key={wallpaper.id}
                    role="radio"
                    aria-checked={value === presetValue(wallpaper.id)}
                    title={wallpaper.name}
                    onClick={() => onChange(presetValue(wallpaper.id))}
                    className={swatch(value === presetValue(wallpaper.id))}
                    style={wallpaperStyle(presetValue(wallpaper.id), { tone, dark, preview: true })}
                >
                    <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[10px] font-semibold py-0.5">{wallpaper.name}</span>
                </button>
            ))}
        </>
    );

    return (
        <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1" role="radiogroup" aria-label="Chat wallpaper">
            {group('Texture')}
            {group('Colour')}
            <p className="col-span-3 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Other</p>
            <button type="button" role="radio" aria-checked={value === null} onClick={() => onChange(null)} className={`${swatch(value === null)} ${plainButton}`}>Plain</button>
            {onUpload && (
                <button type="button" role="radio" aria-checked={isUpload} onClick={onUpload} className={`${swatch(isUpload)} ${plainButton}`}>
                    {isUpload ? 'Your image' : 'Upload…'}
                </button>
            )}
        </div>
    );
};

export default WallpaperPicker;
