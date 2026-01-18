import React from 'react';
import { RefreshCcw, Check, Download, Save, X, Scissors, PlayCircle, Loader2 } from 'lucide-react';
import { Button } from './Button';

interface ReviewModalProps {
  mediaBlobUrl: string;
  currentBlob: Blob;
  onClose: () => void;
  onSave: (silent?: boolean) => void;
  onSaveAndEdit: () => void;
  isSaving: boolean;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  mediaBlobUrl,
  currentBlob,
  onClose,
  onSave,
  onSaveAndEdit,
  isSaving
}) => {
  const isValidBlob = currentBlob && currentBlob.size > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose}></div>

      <div className="relative w-full max-w-5xl bg-[#3A5A40] border border-[#588157] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-8">
          <h2 className="text-3xl font-[900] text-[#DAD7CD] tracking-tighter flex items-center gap-3">
            Review Capture
          </h2>
          <button
            onClick={onClose}
            className="p-3 bg-[#344E41] text-[#A3B18A] hover:text-[#DAD7CD] rounded-full transition-colors border border-[#588157]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Preview Area */}
        <div className="flex-1 bg-[#344E41] relative overflow-hidden flex items-center justify-center p-8 mx-8 rounded-[2rem] border border-[#588157]">
          {!isValidBlob ? (
            <div className="text-center">
              <p className="text-[#A3B18A] text-lg mb-2">⚠️ Recording data is invalid</p>
              <p className="text-[#588157] text-sm">The recording may have been corrupted. Please try recording again.</p>
            </div>
          ) : (
            <video
              src={mediaBlobUrl}
              controls
              autoPlay
              muted
              playsInline
              onError={(e) => {
                const videoElement = e.currentTarget;
                console.error('[ReviewModal] Video error:', videoElement.error);
              }}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-xl"
            />
          )}
        </div>

        {/* Actions */}
        <div className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <button
            onClick={onClose}
            className="flex items-center gap-3 px-8 py-4 rounded-full border border-[#588157] text-[#A3B18A] hover:bg-[#344E41] hover:text-[#DAD7CD] transition-all font-bold text-xs uppercase tracking-widest w-full sm:w-auto justify-center"
          >
            <RefreshCcw size={16} />
            Record Again
          </button>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <a
              href={mediaBlobUrl}
              download={`vibe-recording-${Date.now()}.${currentBlob.type.includes('mp4') ? 'mp4' : 'webm'}`}
              className="hidden sm:block"
            >
              <button className="p-4 bg-[#344E41] text-[#A3B18A] hover:text-[#DAD7CD] hover:bg-[#588157] rounded-2xl transition-all border border-[#588157]">
                <Download size={22} />
              </button>
            </a>

            <Button
              onClick={() => onSave(false)}
              variant="secondary"
              disabled={isSaving}
              className="!rounded-full !px-8 !py-5"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save to Library'}
            </Button>

            <Button
              onClick={onSaveAndEdit}
              variant="primary"
              className="flex-1 sm:flex-none w-full sm:w-auto !rounded-full !px-12 !py-5"
            >
              Launch Editor
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};
