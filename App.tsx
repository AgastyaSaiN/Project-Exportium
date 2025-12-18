
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AppPage from './pages/AppPage';
import PrivacyBadge from './components/PrivacyBadge';

import TitleBar from './components/TitleBar';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans h-screen flex flex-col overflow-hidden">
        <TitleBar />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/app/:appName" element={<AppPage />} />
          </Routes>
          <PrivacyBadge />
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
