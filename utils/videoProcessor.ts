/** Fix: Added DOM library reference to resolve missing browser global properties like window.crossOriginIsolated */
/// <reference lib="dom" />

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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
  // Layout now handles zoom/crop (sourceRect) and padding/background (destRect/canvasSize)
  layout?: VideoLayout;
  targetResolution?: { width: number; height: number };
  backgroundColor?: string;
  backgroundBlob?: Blob;
  backgroundImageUrl?: string;
  addedAudioBlob?: Blob;
  addedAudioUrl?: string;
  format?: 'webm' | 'mp4' | 'gif';
  onProgress: (progress: number) => void;
  hasAudioTrack?: boolean; // New flag to prevent crashes if input has no audio
}

let ffmpeg: FFmpeg | null = null;

const loadFFmpeg = async (onEngineLoaded?: () => void) => {
  if (ffmpeg) return ffmpeg;
  const instance = new FFmpeg();
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  
  const isIsolated = window.crossOriginIsolated;
  
  try {
    console.log(`Initializing FFmpeg. Cross-Origin Isolated: ${isIsolated}`);
    await instance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    ffmpeg = instance;
    onEngineLoaded?.();
    return ffmpeg;
  } catch (err) {
    console.error("FFmpeg Load Error:", err);
    throw new Error(`Failed to initialize video engine. Details: ${err}`);
  }
};

const formatColor = (hex?: string) => {
  if (!hex) return 'black';
  return hex.replace('#', '0x');
};

const even = (n: number) => 2 * Math.floor(Math.round(n) / 2);

