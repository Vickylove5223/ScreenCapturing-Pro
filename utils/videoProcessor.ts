/** Fix: Added DOM library reference to resolve missing browser global properties */
/// <reference lib="dom" />

// @ts-ignore
import GIF from 'gif.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VideoLayout {
  canvasSize: { width: number; height: number };
  // sourceRect is used for cropping the input video (Zoom/Pan)
  sourceRect?: Rect;
  // destRect is where the cropped video is placed on the canvas
  destRect?: Rect;
}

export interface VideoSegment {
  id: string;
  start: number;
  end: number;
}

export interface ProcessOptions {
  blob: Blob;
  segments: VideoSegment[];
  videoVolume: number;
  musicVolume: number;
  playbackSpeed: number;
  // Layout handles zoom/crop
  layout?: VideoLayout;
  targetResolution?: { width: number; height: number };
  addedAudioBlob?: Blob;
  addedAudioUrl?: string;
  format?: 'webm' | 'mp4' | 'gif';
  onProgress: (progress: number) => void;
  hasAudioTrack?: boolean;
}

// Dummy export to prevent breaking imports of helper functions
export const preloadFFmpeg = async (): Promise<boolean> => {
  return true;
};

export const isFFmpegReady = (): boolean => true;

// Helper to keep format signature even if unused
export const downscaleImageBlob = async (blob: Blob, maxSize = 1920): Promise<Blob> => {
  return blob;
};

/**
 * Native video processing using MediaRecorder, Canvas, and Web Audio API.
 * Replaces FFmpeg for a lighter, more stable export experience.
 */
