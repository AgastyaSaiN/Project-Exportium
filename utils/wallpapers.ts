import type { CSSProperties } from 'react';
import { LOGO_ASCII } from './logoAscii';

export type WallpaperTone = 'green' | 'pink' | 'sky' | 'yellow';

export interface WallpaperOptions {
    /** The app's accent, which tints the texture wallpapers. */
    tone?: WallpaperTone;
    dark?: boolean;
    /** Smaller pattern, for the swatches in the picker. */
    preview?: boolean;
}

export interface Wallpaper {
    id: string;
    name: string;
    group: 'Texture' | 'Colour';
    style: (options: WallpaperOptions) => CSSProperties;
}

// ---------------------------------------------------------------- texture wallpapers
// White marks on a tint, like WhatsApp's doodle background: drawn as SVG text, so there is nothing to download.

const BASE: Record<'light' | 'dark', Record<WallpaperTone, string>> = {
    light: { green: '#d6e6d9', pink: '#f3dde6', sky: '#d7e6f2', yellow: '#efe6c6' },
    dark: { green: '#0d1b17', pink: '#1d1219', sky: '#0d1722', yellow: '#14130a' },
};

const CELL_W = 8;
const CELL_H = 14;

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One <text> per row, with every character placed on the grid so the tile repeats seamlessly. */
const textRows = (rows: string[], cellW: number, cellH: number, fontSize: number): string =>
    rows.map((row, r) => {
        const xs: number[] = [];
        let chars = '';
        for (let c = 0; c < row.length; c++) {
            if (row[c] === ' ') continue;
            xs.push(c * cellW + cellW / 2);
            chars += escapeXml(row[c]);
        }
        return chars ? `<text x="${xs.join(' ')}" y="${r * cellH + fontSize}" text-anchor="middle">${chars}</text>` : '';
    }).join('');

const tileUrl = (rows: string[], ink: string): { url: string; width: number; height: number } => {
    const width = Math.max(...rows.map(row => row.length)) * CELL_W;
    const height = rows.length * CELL_H;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g font-family="Consolas,Menlo,'Courier New',monospace" font-size="12" font-weight="bold" fill="${ink}">${textRows(rows, CELL_W, CELL_H, 11)}</g></svg>`;
    return { url: svgUrl(svg), width, height };
};

const LOGO_CELL_W = 6;
const LOGO_CELL_H = 12;
const logoCache = new Map<string, string>();
const logoUrl = (ink: string): string => {
    let url = logoCache.get(ink);
    if (!url) {
        const width = Math.max(...LOGO_ASCII.map(row => row.length)) * LOGO_CELL_W;
        const height = LOGO_ASCII.length * LOGO_CELL_H;
        url = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g font-family="Consolas,Menlo,'Courier New',monospace" font-size="11" font-weight="bold" fill="${ink}">${textRows(LOGO_ASCII, LOGO_CELL_W, LOGO_CELL_H, 10)}</g></svg>`);
        logoCache.set(ink, url);
    }
    return url;
};

// Tiles are written with String.raw so backslashes stay as typed.
const T = String.raw;
const TILES: Record<string, string[]> = {
    dots: [
        T`.  .  .  .  .  .  .  .  .  .  .  .  `,
        T`  :  :  :  :  :  :  :  :  :  :  :  :`,
        T`.  .  '  .  .  '  .  .  '  .  .  '  `,
        T`  :  .  :  :  .  :  :  .  :  :  .  :`,
    ],
};

/** The logo (fixed in the centre) over a repeating tile, on a base colour. */
const layered = (base: string, logoInk: string, tile: { url: string; width: number; height: number }, scale: number, withLogo: boolean): CSSProperties => {
    const layers: string[] = [];
    const sizes: string[] = [];
    const repeats: string[] = [];
    const positions: string[] = [];
    if (withLogo) {
        layers.push(logoUrl(logoInk));
        sizes.push('auto 86%');
        repeats.push('no-repeat');
        positions.push('center');
    }
    layers.push(tile.url);
    sizes.push(`${tile.width * scale}px ${tile.height * scale}px`);
    repeats.push('repeat');
    positions.push('0 0');
    return {
        backgroundColor: base,
        backgroundImage: layers.join(', '),
        backgroundSize: sizes.join(', '),
        backgroundRepeat: repeats.join(', '),
        backgroundPosition: positions.join(', '),
    };
};

const texture = (id: string, name: string, tileId: string, withLogo = true): Wallpaper => ({
    id,
    name,
    group: 'Texture',
    style: ({ tone = 'green', dark = false, preview = false }) => {
        const tile = tileUrl(TILES[tileId], preview ? (dark ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,1)') : dark ? 'rgba(255,255,255,0.075)' : 'rgba(255,255,255,0.62)');
        return layered(BASE[dark ? 'dark' : 'light'][tone], dark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.9)', tile, preview ? 0.6 : 1, withLogo);
    },
});

// ---------------------------------------------------------------- hearts wallpaper
// Drawn hearts on deep rose, the same in every app and in both themes.

const HEART = 'M12 21C5 15 2 11 2 7.5C2 4.5 4.3 2.5 7 2.5C9 2.5 11 3.7 12 5.5C13 3.7 15 2.5 17 2.5C19.7 2.5 22 4.5 22 7.5C22 11 19 15 12 21Z';

interface Ink { base: string; fill: string; line: string }
const ROSE_NIGHT: Ink = { base: '#1d0f16', fill: 'rgba(255,255,255,0.06)', line: 'rgba(251,113,133,0.2)' };
const ROSE_NIGHT_PREVIEW: Ink = { base: '#1d0f16', fill: 'rgba(255,255,255,0.12)', line: 'rgba(251,113,133,0.5)' };

type Shape = [x: number, y: number, size: number, rotation: number];

/** A 24-unit path drawn at a position, size and angle; outlines keep their width at any size. */
const shape = (d: string, [x, y, size, rotation]: Shape, attrs: string) =>
    `<path d="${d}" transform="translate(${x} ${y}) rotate(${rotation}) scale(${size / 24}) translate(-12 -12)" vector-effect="non-scaling-stroke" ${attrs}/>`;

const romanticTile = (side: number, draw: (ink: Ink) => string, ink: Ink) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}"><g stroke-linecap="round" stroke-linejoin="round">${draw(ink)}</g></svg>`;
    return { url: svgUrl(svg), width: side, height: side };
};

