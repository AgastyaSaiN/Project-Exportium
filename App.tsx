
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AppPage from './pages/AppPage';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="bg-white text-slate-800 font-sans">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/app/:appName" element={<AppPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;