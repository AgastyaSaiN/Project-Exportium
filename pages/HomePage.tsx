import React from 'react';
import { PLATFORMS } from '../constants';
import PlatformCard from '../components/PlatformCard';
import LogoIcon from '../components/LogoIcon';

const HomePage: React.FC = () => {
  const [radius, setRadius] = React.useState(250);

  React.useEffect(() => {
    const updateRadius = () => {
      if (window.innerWidth >= 1280) {
        setRadius(280);
      } else if (window.innerWidth >= 1024) {
        setRadius(240);
      } else if (window.innerWidth >= 768) {
        setRadius(200);
      } else if (window.innerWidth >= 640) {
        setRadius(160);
      } else {
        setRadius(130);
      }
    };

    updateRadius();
    window.addEventListener('resize', updateRadius);
    return () => window.removeEventListener('resize', updateRadius);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
       <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-slate-900 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:6rem_4rem]"><div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_100%_200px,#d5c5ff,transparent)] dark:bg-[radial-gradient(circle_800px_at_100%_200px,#3f3c5f,transparent)]"></div></div>
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tight">
            Project Keicei v1
          </h1>
          <p className="mt-3 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Your exported data, beautifully reimagined.
          </p>
        </header>

        <div 
          className="relative flex items-center justify-center transition-all duration-300"
          style={{ height: `${radius * 2 + 120}px`, width: `${radius * 2 + 120}px` }}
        >
          <LogoIcon
            aria-label="Project Keicei Logo"
            className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 transition-all duration-300 ease-in-out"
          />

          <div className="absolute top-0 left-0 w-full h-full">
            {PLATFORMS.map((platform, index) => {
              const angle = (index / PLATFORMS.length) * 2 * Math.PI - (Math.PI / 2); // Start from top
              const x = radius * Math.cos(angle);
              const y = radius * Math.sin(angle);

              return (
                <div
                  key={platform.slug}
                  className="absolute top-1/2 left-1/2 transition-transform duration-500 ease-out"
                  style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
                >
                  <PlatformCard
                    name={platform.name}
                    slug={platform.slug}
                    icon={platform.icon}
                    color={platform.color}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="w-full py-6 text-center mt-auto">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Privacy First. All data stays on your device.
        </p>
      </footer>
    </div>
  );
};

export default HomePage;