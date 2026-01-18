import React, { useState } from 'react';
import { X, Monitor, Mic, Camera, Clock, PictureInPicture, Settings, Palette } from 'lucide-react';
import { Toggle } from './Toggle';
import { Button } from './Button';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (options: CaptureOptions) => void;
}

export interface CaptureOptions {
  audio: boolean;
  countdown: boolean;
  source: 'screen' | 'camera';
  timeLimit?: number;
  pip: boolean;
  audioMixing: boolean;
  backgroundColor?: string;
  backgroundImageUrl?: string;
}

const PRESET_COLORS = ['#000000', '#344E41', '#1a1a2e', '#0f0e17', '#16213e', '#1b262c'];
const PRESET_BACKGROUNDS = [
  { id: 'gradient-1', name: 'Magic Purple', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1920&q=80' },
  { id: 'gradient-2', name: 'Dark Flow', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80' },
  { id: 'abstract-1', name: 'Deep Space', url: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&w=1920&q=80' },
];

export const CaptureModal: React.FC<CaptureModalProps> = ({ isOpen, onClose, onStart }) => {
  const [activeTab, setActiveTab] = useState<'screen' | 'camera'>('screen');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [countdownEnabled, setCountdownEnabled] = useState(true);
  const [pipEnabled, setPipEnabled] = useState(false);
  const [audioMixingEnabled, setAudioMixingEnabled] = useState(false);

  // Background state
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgColor, setBgColor] = useState<string>('#000000');
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectColor = (color: string) => {
    setBgColor(color);
    setBgImageUrl(null);
    setBgEnabled(true);
  };

  const handleSelectImage = (url: string) => {
    setBgImageUrl(url);
    setBgEnabled(true);
  };

  const handleClearBackground = () => {
    setBgEnabled(false);
    setBgImageUrl(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>

      <div className="relative w-full max-w-lg bg-[#3A5A40] border border-[#588157] rounded-[3rem] card-shadow overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">

        {/* Header */}
        <div className="flex items-center justify-between p-8">
          <h2 className="text-2xl font-[900] text-[#DAD7CD] tracking-tight flex items-center gap-3">
            Capture Setup
          </h2>
          <button onClick={onClose} className="p-2 bg-[#344E41] text-[#A3B18A] hover:text-[#DAD7CD] rounded-full transition-colors border border-[#588157]">
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-8 flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('screen')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all ${activeTab === 'screen' ? 'bg-[#DAD7CD] text-[#344E41] border-[#DAD7CD] shadow-lg shadow-[#DAD7CD]/20' : 'bg-[#344E41] border-[#588157] text-[#A3B18A] hover:bg-[#588157] hover:text-white'}`}
          >
            <Monitor size={18} />
            <span className="text-sm font-bold uppercase tracking-widest">Screen</span>
          </button>

          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all ${activeTab === 'camera' ? 'bg-[#DAD7CD] text-[#344E41] border-[#DAD7CD] shadow-lg shadow-[#DAD7CD]/20' : 'bg-[#344E41] border-[#588157] text-[#A3B18A] hover:bg-[#588157] hover:text-white'}`}
          >
            <Camera size={18} />
            <span className="text-sm font-bold uppercase tracking-widest">Camera</span>
          </button>
        </div>

        {/* Background Selection */}
        <div className="px-8 mb-6">
          <div className="p-4 bg-[#344E41] rounded-2xl border border-[#588157]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#3A5A40] rounded-lg flex items-center justify-center border border-[#588157]">
                  <Palette size={14} className="text-[#A3B18A]" />
                </div>
                <div className="text-xs font-bold text-[#DAD7CD] uppercase tracking-wider">Background</div>
              </div>
              {bgEnabled && (
                <button
                  onClick={handleClearBackground}
                  className="text-[10px] text-[#A3B18A] hover:text-[#DAD7CD] font-bold uppercase tracking-wider"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Color Presets */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-[#A3B18A] font-bold uppercase tracking-wider w-12">Color</span>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => handleSelectColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${bgEnabled && bgColor === color && !bgImageUrl ? 'border-[#DAD7CD] scale-110' : 'border-transparent hover:border-[#588157]'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Image Presets */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#A3B18A] font-bold uppercase tracking-wider w-12">Image</span>
              <div className="flex gap-2 flex-1">
                {PRESET_BACKGROUNDS.map(bg => (
                  <button
                    key={bg.id}
                    onClick={() => handleSelectImage(bg.url)}
                    className={`flex-1 h-10 rounded-lg border-2 overflow-hidden transition-all ${bgEnabled && bgImageUrl === bg.url ? 'border-[#DAD7CD] scale-[0.98]' : 'border-transparent hover:border-[#588157]'}`}
                  >
                    <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  </button>
                ))}
              </div>
            </div>

            {bgEnabled && (
              <div className="mt-3 text-[10px] text-[#A3B18A] italic">
                ✓ Background will be composited in real-time
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="px-8 pb-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Audio */}
            <div className="p-4 bg-[#344E41] rounded-2xl border border-[#588157] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 bg-[#3A5A40] rounded-lg flex items-center justify-center border border-[#588157]"><Mic size={14} className="text-[#A3B18A]" /></div>
                <Toggle label="" checked={audioEnabled} onChange={setAudioEnabled} />
              </div>
              <div className="text-xs font-bold text-[#DAD7CD] uppercase tracking-wider">Audio</div>
            </div>

            {/* Countdown */}
            <div className="p-4 bg-[#344E41] rounded-2xl border border-[#588157] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 bg-[#3A5A40] rounded-lg flex items-center justify-center border border-[#588157]"><Clock size={14} className="text-[#A3B18A]" /></div>
                <Toggle label="" checked={countdownEnabled} onChange={setCountdownEnabled} />
              </div>
              <div className="text-xs font-bold text-[#DAD7CD] uppercase tracking-wider">Countdown</div>
            </div>

            {/* PiP */}
            <div className="p-4 bg-[#344E41] rounded-2xl border border-[#588157] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 bg-[#3A5A40] rounded-lg flex items-center justify-center border border-[#588157]"><PictureInPicture size={14} className="text-[#A3B18A]" /></div>
                <Toggle label="" checked={pipEnabled} onChange={setPipEnabled} />
              </div>
              <div className="text-xs font-bold text-[#DAD7CD] uppercase tracking-wider">PiP</div>
            </div>

            {/* Mixing */}
            <div className="p-4 bg-[#344E41] rounded-2xl border border-[#588157] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 bg-[#3A5A40] rounded-lg flex items-center justify-center border border-[#588157]"><Settings size={14} className="text-[#A3B18A]" /></div>
                <Toggle label="" checked={audioMixingEnabled} onChange={setAudioMixingEnabled} />
              </div>
              <div className="text-xs font-bold text-[#DAD7CD] uppercase tracking-wider">Mic Mix</div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              fullWidth
              onClick={() => onStart({
                audio: audioEnabled,
                countdown: countdownEnabled,
                source: activeTab,
                pip: pipEnabled,
                audioMixing: audioMixingEnabled,
                backgroundColor: bgEnabled && !bgImageUrl ? bgColor : undefined,
                backgroundImageUrl: bgEnabled && bgImageUrl ? bgImageUrl : undefined,
              })}
              className="!rounded-full !py-6 !bg-[#DAD7CD] !text-[#344E41] hover:!bg-[#A3B18A]"
            >
              Start Session
            </Button>
            <p className="text-center text-[10px] font-black text-[#A3B18A] uppercase tracking-widest mt-6">
              Alt + Shift + S to stop
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};