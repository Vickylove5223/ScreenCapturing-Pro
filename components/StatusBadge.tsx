import React from 'react';
import { RecorderStatus } from '../hooks/useScreenRecorder';

export const StatusBadge: React.FC<{ status: RecorderStatus }> = ({ status }) => {
  const config = {
    idle: {
      color: "bg-[#344E41] text-[#A3B18A] border border-[#588157]",
      text: "Idle",
      dot: "bg-[#A3B18A]"
    },
    recording: {
      color: "bg-[#DAD7CD]/10 text-[#DAD7CD] border border-[#DAD7CD]/20",
      text: "Recording",
      dot: "bg-[#DAD7CD] animate-pulse"
    },
    recorded: {
      color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      text: "Finished",
      dot: "bg-emerald-500"
    }
  };

  const current = config[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${current.color}`}>
      <span className={`w-2 h-2 rounded-full ${current.dot}`}></span>
      {current.text}
    </div>
  );
};