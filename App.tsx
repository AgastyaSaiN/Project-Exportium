
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AppPage from './pages/AppPage';
import PrivacyBadge from './components/PrivacyBadge';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/app/:appName" element={<AppPage />} />
        </Routes>
        <PrivacyBadge />
      </div>
    </HashRouter>
  );
};

export default App;
