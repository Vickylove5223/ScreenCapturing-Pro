/** Fix: Added DOM library reference to resolve missing browser global types like MediaStream and HTMLVideoElement */
/// <reference lib="dom" />
import React, { useRef, useEffect } from 'react';

interface VideoPreviewProps {
  stream: MediaStream;
  muted?: boolean;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ stream, muted = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className="w-full h-full object-contain"
    />
  );
};