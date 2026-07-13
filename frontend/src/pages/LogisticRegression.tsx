import React, { useState, useEffect } from 'react';
import { useApp, API_BASE } from '../context/AppContext';
import { Play, GitBranch, AlertTriangle } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';

interface ConfusionMatrix { tn: number; fp: number; fn: number; tp: number; }
interface ClassMetrics { precision: number; recall: number; 'f1-score': number; support: number; }
interface ClassificationResults {
  accuracy: number; precision: number; recall: number; f1_score: number;
  confusion_matrix: ConfusionMatrix;
  classification_report: Record<string, ClassMetrics | number>;
  classes: string[]; data_points_used: number;
}

export const LogisticRegression: React.FC = () => {
  const { status, addHistoryItem } = useApp();
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [results, setResults] = useState<ClassificationResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status.loaded && status.info) {
      const nc = status.info.columns.filter(c => c.type.includes('int') || c.type.includes('float')).map(c => c.name);
      const binary = status.info.columns.find(c => c.unique_count === 2);
      if (binary) {
        setSelectedTarget(binary.name);
        setSelectedFeatures(nc.filter(c => c !== binary.name));
      } else if (nc.length > 1) {
        setSelectedTarget(nc[nc.length - 1]);
        setSelectedFeatures(nc.slice(0, nc.length - 1));
      }
    }
  }, [status.loaded, status.info]);

  const handleRun = async () => {
    if (!selectedTarget || selectedFeatures.length === 0) { setError('Select target and features.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/logistic-regression`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: selectedFeatures, target: selectedTarget }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed');
      const data: ClassificationResults = await res.json();
      setResults(data);
      addHistoryItem({ type: 'Logistic Regression', dataset: status.filename || '', features: selectedFeatures, target: selectedTarget,
        metrics: { Accuracy: data.accuracy, Precision: data.precision, Recall: data.recall, 'F1 Score': data.f1_score },
        results: { confusion_matrix: data.confusion_matrix, classes: data.classes, data_points_used: data.data_points_used } });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  if (!status.loaded) return <EmptyState icon={<GitBranch className="w-6 h-6" />} title="No Dataset" description="Upload a dataset first." />;

  const allCols = status.info?.columns.map(c => c.name) || [];
  const numericCols = status.info?.columns.filter(c => c.type.includes('int') || c.type.includes('float')).map(c => c.name) || [];

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-emerald-400" /> Logistic Regression
        </h1>
        <p className="text-xs text-[#6B7280] mt-1">Binary classification with evaluation metrics.</p>
      </div>

      {error && <div className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 px-3 py-2 rounded-lg">{error}</div>}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 card-base p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white">Configuration</h3>
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#6B7280] font-medium">Target (Binary)</label>
            <select value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)} className="input-base text-xs">
              <option value="">Select...</option>
              {allCols.map((c, i) => {
                const info = status.info?.columns.find(x => x.name === c);
                return <option key={i} value={c}>{c} ({info?.unique_count} classes)</option>;
              })}
            </select>
            {selectedTarget && (status.info?.columns.find(x => x.name === selectedTarget)?.unique_count || 0) !== 2 && (
              <div className="flex items-center gap-1 text-[10px] text-amber-500 mt-1">
                <AlertTriangle className="w-3 h-3" /><span>Target must have 2 classes.</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#6B7280] font-medium">Features</label>
            <div className="space-y-1 max-h-40 overflow-y-auto border border-[#1F2937] p-2 rounded-lg bg-[#0d1526]">
              {numericCols.map((c, i) => (
                <label key={i} className="flex items-center gap-2 text-xs py-0.5 cursor-pointer">
                  <input type="checkbox" checked={selectedFeatures.includes(c)} disabled={c === selectedTarget}
                    onChange={() => setSelectedFeatures(p => p.includes(c) ? p.filter(f => f !== c) : [...p, c])}
                    className="w-3.5 h-3.5 rounded border-[#374151] bg-[#0d1526] text-emerald-500 focus:ring-emerald-500" />
                  <span className={c === selectedTarget ? 'text-[#374151] line-through' : 'text-[#9CA3AF]'}>{c}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleRun} disabled={loading} className="w-full btn-primary text-xs py-2 disabled:opacity-50">
            <Play className="w-3 h-3" /><span>{loading ? 'Training...' : 'Train Classifier'}</span>
          </button>
        </div>

        <div className="col-span-2 space-y-4">
          {!results && !loading && (
            <div className="card-base flex flex-col items-center justify-center py-16 text-center">
              <GitBranch className="w-10 h-10 text-emerald-500/20 mb-2" />
              <p className="text-xs text-[#6B7280]">Configure and click Train Classifier.</p>
            </div>
          )}
          {loading && (
            <div className="card-base flex flex-col items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-[#6B7280]">Training on backend...</p>
            </div>
          )}
          {results && !loading && (<>
            <div className="grid grid-cols-4 gap-3">
              {[{ n: 'Accuracy', v: results.accuracy }, { n: 'Precision', v: results.precision }, { n: 'Recall', v: results.recall }, { n: 'F1 Score', v: results.f1_score }].map((m, i) => (
                <div key={i} className="card-base p-3">
                  <p className="text-[10px] text-[#6B7280] uppercase font-semibold tracking-wider">{m.n}</p>
                  <p className="text-lg font-bold text-gradient mt-0.5 font-display">{(m.v * 100).toFixed(1)}%</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="card-base p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Confusion Matrix</h3>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-[#0d1526] p-3 rounded-lg border border-[#1F2937]">
                    <span className="text-[9px] text-[#6B7280] uppercase font-semibold">TN</span>
                    <strong className="block text-2xl text-white mt-1">{results.confusion_matrix.tn}</strong>
                  </div>
                  <div className="bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                    <span className="text-[9px] text-red-400 uppercase font-semibold">FP</span>
                    <strong className="block text-2xl text-red-400 mt-1">{results.confusion_matrix.fp}</strong>
                  </div>
                  <div className="bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                    <span className="text-[9px] text-red-400 uppercase font-semibold">FN</span>
                    <strong className="block text-2xl text-red-400 mt-1">{results.confusion_matrix.fn}</strong>
                  </div>
                  <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/15">
                    <span className="text-[9px] text-emerald-400 uppercase font-semibold">TP</span>
                    <strong className="block text-2xl text-emerald-400 mt-1">{results.confusion_matrix.tp}</strong>
                  </div>
                </div>
                <p className="text-[10px] text-[#4B5563] text-center mt-2">{results.data_points_used} samples total</p>
              </div>
              <div className="card-base p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Classification Report</h3>
                <table className="table-base">
                  <thead>
                    <tr><th>Class</th><th>Precision</th><th>Recall</th><th className="text-right">F1</th></tr>
                  </thead>
                  <tbody>
                    {results.classes.map((cls, i) => {
                      const r = results.classification_report[cls] as ClassMetrics;
                      if (!r) return null;
                      return (
                        <tr key={i}>
                          <td className="font-medium text-white">{cls}</td>
                          <td>{r.precision.toFixed(2)}</td>
                          <td>{r.recall.toFixed(2)}</td>
                          <td className="text-right text-emerald-400 font-medium">{r['f1-score'].toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
};
