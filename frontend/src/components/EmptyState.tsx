import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description }) => {
  const { setActivePage } = useApp();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center card-base">
      <div className="w-14 h-14 rounded-xl bg-emerald-500/8 border border-emerald-500/15 flex items-center justify-center text-emerald-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--color-text-dim)] max-w-sm mb-5">{description}</p>
      <button
        onClick={() => setActivePage('upload')}
        className="btn-primary text-sm"
      >
        <span>Go to Dataset</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
