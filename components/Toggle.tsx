import React from 'react';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange }) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input 
          type="checkbox" 
          className="sr-only" 
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`w-10 h-6 bg-slate-700 rounded-full transition-colors duration-200 border border-slate-600 ${checked ? 'bg-emerald-500/20 border-emerald-500/50' : ''}`}></div>
        <div className={`absolute left-1 top-1 bg-slate-400 w-4 h-4 rounded-full transition-transform duration-200 ${checked ? 'translate-x-4 bg-emerald-400' : ''}`}></div>
      </div>
      <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">{label}</span>
    </label>
  );
};