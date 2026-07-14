import React from 'react';
import { useApp } from '../context/AppContext';
import { Brain, Trash2, Calendar, FileText } from 'lucide-react';

export const Results: React.FC = () => {
  const { resultsHistory, clearHistory } = useApp();

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-[var(--color-text)]">Reports</h1>
          <p className="text-xs text-[var(--color-text-dim)] mt-1">Review results from models trained during this session.</p>
        </div>
        {resultsHistory.length > 0 && (
          <button onClick={clearHistory} className="btn-danger text-xs">
            <Trash2 className="w-3 h-3" /><span>Clear History</span>
          </button>
        )}
      </div>

      {resultsHistory.length === 0 ? (
        <div className="card-base flex flex-col items-center justify-center py-16 text-center">
          <Brain className="w-12 h-12 text-emerald-500/15 mb-3" />
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">No Models Trained</h3>
          <p className="text-xs text-[var(--color-text-dim)] max-w-sm">
            Train a model from Linear Regression, Logistic Regression, or K-Means to see results here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {resultsHistory.map((item) => (
            <div key={item.id} className="card-base p-4 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="badge badge-emerald">{item.type}</span>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-dim)]">
                    <FileText className="w-3 h-3" />
                    <span className="font-medium text-[var(--color-text-muted)] max-w-[200px] truncate">{item.dataset}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-dim)]">
                  <Calendar className="w-3 h-3" />
                  <span>{item.timestamp}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-dim)]">
                <span className="font-medium">Features:</span>
                <span>{item.features.join(', ')}</span>
                {item.target && (
                  <span className="ml-2">→ <strong className="text-emerald-400">{item.target}</strong></span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-3 border-t border-border pt-3">
                {Object.entries(item.metrics).map(([name, val], i) => {
                  const isPercent = name === 'Accuracy' || name === 'Precision' || name === 'Recall' || name === 'F1 Score';
                  const display = isPercent ? `${(val * 100).toFixed(1)}%` : typeof val === 'number' ? val.toFixed(4) : val;
                  return (
                    <div key={i} className="bg-bg-input p-2.5 rounded-lg border border-border">
                      <p className="text-[9px] text-[var(--color-text-dim)] uppercase font-semibold tracking-wider">{name}</p>
                      <p className="text-sm font-bold text-gradient mt-0.5 font-display">{display}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
