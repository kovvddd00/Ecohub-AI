import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid, Label } from 'recharts';
import { BarChart3, Eye, GitCommit, Grid3x3 } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';

interface EdaData {
  numeric_columns: string[];
  categorical_columns: string[];
  summary_stats: Record<string, any>;
  histograms: Record<string, any[]>;
  boxplots: Record<string, any>;
  heatmap: { x: string; y: string; value: number }[];
  scatter: { x: number; y: number; id: number }[];
}

type TabId = 'histogram' | 'boxplot' | 'scatter' | 'heatmap';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'histogram', label: 'Histograms', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { id: 'boxplot', label: 'Box Plots', icon: <Eye className="w-3.5 h-3.5" /> },
  { id: 'scatter', label: 'Scatter', icon: <GitCommit className="w-3.5 h-3.5" /> },
  { id: 'heatmap', label: 'Heatmap', icon: <Grid3x3 className="w-3.5 h-3.5" /> },
];

export const EDA: React.FC = () => {
  const { status } = useApp();
  const [edaData, setEdaData] = useState<EdaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('histogram');
  const [selectedHistCol, setSelectedHistCol] = useState<string>('');
  const [selectedBoxCol, setSelectedBoxCol] = useState<string>('');
  const [scatterX, setScatterX] = useState<string>('');
  const [scatterY, setScatterY] = useState<string>('');

  useEffect(() => { if (status.loaded) fetchEdaData(); }, [status.loaded]);

  useEffect(() => {
    if (edaData?.numeric_columns.length) {
      if (!selectedHistCol) setSelectedHistCol(edaData.numeric_columns[0]);
      if (!selectedBoxCol) setSelectedBoxCol(edaData.numeric_columns[0]);
      if (!scatterX) setScatterX(edaData.numeric_columns[0]);
      if (!scatterY) setScatterY(edaData.numeric_columns[Math.min(1, edaData.numeric_columns.length - 1)]);
    }
  }, [edaData]);

  useEffect(() => {
    if (status.loaded && scatterX && scatterY) fetchEdaData(scatterX, scatterY);
  }, [scatterX, scatterY]);

  const fetchEdaData = async (xCol?: string, yCol?: string) => {
    setLoading(true);
    setLocalError(null);
    try {
      const body: Record<string, string> = {};
      if (xCol) body.x_col = xCol;
      if (yCol) body.y_col = yCol;
      const res = await fetch('http://localhost:8000/api/eda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'EDA failed');
      const data = await res.json();
      setEdaData(prev => prev ? { ...data, histograms: data.histograms || prev.histograms, boxplots: data.boxplots || prev.boxplots, heatmap: data.heatmap || prev.heatmap } : data);
    } catch (err: any) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!status.loaded) return <EmptyState icon={<BarChart3 className="w-6 h-6" />} title="No Dataset Loaded" description="Upload a dataset to start exploring." />;

  const numericCols = edaData?.numeric_columns || [];
  const activeHistData = selectedHistCol && edaData?.histograms ? edaData.histograms[selectedHistCol] : [];
  const activeBoxData = selectedBoxCol && edaData?.boxplots ? edaData.boxplots[selectedBoxCol] : null;
  const activeSummary = selectedBoxCol && edaData?.summary_stats ? edaData.summary_stats[selectedBoxCol] : null;

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-white">Exploratory Data Analysis</h1>
        <p className="text-xs text-[#6B7280] mt-1">Analyze distributions, outliers, relationships, and correlations.</p>
      </div>

      {localError && <div className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 px-3 py-2 rounded-lg">{localError}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111827] p-1 rounded-lg border border-[#1F2937] w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-500/10 text-emerald-400 shadow-sm'
                : 'text-[#6B7280] hover:text-[#9CA3AF]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading && !edaData && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {edaData && (
        <div className="grid grid-cols-4 gap-4">
          {/* Left — Controls */}
          <div className="col-span-1 space-y-4">
            <div className="card-base p-4 space-y-4">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Controls</h4>

              {activeTab === 'histogram' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#6B7280] font-medium">Variable</label>
                  <select value={selectedHistCol} onChange={e => setSelectedHistCol(e.target.value)} className="input-base text-xs">
                    {numericCols.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {activeTab === 'boxplot' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#6B7280] font-medium">Variable</label>
                  <select value={selectedBoxCol} onChange={e => setSelectedBoxCol(e.target.value)} className="input-base text-xs">
                    {numericCols.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {activeTab === 'scatter' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#6B7280] font-medium">X Axis</label>
                    <select value={scatterX} onChange={e => setScatterX(e.target.value)} className="input-base text-xs">
                      {numericCols.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#6B7280] font-medium">Y Axis</label>
                    <select value={scatterY} onChange={e => setScatterY(e.target.value)} className="input-base text-xs">
                      {numericCols.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'heatmap' && (
                <p className="text-[11px] text-[#6B7280] leading-relaxed">
                  Pearson correlation matrix. Green = positive, Red = negative.
                </p>
              )}

              <div className="h-px bg-[#1F2937]" />
              <p className="text-[11px] text-[#4B5563]">Dataset: <strong className="text-[#9CA3AF]">{status.filename}</strong></p>
            </div>

            {activeTab === 'boxplot' && activeSummary && (
              <div className="card-base p-4 space-y-3">
                <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Stats</h4>
                <div className="space-y-2 text-xs">
                  {[['Mean', activeSummary.mean], ['Std', activeSummary.std], ['Min', activeSummary.min], ['Max', activeSummary.max]].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between"><span className="text-[#6B7280]">{k}</span><span className="text-white font-medium font-mono">{typeof v === 'number' ? v.toFixed(3) : v}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Chart */}
          <div className="col-span-3 card-base p-4">
            {activeTab === 'histogram' && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">{selectedHistCol} Distribution</h3>
                <p className="text-[11px] text-[#6B7280] mb-3">Frequency distribution across bins</p>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activeHistData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(31,41,55,0.6)" />
                      <XAxis dataKey="bin" stroke="#4B5563" fontSize={10} tickLine={false} />
                      <YAxis stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                      <Bar dataKey="count" fill="#10B981" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'boxplot' && activeBoxData && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">{selectedBoxCol} Box Plot</h3>
                <p className="text-[11px] text-[#6B7280] mb-4">Quartile visualization</p>
                <div className="py-6 px-4 space-y-6">
                  <div className="relative h-3 bg-[#1F2937] rounded-full">
                    {(() => {
                      const range = (activeBoxData.max - activeBoxData.min) || 1;
                      const q1 = ((activeBoxData.q1 - activeBoxData.min) / range) * 100;
                      const q3 = ((activeBoxData.q3 - activeBoxData.min) / range) * 100;
                      const med = ((activeBoxData.median - activeBoxData.min) / range) * 100;
                      return (<>
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-emerald-500/50 -translate-y-1/2" />
                        <div className="absolute top-0 bottom-0 bg-emerald-500/20 border border-emerald-500/40 rounded-sm" style={{ left: `${q1}%`, right: `${100 - q3}%` }} />
                        <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-400" style={{ left: `${med}%` }} />
                      </>);
                    })()}
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    {[['Min', activeBoxData.min], ['Q1', activeBoxData.q1], ['Median', activeBoxData.median], ['Q3', activeBoxData.q3], ['Max', activeBoxData.max]].map(([label, val]) => (
                      <div key={label as string} className="bg-[#0d1526] p-2 rounded-lg border border-[#1F2937]">
                        <span className="block text-[10px] text-[#6B7280]">{label}</span>
                        <strong className="text-sm text-white">{(val as number).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                  {activeBoxData.outliers?.length > 0 && (
                    <div>
                      <span className="text-[11px] text-amber-500 font-medium">Outliers ({activeBoxData.outliers.length})</span>
                      <div className="flex flex-wrap gap-1 mt-1 max-h-12 overflow-y-auto">
                        {activeBoxData.outliers.map((o: number, i: number) => (
                          <span key={i} className="text-[10px] bg-amber-500/8 text-amber-400 px-1.5 py-0.5 rounded font-mono">{o.toFixed(2)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'scatter' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{scatterX} vs {scatterY}</h3>
                    <p className="text-[11px] text-[#6B7280]">Bivariate scatter</p>
                  </div>
                  {loading && <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,41,55,0.6)" />
                      <XAxis type="number" dataKey="x" name={scatterX} stroke="#4B5563" fontSize={10} tickLine={false}>
                        <Label value={scatterX} offset={-10} position="insideBottom" fill="#6B7280" style={{ fontSize: 10 }} />
                      </XAxis>
                      <YAxis type="number" dataKey="y" name={scatterY} stroke="#4B5563" fontSize={10} tickLine={false}>
                        <Label value={scatterY} angle={-90} position="insideLeft" fill="#6B7280" style={{ fontSize: 10 }} />
                      </YAxis>
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                      <Scatter name="Points" data={edaData.scatter} fill="#10B981" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'heatmap' && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Correlation Matrix</h3>
                <p className="text-[11px] text-[#6B7280] mb-3">Pearson coefficients</p>
                <div className="overflow-auto max-h-[320px] p-1">
                  <div className="grid gap-[2px] min-w-[400px]" style={{ gridTemplateColumns: `repeat(${numericCols.length}, minmax(0, 1fr))` }}>
                    {edaData.heatmap.map((cell, idx) => {
                      const val = cell.value;
                      const bg = val >= 0
                        ? `rgba(16, 185, 129, ${val * 0.7 + 0.05})`
                        : `rgba(239, 68, 68, ${Math.abs(val) * 0.7 + 0.05})`;
                      return (
                        <div key={idx} title={`${cell.x} × ${cell.y}: ${val.toFixed(3)}`}
                          className="h-11 rounded flex flex-col items-center justify-center cursor-default hover:scale-105 transition-transform"
                          style={{ backgroundColor: bg, color: Math.abs(val) > 0.35 ? '#fff' : '#9CA3AF' }}>
                          <span className="text-[8px] font-medium truncate max-w-full px-1">{cell.x === cell.y ? cell.x.slice(0, 6) : ''}</span>
                          <span className="text-[10px] font-mono font-medium">{val.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[#1F2937]">
                  {numericCols.map((c, i) => (
                    <span key={i} className="text-[10px] bg-[#0d1526] text-[#6B7280] px-2 py-0.5 rounded font-mono border border-[#1F2937]">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
