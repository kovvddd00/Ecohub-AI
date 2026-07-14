import React from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subtitle, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="card-interactive p-4 flex items-start gap-3"
    >
      <div className="w-9 h-9 rounded-lg bg-emerald-500/8 border border-emerald-500/15 flex items-center justify-center shrink-0 text-emerald-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[var(--color-text-dim)] uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-[var(--color-text)] mt-0.5 font-display">{value}</p>
        {subtitle && <p className="text-[11px] text-[var(--color-text-dim)] mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  );
};
