import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

interface ModelCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'ready' | 'not-run' | 'running' | 'completed';
  onRun: () => void;
  delay?: number;
}

export const ModelCard: React.FC<ModelCardProps> = ({ icon, title, description, status, onRun, delay = 0 }) => {
  const statusConfig = {
    ready: { label: 'Ready', className: 'badge-emerald' },
    'not-run': { label: 'Not Run', className: 'badge-slate' },
    running: { label: 'Running', className: 'badge-amber' },
    completed: { label: 'Completed', className: 'badge-emerald' },
  };

  const cfg = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="card-base p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-border/60 flex items-center justify-center text-[var(--color-text-muted)]">
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text)]">{title}</h4>
            <p className="text-[11px] text-[var(--color-text-dim)] mt-0.5 leading-tight">{description}</p>
          </div>
        </div>
        <span className={`badge ${cfg.className}`}>{cfg.label}</span>
      </div>

      <button
        onClick={onRun}
        disabled={status === 'running'}
        className="w-full btn-primary text-xs py-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Play className="w-3 h-3" />
        <span>{status === 'running' ? 'Running...' : 'Run Model'}</span>
      </button>
    </motion.div>
  );
};
