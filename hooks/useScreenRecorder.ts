/** Fix: Added DOM library reference to resolve missing browser global types like MediaStream and MediaRecorder */
/// <reference lib="dom" />

import { useState, useCallback, useRef, useEffect } from 'react';

export type RecorderStatus = 'idle' | 'recording' | 'recorded';

export interface RecorderOptions {
  audio: boolean;
  camera?: boolean;
  pip?: boolean;
  audioMixing?: boolean;
}

interface UseScreenRecorderReturn {
  status: RecorderStatus;
  mediaStream: MediaStream | null;
  mediaBlobUrl: string | null;
  currentBlob: Blob | null;
  startRecording: (options?: RecorderOptions) => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  loadRecording: (blob: Blob) => void;
  error: string | null;
  isAudioEnabled: boolean;
  setIsAudioEnabled: (enabled: boolean) => void;
}

export function useScreenRecorder(): UseScreenRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamNodesRef = useRef<MediaStreamAudioSourceNode[]>([]);

  const cleanupStream = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    
    if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
        audioStreamNodesRef.current = [];
    }
  }, [mediaStream]);

  useEffect(() => {
    return () => {
      cleanupStream();
      if (mediaBlobUrl) {
        URL.revokeObjectURL(mediaBlobUrl);
      }
    };
  }, [cleanupStream, mediaBlobUrl]);

  const startRecording = useCallback(async (options?: RecorderOptions) => {
    try {
      setError(null);
      cleanupStream(); 
      
      const shouldRecordAudio = options ? options.audio : isAudioEnabled;
      const shouldUseAudioMixing = options?.audioMixing && shouldRecordAudio;
      const shouldUsePip = options?.pip;
      
      let stream: MediaStream;

      if (options?.camera) {
         stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: shouldRecordAudio
         });
      } else {
         try {
           // Attempt to capture screen with system audio
           stream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: shouldRecordAudio 
           });
         } catch (displayErr: any) {
           // Fallback to video only if audio capture is unsupported or errors
           if (shouldRecordAudio && (displayErr.name === 'NotFoundError' || displayErr.name === 'InvalidStateError' || displayErr.name === 'TypeError')) {
             console.warn("System audio capture failed, falling back to video only.");
             stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
           } else {
             throw displayErr;
           }
         }

         if (shouldUseAudioMixing) {
             try {
                 const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                 const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                 const audioCtx = new AudioContextClass();
                 audioContextRef.current = audioCtx;
                 const dest = audioCtx.createMediaStreamDestination();

                 if (stream.getAudioTracks().length > 0) {
                     const sysSource = audioCtx.createMediaStreamSource(stream);
                     sysSource.connect(dest);
                     audioStreamNodesRef.current.push(sysSource);
                 }

                 const micSource = audioCtx.createMediaStreamSource(micStream);
                 micSource.connect(dest);
                 audioStreamNodesRef.current.push(micSource);

                 const mixedAudioTrack = dest.stream.getAudioTracks()[0];
                 
                 stream.getAudioTracks().forEach(track => {
                    stream.removeTrack(track);
                    track.stop();
                 });
                 
                 stream.addTrack(mixedAudioTrack);
             } catch (mixErr) {
                 console.error("Audio mixing failed:", mixErr);
             }
         }
      }

      setMediaStream(stream);

      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setMediaBlobUrl(url);
        setCurrentBlob(blob);
        setStatus('recorded');
        
        stream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
        
        if(audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
      };

      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      };

      mediaRecorder.start();
      setStatus('recording');

    } catch (err: any) {
      console.error("Error starting screen capture:", err);
      if (err.name === 'NotAllowedError') {
        setError("Permission denied. Please allow access to record.");
      } else if (err.name === 'NotFoundError') {
        setError("Requested device not found. Ensure your browser supports screen sharing.");
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
      setStatus('idle');
    }
  }, [isAudioEnabled, cleanupStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const resetRecording = useCallback(() => {
    cleanupStream();
    if (mediaBlobUrl) {
      URL.revokeObjectURL(mediaBlobUrl);
      setMediaBlobUrl(null);
    }
    setCurrentBlob(null);
    setError(null);
    setStatus('idle');
  }, [cleanupStream, mediaBlobUrl]);

  const loadRecording = useCallback((blob: Blob) => {
    cleanupStream();
    if (mediaBlobUrl) {
      URL.revokeObjectURL(mediaBlobUrl);
    }
    const url = URL.createObjectURL(blob);
    setMediaBlobUrl(url);
    setCurrentBlob(blob);
    setStatus('recorded');
    setError(null);
  }, [cleanupStream, mediaBlobUrl]);

  return {
    status,
    mediaStream,
    mediaBlobUrl,
    currentBlob,
    startRecording,
    stopRecording,
    resetRecording,
    loadRecording,
    error,
    isAudioEnabled,
    setIsAudioEnabled
  };
}