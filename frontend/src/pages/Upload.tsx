import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Upload as UploadIcon, AlertCircle, CheckCircle, RefreshCw, ListFilter, Trash2 } from 'lucide-react';

export const Upload: React.FC = () => {
  const { status, isLoading, error, uploadDataset, removeDataset, loadSampleDataset, cleanDataset } = useApp();
  const [imputationStrategy, setImputationStrategy] = useState<string>('mean');
  const [dragActive, setDragActive] = useState<boolean>(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]?.name.endsWith('.csv')) {
      await uploadDataset(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]?.name.endsWith('.csv')) {
      await uploadDataset(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-[var(--color-text)]">Dataset</h1>
        <p className="text-xs text-[var(--color-text-dim)] mt-1">Import and configure sustainability datasets for analysis.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/8 border border-red-500/15 px-3 py-2.5 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Zone */}
      {!status.loaded && (
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center flex flex-col items-center justify-center transition-all ${
            dragActive
              ? 'border-emerald-500 bg-emerald-500/5'
              : 'border-border hover:border-border-hover'
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/8 border border-emerald-500/15 flex items-center justify-center text-emerald-400 mb-3">
            <UploadIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Upload CSV Dataset</h3>
          <p className="text-xs text-[var(--color-text-dim)] max-w-xs mb-4">
            Drag and drop your CSV file here, or click to browse.
          </p>
          <label className="btn-primary text-xs cursor-pointer">
            <span>Browse Files</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} disabled={isLoading} />
          </label>
          <div className="mt-4 text-xs text-[var(--color-text-dim)]">
            <span>No dataset? </span>
            <button onClick={loadSampleDataset} disabled={isLoading} className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
              {isLoading ? 'Loading...' : 'Use sample dataset'}
            </button>
          </div>
        </div>
      )}

      {/* After Upload */}
      {status.loaded && status.info && (
        <div className="grid grid-cols-4 gap-4">
          {/* Left Panel — File Info + Cleaning */}
          <div className="col-span-1 space-y-4">
            <div className="card-base p-4 space-y-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">File Info</h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg">
                  <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-[10px] font-bold">CSV</div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--color-text)] truncate">{status.filename}</p>
                    <p className="text-[10px] text-[var(--color-text-dim)]">{status.info.row_count} rows · {status.info.col_count} cols</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium">
                  {status.is_cleaned ? (
                    <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500">Cleaned</span></>
                  ) : (
                    <><AlertCircle className="w-3.5 h-3.5 text-amber-500" /><span className="text-amber-500">Needs Cleaning</span></>
                  )}
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-[var(--color-text-dim)] flex items-center gap-1 mb-1.5">
                    <ListFilter className="w-3 h-3 text-emerald-500" />
                    Imputation Strategy
                  </label>
                  <select
                    value={imputationStrategy}
                    onChange={(e) => setImputationStrategy(e.target.value)}
                    className="input-base text-xs"
                  >
                    <option value="mean">Mean</option>
                    <option value="median">Median</option>
                    <option value="mode">Mode</option>
                  </select>
                </div>
                <button
                  onClick={() => cleanDataset(imputationStrategy)}
                  disabled={isLoading}
                  className="w-full btn-primary text-xs py-2"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Cleaning...' : 'Clean Dataset'}</span>
                </button>
              </div>

              <div className="flex justify-between items-center mt-4">
                <button onClick={loadSampleDataset} disabled={isLoading} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium">
                  Reset with sample
                </button>
                <button onClick={removeDataset} disabled={isLoading} className="text-[10px] text-red-400 hover:text-red-300 font-medium flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel — Column Table */}
          <div className="col-span-3 card-base overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">Column Definitions</h3>
            </div>
            <div className="overflow-x-auto max-h-[260px]">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th className="text-center">Nulls</th>
                    <th className="text-center">Null %</th>
                    <th className="text-right">Uniques</th>
                  </tr>
                </thead>
                <tbody>
                  {status.info.columns.map((col, idx) => (
                    <tr key={idx}>
                      <td className="font-medium text-[var(--color-text)]">{col.name}</td>
                      <td>
                        <span className={`badge ${col.type.includes('int') || col.type.includes('float') ? 'badge-blue' : 'badge-slate'}`}>
                          {col.type}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={col.null_count > 0 ? 'text-amber-400 font-medium' : 'text-[var(--color-text-dim)]'}>{col.null_count}</span>
                      </td>
                      <td className="text-center">
                        <span className={col.null_percentage > 0 ? 'text-amber-400 font-medium' : 'text-[var(--color-text-dim)]'}>{col.null_percentage}%</span>
                      </td>
                      <td className="text-right font-mono text-[var(--color-text-dim)]">{col.unique_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Data Preview */}
      {status.loaded && status.info?.preview && (
        <div className="card-base overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Data Preview</h3>
            <p className="text-[11px] text-[var(--color-text-dim)]">First 10 records</p>
          </div>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="table-base">
              <thead>
                <tr>
                  {Object.keys(status.info.preview[0]).map((key, i) => (
                    <th key={i}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {status.info.preview.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {Object.values(row).map((val, cIdx) => (
                      <td key={cIdx} className="max-w-[150px] truncate">
                        {val === null || val === undefined ? (
                          <span className="text-amber-500/80 text-[10px] font-mono">null</span>
                        ) : typeof val === 'number' ? (
                          Math.round(val * 1000) / 1000
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
      )}
    </div>
  );
};
