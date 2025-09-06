
import React from 'react';
import { Link } from 'react-router-dom';

interface PlatformCardProps {
  name: string;
  slug: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  color: string;
}

const PlatformCard: React.FC<PlatformCardProps> = ({ name, slug, icon: Icon, color }) => {
  const colorMap: { [key: string]: string } = {
    'text-pink-500': 'shadow-pink-500/25',
    'text-green-500': 'shadow-green-500/25',
    'text-gray-800': 'shadow-gray-500/25',
    'text-blue-600': 'shadow-blue-600/25',
    'text-sky-500': 'shadow-sky-500/25',
    'text-red-500': 'shadow-red-500/25',
    'text-red-600': 'shadow-red-600/25',
  };
  const hoverShadow = colorMap[color] || 'shadow-gray-500/25';

  return (
    <Link
      to={`/app/${slug}`}
      className={`group flex flex-col items-center justify-center p-3.5 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 hover:shadow-[-5px_10px_30px_0px] hover:${hoverShadow}`}
    >
      <div className={`relative w-12 h-12 flex items-center justify-center rounded-full bg-slate-100`}>
          <Icon className={`w-8 h-8 ${color} transition-colors duration-300`} />
      </div>
      <span className="mt-2 text-sm font-medium text-slate-800 text-center">{name}</span>
    </Link>
  );
};

export default PlatformCard;