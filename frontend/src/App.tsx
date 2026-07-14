import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { Upload } from './pages/Upload';
import { EDA } from './pages/EDA';
import { LinearRegression } from './pages/LinearRegression';
import { LogisticRegression } from './pages/LogisticRegression';
import { KMeans } from './pages/KMeans';
import { Results } from './pages/Results';
import { SettingsPage } from './pages/Settings';
import { AnimatePresence, motion } from 'framer-motion';

const MainContent: React.FC = () => {
  const { activePage } = useApp();

  const renderPage = () => {
    switch (activePage) {
      case 'home': return <Home />;
      case 'upload': return <Upload />;
      case 'eda': return <EDA />;
      case 'linear': return <LinearRegression />;
      case 'logistic': return <LogisticRegression />;
      case 'kmeans': return <KMeans />;
      case 'results': return <Results />;
      case 'settings': return <SettingsPage />;
      default: return <Home />;
    }
  };

  return (
    <div className="ml-60 flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <div className="min-h-screen bg-bg-app">
        <Sidebar />
        <MainContent />
      </div>
    </AppProvider>
  );
};

export default App;
