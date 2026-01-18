/** Fix: Added DOM library reference to resolve missing browser global types like MediaStream and MediaRecorder */
/// <reference lib="dom" />

import { useState, useCallback, useRef, useEffect } from 'react';

// CanvasCaptureMediaStreamTrack extends MediaStreamTrack with requestFrame method
interface CanvasCaptureMediaStreamTrack extends MediaStreamTrack {
  requestFrame(): void;
}

export type RecorderStatus = 'idle' | 'recording' | 'recorded';

export interface RecorderOptions {
  audio: boolean;
  camera?: boolean;
  pip?: boolean;
  audioMixing?: boolean;
  backgroundColor?: string;
  backgroundImageUrl?: string;
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
  const mimeTypeRef = useRef<string>('video/webm');

  // Canvas compositing refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  // Ref-based guard to prevent multiple recording starts (avoids stale closure issues)
  const isRecordingInProgressRef = useRef<boolean>(false);

  const cleanupStream = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Cleanup video element
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
      videoElementRef.current = null;
    }

    // Cleanup canvas
    if (canvasRef.current) {
      canvasRef.current = null;
    }

    // Cleanup background image
    if (backgroundImageRef.current) {
      backgroundImageRef.current = null;
    }

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
    // Ref-based guard: prevents multiple calls even with stale closures
    if (isRecordingInProgressRef.current) {
      console.warn('Recording already in progress, ignoring duplicate startRecording call');
      return;
    }
    // Set ref IMMEDIATELY to block any concurrent calls
    isRecordingInProgressRef.current = true;

    try {
      setError(null);
      cleanupStream();

      const shouldRecordAudio = options ? options.audio : isAudioEnabled;
      const shouldUseAudioMixing = options?.audioMixing && shouldRecordAudio;
      const shouldUsePip = options?.pip;
      const hasBackground = !!(options?.backgroundColor || options?.backgroundImageUrl);

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

      // Determine which stream to record
      let recordingStream: MediaStream;

      if (hasBackground) {
        console.log('Canvas compositing enabled with background');

        // Create hidden video element for the source stream
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        videoElementRef.current = video;

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(reject);
          };
          video.onerror = () => reject(new Error('Failed to load video stream'));
        });

        // Get video dimensions
        const videoWidth = video.videoWidth || 1920;
        const videoHeight = video.videoHeight || 1080;

        // Create canvas with 16:9 aspect ratio, centered video with padding
        const canvasWidth = 1920;
        const canvasHeight = 1080;
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvasRef.current = canvas;

        const ctx = canvas.getContext('2d', { alpha: false })!; // Optimize for no alpha if possible

        // Load background image if specified
        let bgImage: HTMLImageElement | null = null;
        if (options?.backgroundImageUrl) {
          bgImage = new Image();
          // CRITICAL: Set crossOrigin BEFORE setting src
          bgImage.crossOrigin = 'anonymous';

          // CACHE BUSTING: Add unique timestamp to prevent browser serving cached non-CORS version
          // This is crucial because preview images might be cached without CORS headers
          const cacheBuster = `_cors_${Date.now()}`;
          const urlWithCacheBuster = options.backgroundImageUrl.includes('?')
            ? `${options.backgroundImageUrl}&${cacheBuster}`
            : `${options.backgroundImageUrl}?${cacheBuster}`;

          console.log('[Recording] Loading background image with cache busting:', urlWithCacheBuster);
          bgImage.src = urlWithCacheBuster;

          await new Promise<void>((resolve, reject) => {
            bgImage!.onload = async () => {
              try {
                // Wait for image to be fully decoded (prevents race conditions)
                if (bgImage!.decode) {
                  await bgImage!.decode();
                  console.log('[Recording] Background image decoded successfully');
                }

                // Test if image will taint canvas by trying to draw it to a test canvas
                const testCanvas = document.createElement('canvas');
                testCanvas.width = 1;
                testCanvas.height = 1;
                const testCtx = testCanvas.getContext('2d')!;
                testCtx.drawImage(bgImage!, 0, 0, 1, 1);

                // This will throw if canvas is tainted
                testCtx.getImageData(0, 0, 1, 1);
                console.log('[Recording] Background image CORS check: ✅ PASSED');
                resolve();
              } catch (err) {
                console.error('[Recording] Background image CORS check: ❌ FAILED', err);
                bgImage = null;
                reject(new Error('Background image does not support CORS and will corrupt the recording. Please use a local image or ensure the image server has CORS headers.'));
              }
            };
            bgImage!.onerror = (err) => {
              console.error('[Recording] Failed to load background image:', err);
              bgImage = null;
              // Reject instead of silently falling back - let user know there's an issue
              reject(new Error('Failed to load background image. Please check the URL or try a different image.'));
            };
          });
          backgroundImageRef.current = bgImage;
        }

        const bgColor = options?.backgroundColor || '#000000';

        // Calculate video positioning (centered with 10% padding)
        const padding = 0.1;
        const maxWidth = canvasWidth * (1 - padding * 2);
        const maxHeight = canvasHeight * (1 - padding * 2);
        const scale = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
        const scaledWidth = videoWidth * scale;
        const scaledHeight = videoHeight * scale;
        const x = (canvasWidth - scaledWidth) / 2;
        const y = (canvasHeight - scaledHeight) / 2;

        // Capture canvas stream with AUTOMATIC frame control
        console.log('[Recording] Canvas dimensions:', canvasWidth, 'x', canvasHeight);
        console.log('[Recording] Has background image:', !!bgImage);
        console.log('[Recording] Background color:', bgColor);

        let canvasStream: MediaStream;

        try {
          // Use 30FPS auto-capture for better compatibility
          canvasStream = canvas.captureStream(30);

          console.log('[Recording] Canvas stream created:', canvasStream.id);
          console.log('[Recording] Canvas video tracks:', canvasStream.getVideoTracks().length);
        } catch (err: any) {
          console.error('[Recording] Canvas captureStream failed:', err);
          if (err.name === 'SecurityError') {
            throw new Error('Canvas recording blocked by security policy. Background image may have CORS issues.');
          }
          throw err;
        }

        // Animation loop to draw frames
        const drawFrame = () => {
          if (!canvasRef.current || !videoElementRef.current) return;

          // Draw background
          if (bgImage) {
            ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
          } else {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          }

          // Draw video with rounded corners
          ctx.save();
          const radius = 20;
          ctx.beginPath();
          ctx.roundRect(x, y, scaledWidth, scaledHeight, radius);
          ctx.clip();
          ctx.drawImage(video, x, y, scaledWidth, scaledHeight);
          ctx.restore();

          // No need to requestFrame() with captureStream(30)

          animationFrameRef.current = requestAnimationFrame(drawFrame);
        };

        // Start drawing
        drawFrame();

        // Wait for canvas stream to be truly ready
        await new Promise<void>((resolve) => {
          // Give it a moment to generate a few frames
          setTimeout(() => {
            console.log('[Recording] Canvas stream buffer initialized');
            resolve();
          }, 200);
        });

        // Verify the canvas stream has active video tracks
        const videoTracks = canvasStream.getVideoTracks();
        if (videoTracks.length === 0 || videoTracks[0].readyState !== 'live') {
          console.error('[Recording] Canvas stream video track not live!');
          throw new Error('Canvas stream failed to initialize properly');
        }
        console.log('[Recording] Canvas video track state:', videoTracks[0].readyState);

        // Add audio tracks from original stream
        stream.getAudioTracks().forEach(track => {
          canvasStream.addTrack(track);
        });

        recordingStream = canvasStream;
        setMediaStream(stream); // Keep original stream for preview
      } else {
        // No background - use original stream directly
        recordingStream = stream;
        setMediaStream(stream);
      }

      // Check if we actually have audio tracks
      const hasAudio = recordingStream.getAudioTracks().length > 0;
      console.log('[Recording] Has audio tracks:', hasAudio);

      // Robust MIME type selection
      const getSupportedMimeType = () => {
        const types = [
          hasAudio ? 'video/webm;codecs=vp9,opus' : 'video/webm;codecs=vp9',
          hasAudio ? 'video/webm;codecs=vp8,opus' : 'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4'
        ];

        for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) {
            return type;
          }
        }
        return ''; // Let constructor decide default if nothing matches
      };

      const mimeType = getSupportedMimeType();
      console.log('[Recording] Using MIME type:', mimeType);

      // If no supported type found, don't pass mimeType option to let browser use default
      const optionsObj = mimeType ? { mimeType, videoBitsPerSecond: 2500000 } : { videoBitsPerSecond: 2500000 };

      // Store actual used mime type if possible, or fallback to what we selected
      mimeTypeRef.current = mimeType || 'video/webm';

      const mediaRecorder = new MediaRecorder(recordingStream, optionsObj);

      // If we didn't specify a type, try to read what the browser resolved to (if property exists or can be inferred)
      if (!mimeType && mediaRecorder.mimeType) {
        mimeTypeRef.current = mediaRecorder.mimeType;
        console.log('[Recording] Browser resolved default MIME type:', mediaRecorder.mimeType);
      }

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          // console.log('[Recording] Data chunk received:', event.data.size);
          chunksRef.current.push(event.data);
        }
      };

      // CRITICAL: Add error handler for MediaRecorder encoding errors
      mediaRecorder.onerror = (event: Event) => {
        console.error('[Recording] MediaRecorder error:', event);
        setError('Recording failed: Encoding error occurred');
        setStatus('idle');
        isRecordingInProgressRef.current = false;
        cleanupStream();
      };

      mediaRecorder.onstop = () => {
        console.log('[Recording] Stopped. Total chunks:', chunksRef.current.length);

        // Validate that we have data
        if (chunksRef.current.length === 0) {
          console.error('[Recording] No data chunks collected!');
          setError('Recording failed: No data captured');
          setStatus('idle');
          isRecordingInProgressRef.current = false;
          cleanupStream();
          return;
        }

        const validChunks = chunksRef.current; // With auto-capture, 1-byte chunks are less likely, but we accept all non-zero

        try {
          // Create blob with the actual MIME type used during recording
          console.log('[Recording] Creating blob with type:', mimeTypeRef.current);
          const blob = new Blob(validChunks, { type: mimeTypeRef.current });
          console.log('[Recording] Created blob:', blob.size, 'bytes, type:', blob.type);

          // Validate blob size
          if (blob.size === 0) {
            console.error('[Recording] Blob is empty!');
            setError('Recording failed: Empty video data');
            setStatus('idle');
            isRecordingInProgressRef.current = false;
            cleanupStream();
            return;
          }

          // Create object URL
          const url = URL.createObjectURL(blob);
          console.log('[Recording] Created object URL:', url);

          setMediaBlobUrl(url);
          setCurrentBlob(blob);
          setStatus('recorded');
          // Reset the guard when recording ends
          isRecordingInProgressRef.current = false;

        } catch (err: any) {
          console.error('[Recording] Error creating blob:', err);
          setError(`Recording failed: ${err.message || 'Could not process video data'}`);
          setStatus('idle');
          isRecordingInProgressRef.current = false;
          cleanupStream();
          return;
        }

        // Stop animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        stream.getTracks().forEach(track => track.stop());
        setMediaStream(null);

        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      };

      // CRITICAL FIX: Add timeslice parameter
      console.log('[Recording] Starting MediaRecorder with 1000ms timeslice (optimized)');
      mediaRecorder.start(100);
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
      // Reset guard on error
      isRecordingInProgressRef.current = false;
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
    // Reset the guard so new recordings can start
    isRecordingInProgressRef.current = false;
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