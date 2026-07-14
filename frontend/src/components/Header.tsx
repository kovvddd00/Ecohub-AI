import React from 'react';
import { useApp, type PageId } from '../context/AppContext';
import { Database, Search, Bell } from 'lucide-react';

const pageTitles: Record<PageId, string> = {
  home: 'Dashboard',
  upload: 'Dataset',
  eda: 'Exploratory Data Analysis',
  linear: 'Linear Regression',
  logistic: 'Logistic Regression',
  kmeans: 'K-Means Clustering',
  results: 'Reports',
  settings: 'Settings',
};

export const Header: React.FC = () => {
  const { activePage, status } = useApp();

  return (
    <header className="h-14 border-b border-border bg-bg-app/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Left — Page title */}
      <h2 className="font-display font-semibold text-sm text-[var(--color-text)] tracking-tight">
        {pageTitles[activePage]}
      </h2>

      {/* Right — Controls */}
      <div className="flex items-center gap-3">
        {/* Dataset Status */}
        {status.loaded ? (
          <div className="flex items-center gap-2 text-xs bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-md font-medium">
            <Database className="w-3 h-3" />
            <span className="max-w-[120px] truncate">{status.filename}</span>
            <span className="flex h-1.5 w-1.5">
              <span className="animate-ping absolute h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-dim)] px-2.5 py-1 rounded-md border border-border font-medium">
            <Database className="w-3 h-3" />
            <span>No Dataset</span>
          </div>
        )}

        {/* Search placeholder */}
        <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)] hover:border-border-hover transition-colors">
          <Search className="w-3.5 h-3.5" />
        </button>

        {/* Notifications placeholder */}
        <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)] hover:border-border-hover transition-colors relative">
          <Bell className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
