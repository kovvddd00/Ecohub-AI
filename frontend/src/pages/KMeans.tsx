import React, { useState, useEffect } from 'react';
import { useApp, API_BASE } from '../context/AppContext';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { Play, Target } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';

interface KMeansResults {
  elbow_data: { k: number; inertia: number }[];
  silhouette_score: number;
  cluster_centers_2d: { pc1: number; pc2: number; cluster: number }[];
  points: { pc1: number; pc2: number; cluster: number; original_index: number }[];
  explained_variance: number[];
  data_points_used: number;
}

const COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#6366f1'];

export const KMeans: React.FC = () => {
  const { status, addHistoryItem } = useApp();
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [kSelected, setKSelected] = useState(3);
  const [results, setResults] = useState<KMeansResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status.loaded && status.info) {
      const nc = status.info.columns.filter(c => c.type.includes('int') || c.type.includes('float')).map(c => c.name);
      if (nc.length > 1) setSelectedFeatures(nc.slice(0, 3));
    }
  }, [status.loaded, status.info]);

  const handleRun = async () => {
    if (selectedFeatures.length === 0) { setError('Select features.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/kmeans`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: selectedFeatures, k_selected: kSelected, k_max: 10 }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed');
      const data: KMeansResults = await res.json();
      setResults(data);
      addHistoryItem({ type: 'K-Means Clustering', dataset: status.filename || '', features: selectedFeatures,
        metrics: { 'K': kSelected, 'Silhouette': data.silhouette_score, 'Var PC1': data.explained_variance[0], 'Var PC2': data.explained_variance[1] },
        results: { data_points_used: data.data_points_used } });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  if (!status.loaded) return <EmptyState icon={<Target className="w-6 h-6" />} title="No Dataset" description="Upload a dataset first." />;

  const numericCols = status.info?.columns.filter(c => c.type.includes('int') || c.type.includes('float')).map(c => c.name) || [];

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
          <Target className="w-6 h-6 text-emerald-400" /> K-Means Clustering
        </h1>
        <p className="text-xs text-[#6B7280] mt-1">Unsupervised cluster analysis with PCA visualization.</p>
      </div>

      {error && <div className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 px-3 py-2 rounded-lg">{error}</div>}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 card-base p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white">Configuration</h3>
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#6B7280] font-medium">Clusters (K)</label>
            <select value={kSelected} onChange={e => setKSelected(parseInt(e.target.value))} className="input-base text-xs">
              {[2, 3, 4, 5, 6, 7, 8].map(k => <option key={k} value={k}>{k} Clusters</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#6B7280] font-medium">Features</label>
            <div className="space-y-1 max-h-40 overflow-y-auto border border-[#1F2937] p-2 rounded-lg bg-[#0d1526]">
              {numericCols.map((c, i) => (
                <label key={i} className="flex items-center gap-2 text-xs py-0.5 cursor-pointer">
                  <input type="checkbox" checked={selectedFeatures.includes(c)}
                    onChange={() => setSelectedFeatures(p => p.includes(c) ? p.filter(f => f !== c) : [...p, c])}
                    className="w-3.5 h-3.5 rounded border-[#374151] bg-[#0d1526] text-emerald-500 focus:ring-emerald-500" />
                  <span className="text-[#9CA3AF]">{c}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleRun} disabled={loading} className="w-full btn-primary text-xs py-2 disabled:opacity-50">
            <Play className="w-3 h-3" /><span>{loading ? 'Clustering...' : 'Run Clustering'}</span>
          </button>
        </div>

        <div className="col-span-2 space-y-4">
          {!results && !loading && (
            <div className="card-base flex flex-col items-center justify-center py-16 text-center">
              <Target className="w-10 h-10 text-emerald-500/20 mb-2" />
              <p className="text-xs text-[#6B7280]">Select features and click Run Clustering.</p>
            </div>
          )}
          {loading && (
            <div className="card-base flex flex-col items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-[#6B7280]">Computing clusters...</p>
            </div>
          )}
          {results && !loading && (<>
            <div className="grid grid-cols-3 gap-3">
              {[
                { n: 'Silhouette', v: results.silhouette_score.toFixed(4) },
                { n: 'PCA Variance', v: `${((results.explained_variance[0] + results.explained_variance[1]) * 100).toFixed(1)}%` },
                { n: 'Samples', v: results.data_points_used },
              ].map((m, i) => (
                <div key={i} className="card-base p-3">
                  <p className="text-[10px] text-[#6B7280] uppercase font-semibold tracking-wider">{m.n}</p>
                  <p className="text-lg font-bold text-gradient mt-0.5 font-display">{m.v}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="card-base p-4">
                <h3 className="text-sm font-semibold text-white mb-1">Elbow Method</h3>
                <p className="text-[11px] text-[#6B7280] mb-2">Inertia vs K</p>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={results.elbow_data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,41,55,0.6)" />
                      <XAxis dataKey="k" stroke="#4B5563" fontSize={10} tickLine={false} />
                      <YAxis stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="inertia" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card-base p-4">
                <h3 className="text-sm font-semibold text-white mb-1">PCA Clusters</h3>
                <p className="text-[11px] text-[#6B7280] mb-2">2D projection</p>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,41,55,0.6)" />
                      <XAxis type="number" dataKey="pc1" stroke="#4B5563" fontSize={10} tickLine={false} />
                      <YAxis type="number" dataKey="pc2" stroke="#4B5563" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                      <Scatter name="Clusters" data={results.points}>
                        {results.points.map((entry, i) => (
                          <Cell key={i} fill={COLORS[entry.cluster % COLORS.length]} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
};
