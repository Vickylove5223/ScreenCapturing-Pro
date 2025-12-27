import React, { useState } from 'react';
import { X, Monitor, Mic, Camera, Clock, PictureInPicture, Settings } from 'lucide-react';
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
}

export const CaptureModal: React.FC<CaptureModalProps> = ({ isOpen, onClose, onStart }) => {
  const [activeTab, setActiveTab] = useState<'screen' | 'camera'>('screen');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [countdownEnabled, setCountdownEnabled] = useState(true);
  const [pipEnabled, setPipEnabled] = useState(false);
  const [audioMixingEnabled, setAudioMixingEnabled] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>

      <div className="relative w-full max-w-lg bg-[#3A5A40] border border-[#588157] rounded-[3rem] card-shadow overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
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
        <div className="px-8 flex gap-4 mb-8">
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

        {/* Settings */}
        <div className="px-8 pb-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {/* Audio */}
             <div className="p-4 bg-[#344E41] rounded-2xl border border-[#588157] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                   <div className="w-8 h-8 bg-[#3A5A40] rounded-lg flex items-center justify-center border border-[#588157]"><Mic size={14} className="text-[#A3B18A]"/></div>
                   <Toggle label="" checked={audioEnabled} onChange={setAudioEnabled} />
                </div>
                <div className="text-xs font-bold text-[#DAD7CD] uppercase tracking-wider">Audio Source</div>
             </div>

             {/* Countdown */}
             <div className="p-4 bg-[#344E41] rounded-2xl border border-[#588157] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                   <div className="w-8 h-8 bg-[#3A5A40] rounded-lg flex items-center justify-center border border-[#588157]"><Clock size={14} className="text-[#A3B18A]"/></div>
                   <Toggle label="" checked={countdownEnabled} onChange={setCountdownEnabled} />
                </div>
                <div className="text-xs font-bold text-[#DAD7CD] uppercase tracking-wider">Preparation</div>
             </div>

             {/* PiP */}
             <div className="p-4 bg-[#344E41] rounded-2xl border border-[#588157] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                   <div className="w-8 h-8 bg-[#3A5A40] rounded-lg flex items-center justify-center border border-[#588157]"><PictureInPicture size={14} className="text-[#A3B18A]"/></div>
                   <Toggle label="" checked={pipEnabled} onChange={setPipEnabled} />
                </div>
                <div className="text-xs font-bold text-[#DAD7CD] uppercase tracking-wider">PiP Overlay</div>
             </div>

             {/* Mixing */}
             <div className="p-4 bg-[#344E41] rounded-2xl border border-[#588157] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                   <div className="w-8 h-8 bg-[#3A5A40] rounded-lg flex items-center justify-center border border-[#588157]"><Settings size={14} className="text-[#A3B18A]"/></div>
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
                audioMixing: audioMixingEnabled
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