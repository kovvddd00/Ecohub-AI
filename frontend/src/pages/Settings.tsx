import React from 'react';
import { useApp } from '../context/AppContext';
import { Sun, Moon, Server, Info } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { darkMode, toggleDarkMode } = useApp();

  return (
    <div className="space-y-6 max-w-[700px]">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-white">Settings</h1>
        <p className="text-xs text-[#6B7280] mt-1">Configure application preferences.</p>
      </div>

      {/* Appearance */}
      <div className="card-base p-4 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          {darkMode ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
          Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#9CA3AF] font-medium">Theme</p>
            <p className="text-[11px] text-[#6B7280]">Switch between dark and light mode.</p>
          </div>
          <button onClick={toggleDarkMode} className="btn-ghost text-xs">
            {darkMode ? <><Sun className="w-3.5 h-3.5" /> Light Mode</> : <><Moon className="w-3.5 h-3.5" /> Dark Mode</>}
          </button>
        </div>
      </div>

      {/* API Configuration */}
      <div className="card-base p-4 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" /> API Configuration
        </h3>
        <div className="space-y-1.5">
          <label className="text-[11px] text-[#6B7280] font-medium">Backend URL</label>
          <input
            type="text"
            value="http://localhost:8000"
            readOnly
            className="input-base text-xs font-mono text-[#6B7280]"
          />
          <p className="text-[10px] text-[#4B5563]">FastAPI backend with scikit-learn ML pipelines.</p>
        </div>
      </div>

      {/* About */}
      <div className="card-base p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-400" /> About
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-[#6B7280]">Application</span><span className="text-white font-medium">EcoHub AI</span></div>
          <div className="flex justify-between"><span className="text-[#6B7280]">Version</span><span className="text-white font-medium">4.0.0</span></div>
          <div className="flex justify-between"><span className="text-[#6B7280]">Stack</span><span className="text-white font-medium">React + TypeScript + FastAPI</span></div>
          <div className="flex justify-between"><span className="text-[#6B7280]">ML Engine</span><span className="text-white font-medium">scikit-learn</span></div>
        </div>
      </div>
    </div>
  );
};
