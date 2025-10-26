
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { PLATFORMS } from '../constants';
import SnapchatPage from './apps/snapchat/SnapchatPage';
import InstagramPage from './apps/InstagramPage';
import WhatsAppPage from './apps/whatsapp/WhatsAppPage';
import TelegramPage from './apps/telegram/TelegramPage';


const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
);


const AppPage: React.FC = () => {
    const { appName } = useParams<{ appName: string }>();
    const platform = PLATFORMS.find(p => p.slug === appName);

    if (!platform) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-4">
                <h1 className="text-4xl font-bold text-red-500 mb-4">Platform Not Found</h1>
                <p className="text-lg text-gray-600 mb-8">The application '{appName}' is not supported.</p>
                <Link
                    to="/"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300"
                >
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    Back to Home
                </Link>
            </div>
        );
    }

    // Render specific component based on the platform slug
    if (platform.slug === 'snapchat') {
        return <SnapchatPage platform={platform} />;
    }
    if (platform.slug === 'instagram') {
        return <InstagramPage platform={platform} />;
    }
    if (platform.slug === 'whatsapp') {
        return <WhatsAppPage platform={platform} />;
    }
    if (platform.slug === 'telegram') {
        return <TelegramPage platform={platform} />;
    }


    // Fallback in case PLATFORMS constant is modified to include other apps without adding logic here.
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="text-center">
                <platform.icon className={`w-24 h-24 mx-auto mb-6 ${platform.color}`} />
                <h1 className="text-5xl font-bold text-gray-900">
                    {platform.name} Archive
                </h1>
                <p className="mt-4 text-xl text-gray-500">
                    Importer not implemented for {platform.name}.
                </p>
                <div className="mt-12">
                     <Link
                        to="/"
                        className="inline-flex items-center px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-300"
                    >
                        <ArrowLeftIcon className="w-5 h-5 mr-2" />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AppPage;