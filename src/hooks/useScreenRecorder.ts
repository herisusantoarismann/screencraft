import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useRecordStore } from "../stores/recordStore";

interface ClickRipple {
  id: number;
  x: number;
  y: number;
}

const safeInvoke = async (cmd: string, args?: Record<string, unknown>) => {
  try {
    await invoke(cmd, args);
  } catch (err) {
    console.warn(`[Tauri safeInvoke ${cmd}]:`, err);
  }
};

export const useScreenRecorder = () => {
  const {
    isRecording,
    recordingDuration,
    isMicEnabled,
    startRecording: startStoreRecording,
    stopRecording: stopStoreRecording,
    setRecordingBlob,
    setRecordingDuration,
    incrementDuration,
    resetRecording,
  } = useRecordStore();

  const [isPreparingRecord, setIsPreparingRecord] = useState<boolean>(false);
  const [ripples, setRipples] = useState<ClickRipple[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Stop recording execution
  const stopRecording = useCallback(async () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
  }, []);

  // Start recording screen
  const startRecording = useCallback(async () => {
    try {
      setIsPreparingRecord(true);
      chunksRef.current = [];

      // 1. JEDA: Give React 150ms to smoothly fade out the floating bar in place
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 0. Temporarily disable always-on-top so user can freely select other windows without z-order conflict
      await safeInvoke("prepare_for_recording");

      // 1. Request screen stream WITHOUT displaySurface constraint!
      // This allows both "Entire Screen" and "Window" to be selected without constraint rejection!
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Handle user stopping screen share via native browser / OS banner
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          void stopRecording();
        };
      }

      // 1b. Capture microphone audio if user enabled Quick Audio Memo / Voiceover
      let combinedStream = stream;
      if (isMicEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          micStreamRef.current = micStream;
          const audioTrack = micStream.getAudioTracks()[0];
          if (audioTrack) {
            combinedStream = new MediaStream([
              ...stream.getVideoTracks(),
              audioTrack,
            ]);
          }
        } catch (micErr) {
          console.warn("[ScreenRecorder] Microphone capture failed:", micErr);
        }
      }

      // Use VP8 / universal webm to prevent VP9 hardware encoder crash on non-standard window dimensions
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/webm;codecs=vp9";

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const fullBlob = new Blob(chunksRef.current, { type: mimeType });
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        const finalSec = Math.max(0.5, Math.round(elapsed * 10) / 10);
        setRecordingDuration(finalSec);
        setRecordingBlob(fullBlob);
        stopStoreRecording();
        // Restore full screen overlay directly into VideoTrimModal
        await safeInvoke("exit_recording_mode");
      };

      // 2. Position window to bottom-right widget FIRST so recording UI renders directly in place!
      await safeInvoke("enter_recording_mode");

      mediaRecorderRef.current = recorder;
      recorder.start(500); // 500ms time slices

      startTimeRef.current = performance.now();
      startStoreRecording();
      setIsPreparingRecord(false);

      // Start duration timer (1s interval)
      timerRef.current = window.setInterval(() => {
        incrementDuration();
      }, 1000);
    } catch (err) {
      // If user cancelled screen picker, make sure window returns to floating bar
      await safeInvoke("enter_floating_bar_mode");
      console.warn("[ScreenRecorder] Screen capture cancelled or failed:", err);
      resetRecording();
      // JEDA: Wait 150ms for window to settle back before un-hiding floating bar
      await new Promise((resolve) => setTimeout(resolve, 150));
      setIsPreparingRecord(false);
    }
  }, [
    isMicEnabled,
    startStoreRecording,
    stopRecording,
    setRecordingBlob,
    setRecordingDuration,
    incrementDuration,
    resetRecording,
  ]);

  // Auto-stop when reaching max 30 seconds
  useEffect(() => {
    if (isRecording && recordingDuration >= 30) {
      stopRecording();
    }
  }, [isRecording, recordingDuration, stopRecording]);

  // Mouse Click Ripple animation tracker during recording
  useEffect(() => {
    if (!isRecording) {
      setRipples([]);
      return;
    }

    const handleClick = (e: MouseEvent) => {
      const newRipple: ClickRipple = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
      };

      setRipples((prev) => [...prev, newRipple]);

      // Remove after 650ms animation completion
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 650);
    };

    window.addEventListener("mousedown", handleClick, { passive: true });
    return () => {
      window.removeEventListener("mousedown", handleClick);
    };
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    isRecording,
    isPreparingRecord,
    recordingDuration,
    ripples,
    startRecording,
    stopRecording,
  };
};