const solid = (ink: Ink) => `fill="${ink.fill}" stroke="none"`;
const outline = (ink: Ink) => `fill="none" stroke="${ink.line}" stroke-width="1.3"`;
const dot = (ink: Ink, x: number, y: number) => `<circle cx="${x}" cy="${y}" r="1.5" fill="${ink.line}"/>`;

const HEARTS_SOLID: Shape[] = [[28, 28, 24, -14], [112, 22, 16, 14], [84, 76, 28, 8], [140, 112, 18, -12], [30, 104, 18, 16], [112, 146, 22, -8], [56, 146, 12, 0]];
const HEARTS_OUTLINE: Shape[] = [[66, 30, 12, 12], [146, 60, 12, -8], [20, 66, 12, 10], [60, 116, 14, -14], [96, 118, 10, 6], [140, 148, 10, 0]];
const drawHearts = (ink: Ink) =>
    HEARTS_SOLID.map(s => shape(HEART, s, solid(ink))).join('') +
    HEARTS_OUTLINE.map(s => shape(HEART, s, outline(ink))).join('') +
    [[48, 60], [130, 40], [70, 100], [150, 134], [10, 130]].map(([x, y]) => dot(ink, x, y)).join('');

const hearts: Wallpaper = {
    id: 'hearts',
    name: 'Hearts',
    group: 'Texture',
    style: ({ preview = false }) => {
        const ink = preview ? ROSE_NIGHT_PREVIEW : ROSE_NIGHT;
        return layered(ink.base, 'rgba(255,255,255,0.12)', romanticTile(160, drawHearts, ink), preview ? 0.6 : 1, true);
    },
};

// ---------------------------------------------------------------- colour wallpapers

const colour = (id: string, name: string, style: CSSProperties): Wallpaper => ({ id, name, group: 'Colour', style: () => style });

export const WALLPAPERS: Wallpaper[] = [
    texture('dots', 'Dots', 'dots'),
    hearts,
    colour('aurora', 'Aurora', {
        backgroundColor: '#0f2a33',
        backgroundImage: 'radial-gradient(ellipse at 20% 10%, rgba(45,212,191,0.45), transparent 55%), radial-gradient(ellipse at 85% 30%, rgba(99,102,241,0.40), transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(16,185,129,0.35), transparent 60%), linear-gradient(160deg, #0b1f2a, #123845 60%, #102a43)',
    }),
    colour('dusk', 'Dusk', { backgroundImage: 'linear-gradient(165deg, #fde2e4 0%, #e9d5ff 45%, #c7d2fe 100%)' }),
    colour('meadow', 'Meadow', {
        backgroundColor: '#dff3e4',
        backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.7), transparent 40%), radial-gradient(circle at 85% 80%, rgba(134,239,172,0.55), transparent 45%), linear-gradient(150deg, #e8f8ec, #bfe8cb)',
    }),
    colour('midnight', 'Midnight', {
        backgroundColor: '#0b1020',
        backgroundImage: 'radial-gradient(1.5px 1.5px at 20px 30px, rgba(255,255,255,0.7), transparent), radial-gradient(1px 1px at 90px 80px, rgba(255,255,255,0.5), transparent), radial-gradient(1.5px 1.5px at 150px 20px, rgba(255,255,255,0.6), transparent), linear-gradient(180deg, #0b1020, #1a1f3d)',
        backgroundSize: '180px 120px, 180px 120px, 180px 120px, 100% 100%',
    }),
];

/** What a chat shows until the reader picks something else. */
export const DEFAULT_WALLPAPER = 'wp:dots';

/** Stored as `wp:<id>` for a built-in wallpaper, `none` for the plain background; anything else is an uploaded image. */
export const presetValue = (id: string): string => `wp:${id}`;
export const isPreset = (value: string | null | undefined): value is string => !!value && value.startsWith('wp:');

/** From what was saved (nothing yet = the default) to the value a viewer keeps in state (null = plain). */
export const resolveWallpaper = (saved: string | null | undefined): string | null => (saved === 'none' ? null : saved || DEFAULT_WALLPAPER);

/** What to save for a value: built-in choices and "plain" are remembered, an uploaded image is too big to be. */
export const storableWallpaper = (value: string | null): string => (value === null ? 'none' : isPreset(value) ? value : '');

/** The CSS for a wallpaper value, or undefined for the plain background. */
export const wallpaperStyle = (value: string | null | undefined, options: WallpaperOptions = {}): CSSProperties | undefined => {
    if (!value) return undefined;
    if (isPreset(value)) return WALLPAPERS.find(w => presetValue(w.id) === value)?.style(options);
    return { backgroundImage: `url(${value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
};
