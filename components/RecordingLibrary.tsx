/** Fix: Added DOM library reference to resolve missing browser global properties like window.location */
/// <reference lib="dom" />
import React, { useState } from 'react';
import { RecordingMeta, updateRecordingName } from '../utils/videoStorage';
import { Play, Trash2, Calendar, HardDrive, Pencil, Check, X, Film, MoreHorizontal } from 'lucide-react';
import { Button } from './Button';

interface RecordingLibraryProps {
  recordings: RecordingMeta[];
  onPlay: (id: string) => void;
  onEdit: (id: string, blob: Blob) => void;
  onDelete: (id: string) => void;
  getBlob: (id: string) => Promise<Blob>;
}

export const RecordingLibrary: React.FC<RecordingLibraryProps> = ({ recordings, onPlay, onEdit, onDelete, getBlob }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  if (recordings.length === 0) {
    return null;
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric'
    });
  };

  const startRenaming = (rec: RecordingMeta) => {
    setEditingId(rec.id);
    setTempName(rec.name);
  };

  const saveName = (id: string) => {
    if (tempName.trim()) {
      updateRecordingName(id, tempName);
      window.location.reload(); 
    }
    setEditingId(null);
  };

  const handleEditClick = async (rec: RecordingMeta) => {
    try {
      const blob = await getBlob(rec.id);
      onEdit(rec.id, blob);
    } catch (e) {
      console.error("Could not load blob for editing");
    }
  };

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {recordings.map((rec) => (
          <div 
            key={rec.id} 
            className="bg-[#3A5A40] border border-[#588157] rounded-[2.5rem] overflow-hidden card-shadow hover:scale-[1.02] transition-transform duration-300 flex flex-col"
          >
            {/* Thumbnail Placeholder */}
            <div className="aspect-video bg-[#344E41] relative group cursor-pointer" onClick={() => onPlay(rec.id)}>
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-[#A3B18A] rounded-full flex items-center justify-center shadow-2xl scale-0 group-hover:scale-100 transition-transform">
                     <Play className="text-[#344E41] ml-1" fill="#344E41" size={24} />
                  </div>
               </div>
               <div className="absolute bottom-4 left-4">
                  <div className="bg-[#344E41]/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-[#DAD7CD] uppercase tracking-widest border border-[#588157]/30">
                     {formatSize(rec.size)}
                  </div>
               </div>
               <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); onDelete(rec.id); }} className="p-2 bg-[#344E41]/70 hover:bg-rose-500 hover:text-white rounded-full text-[#A3B18A] transition-colors border border-[#588157]/30">
                     <Trash2 size={16} />
                  </button>
               </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-1">
                {editingId === rec.id ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="flex-1 bg-[#344E41] border border-[#588157] rounded-xl px-4 py-2 text-[#DAD7CD] text-sm font-bold focus:ring-2 focus:ring-[#A3B18A] outline-none"
                      autoFocus
                    />
                    <button onClick={() => saveName(rec.id)} className="text-emerald-500 hover:text-emerald-400"><Check size={20} /></button>
                  </div>
                ) : (
                  <h3 
                    className="text-xl font-[900] text-[#DAD7CD] tracking-tight line-clamp-1 hover:text-[#A3B18A] transition-colors cursor-pointer"
                    onClick={() => startRenaming(rec)}
                  >
                    {rec.name}
                  </h3>
                )}
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[#A3B18A]">
                   <div className="flex items-center gap-1.5"><Calendar size={12}/> {formatDate(rec.timestamp)}</div>
                   <div className="flex items-center gap-1.5"><Film size={12}/> WebM</div>
                </div>
              </div>

              <div className="flex gap-3">
                 <Button 
                   variant="primary" 
                   fullWidth 
                   className="!rounded-2xl !py-3 !text-xs"
                   onClick={() => handleEditClick(rec)}
                 >
                    Launch Editor
                 </Button>
                 <Button 
                   variant="secondary"
                   className="!px-4 !rounded-2xl"
                   onClick={() => onPlay(rec.id)}
                 >
                    <Play size={16} fill="#DAD7CD" />
                 </Button>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};