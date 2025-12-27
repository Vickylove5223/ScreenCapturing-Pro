import React, { useState } from 'react';
import { X, Check, Cloud, Monitor, Youtube, HardDrive, Film, Image as ImageIcon, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export type ExportQuality = '4k' | '1080p' | '720p' | '480p';
export type ExportFormat = 'webm' | 'mp4' | 'gif';
export type SaveLocation = 'local' | 'drive' | 'youtube';

export interface ExportOptions {
  filename: string;
  quality: ExportQuality;
  format: ExportFormat;
  location: SaveLocation;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  currentName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, currentName }) => {
  const [filename, setFilename] = useState(currentName);
  const [quality, setQuality] = useState<ExportQuality>('1080p');
  const [format, setFormat] = useState<ExportFormat>('webm');
  const [location, setLocation] = useState<SaveLocation>('local');

  if (!isOpen) return null;

  const qualities = [
    { id: '4k', label: '4K', desc: 'Ultra HD clarity' },
    { id: '1080p', label: '1080p', desc: 'High quality (HD)' },
    { id: '720p', label: '720p', desc: 'Fast export' },
    { id: '480p', label: '480p', desc: 'Draft quality' },
  ];

  const isCloud = location === 'drive' || location === 'youtube';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-[#344E41]/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-[#3A5A40] border border-[#588157] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#588157]">
          <h2 className="text-lg font-semibold text-[#DAD7CD]">{isCloud ? 'Sync to Cloud' : 'Export Video'}</h2>
          <button onClick={onClose} className="text-[#A3B18A] hover:text-[#DAD7CD]"><X size={20} /></button>
        </div>
        
        <div className="flex flex-col md:flex-row h-full">
            {/* Left: Quality */}
            <div className="w-full md:w-56 bg-[#344E41] border-r border-[#588157] p-4 space-y-4">
                <h3 className="text-sm font-medium text-[#A3B18A] uppercase tracking-wider">Quality</h3>
                <div className="space-y-2">
                    {qualities.map(q => (
                        <button
                            key={q.id}
                            onClick={() => { setQuality(q.id as ExportQuality); if(format === 'gif') setFormat('webm'); }}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${quality === q.id && format !== 'gif' ? 'bg-[#DAD7CD]/10 border-[#DAD7CD]/50 text-[#DAD7CD] shadow-lg shadow-[#DAD7CD]/20' : 'bg-[#3A5A40] border-transparent text-[#A3B18A] hover:bg-[#588157] hover:text-white'}`}
                        >
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="font-semibold text-sm">{q.label}</span>
                                {q.id === '4k' && <Sparkles size={12} className="text-amber-400" />}
                            </div>
                            <div className="text-xs opacity-70">{q.desc}</div>
                        </button>
                    ))}
                     <button
                            onClick={() => { setQuality('480p'); setFormat('gif'); }}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${format === 'gif' ? 'bg-[#DAD7CD]/10 border-[#DAD7CD]/50 text-[#DAD7CD] shadow-lg shadow-[#DAD7CD]/20' : 'bg-[#3A5A40] border-transparent text-[#A3B18A] hover:bg-[#588157] hover:text-white'}`}
                        >
                             <div className="flex items-center justify-between mb-0.5">
                                <span className="font-semibold text-sm">GIF</span>
                            </div>
                            <div className="text-xs opacity-70">Looping animation</div>
                        </button>
                </div>
            </div>

            {/* Right: Details */}
            <div className="flex-1 p-6 space-y-6">
                
                {/* Filename */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[#DAD7CD]">File name</label>
                    <div className="flex items-center bg-[#344E41] border border-[#588157] rounded-lg overflow-hidden focus-within:border-[#DAD7CD] transition-colors">
                        <input 
                            type="text" 
                            value={filename}
                            onChange={(e) => setFilename(e.target.value)}
                            className="flex-1 bg-transparent border-none px-3 py-2 text-[#DAD7CD] text-sm focus:ring-0 outline-none"
                            placeholder="My Video"
                        />
                        <div className="bg-[#3A5A40] px-3 py-2 text-xs text-[#A3B18A] border-l border-[#588157]">
                            .{format}
                        </div>
                    </div>
                </div>

                {/* Destination */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-[#DAD7CD]">Save location</label>
                    <div className="grid grid-cols-1 gap-2">
                        <button onClick={() => setLocation('local')} className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${location === 'local' ? 'bg-[#344E41] border-[#DAD7CD]/50 text-[#DAD7CD]' : 'bg-[#344E41]/30 border-[#588157] text-[#A3B18A]'}`}>
                            <div className={`p-2 rounded-lg ${location === 'local' ? 'bg-[#DAD7CD]/20 text-[#DAD7CD]' : 'bg-[#3A5A40] text-[#588157]'}`}><HardDrive size={18} /></div>
                            <div className="flex-1">
                                <div className="text-sm font-medium">Local Device</div>
                                <div className="text-xs opacity-60">Downloads folder</div>
                            </div>
                            {location === 'local' && <Check size={16} className="text-[#DAD7CD]" />}
                        </button>
                        
                        <button onClick={() => setLocation('drive')} className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${location === 'drive' ? 'bg-[#344E41] border-blue-500/50 text-[#DAD7CD]' : 'bg-[#344E41]/30 border-[#588157] text-[#A3B18A]'}`}>
                            <div className={`p-2 rounded-lg ${location === 'drive' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#3A5A40] text-[#588157]'}`}><Cloud size={18} /></div>
                            <div className="flex-1">
                                <div className="text-sm font-medium">Google Drive</div>
                                <div className="text-xs opacity-60">Vibe/Exports</div>
                            </div>
                             {location === 'drive' && <Check size={16} className="text-blue-500" />}
                        </button>

                         <button onClick={() => setLocation('youtube')} className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${location === 'youtube' ? 'bg-[#344E41] border-rose-500/50 text-[#DAD7CD]' : 'bg-[#344E41]/30 border-[#588157] text-[#A3B18A]'}`}>
                            <div className={`p-2 rounded-lg ${location === 'youtube' ? 'bg-rose-500/20 text-rose-400' : 'bg-[#3A5A40] text-[#588157]'}`}><Youtube size={18} /></div>
                            <div className="flex-1">
                                <div className="text-sm font-medium">YouTube</div>
                                <div className="text-xs opacity-60">Upload directly</div>
                            </div>
                             {location === 'youtube' && <Check size={16} className="text-rose-500" />}
                        </button>
                    </div>
                </div>

                <div className="pt-4">
                     <Button 
                        fullWidth 
                        onClick={() => onExport({ filename, quality, format, location })}
                        icon={isCloud ? <RefreshCw size={18} /> : <HardDrive size={18} />}
                    >
                        {isCloud ? 'Sync Video' : 'Export Video'}
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};