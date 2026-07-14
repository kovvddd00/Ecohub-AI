import React, { useState, useEffect } from 'react';
import { useApp, API_BASE } from '../context/AppContext';
import { StatCard } from '../components/StatCard';
import { ModelCard } from '../components/ModelCard';
import {
  Rows3,
  Columns3,
  AlertTriangle,
  Brain,
  Upload,
  FlaskConical,
  TrendingUp,
  GitBranch,
  Target,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export const Home: React.FC = () => {
  const { status, loadSampleDataset, setActivePage, isLoading, modelsTrainedCount, resultsHistory } = useApp();
  const [histData, setHistData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [numericCols, setNumericCols] = useState<string[]>([]);

  // Fetch EDA data when dataset is loaded for dashboard charts
  useEffect(() => {
    if (status.loaded) {
      fetchDashboardCharts();
    }
  }, [status.loaded]);

  const fetchDashboardCharts = async () => {
    try {
      const res = await fetch(`${API_BASE}/eda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        setNumericCols(data.numeric_columns || []);
        // Get first numeric column histogram
        if (data.histograms && data.numeric_columns?.length > 0) {
          const firstCol = data.numeric_columns[0];
          setHistData(data.histograms[firstCol] || []);
        }
        setHeatmapData(data.heatmap || []);
      }
    } catch (_err) {
      /* silently fail for dashboard charts */
    }
  };

  const totalNulls = status.info?.columns.reduce((acc, col) => acc + col.null_count, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* ── Hero Section ── */}
      <div className="flex items-start justify-between gap-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold font-display tracking-tight text-[var(--color-text)]">
            EcoHub <span className="text-gradient">AI</span>
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] font-medium">
            AI-Powered Sustainability Analytics Platform
          </p>
          <p className="text-xs text-[var(--color-text-dim)] max-w-lg leading-relaxed">
            Upload environmental datasets, run machine learning models, and extract actionable insights
            from sustainability metrics — all in a streamlined interface powered by scikit-learn.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setActivePage('upload')}
              className="btn-primary text-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Dataset</span>
            </button>
            <button
              onClick={loadSampleDataset}
              disabled={isLoading}
              className="btn-ghost text-sm"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Loading...' : 'Use Sample Dataset'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Statistics Row ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Rows3 className="w-4 h-4" />}
          label="Rows"
          value={status.info?.row_count ?? '—'}
          delay={0}
        />
        <StatCard
          icon={<Columns3 className="w-4 h-4" />}
          label="Columns"
          value={status.info?.col_count ?? '—'}
          delay={0.05}
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Missing Values"
          value={status.loaded ? totalNulls : '—'}
          subtitle={status.loaded && totalNulls > 0 ? 'Imputation needed' : undefined}
          delay={0.1}
        />
        <StatCard
          icon={<Brain className="w-4 h-4" />}
          label="Models Trained"
          value={modelsTrainedCount}
          delay={0.15}
        />
      </div>

      {/* ── Two-Column Grid: Preview + Summary ── */}
      {status.loaded && status.info && (
        <div className="grid grid-cols-5 gap-4">
          {/* Left — Dataset Preview Table */}
          <div className="col-span-3 card-base overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">Dataset Preview</h3>
              <button
                onClick={() => setActivePage('upload')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
              >
                View Full <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto max-h-[220px]">
              <table className="table-base">
                <thead>
                  <tr>
                    {status.info.preview.length > 0 &&
                      Object.keys(status.info.preview[0]).map((key, i) => (
                        <th key={i}>{key}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {status.info.preview.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx}>
                      {Object.values(row).map((val, cIdx) => (
                        <td key={cIdx} className="max-w-[120px] truncate">
                          {val === null || val === undefined ? (
                            <span className="text-amber-500/80 text-[10px] font-mono">null</span>
                          ) : typeof val === 'number' ? (
                            Math.round(val * 100) / 100
                          ) : (
                            String(val)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right — Dataset Summary */}
          <div className="col-span-2 card-base p-4 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Dataset Summary</h3>

            <div className="space-y-2.5">
              {/* Column Types */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-dim)]">Numeric Columns</span>
                <span className="text-[var(--color-text)] font-medium">
                  {status.info.columns.filter(c => c.type.includes('int') || c.type.includes('float')).length}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-dim)]">Categorical Columns</span>
                <span className="text-[var(--color-text)] font-medium">
                  {status.info.columns.filter(c => !c.type.includes('int') && !c.type.includes('float')).length}
                </span>
              </div>
              <div className="h-px bg-border" />

              {/* Missing Values */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-dim)]">Total Missing</span>
                <span className={`font-medium ${totalNulls > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {totalNulls}
                </span>
              </div>

              {/* Cleaning Status */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-dim)]">Status</span>
                {status.is_cleaned ? (
                  <span className="badge badge-emerald">Cleaned</span>
                ) : (
                  <span className="badge badge-amber">Raw</span>
                )}
              </div>
              <div className="h-px bg-border" />

              {/* Duplicates */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-dim)]">Filename</span>
                <span className="text-[var(--color-text)] font-medium text-[11px] max-w-[140px] truncate">{status.filename}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Charts Row: Heatmap + Distribution ── */}
      {status.loaded && (histData.length > 0 || heatmapData.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {/* Left — Correlation Heatmap */}
          <div className="card-base overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">Correlation Heatmap</h3>
              <p className="text-[11px] text-[var(--color-text-dim)]">Pearson correlation matrix</p>
            </div>
            <div className="p-3 overflow-auto max-h-[220px]">
              {heatmapData.length > 0 && numericCols.length > 0 ? (
                <div
                  className="grid gap-[2px] min-w-[300px]"
                  style={{ gridTemplateColumns: `repeat(${numericCols.length}, minmax(0, 1fr))` }}
                >
                  {heatmapData.map((cell, idx) => {
                    const val = cell.value;
                    const bgColor = val >= 0
                      ? `rgba(16, 185, 129, ${val * 0.7 + 0.05})`
                      : `rgba(239, 68, 68, ${Math.abs(val) * 0.7 + 0.05})`;
                    const textColor = Math.abs(val) > 0.35 ? '#fff' : '#9CA3AF';

                    return (
                      <div
                        key={idx}
                        title={`${cell.x} × ${cell.y}: ${val.toFixed(3)}`}
                        className="h-10 rounded flex items-center justify-center text-[10px] font-mono font-medium cursor-default hover:scale-105 transition-transform"
                        style={{ backgroundColor: bgColor, color: textColor }}
                      >
                        {val.toFixed(1)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-dim)] text-center py-8">No correlation data available</p>
              )}
            </div>
          </div>

          {/* Right — Distribution Chart */}
          <div className="card-base overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">Distribution</h3>
              <p className="text-[11px] text-[var(--color-text-dim)]">{numericCols[0] || 'First numeric column'}</p>
            </div>
            <div className="p-3 h-[200px]">
              {histData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histData} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(31,41,55,0.6)" />
                    <XAxis dataKey="bin" stroke="#4B5563" fontSize={10} tickLine={false} />
                    <YAxis stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#111827',
                        border: '1px solid #1F2937',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="count" fill="#10B981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-[var(--color-text-dim)] text-center py-16">No distribution data</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ML Model Cards ── */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Machine Learning Models</h3>
        <div className="grid grid-cols-3 gap-4">
          <ModelCard
            icon={<TrendingUp className="w-4 h-4" />}
            title="Linear Regression"
            description="Predict continuous targets with OLS"
            status={status.loaded ? 'ready' : 'not-run'}
            onRun={() => setActivePage('linear')}
            delay={0}
          />
          <ModelCard
            icon={<GitBranch className="w-4 h-4" />}
            title="Logistic Regression"
            description="Binary classification with logit"
            status={status.loaded ? 'ready' : 'not-run'}
            onRun={() => setActivePage('logistic')}
            delay={0.05}
          />
          <ModelCard
            icon={<Target className="w-4 h-4" />}
            title="K-Means Clustering"
            description="Unsupervised cluster analysis"
            status={status.loaded ? 'ready' : 'not-run'}
            onRun={() => setActivePage('kmeans')}
            delay={0.1}
          />
        </div>
      </div>

      {/* ── Recent Results ── */}
      {resultsHistory.length > 0 && (
        <div className="card-base overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Recent Results</h3>
            <button
              onClick={() => setActivePage('results')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
            >
              View All <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Time</th>
                  {Object.keys(resultsHistory[0].metrics).slice(0, 4).map((key, i) => (
                    <th key={i} className="text-right">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultsHistory.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="badge badge-emerald">{item.type}</span>
                    </td>
                    <td className="text-[var(--color-text-dim)]">{item.timestamp}</td>
                    {Object.values(item.metrics).slice(0, 4).map((val, i) => {
                      const isPercent = typeof val === 'number' && val <= 1 && val >= 0;
                      return (
                        <td key={i} className="text-right font-mono text-emerald-400 text-xs">
                          {isPercent ? `${(val * 100).toFixed(1)}%` : typeof val === 'number' ? val.toFixed(4) : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