export const processVideo = async (options: ProcessOptions): Promise<Blob> => {
  const {
    blob,
    segments,
    videoVolume,
    musicVolume,
    playbackSpeed,
    layout,
    targetResolution,
    backgroundColor,
    backgroundBlob,
    backgroundImageUrl,
    addedAudioBlob,
    addedAudioUrl,
    format = 'webm',
    onProgress,
    hasAudioTrack = true // Default to true, but caller should verify
  } = options;

  if (!segments || segments.length === 0) {
      throw new Error("No video segments selected for export.");
  }

  const ffmpeg = await loadFFmpeg();
  
  ffmpeg.on('progress', ({ progress }) => {
    onProgress(Math.max(0, Math.min(1, progress)));
  });

  const sortedSegments = [...segments].sort((a, b) => a.start - b.start);

  const inputName = 'input.webm';
  await ffmpeg.writeFile(inputName, await fetchFile(blob));

  // Handle Music
  let audioInputName: string | null = null;
  if (format !== 'gif') {
    if (addedAudioBlob) {
      audioInputName = 'music.mp3';
      await ffmpeg.writeFile(audioInputName, await fetchFile(addedAudioBlob));
    } else if (addedAudioUrl) {
      audioInputName = 'music_url.mp3';
      try {
        const audioData = await fetchFile(addedAudioUrl);
        await ffmpeg.writeFile(audioInputName, audioData);
      } catch (e) {
        console.warn("Could not fetch remote music track.", e);
        audioInputName = null;
      }
    }
  }

  // Handle Background Image
  let bgInputName: string | null = null;
  if (backgroundBlob) {
    bgInputName = 'bg.png';
    await ffmpeg.writeFile(bgInputName, await fetchFile(backgroundBlob));
  } else if (backgroundImageUrl) {
    bgInputName = 'bg_url.png';
    try {
      const imageData = await fetchFile(backgroundImageUrl);
      await ffmpeg.writeFile(bgInputName, imageData);
    } catch (e) {
      console.warn("Could not fetch remote background image.", e);
      bgInputName = null;
    }
  }

  const filters: string[] = [];
  
  // 1. TRIM & TIMING
  sortedSegments.forEach((seg, i) => {
    // Video
    let vFilter = `[0:v]trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS`;
    if (playbackSpeed !== 1) vFilter += `,setpts=PTS/${playbackSpeed}`;
    vFilter += `[v${i}]`;
    filters.push(vFilter);

    // Audio - Only if input exists and output isn't GIF
    if (format !== 'gif' && hasAudioTrack) {
      let aFilter = `[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS`;
      if (playbackSpeed !== 1) {
          const tempo = Math.max(0.5, Math.min(2.0, playbackSpeed));
          aFilter += `,atempo=${tempo}`;
      }
      aFilter += `[a${i}]`;
      filters.push(aFilter);
    }
  });

  // 2. CONCATENATION
  const vConcatInputs = sortedSegments.map((_, i) => `[v${i}]`).join('');
  let lastVideoLabel = 'v_concated';
  
  if (format === 'gif') {
    filters.push(`${vConcatInputs}concat=n=${sortedSegments.length}:v=1:a=0[v_concated]`);
  } else {
    if (hasAudioTrack) {
        const aConcatInputs = sortedSegments.map((_, i) => `[a${i}]`).join('');
        filters.push(`${vConcatInputs}${aConcatInputs}concat=n=${sortedSegments.length}:v=1:a=1[v_concated][a_concated]`);
    } else {
        // No audio from video, just concat video
        filters.push(`${vConcatInputs}concat=n=${sortedSegments.length}:v=1:a=0[v_concated]`);
    }
  }

  // 3. LAYOUT (CROP -> SCALE -> PAD/OVERLAY)
  if (layout) {
    const { canvasSize, sourceRect, destRect } = layout;

    // A. Crop (Zoom/Pan)
    // sourceRect defines the region of the video to KEEP.
    if (sourceRect) {
        // Validation to prevent FFmpeg errors if crop is out of bounds
        const cropW = even(Math.max(1, sourceRect.width));
        const cropH = even(Math.max(1, sourceRect.height));
        const cropX = even(Math.max(0, sourceRect.x));
        const cropY = even(Math.max(0, sourceRect.y));
        
        filters.push(`[${lastVideoLabel}]crop=${cropW}:${cropH}:${cropX}:${cropY}[v_cropped]`);
        lastVideoLabel = 'v_cropped';
    }

    // B. Scale to Destination Size (e.g. if we want it smaller on canvas, or fit canvas)
    if (destRect) {
        filters.push(`[${lastVideoLabel}]scale=${even(destRect.width)}:${even(destRect.height)}[v_scaled]`);
        lastVideoLabel = 'v_scaled';
    }

    // C. Composition (Background Color or Image)
    if (bgInputName) {
      // Scale BG image to canvas size
      filters.push(`[1:v]scale=${even(canvasSize.width)}:${even(canvasSize.height)}[v_bg_scaled]`);
      // Overlay video onto BG
      const x = destRect ? even(destRect.x) : 0;
      const y = destRect ? even(destRect.y) : 0;
      filters.push(`[v_bg_scaled][${lastVideoLabel}]overlay=x=${x}:y=${y}[v_composited]`);
      lastVideoLabel = 'v_composited';
    } else {
      // Pad with color
      const color = formatColor(backgroundColor);
      const x = destRect ? even(destRect.x) : 0;
      const y = destRect ? even(destRect.y) : 0;
      
      filters.push(`[${lastVideoLabel}]pad=${even(canvasSize.width)}:${even(canvasSize.height)}:${x}:${y}:color=${color}[v_composited]`);
      lastVideoLabel = 'v_composited';
    }
  }

  // 4. FINAL RESOLUTION SCALING
  if (targetResolution) {
    filters.push(`[${lastVideoLabel}]scale=${even(targetResolution.width)}:${even(targetResolution.height)}:force_original_aspect_ratio=decrease,pad=${even(targetResolution.width)}:${even(targetResolution.height)}:(ow-iw)/2:(oh-ih)/2[v_final]`);
    lastVideoLabel = 'v_final';
  }

  // GIF Special Handling
  if (format === 'gif') {
    filters.push(`[${lastVideoLabel}]split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse[v_gif]`);
    lastVideoLabel = 'v_gif';
  }

  // 5. AUDIO MIXING
  let lastAudioLabel = hasAudioTrack ? 'a_concated' : null;
  
  if (format !== 'gif') {
    // If we have video audio, adjust its volume
    if (lastAudioLabel && videoVolume !== 1) {
      filters.push(`[${lastAudioLabel}]volume=${videoVolume}[a_vol]`);
      lastAudioLabel = 'a_vol';
    }
    
    // If video volume is effectively muted, discard it to avoid noise/mixing issues if we have music
    if (videoVolume === 0) {
        lastAudioLabel = null;
    }

    // If we have music
    if (audioInputName) {
      const musicInputIdx = bgInputName ? 2 : 1;
      
      // If we have video audio, mix them
      if (lastAudioLabel) {
        filters.push(`[${musicInputIdx}:a]volume=${musicVolume}[a_music_vol]`);
        // amix with duration=first ensures audio doesn't extend past video. 
        // dropout_transition=0 helps smooth transition
        filters.push(`[${lastAudioLabel}][a_music_vol]amix=inputs=2:duration=first:dropout_transition=0[a_mixed]`);
        lastAudioLabel = 'a_mixed';
      } else {
        // No video audio, just use music (trimmed to video length?)
        // To ensure music stops when video stops, we use 'apad' or 'atrim' combined with video length.
        // A simpler hack in complex filters is using the video stream to control duration, but amix is easier.
        // Let's just use the music stream directly, but we run risk of it being too long.
        // Better: use `atrim` on music to match total duration.
        // We'll calculate total duration from segments.
        const totalDuration = sortedSegments.reduce((acc, s) => acc + (s.end - s.start), 0) / playbackSpeed;
        
        filters.push(`[${musicInputIdx}:a]volume=${musicVolume},atrim=duration=${totalDuration}[a_mixed]`);
        lastAudioLabel = 'a_mixed';
      }
    }
  }

  // 6. EXECUTION ARGS
  const outputFilename = `output.${format}`;
  const args = ['-i', inputName];
  if (bgInputName) args.push('-i', bgInputName);
  if (audioInputName) args.push('-i', audioInputName);

  args.push('-filter_complex', filters.join(';'));
  args.push('-map', `[${lastVideoLabel}]`);
  
  // Map audio if it exists and not GIF
  if (format !== 'gif' && lastAudioLabel) {
      args.push('-map', `[${lastAudioLabel}]`);
  }

  if (format === 'mp4') {
    args.push('-c:v', 'mpeg4', '-q:v', '5', '-c:a', 'aac', '-b:a', '128k', '-pix_fmt', 'yuv420p');
  } else if (format === 'webm') {
    args.push('-c:v', 'libvpx-vp9', '-b:v', '1200k', '-c:a', 'libvorbis');
  } else if (format === 'gif') {
    args.push('-f', 'gif');
  }

  args.push(outputFilename);
  
  try {
    console.log("FFmpeg Args:", args.join(' '));
    await ffmpeg.exec(args);
    const data = await ffmpeg.readFile(outputFilename);
    
    // Cleanup
    try {
        await ffmpeg.deleteFile(inputName);
        if (audioInputName) await ffmpeg.deleteFile(audioInputName);
        if (bgInputName) await ffmpeg.deleteFile(bgInputName);
        await ffmpeg.deleteFile(outputFilename);
    } catch(e) { console.warn("Cleanup warning:", e); }

    const mimeType = format === 'mp4' ? 'video/mp4' : format === 'gif' ? 'image/gif' : 'video/webm';
    return new Blob([data], { type: mimeType });
  } catch (err) {
    console.error("FFmpeg execution error:", err);
    throw new Error("Export failed. Try a lower resolution or simpler edits.");
  }
};