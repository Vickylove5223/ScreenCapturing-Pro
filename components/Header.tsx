import React from 'react';
import { Video, HardDrive, Settings, User } from 'lucide-react';

interface HeaderProps {
  activePage: 'home' | 'library' | 'settings';
  onNavigate: (page: 'home' | 'library' | 'settings') => void;
  onRecordClick: () => void;
  isRecording: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activePage, onNavigate, onRecordClick, isRecording }) => {
  return (
    <header className="w-full bg-[#DAD7CD]/80 backdrop-blur-md border-b border-[#A3B18A] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Navigation Left */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => onNavigate('home')}
            className={`text-sm font-semibold transition-colors ${activePage === 'home' ? 'text-[#344E41]' : 'text-[#588157] hover:text-[#344E41]'}`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('library')}
            className={`text-sm font-semibold transition-colors ${activePage === 'library' ? 'text-[#344E41]' : 'text-[#588157] hover:text-[#344E41]'}`}
          >
            Library
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className={`text-sm font-semibold transition-colors ${activePage === 'settings' ? 'text-[#344E41]' : 'text-[#588157] hover:text-[#344E41]'}`}
          >
            Settings
          </button>
        </nav>

        {/* Logo Center */}
        <div 
          className="flex items-center gap-2 cursor-pointer absolute left-1/2 -translate-x-1/2 group" 
          onClick={() => onNavigate('home')}
        >
          <div className="w-8 h-8 bg-[#344E41] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-[#344E41]/20">
            <Video className="text-[#DAD7CD]" size={16} />
          </div>
          <span className="font-black text-lg text-[#344E41] tracking-tight uppercase whitespace-nowrap hidden sm:block">
            ScreenCapturing Pro
          </span>
           <span className="font-black text-lg text-[#344E41] tracking-tight uppercase sm:hidden">
            SCP
          </span>
        </div>

        {/* User / Wallet Placeholder Right */}
        <div className="flex items-center gap-4">
          {isRecording ? (
            <div className="flex items-center gap-2 text-[#344E41] px-4 py-2 bg-[#A3B18A]/20 border border-[#A3B18A]/40 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
              <div className="w-2 h-2 bg-[#344E41] rounded-full"></div>
              Recording
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-[#A3B18A] px-4 py-2 rounded-full border border-[#588157] shadow-sm">
              <div className="w-6 h-6 bg-[#344E41] rounded-full flex items-center justify-center">
                 <User size={14} className="text-[#DAD7CD]" />
              </div>
              <span className="text-xs font-bold font-mono text-[#344E41]">User_72...a9</span>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};