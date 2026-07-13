import React from 'react';
import { useApp, type PageId } from '../context/AppContext';
import {
  Leaf,
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  TrendingUp,
  GitBranch,
  Target,
  FileText,
  Settings,
  Sun,
  Moon,
  Users,
} from 'lucide-react';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ReactNode;
  requiresDataset?: boolean;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'upload', label: 'Dataset', icon: <FolderOpen className="w-4 h-4" /> },
  { id: 'eda', label: 'EDA', icon: <BarChart3 className="w-4 h-4" />, requiresDataset: true },
  { id: 'linear', label: 'Linear Regression', icon: <TrendingUp className="w-4 h-4" />, requiresDataset: true },
  { id: 'logistic', label: 'Logistic Regression', icon: <GitBranch className="w-4 h-4" />, requiresDataset: true },
  { id: 'kmeans', label: 'K-Means', icon: <Target className="w-4 h-4" />, requiresDataset: true },
  { id: 'results', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, status, darkMode, toggleDarkMode } = useApp();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-[#0a0f1a] border-r border-[#1F2937] flex flex-col z-50">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-[#1F2937]">
        <button
          onClick={() => setActivePage('home')}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-shadow">
            <Leaf className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-display font-bold text-sm text-white tracking-tight">
            EcoHub <span className="text-emerald-400 font-extrabold">AI</span>
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          const isLocked = item.requiresDataset && !status.loaded;

          return (
            <button
              key={item.id}
              disabled={isLocked}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative group ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : isLocked
                    ? 'text-[#374151] cursor-not-allowed'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500" />
              )}
              <span className={isActive ? 'text-emerald-400' : isLocked ? 'text-[#374151]' : 'text-[#6B7280] group-hover:text-[#9CA3AF]'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 pb-4 space-y-3 border-t border-[#1F2937] pt-3">
        {/* Version */}
        <div className="flex items-center justify-between px-3">
          <span className="text-[11px] text-[#4B5563] font-medium">v4.0.0</span>
          <span className="badge badge-slate text-[10px]">Stable</span>
        </div>

        {/* Team */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02]">
          <Users className="w-3.5 h-3.5 text-[#6B7280]" />
          <span className="text-[11px] text-[#6B7280] font-medium">EcoHub Lab</span>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[#9CA3AF] hover:text-white hover:bg-white/[0.03] transition-all"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
          <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </aside>
  );
};
