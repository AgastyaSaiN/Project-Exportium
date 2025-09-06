
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AppPage from './pages/AppPage';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/app/:appName" element={<AppPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;