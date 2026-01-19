import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// Singleton FFmpeg instance
let ffmpeg: FFmpeg | null = null;

const loadFFmpeg = async () => {
  if (ffmpeg) return ffmpeg;

  const ffmpegInstance = new FFmpeg();

  // Load FFmpeg (requires internet initially to fetch wasm)
  // We use the default CDN setup for simplicity
  await ffmpegInstance.load({
    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js',
    wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm',
  });

  ffmpeg = ffmpegInstance;
  return ffmpeg;
};

export const preloadFFmpeg = async (): Promise<boolean> => {
  try {
    await loadFFmpeg();
    return true;
  } catch (e) {
    console.error("Failed to preload FFmpeg", e);
    return false;
  }
};

export const isFFmpegReady = (): boolean => !!ffmpeg;

export const downscaleImageBlob = async (blob: Blob, maxSize = 1920): Promise<Blob> => {
  return blob;
};

/**
 * Native video processing using MediaRecorder for video, and FFmpeg.wasm for GIF.
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

  // -------------------------------------------------------------------------
  // STEP 1: RENDER TO WEBM FIRST (Standardize Input)
  // -------------------------------------------------------------------------
  // We need a clean video file to pass to FFmpeg or to return as the final videoResult.
  // We reuse the existing canvas/MediaRecorder logic to burn in effects/edits first.

  // Setup Canvas
  const canvas = document.createElement('canvas');
  const outputWidth = targetResolution?.width || 1920;
  const outputHeight = targetResolution?.height || 1080;
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error("Failed to create canvas context");

  // Setup Resources
  const video = document.createElement('video');
  video.src = URL.createObjectURL(blob);
  video.muted = true;
  video.crossOrigin = "anonymous";
  video.playbackRate = playbackSpeed;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load input video"));
  });

  // Layout
  const sourceRect = layout?.sourceRect || { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight };
  const scale = Math.min(outputWidth / sourceRect.width, outputHeight / sourceRect.height);
  const drawnWidth = sourceRect.width * scale;
  const drawnHeight = sourceRect.height * scale;
  const drawnX = (outputWidth - drawnWidth) / 2;
  const drawnY = (outputHeight - drawnHeight) / 2;

  // Audio mixing setup (only needed if NOT gif, but we do it to create the intermediate blob correctly)
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const dest = audioCtx.createMediaStreamDestination();
  let musicElement: HTMLAudioElement | null = null;

  // Video Audio
  const videoSource = audioCtx.createMediaElementSource(video);
  const videoGain = audioCtx.createGain();
  videoGain.gain.value = videoVolume;
  videoSource.connect(videoGain).connect(dest);

  // Music
  if (addedAudioBlob || addedAudioUrl) {
    musicElement = new Audio();
    musicElement.crossOrigin = "anonymous";
    musicElement.loop = true;
    musicElement.playbackRate = playbackSpeed;
    musicElement.src = addedAudioBlob ? URL.createObjectURL(addedAudioBlob) : addedAudioUrl!;
    try {
      await new Promise<void>((resolve) => {
        musicElement!.onloadedmetadata = () => resolve();
        musicElement!.onerror = () => { musicElement = null; resolve(); };
      });
    } catch (e) { }
    if (musicElement) {
      const musicSource = audioCtx.createMediaElementSource(musicElement);
      const musicGain = audioCtx.createGain();
      musicGain.gain.value = musicVolume;
      musicSource.connect(musicGain).connect(dest);
    }
  }

  // Render Steps
  const intermediateChunks: Blob[] = [];
  // If GIF, we don't strictly need audio in the intermediate, BUT keeping it generic is safer.
  // However, FFmpeg for GIF ignores audio.
  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...(dest.stream.getAudioTracks())
  ]);

  const intermediateRecorder = new MediaRecorder(combinedStream, {
    mimeType: 'video/webm;codecs=vp8', // VP8 is safer for generic FFmpeg/Browser compatibility
    videoBitsPerSecond: 25000000
  });

  intermediateRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) intermediateChunks.push(e.data);
  };

  const sortedSegments = [...segments].sort((a, b) => a.start - b.start);
  const totalDuration = sortedSegments.reduce((acc, s) => acc + (s.end - s.start), 0);
  let processedDuration = 0;

  // Wait for intermediate render
  const intermediateBlob = await new Promise<Blob>(async (resolve, reject) => {
    intermediateRecorder.onstop = () => {
      resolve(new Blob(intermediateChunks, { type: 'video/webm' }));
    };
    intermediateRecorder.onerror = (e) => reject(e);

    intermediateRecorder.start(100);

    // Draw Loop
    let stopDrawing = false;
    const draw = () => {
      if (stopDrawing) return;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, outputWidth, outputHeight);
      ctx.drawImage(video, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height, drawnX, drawnY, drawnWidth, drawnHeight);
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);

    try {
      for (const segment of sortedSegments) {
        if (intermediateRecorder.state === 'recording') intermediateRecorder.pause();
        if (musicElement) musicElement.pause();

        video.currentTime = segment.start;
        await new Promise<void>(r => {
          const onSeek = () => { video.removeEventListener('seeked', onSeek); r(); };
          video.addEventListener('seeked', onSeek);
        });

        if (intermediateRecorder.state === 'paused') intermediateRecorder.resume();
        if (musicElement) musicElement.play();
        await video.play();

        await new Promise<void>(r => {
          const checkTime = () => {
            if (video.currentTime >= segment.end || video.paused || video.ended) {
              video.removeEventListener('timeupdate', checkTime);
              r();
            } else {
              const prog = (processedDuration + (video.currentTime - segment.start)) / totalDuration;
              // If exporting GIF, this is Phase 1 (50% progress)
              // If exporting Video, this is Phase 1 (100% progress)
              onProgress(format === 'gif' ? prog * 0.5 : prog);
            }
          };
          video.addEventListener('timeupdate', checkTime);
        });
        video.pause();
        processedDuration += (segment.end - segment.start);
      }
      stopDrawing = true;
      intermediateRecorder.stop();
    } catch (e) {
      stopDrawing = true;
      intermediateRecorder.stop();
      reject(e);
    }
  });

  // Cleanup Audio/Resources
  audioCtx.close();
  URL.revokeObjectURL(video.src);
  if (musicElement) URL.revokeObjectURL(musicElement.src);


  // -------------------------------------------------------------------------
  // STEP 2: FINALIZE (Return Blob OR Convert to GIF)
  // -------------------------------------------------------------------------

  if (format !== 'gif') {
    // If user wanted video, we are done!
    onProgress(1);
    return intermediateBlob;
  }

  // -------------------------------------------------------------------------
  // STEP 3: CONVERT TO GIF (FFmpeg)
  // -------------------------------------------------------------------------
  console.log("Loading FFmpeg for GIF conversion...");
  const ff = await loadFFmpeg();

  onProgress(0.6); // Loaded

  const inputName = 'input.webm';
  const outputName = 'output.gif';
  const paletteName = 'palette.png';

  // Write input file to FS
  await ff.writeFile(inputName, await fetchFile(intermediateBlob));

  onProgress(0.7);

  // 1. Generate Palette (Better quality)
  // ffmpeg -i input.webm -vf "fps=15,scale=...:flags=lanczos,palettegen" -y palette.png
  console.log("Generating GIF palette...");
  await ff.exec([
    '-i', inputName,
    '-vf', `fps=15,scale=${outputWidth}:-1:flags=lanczos,palettegen`,
    '-y', paletteName
  ]);

  onProgress(0.8);

  // 2. Generate GIF using Palette
  // ffmpeg -i input.webm -i palette.png -filter_complex "fps=15,scale=...:flags=lanczos[x];[x][1:v]paletteuse" -y output.gif
  console.log("Encoding GIF...");
  await ff.exec([
    '-i', inputName,
    '-i', paletteName,
    '-filter_complex', `fps=15,scale=${outputWidth}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
    '-y', outputName
  ]);

  onProgress(0.9);

  // Read result
  const data = await ff.readFile(outputName);

  // Cleanup FS
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);
  await ff.deleteFile(paletteName);

  onProgress(1);
  return new Blob([data], { type: 'image/gif' });
};