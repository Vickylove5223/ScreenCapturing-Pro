/** Fix: Added DOM library reference to resolve missing browser global types like HTMLVideoElement, HTMLAudioElement, and document */
/// <reference lib="dom" />

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Scissors, Volume2, Download,
  ArrowLeft, Maximize2, ZoomIn, Undo2, Redo2,
  Plus, Play, Pause, Monitor, Type, Sparkles, Music, History, Box,
  ChevronLeft, ChevronRight, Gauge, Upload, X, Layers,
  CheckCircle, Copy, ExternalLink, Cloud, Youtube
} from 'lucide-react';
import { ExportModal, ExportOptions, SaveLocation } from './ExportModal';
import { Timeline } from './Timeline';
import { processVideo, VideoLayout } from '../utils/videoProcessor';
import { authenticateGoogle, uploadToDrive, uploadToYouTube } from '../utils/googleIntegration';

interface EditorProps {
  blob: Blob;
  onBack: () => void;
  onSave: () => void;
}

export interface VideoSegment {
  id: string;
  start: number;
  end: number;
}

interface EditorState {
  segments: VideoSegment[];
  videoVolume: number;
  musicVolume: number;
  playbackSpeed: number;
  zoom: number;
  panX: number;
  panY: number;
  addedAudioBlob: Blob | null;
  addedAudioName: string | null;
  addedAudioUrl: string | null;
}

const INITIAL_STATE: Omit<EditorState, 'segments'> = {
  videoVolume: 1,
  musicVolume: 0.5,
  playbackSpeed: 1,
  zoom: 1,
  panX: 0,
  panY: 0,
  addedAudioBlob: null,
  addedAudioName: null,
  addedAudioUrl: null,
};

