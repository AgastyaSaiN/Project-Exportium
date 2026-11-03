
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AppPage from './pages/AppPage';
import ErrorBoundary from './components/ErrorBoundary';
import UpdateBanner from './components/UpdateBanner';


const App: React.FC = () => {
  return (
    <ErrorBoundary>
    <HashRouter>
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans h-screen flex flex-col overflow-hidden">
        <UpdateBanner />
        {/* Native TitleBar used */}
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/app/:appName" element={<AppPage />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
    </ErrorBoundary>
  );
};

export default App;
