import { useState, useEffect, useCallback } from 'react';

export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeStream = useCallback(async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1920 }, // Attempt 1080p
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: "user" // Default to front camera on mobile
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setError(null);
    } catch (err: any) {
      console.error("Error accessing media devices:", err);
      setError("Could not access camera or microphone. Please check permissions.");
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(prev => !prev);
    }
  }, [stream]);

  const toggleAudio = useCallback(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(prev => !prev);
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    initializeStream,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    error
  };
}