export const processVideo = async (options: ProcessOptions): Promise<Blob> => {
  const {
    blob,
    segments,
    videoVolume,
    musicVolume,
    playbackSpeed,
    layout,
    targetResolution,
    addedAudioBlob,
    addedAudioUrl,
    format = 'webm',
    onProgress,
  } = options;

  if (!segments || segments.length === 0) {
    throw new Error("No video segments selected for export.");
  }

  // 1. Setup Canvas for Video Manipulation (Crop/Resize)
  const canvas = document.createElement('canvas');
  // Determine output size
  const outputWidth = targetResolution?.width || 1920;
  const outputHeight = targetResolution?.height || 1080;
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: format === 'gif' }); // Optimization

  if (!ctx) throw new Error("Failed to create canvas context");

  // 2. Setup Resources (Video Source, Audio Elements)
  const video = document.createElement('video');
  video.src = URL.createObjectURL(blob);
  video.muted = true; // We mix audio separately to avoid feedback/echo
  video.crossOrigin = "anonymous";
  video.playbackRate = playbackSpeed;

  // Wait for video metadata
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load input video"));
  });

  // Calculate layout logic once
  const sourceRect = layout?.sourceRect || { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight };

  // Calculate destination rect on the output canvas (Letterboxing/Fit)
  const scale = Math.min(outputWidth / sourceRect.width, outputHeight / sourceRect.height);
  const drawnWidth = sourceRect.width * scale;
  const drawnHeight = sourceRect.height * scale;
  const drawnX = (outputWidth - drawnWidth) / 2;
  const drawnY = (outputHeight - drawnHeight) / 2;

  // 3. Audio Construction (Web Audio API)
  // Only relevant for video formats
  let audioCtx: AudioContext | null = null;
  let dest: MediaStreamAudioDestinationNode | null = null;
  let musicElement: HTMLAudioElement | null = null;

  if (format !== 'gif') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
    dest = audioCtx.createMediaStreamDestination();

    // Video Audio Source
    const videoSource = audioCtx.createMediaElementSource(video);
    const videoGain = audioCtx.createGain();
    videoGain.gain.value = videoVolume;
    videoSource.connect(videoGain).connect(dest);

    // Background Music Source (if any)
    if (addedAudioBlob || addedAudioUrl) {
      musicElement = new Audio();
      musicElement.crossOrigin = "anonymous";
      musicElement.loop = true; // Background music usually loops
      musicElement.playbackRate = playbackSpeed; // Sync speed

      if (addedAudioBlob) {
        musicElement.src = URL.createObjectURL(addedAudioBlob);
      } else if (addedAudioUrl) {
        musicElement.src = addedAudioUrl;
      }

      // Wait for music to be loadable
      try {
        await new Promise<void>((resolve, reject) => {
          if (!musicElement) return resolve();
          musicElement.onloadedmetadata = () => resolve();
          musicElement.onerror = () => {
            console.warn("Failed to load music, skipping.");
            musicElement = null;
            resolve(); // Don't fail export
          };
        });
      } catch (e) { console.warn("Music load error", e); }

      if (musicElement) {
        const musicSource = audioCtx.createMediaElementSource(musicElement);
        const musicGain = audioCtx.createGain();
        musicGain.gain.value = musicVolume;
        musicSource.connect(musicGain).connect(dest);
      }
    }
  }

  // 4. Processing Loop Setup
  const sortedSegments = [...segments].sort((a, b) => a.start - b.start);
  const totalDuration = sortedSegments.reduce((acc, s) => acc + (s.end - s.start), 0);
  let processedDuration = 0;

  // --- GIF VS VIDEO PATH ---

  if (format === 'gif') {
    // GIF EXPORT
    return new Promise(async (resolve, reject) => {
      try {
        const gif = new GIF({
          workers: 4,
          quality: 10,
          width: outputWidth,
          height: outputHeight,
          workerScript: '/gif.worker.js'
        });

        gif.on('finished', (blob: Blob) => {
          resolve(blob);
        });

        const fps = 10; // Reduce FPS for GIF to keep size manageable and speed reasonable
        const frameInterval = 1 / fps;

        for (const segment of sortedSegments) {
          let currentTime = segment.start;
          while (currentTime < segment.end) {
            video.currentTime = currentTime;
            await new Promise<void>(r => {
              const onSeek = () => { video.removeEventListener('seeked', onSeek); r(); };
              video.addEventListener('seeked', onSeek);
            });

            // Draw frame
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, outputWidth, outputHeight);
            ctx.drawImage(
              video,
              sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
              drawnX, drawnY, drawnWidth, drawnHeight
            );

            gif.addFrame(ctx, { copy: true, delay: (1000 / fps) / playbackSpeed });

            const totalProgress = (processedDuration + (currentTime - segment.start)) / totalDuration;
            onProgress(totalProgress * 0.8); // Rendering is 80%, encoding is 20%

            currentTime += frameInterval * playbackSpeed;
          }
          processedDuration += (segment.end - segment.start);
        }

        onProgress(0.8);
        console.log("GIF Rendering 100%, now encoding...");
        gif.render(); // Start encoding

      } catch (err) {
        reject(err);
      }
    });
  } else {
    // VIDEO EXPORT (WebM/MP4)
    const canvasStream = canvas.captureStream(30); // 30 FPS

    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...(dest ? dest.stream.getAudioTracks() : [])
    ]);

    // High Quality Bitrates
    // 4K: 50 Mbps, 1080p: 25 Mbps, 720p: 8 Mbps
    let bitrate = 25000000;
    if (outputWidth >= 3840) bitrate = 50000000;
    else if (outputWidth <= 1280) bitrate = 8000000;

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: bitrate
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    return new Promise(async (resolve, reject) => {

      recorder.onstop = async () => {
        // Cleanup
        URL.revokeObjectURL(video.src);
        if (musicElement) URL.revokeObjectURL(musicElement.src);
        if (audioCtx) audioCtx.close();

        // Final Blob
        const finalBlob = new Blob(chunks, { type: mimeType });
        resolve(finalBlob);
      };

      recorder.onerror = (e) => reject(e);

      // Start Recording
      recorder.start(100);

      // Draw Loop
      let stopDrawing = false;
      const draw = () => {
        if (stopDrawing) return;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, outputWidth, outputHeight);

        ctx.drawImage(
          video,
          sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
          drawnX, drawnY, drawnWidth, drawnHeight
        );

        requestAnimationFrame(draw);
      };

      requestAnimationFrame(draw);

      try {
        for (const segment of sortedSegments) {

          if (recorder.state === 'recording') recorder.pause();
          if (musicElement) musicElement.pause();

          video.currentTime = segment.start;
          await new Promise<void>(r => {
            const onSeek = () => { video.removeEventListener('seeked', onSeek); r(); };
            video.addEventListener('seeked', onSeek);
          });

          if (recorder.state === 'paused') recorder.resume();
          if (musicElement) musicElement.play();

          await video.play();

          await new Promise<void>(r => {
            const checkTime = () => {
              if (video.currentTime >= segment.end || video.paused || video.ended) {
                video.removeEventListener('timeupdate', checkTime);
                r();
              } else {
                const currentSegmentProgress = video.currentTime - segment.start;
                const totalProgress = (processedDuration + currentSegmentProgress) / totalDuration;
                onProgress(Math.min(0.99, totalProgress));
              }
            };
            video.addEventListener('timeupdate', checkTime);
          });

          video.pause();
          processedDuration += (segment.end - segment.start);
        }

        stopDrawing = true;
        recorder.stop();
        onProgress(1);

      } catch (err) {
        stopDrawing = true;
        recorder.stop();
        reject(err);
      }
    });
  }
};