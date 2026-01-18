/** Fix: Added DOM library reference to resolve missing browser global types like HTMLDivElement, MouseEvent, and document */
/// <reference lib="dom" />

import React, { useRef, useState, useCallback } from 'react';
import { Scissors, Plus, Minus, Clock, Trash2 } from 'lucide-react';
import { VideoSegment } from './Editor';

interface TimelineProps {
  duration: number;
  currentTime: number;
  segments: VideoSegment[];
  onSeek: (time: number) => void;
  onSplit: () => void;
  onTrimSegment: (id: string, start: number, end: number) => void;
  onDeleteSegment: (id: string) => void;
  videoTrackLabel?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  segments,
  onSeek,
  onSplit,
  onTrimSegment,
  onDeleteSegment,
  videoTrackLabel = "Screen Recording"
}) => {
  const [timelineZoom, setTimelineZoom] = useState(150);
  const scrollRef = useRef<HTMLDivElement>(null);

  // CRITICAL FIX: Validate duration to prevent RangeError
  const safeDuration = (!duration || isNaN(duration) || !isFinite(duration) || duration <= 0) ? 1 : duration;
  const safeCurrentTime = (!currentTime || isNaN(currentTime) || !isFinite(currentTime)) ? 0 : currentTime;

  const trackWidth = safeDuration * timelineZoom;
  const playheadPos = safeCurrentTime * timelineZoom;

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
    const time = Math.max(0, Math.min(safeDuration, x / timelineZoom));
    onSeek(time);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const onHandleDrag = (e: React.MouseEvent, type: 'start' | 'end', segment: VideoSegment) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialStart = segment.start;
    const initialEnd = segment.end;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / timelineZoom;
      if (type === 'start') {
        const newStart = Math.max(0, Math.min(initialEnd - 0.1, initialStart + deltaTime));
        onTrimSegment(segment.id, newStart, initialEnd);
      } else {
        const newEnd = Math.max(initialStart + 0.1, Math.min(safeDuration, initialEnd + deltaTime));
        onTrimSegment(segment.id, initialStart, newEnd);
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="flex flex-col h-full bg-[#3A5A40] border-t border-[#588157]">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between px-4 h-12 bg-[#3A5A40] border-b border-[#588157]">
        <div className="flex items-center gap-4">
          <button
            onClick={onSplit}
            className="p-2 text-[#DAD7CD] hover:bg-[#344E41] rounded transition-colors group flex items-center gap-2"
            title="Split at Playhead"
          >
            <Scissors size={18} className="group-hover:text-[#A3B18A]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#A3B18A] group-hover:text-[#DAD7CD]">Split</span>
          </button>
          <div className="h-4 w-[1px] bg-[#588157]" />
          <div className="flex items-center gap-2 text-sm font-mono text-[#DAD7CD] font-semibold">
            <span className="bg-[#588157]/20 px-2 py-0.5 rounded border border-[#588157]/40">
              {formatTime(safeCurrentTime)}
            </span>
            <span className="text-[#A3B18A]">/</span>
            <span className="text-[#A3B18A]">{formatTime(safeDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-[#344E41] rounded-lg border border-[#588157] p-1">
            <button onClick={() => setTimelineZoom(z => Math.max(50, z - 25))} className="p-1 text-[#A3B18A] hover:text-[#DAD7CD]"><Minus size={14} /></button>
            <div className="w-16 flex justify-center text-[10px] text-[#A3B18A] font-bold uppercase select-none">Zoom</div>
            <button onClick={() => setTimelineZoom(z => Math.min(600, z + 25))} className="p-1 text-[#A3B18A] hover:text-[#DAD7CD]"><Plus size={14} /></button>
          </div>
        </div>
      </div>

      {/* Scroller */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-x-auto overflow-y-hidden select-none custom-scrollbar"
        onMouseDown={handleTimelineClick}
      >
        <div className="relative h-full" style={{ width: `${trackWidth + 400}px`, minWidth: '100%' }}>

          {/* Ruler */}
          <div className="h-8 border-b border-[#588157] relative">
            {Array.from({ length: Math.min(Math.ceil(safeDuration) + 1, 1000) }).map((_, i) => (
              <div
                key={i}
                className="absolute h-full border-l border-[#588157] flex flex-col justify-end pb-1"
                style={{ left: `${i * timelineZoom}px` }}
              >
                <span className="text-[10px] text-[#A3B18A] font-mono -ml-2 mb-1">{i}s</span>
                <div className="h-2 w-px bg-[#588157]" />
              </div>
            ))}
          </div>

          {/* Tracks Area */}
          <div className="relative pt-6 px-0 space-y-4">

            {/* Video Track */}
            <div className="relative h-16 w-full flex items-center">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  className="absolute h-14 bg-gradient-to-r from-[#588157] to-[#3A5A40] border-y-2 border-[#A3B18A] flex items-center shadow-lg group rounded-sm"
                  style={{
                    left: `${segment.start * timelineZoom}px`,
                    width: `${(segment.end - segment.start) * timelineZoom}px`
                  }}
                >
                  <div className="px-4 text-xs font-bold text-[#DAD7CD] whitespace-nowrap overflow-hidden flex items-center gap-2 flex-1">
                    <div className="w-4 h-4 bg-white/20 rounded flex items-center justify-center"><Clock size={10} /></div>
                    {videoTrackLabel}
                  </div>

                  {/* Delete button (hidden by default, shown on group hover) */}
                  {segments.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteSegment(segment.id); }}
                      className="mr-3 p-1.5 hover:bg-rose-500 rounded text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Segment"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  {/* Trim Handles */}
                  <div
                    onMouseDown={(e) => onHandleDrag(e, 'start', segment)}
                    className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#A3B18A] cursor-ew-resize hover:w-3 transition-all flex items-center justify-center z-10"
                  >
                    <div className="w-[1px] h-4 bg-[#344E41]" />
                  </div>
                  <div
                    onMouseDown={(e) => onHandleDrag(e, 'end', segment)}
                    className="absolute right-0 top-0 bottom-0 w-2.5 bg-[#A3B18A] cursor-ew-resize hover:w-3 transition-all flex items-center justify-center z-10"
                  >
                    <div className="w-[1px] h-4 bg-[#344E41]" />
                  </div>
                </div>
              ))}
            </div>

            {/* Audio Track (Decorative Waveform-like) */}
            <div className="relative h-12 w-full flex items-center opacity-40">
              {segments.map(segment => (
                <div
                  key={`audio-${segment.id}`}
                  className="absolute h-10 bg-[#588157]/10 border-y border-[#588157]/30 flex items-center rounded-sm overflow-hidden"
                  style={{
                    left: `${segment.start * timelineZoom}px`,
                    width: `${(segment.end - segment.start) * timelineZoom}px`
                  }}
                >
                  <div className="flex gap-1 h-full items-center px-2">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="w-[2px] bg-[#588157]/40 rounded-full" style={{ height: `${Math.random() * 80 + 20}%` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vertical Grid Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-5">
            {Array.from({ length: Math.min(Math.ceil(safeDuration), 1000) }).map((_, i) => (
              <div key={i} className="absolute inset-y-0 w-px bg-[#DAD7CD]" style={{ left: `${i * timelineZoom}px` }} />
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-[#DAD7CD] z-50 pointer-events-none"
            style={{ left: `${playheadPos}px` }}
          >
            <div className="absolute -top-1 -left-[5px] w-3 h-3 bg-[#DAD7CD] rounded-full ring-4 ring-[#DAD7CD]/20 shadow-[0_0_10px_#DAD7CD]" />
            <div className="absolute inset-y-0 -left-[4px] w-[10px] bg-gradient-to-r from-[#DAD7CD]/20 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
};