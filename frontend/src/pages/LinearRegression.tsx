import React, { useState, useEffect } from 'react';
import { useApp, API_BASE } from '../context/AppContext';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';
import { Play, CheckCircle, TrendingUp } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';

interface RegressionResults {
  mae: number; mse: number; rmse: number; r2_score: number;
  coefficients: Record<string, number>; intercept: number;
  comparison: { actual: number; predicted: number; residual: number }[];
  data_points_used: number;
}

export const LinearRegression: React.FC = () => {
  const { status, addHistoryItem } = useApp();
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [results, setResults] = useState<RegressionResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status.loaded && status.info) {
      const nc = status.info.columns.filter(c => c.type.includes('int') || c.type.includes('float')).map(c => c.name);
      if (nc.length > 1) {
        setSelectedTarget(nc[nc.length - 1]);
        setSelectedFeatures(nc.slice(0, nc.length - 1));
      }
    }
  }, [status.loaded, status.info]);

  const handleRun = async () => {
    if (!selectedTarget || selectedFeatures.length === 0) { setError('Select target and features.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/linear-regression`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: selectedFeatures, target: selectedTarget }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed');
      const data: RegressionResults = await res.json();
      setResults(data);
      addHistoryItem({ type: 'Linear Regression', dataset: status.filename || '', features: selectedFeatures, target: selectedTarget,
        metrics: { 'R²': data.r2_score, MAE: data.mae, MSE: data.mse, RMSE: data.rmse },
        results: { coefficients: data.coefficients, intercept: data.intercept, data_points_used: data.data_points_used } });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  if (!status.loaded) return <EmptyState icon={<TrendingUp className="w-6 h-6" />} title="No Dataset" description="Upload a dataset first." />;

  const numericCols = status.info?.columns.filter(c => c.type.includes('int') || c.type.includes('float')).map(c => c.name) || [];

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-[var(--color-text)] flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-400" /> Linear Regression
        </h1>
        <p className="text-xs text-[var(--color-text-dim)] mt-1">Model continuous targets using OLS regression.</p>
      </div>

      {error && <div className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 px-3 py-2 rounded-lg">{error}</div>}

      <div className="grid grid-cols-3 gap-4">
        {/* Config */}
        <div className="col-span-1 card-base p-4 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Configuration</h3>
          <div className="space-y-1.5">
            <label className="text-[11px] text-[var(--color-text-dim)] font-medium">Target</label>
            <select value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)} className="input-base text-xs">
              <option value="">Select...</option>
              {numericCols.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-[var(--color-text-dim)] font-medium">Features</label>
            <div className="space-y-1 max-h-40 overflow-y-auto border border-border p-2 rounded-lg bg-bg-input">
              {numericCols.map((c, i) => (
                <label key={i} className="flex items-center gap-2 text-xs py-0.5 cursor-pointer">
                  <input type="checkbox" checked={selectedFeatures.includes(c)} disabled={c === selectedTarget}
                    onChange={() => setSelectedFeatures(p => p.includes(c) ? p.filter(f => f !== c) : [...p, c])}
                    className="w-3.5 h-3.5 rounded border-border-hover bg-bg-input text-emerald-500 focus:ring-emerald-500" />
                  <span className={c === selectedTarget ? 'text-[#374151] line-through' : 'text-[var(--color-text-muted)]'}>{c}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleRun} disabled={loading} className="w-full btn-primary text-xs py-2 disabled:opacity-50">
            <Play className="w-3 h-3" />
            <span>{loading ? 'Training...' : 'Train Model'}</span>
          </button>
        </div>

        {/* Results */}
        <div className="col-span-2 space-y-4">
          {!results && !loading && (
            <div className="card-base flex flex-col items-center justify-center py-16 text-center">
              <TrendingUp className="w-10 h-10 text-emerald-500/20 mb-2" />
              <p className="text-xs text-[var(--color-text-dim)]">Configure and click Train Model to start.</p>
            </div>
          )}
          {loading && (
            <div className="card-base flex flex-col items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-[var(--color-text-dim)]">Training on backend...</p>
            </div>
          )}
          {results && !loading && (<>
            <div className="grid grid-cols-4 gap-3">
              {[{ n: 'R² Score', v: results.r2_score }, { n: 'MAE', v: results.mae }, { n: 'RMSE', v: results.rmse }, { n: 'Samples', v: results.data_points_used }].map((m, i) => (
                <div key={i} className="card-base p-3">
                  <p className="text-[10px] text-[var(--color-text-dim)] uppercase font-semibold tracking-wider">{m.n}</p>
                  <p className="text-lg font-bold text-gradient mt-0.5 font-display">{typeof m.v === 'number' && m.n !== 'Samples' ? m.v.toFixed(4) : m.v}</p>
                </div>
              ))}
            </div>
            <div className="card-base p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Equation</h4>
              </div>
              <div className="font-mono text-xs bg-bg-input text-[var(--color-text-muted)] p-3 rounded-lg border border-border overflow-x-auto">
                <span className="text-[var(--color-text)]">{selectedTarget}</span> = {results.intercept.toFixed(4)}
                {Object.entries(results.coefficients).map(([col, coef]) => (
                  <span key={col} className="block pl-4">
                    {coef >= 0 ? '+ ' : '- '}{Math.abs(coef).toFixed(4)} × <span className="text-emerald-400">{col}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="card-base p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Actual vs Predicted</h3>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,41,55,0.6)" />
                    <XAxis type="number" dataKey="actual" stroke="#4B5563" fontSize={10} tickLine={false}>
                      <Label value="Actual" offset={-10} position="insideBottom" fill="#6B7280" style={{ fontSize: 10 }} />
                    </XAxis>
                    <YAxis type="number" dataKey="predicted" stroke="#4B5563" fontSize={10} tickLine={false}>
                      <Label value="Predicted" angle={-90} position="insideLeft" fill="#6B7280" style={{ fontSize: 10 }} />
                    </YAxis>
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                    <Scatter name="Predictions" data={results.comparison} fill="#10B981" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
};