const DEFAULT_MUSIC_TRACKS = [
  { id: 'lofi-1', name: 'Chill Lofi', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'cinematic-1', name: 'Cinematic Pulse', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'upbeat-1', name: 'Modern Upbeat', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

const RESOLUTION_MAP = {
  '4k': { width: 3840, height: 2160 },
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 }
};

type ProcessingState = 'idle' | 'rendering' | 'authenticating' | 'uploading' | 'success';

// Audio detection is now handled directly in videoProcessor.ts via FFmpeg probe

export const Editor: React.FC<EditorProps> = ({ blob, onBack, onSave }) => {

  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoName, setVideoName] = useState('My Masterpiece');
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentState, setCurrentState] = useState<EditorState>({
    ...INITIAL_STATE,
    segments: []
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Advanced Processing States
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState(0);
  const [renderingText, setRenderingText] = useState('');
  const [uploadData, setUploadData] = useState<{ url: string, location: SaveLocation } | null>(null);
  const [exportLocation, setExportLocation] = useState<SaveLocation>('local');

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const addedAudioSrc = useMemo(() => {
    if (currentState.addedAudioBlob) return URL.createObjectURL(currentState.addedAudioBlob);
    if (currentState.addedAudioUrl) return currentState.addedAudioUrl;
    return null;
  }, [currentState.addedAudioBlob, currentState.addedAudioUrl]);

  const updateState = (update: Partial<EditorState>) => {
    setCurrentState(prev => ({ ...prev, ...update }));
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      if (d) {
        setDuration(d);
        if (currentState.segments.length === 0) {
          updateState({ segments: [{ id: 'seg-1', start: 0, end: d }] });
        }
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
    } else {
      videoRef.current.play();
      if (audioRef.current) {
        audioRef.current.currentTime = videoRef.current.currentTime % audioRef.current.duration;
        audioRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (audioRef.current && audioRef.current.duration) {
        audioRef.current.currentTime = time % audioRef.current.duration;
      }
      setCurrentTime(time);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    const segments = currentState.segments.sort((a, b) => a.start - b.start);
    if (segments.length === 0) return;

    const currentSegIndex = segments.findIndex(s => time >= s.start && time < s.end);

    if (currentSegIndex === -1) {
      const nextSeg = segments.find(s => s.start > time);
      if (nextSeg) {
        videoRef.current.currentTime = nextSeg.start;
      } else {
        videoRef.current.currentTime = segments[0].start;
      }
    }
  };

  const handleSplit = useCallback(() => {
    const time = currentTime;
    const newSegments = [...currentState.segments];
    const index = newSegments.findIndex(seg => time > seg.start && time < seg.end);

    if (index !== -1) {
      const segmentToSplit = newSegments[index];
      const part1 = { ...segmentToSplit, end: time };
      const part2 = { id: `seg-${Date.now()}`, start: time, end: segmentToSplit.end };
      newSegments.splice(index, 1, part1, part2);
      updateState({ segments: newSegments });
    }
  }, [currentTime, currentState.segments]);

  const handleDeleteSegment = (id: string) => {
    if (currentState.segments.length <= 1) return;
    updateState({ segments: currentState.segments.filter(s => s.id !== id) });
  };

  const handleTrimSegment = (id: string, start: number, end: number) => {
    const newSegments = currentState.segments.map(seg =>
      seg.id === id ? { ...seg, start, end } : seg
    );
    updateState({ segments: newSegments });
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateState({ addedAudioBlob: file, addedAudioName: file.name, addedAudioUrl: null });
    }
  };

  const handleExport = async (options: ExportOptions) => {
    if (currentState.segments.length === 0) return;

    setProcessingState('rendering');
    setExportLocation(options.location);
    setProgress(0);
    setRenderingText('Preparing Video...');
    setIsExportModalOpen(false);
    setUploadData(null);

    // OPTIMIZATION: If no edits were made and format is WebM, download original blob instantly
    const isClean =
      options.format === 'webm' &&
      currentState.segments.length === 1 &&
      currentState.segments[0].start === 0 &&
      Math.abs(currentState.segments[0].end - duration) < 0.5 &&
      currentState.videoVolume === 1 &&
      currentState.playbackSpeed === 1 &&
      currentState.zoom === 1 &&
      currentState.panX === 0 &&
      currentState.panY === 0 &&
      !currentState.bgImageBlob &&
      !currentState.bgImageUrl &&
      currentState.bgColor === '#000000' &&
      !currentState.addedAudioBlob &&
      !currentState.addedAudioUrl;

    if (isClean && options.location === 'local') {
      console.log("No edits detected - using instant download");
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${options.filename}.${options.format}`;
      a.click();
      URL.revokeObjectURL(url);
      setProcessingState('idle');
      return;
    }

    try {
      const targetRes = RESOLUTION_MAP[options.quality];

      let layout: VideoLayout | undefined = undefined;

      if (videoRef.current) {
        const vidW = videoRef.current.videoWidth || 1920;
        const vidH = videoRef.current.videoHeight || 1080;

        const cropW = vidW / currentState.zoom;
        const cropH = vidH / currentState.zoom;

        const maxShiftX = (vidW - cropW) / 2;
        const maxShiftY = (vidH - cropH) / 2;

        const shiftX = currentState.panX * maxShiftX;
        const shiftY = currentState.panY * maxShiftY;

        const cropX = (vidW - cropW) / 2 - shiftX;
        const cropY = (vidH - cropH) / 2 - shiftY;

        const sourceRect = {
          x: Math.max(0, Math.min(vidW - cropW, cropX)),
          y: Math.max(0, Math.min(vidH - cropH, cropY)),
          width: cropW,
          height: cropH
        };

        // Simplified layout - backgrounds are now handled at recording time
        layout = {
          canvasSize: { width: vidW, height: vidH },
          sourceRect: sourceRect,
          destRect: { x: 0, y: 0, width: vidW, height: vidH }
        };
      }

      setRenderingText('Rendering Video...');

      const resultBlob = await processVideo({
        blob,
        segments: currentState.segments.sort((a, b) => a.start - b.start),
        videoVolume: currentState.videoVolume,
        musicVolume: currentState.musicVolume,
        playbackSpeed: currentState.playbackSpeed,
        addedAudioBlob: currentState.addedAudioBlob || undefined,
        addedAudioUrl: currentState.addedAudioUrl || undefined,
        format: options.format,
        targetResolution: targetRes,
        layout,
        // Audio detection is now handled internally via FFmpeg probe
        onProgress: (p) => {
          setProgress(Math.round(p * 100));
        },
      });

      if (options.location === 'local') {
        setProgress(100);
        const url = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${options.filename}.${options.format}`;
        a.click();
        URL.revokeObjectURL(url);
        setTimeout(() => setProcessingState('idle'), 1000);
      } else {
        setProcessingState('authenticating');
        setRenderingText("Waiting for Google permission...");
        const token = await authenticateGoogle();

        setProcessingState('uploading');
        setRenderingText(`Syncing to ${options.location === 'drive' ? 'Google Drive' : 'YouTube'}...`);
        setProgress(0);

        let finalUrl = '';
        if (options.location === 'drive') {
          finalUrl = await uploadToDrive(resultBlob, `${options.filename}.${options.format}`, token, (p) => setProgress(p));
        } else {
          finalUrl = await uploadToYouTube(resultBlob, options.filename, token, (p) => setProgress(p));
        }

        setUploadData({ url: finalUrl, location: options.location });
        setProcessingState('success');
      }

    } catch (e: any) {
      console.error("Export failed", e);
      alert(`Export failed: ${e.message || 'Check your internet connection.'}`);
      setProcessingState('idle');
    }
  };

  const handleCopyLink = () => {
    if (uploadData?.url) {
      navigator.clipboard.writeText(uploadData.url);
      alert("Link copied to clipboard!");
    }
  };

  const closeProcessingOverlay = () => {
    setProcessingState('idle');
    setUploadData(null);
  };

  const getVideoTransform = () => {
    const scale = currentState.zoom;
    const translateX = -currentState.panX * (scale - 1) * 50;
    const translateY = -currentState.panY * (scale - 1) * 50;
    return `scale(${scale}) translate(${translateX}%, ${translateY}%)`;
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = currentState.videoVolume;
      videoRef.current.playbackRate = currentState.playbackSpeed;
    }
    if (audioRef.current) {
      audioRef.current.volume = currentState.musicVolume;
      audioRef.current.playbackRate = currentState.playbackSpeed;
    }
  }, [currentState.videoVolume, currentState.playbackSpeed, currentState.musicVolume]);

  return (
    <div className="h-full w-full flex flex-col bg-[#344E41] text-[#DAD7CD] overflow-hidden">

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        currentName={videoName}
      />

      <header className="h-[56px] flex-shrink-0 bg-[#3A5A40] border-b border-[#588157] flex items-center justify-between px-4 z-[100]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-[#344E41] rounded-full text-[#A3B18A] transition-colors"><ArrowLeft size={18} /></button>
          <div className="flex flex-col">
            <input
              type="text" value={videoName}
              onChange={(e) => setVideoName(e.target.value)}
              className="bg-transparent border-none text-sm font-bold focus:ring-0 outline-none w-48 text-[#DAD7CD] placeholder-white/20"
            />
            <span className="text-[10px] text-[#A3B18A] font-mono px-1">Autosaved Locally</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-[#344E41] rounded-full px-2 py-1 gap-1 border border-[#588157]">
            <button className="p-1.5 hover:bg-[#3A5A40] rounded-full text-[#A3B18A] hover:text-[#DAD7CD] transition-colors"><Undo2 size={14} /></button>
            <button className="p-1.5 hover:bg-[#3A5A40] rounded-full text-[#A3B18A] hover:text-[#DAD7CD] transition-colors"><Redo2 size={14} /></button>
          </div>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="bg-[#DAD7CD] hover:bg-[#A3B18A] text-[#344E41] px-5 py-1.5 rounded-md font-bold text-sm shadow-lg shadow-[#DAD7CD]/20 transition-all flex items-center gap-2"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">

        <div className="flex-1 flex flex-col bg-[#344E41] overflow-hidden">
          <div className="flex-1 relative flex items-center justify-center p-12 overflow-hidden">

            <div
              className="relative shadow-[0_0_100px_rgba(0,0,0,0.7)] overflow-hidden transition-all duration-300 border border-[#588157] aspect-video flex items-center justify-center bg-black"
              style={{
                width: '100%',
                maxWidth: '1200px',
                backgroundColor: '#000',
              }}
            >
              <div className="relative w-full h-full overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full h-full object-contain pointer-events-none transition-transform duration-200 ease-out origin-center"
                  style={{ transform: getVideoTransform() }}
                  muted={currentState.videoVolume === 0}
                />
              </div>

              {currentState.zoom > 1 && (
                <div
                  className="absolute inset-0 cursor-move z-10"
                  onMouseMove={(e) => {
                    if (e.buttons === 1) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const dx = e.movementX / rect.width;
                      const dy = e.movementY / rect.height;
                      updateState({
                        panX: Math.max(-1, Math.min(1, currentState.panX - dx * 2)),
                        panY: Math.max(-1, Math.min(1, currentState.panY - dy * 2))
                      });
                    }
                  }}
                />
              )}
            </div>

            {addedAudioSrc && (
              <audio
                ref={audioRef}
                src={addedAudioSrc}
                className="hidden"
                loop
              />
            )}

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 bg-[#3A5A40]/90 backdrop-blur-xl px-8 py-3 rounded-full border border-[#588157] shadow-2xl transition-transform hover:scale-105 z-20">
              <button onClick={() => handleSeek(Math.max(0, currentTime - 0.1))} className="text-[#A3B18A] hover:text-[#DAD7CD] transition-colors"><ChevronLeft size={24} /></button>
              <button
                onClick={togglePlay}
                className="w-12 h-12 bg-[#DAD7CD] rounded-full flex items-center justify-center text-[#344E41] shadow-xl hover:scale-110 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
              </button>
              <button onClick={() => handleSeek(Math.min(duration, currentTime + 0.1))} className="text-[#A3B18A] hover:text-[#DAD7CD] transition-colors"><ChevronRight size={24} /></button>
            </div>

            {/* Zoom Controls Removed */}
          </div>

          <div className="h-[280px] flex-shrink-0 bg-[#3A5A40]">
            <Timeline
              duration={duration}
              currentTime={currentTime}
              segments={currentState.segments}
              onSeek={handleSeek}
              onSplit={handleSplit}
              onTrimSegment={handleTrimSegment}
              onDeleteSegment={handleDeleteSegment}
              videoTrackLabel={videoName}
            />
          </div>
        </div>

        <aside className="w-80 bg-[#3A5A40] border-l border-[#588157] p-6 space-y-8 overflow-y-auto custom-scrollbar">
          <div>
            <h3 className="text-[10px] font-black uppercase text-[#A3B18A] mb-4 flex items-center gap-2 tracking-tighter">
              <Volume2 size={12} className="text-[#DAD7CD]" /> Audio Controls
            </h3>
            <div className="space-y-6">
              <div className="p-3 bg-[#344E41] rounded border border-[#588157]">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-[#A3B18A]">Clip Volume</span>
                  <span className="text-[10px] font-mono text-[#DAD7CD]">{Math.round(currentState.videoVolume * 100)}%</span>
                </div>
                <input type="range" min={0} max={1} step={0.01} value={currentState.videoVolume} onChange={(e) => updateState({ videoVolume: Number(e.target.value) })} className="w-full accent-[#DAD7CD] h-1" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-[#A3B18A] font-medium">Background Music</label>
                  <button
                    onClick={() => audioInputRef.current?.click()}
                    className="text-[10px] text-[#DAD7CD] hover:underline flex items-center gap-1 font-bold"
                  >
                    <Plus size={10} /> Add Track
                  </button>
                  <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {DEFAULT_MUSIC_TRACKS.map(track => (
                    <button
                      key={track.id}
                      onClick={() => updateState({ addedAudioUrl: track.url, addedAudioBlob: null, addedAudioName: track.name })}
                      className={`flex items-center gap-3 p-2 rounded border text-left transition-all ${currentState.addedAudioUrl === track.url ? 'bg-[#DAD7CD]/10 border-[#DAD7CD]/50' : 'bg-[#344E41] border-[#588157] opacity-60 hover:opacity-100'}`}
                    >
                      <Music size={12} className={currentState.addedAudioUrl === track.url ? 'text-[#DAD7CD]' : 'text-[#A3B18A]'} />
                      <span className="text-[10px] font-bold">{track.name}</span>
                    </button>
                  ))}
                </div>

                {currentState.addedAudioName && (
                  <div className="p-3 bg-[#344E41] rounded border border-[#DAD7CD]/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Music size={14} className="text-[#DAD7CD] flex-shrink-0" />
                        <span className="text-[10px] truncate text-[#A3B18A] font-mono">{currentState.addedAudioName}</span>
                      </div>
                      <button onClick={() => updateState({ addedAudioBlob: null, addedAudioUrl: null, addedAudioName: null })} className="text-[#A3B18A] hover:text-[#DAD7CD]"><X size={14} /></button>
                    </div>
                    <input type="range" min={0} max={1} step={0.01} value={currentState.musicVolume} onChange={(e) => updateState({ musicVolume: Number(e.target.value) })} className="w-full accent-[#DAD7CD] h-1" />
                    <div className="text-[9px] text-right text-[#A3B18A]">Music Vol: {Math.round(currentState.musicVolume * 100)}%</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase text-[#A3B18A] mb-4 flex items-center gap-2 tracking-tighter">
              <Gauge size={12} className="text-[#DAD7CD]" /> Playback Speed
            </h3>
            <div className="p-3 bg-[#344E41] rounded border border-[#588157]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-[#A3B18A]">Multiplier</span>
                <span className="text-[10px] font-mono text-[#DAD7CD]">{currentState.playbackSpeed}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={currentState.playbackSpeed}
                onChange={(e) => updateState({ playbackSpeed: Number(e.target.value) })}
                className="w-full accent-[#DAD7CD] h-1"
              />
              <div className="flex justify-between mt-2 px-1">
                <button onClick={() => updateState({ playbackSpeed: 0.5 })} className="text-[9px] text-[#A3B18A] hover:text-[#DAD7CD] transition-colors">0.5x</button>
                <button onClick={() => updateState({ playbackSpeed: 1.0 })} className="text-[9px] text-[#A3B18A] hover:text-[#DAD7CD] transition-colors">Normal</button>
                <button onClick={() => updateState({ playbackSpeed: 2.0 })} className="text-[9px] text-[#A3B18A] hover:text-[#DAD7CD] transition-colors">2.0x</button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {processingState !== 'idle' && (
        <div className="fixed inset-0 bg-[#344E41]/95 z-[999] flex flex-col items-center justify-center backdrop-blur-lg animate-in fade-in duration-300">

          {(processingState === 'rendering' || processingState === 'authenticating' || processingState === 'uploading') && (
            <div className="relative flex flex-col items-center w-full max-w-md">
              <button
                onClick={closeProcessingOverlay}
                className="absolute -top-12 right-0 text-[#A3B18A] hover:text-[#DAD7CD] transition-colors p-2 rounded-full hover:bg-[#3A5A40]"
                title="Cancel"
              >
                <X size={24} />
              </button>
              <div className="text-[#DAD7CD] font-black text-3xl tracking-[0.1em] uppercase italic animate-pulse mb-8">
                {processingState === 'rendering'
                  ? (exportLocation === 'local' ? 'Downloading' : 'Syncing Video')
                  : (processingState === 'authenticating' ? 'Signing In' : 'Syncing Cloud')}
              </div>

              <div className="w-full h-6 bg-[#3A5A40] border-2 border-[#588157] rounded-full overflow-hidden relative shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-[#A3B18A] to-[#DAD7CD] transition-all duration-300 ease-out flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(5, progress)}%` }}
                >
                  {progress > 10 && <span className="text-[10px] font-bold text-[#344E41]">{progress}%</span>}
                </div>
              </div>

              <p className="text-[#A3B18A] text-xs mt-4 font-mono font-bold tracking-widest uppercase">{renderingText}</p>
            </div>
          )}

          {processingState === 'success' && uploadData && (
            <div className="bg-[#3A5A40] border border-[#588157] rounded-[2rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300 relative">
              <button onClick={closeProcessingOverlay} className="absolute top-6 right-6 text-[#A3B18A] hover:text-[#DAD7CD]">
                <X size={24} />
              </button>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-[#DAD7CD] rounded-full flex items-center justify-center shadow-lg shadow-[#DAD7CD]/20">
                  {uploadData.location === 'drive' ? <Cloud size={40} className="text-[#344E41]" /> : <Youtube size={40} className="text-[#344E41]" />}
                </div>

                <div>
                  <h2 className="text-3xl font-[900] text-[#DAD7CD] tracking-tighter mb-2">Sync Complete!</h2>
                  <p className="text-[#A3B18A] text-lg">Your video is live on {uploadData.location === 'drive' ? 'Google Drive' : 'YouTube'}.</p>
                </div>

                <div className="w-full bg-[#344E41] rounded-xl border border-[#588157] flex items-center p-2 gap-2 mt-4">
                  <input
                    type="text"
                    readOnly
                    value={uploadData.url}
                    className="flex-1 bg-transparent border-none text-[#DAD7CD] text-sm font-mono px-2 outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-2 bg-[#A3B18A] hover:bg-[#DAD7CD] text-[#344E41] rounded-lg transition-colors font-bold flex items-center gap-2 text-xs uppercase tracking-wider"
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>

                <a
                  href={uploadData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#DAD7CD] hover:text-white flex items-center gap-2 text-sm font-bold mt-4 border-b border-[#DAD7CD]"
                >
                  Open Link directly <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};