import React from 'react';

// --- Icon Components ---

const WhatsAppIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.35 3.45 16.86L2.05 22L7.31 20.62C8.75 21.41 10.36 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 6.45 17.5 2 12.04 2M12.04 3.67C16.56 3.67 20.28 7.39 20.28 11.91C20.28 16.43 16.56 20.15 12.04 20.15C10.56 20.15 9.14 19.78 7.9 19.11L7.53 18.91L4.42 19.75L5.27 16.73L5.06 16.36C4.32 15.03 3.8 13.5 3.8 11.91C3.8 7.39 7.52 3.67 12.04 3.67M16.57 14.45C16.37 14.35 15.28 13.84 15.08 13.76C14.88 13.69 14.75 13.65 14.61 13.85C14.47 14.05 14.03 14.59 13.89 14.76C13.76 14.92 13.62 14.95 13.42 14.85C13.22 14.75 12.38 14.48 11.38 13.61C10.61 12.92 10.09 12.1 9.94 11.83C9.79 11.56 9.92 11.44 10.04 11.32C10.15 11.21 10.29 11.03 10.42 10.89C10.55 10.75 10.6 10.65 10.73 10.42C10.86 10.18 10.79 9.98 10.73 9.85C10.66 9.71 10.15 8.45 9.92 7.85C9.69 7.25 9.46 7.31 9.3 7.31C9.14 7.31 8.97 7.31 8.81 7.31C8.65 7.31 8.41 7.38 8.21 7.58C8.01 7.78 7.47 8.28 7.47 9.38C7.47 10.48 8.24 11.51 8.38 11.68C8.51 11.85 10.15 14.43 12.72 15.54C13.33 15.8 13.79 15.96 14.16 16.08C14.72 16.25 15.21 16.22 15.6 16.15C16.03 16.07 17.02 15.53 17.22 14.96C17.42 14.39 17.42 13.92 17.35 13.82C17.28 13.72 17.15 13.65 16.95 13.55C16.75 13.45 16.64 13.42 16.57 14.45Z" />
  </svg>
);

const InstagramIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
);

const SnapchatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12.002 2.006C7.584 2.006 4 5.592 4 10.005v.553c0 3.328 1.463 6.324 3.82 8.256.002.002.004.004.006.005a.707.707 0 00.708-.002c.22-.16.37-.41.37-.68V16.5c0-.414.336-.75.75-.75h6.69c.414 0 .75.336.75.75v1.64c0 .268.15.52.37.68.002.001.003.003.005.004a.707.707 0 00.708 0c2.357-1.933 3.82-4.928 3.82-8.256v-.553c0-4.413-3.584-8-7.998-8zM9.001 9.505c-.828 0-1.5-.895-1.5-2s.672-2 1.5-2 1.5.895 1.5 2-.672 2-1.5 2zm6 0c-.828 0-1.5-.895-1.5-2s.672-2 1.5-2 1.5.895 1.5 2-.672 2-1.5 2z" />
    </svg>
);

const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
);

const FacebookIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4z" />
    </svg>
);

const TelegramIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M9.78 18.65l.28-4.23l7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3L3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.58c-.28 1.13-1.02 1.4-1.74.88l-4.98-3.6-2.32 2.2a.83.83 0 0 1-.72.31z" />
    </svg>
);

const GmailIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4.58l-8 5-8-5V6.42l8 5 8-5v2.16z" />
    </svg>
);

const YouTubeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25.9.83 1.48 1.73 1.73.47-.13 1.33.22 2.65.28 1.3.07 2.49.1 3.59.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
    </svg>
);

// --- Platform Data Structure ---

export interface Platform {
  name: string;
  slug: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  color: string;
}

export const PLATFORMS: Platform[] = [
  { name: 'Instagram', slug: 'instagram', icon: InstagramIcon, color: 'text-pink-500' },
  { name: 'WhatsApp', slug: 'whatsapp', icon: WhatsAppIcon, color: 'text-green-500' },
  { name: 'Snapchat', slug: 'snapchat', icon: SnapchatIcon, color: 'text-yellow-400' },
  { name: 'Telegram', slug: 'telegram', icon: TelegramIcon, color: 'text-sky-500' },
];
