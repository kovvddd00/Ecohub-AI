import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ColumnInfo {
  name: string;
  type: string;
  null_count: number;
  null_percentage: number;
  unique_count: number;
}

export interface DatasetInfo {
  row_count: number;
  col_count: number;
  columns: ColumnInfo[];
  preview: Record<string, any>[];
}

export interface DatasetStatus {
  loaded: boolean;
  filename?: string;
  is_cleaned?: boolean;
  info?: DatasetInfo;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  type: 'Linear Regression' | 'Logistic Regression' | 'K-Means Clustering';
  dataset: string;
  features: string[];
  target?: string;
  metrics: Record<string, any>;
  results: any;
}

export type PageId = 'home' | 'upload' | 'eda' | 'linear' | 'logistic' | 'kmeans' | 'results' | 'settings';

interface AppContextType {
  status: DatasetStatus;
  isLoading: boolean;
  error: string | null;
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  resultsHistory: HistoryItem[];
  modelsTrainedCount: number;
  darkMode: boolean;
  toggleDarkMode: () => void;
  uploadDataset: (file: File) => Promise<void>;
  removeDataset: () => Promise<void>;
  cleanDataset: (imputationStrategy: string) => Promise<void>;
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  refreshStatus: () => Promise<void>;
  loadSampleDataset: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_BASE = 'http://localhost:8000/api';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<DatasetStatus>({ loaded: false });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<PageId>('home');
  const [resultsHistory, setResultsHistory] = useState<HistoryItem[]>([]);
  const [modelsTrainedCount, setModelsTrainedCount] = useState<number>(0);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    refreshStatus();
    
    const saved = localStorage.getItem('ecohub_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setResultsHistory(parsed);
        setModelsTrainedCount(parsed.length);
      } catch (_e) {
        /* ignore parse errors */
      }
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const refreshStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/dataset/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.loaded) {
          setStatus({
            loaded: true,
            filename: data.filename,
            is_cleaned: data.is_cleaned,
            info: data.info
          });
        }
      }
    } catch (_err) {
      /* backend might not be running yet */
    }
  };

  const uploadDataset = async (file: File) => {
    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errDetail = await res.json();
        throw new Error(errDetail.detail || 'Failed to upload dataset');
      }

      const data = await res.json();
      setStatus({
        loaded: true,
        filename: data.filename,
        is_cleaned: data.is_cleaned,
        info: data.info
      });
      setActivePage('upload');
    } catch (err: any) {
      setError(err.message || 'Network error connecting to backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeDataset = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/dataset`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to remove dataset');
      }
      setStatus({ loaded: false });
    } catch (err: any) {
      setError(err.message || 'Error removing dataset.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleDataset = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/sample_dataset.csv');
      if (!response.ok) {
        throw new Error('Failed to fetch sample dataset');
      }
      const blob = await response.blob();
      const file = new File([blob], 'sample_dataset.csv', { type: 'text/csv' });
      await uploadDataset(file);
    } catch (err: any) {
      setError(err.message || 'Failed to load sample dataset.');
      setIsLoading(false);
    }
  };

  const cleanDataset = async (imputationStrategy: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imputation_strategy: imputationStrategy }),
      });

      if (!res.ok) {
        const errDetail = await res.json();
        throw new Error(errDetail.detail || 'Data cleaning failed');
      }

      const data = await res.json();
      setStatus({
        loaded: true,
        filename: data.filename,
        is_cleaned: data.is_cleaned,
        info: data.info
      });
    } catch (err: any) {
      setError(err.message || 'Cleaning failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString()
    };
    
    setResultsHistory(prev => {
      const updated = [newItem, ...prev];
      localStorage.setItem('ecohub_history', JSON.stringify(updated));
      return updated;
    });
    setModelsTrainedCount(prev => prev + 1);
  };

  const clearHistory = () => {
    setResultsHistory([]);
    setModelsTrainedCount(0);
    localStorage.removeItem('ecohub_history');
  };

  return (
    <AppContext.Provider
      value={{
        status,
        isLoading,
        error,
        activePage,
        setActivePage,
        resultsHistory,
        modelsTrainedCount,
        darkMode,
        toggleDarkMode,
        uploadDataset,
        removeDataset,
        cleanDataset,
        addHistoryItem,
        clearHistory,
        refreshStatus,
        loadSampleDataset
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
