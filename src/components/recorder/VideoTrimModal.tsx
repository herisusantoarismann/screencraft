import React, { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  X,
  Play,
  Pause,
  Download,
  Check,
  Film,
  Sparkles,
  Loader2,
  Clock,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic,
  Share2,
  FileVideo,
} from "lucide-react";
import { useRecordStore } from "../../stores/recordStore";
import { convertWebmToGif } from "../../services/gifConverter";
import { compressVideoForPlatform } from "../../services/videoCompressor";

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const saveBlobFile = async (blob: Blob, defaultName: string): Promise<string | null> => {
  try {
    const base64Data = await blobToBase64(blob);
    const savedPath = await invoke<string>("save_file_to_downloads", {
      fileName: defaultName,
      base64Data,
    });
    return savedPath;
  } catch (err) {
    console.warn("[saveBlobFile] Rust save failed, falling back to browser download:", err);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 15000);
    return null;
  }
};

export const VideoTrimModal: React.FC = () => {
  const {
    recordingBlob,
    recordingDuration,
    isPreviewOpen,
    isConverting,
    conversionProgress,
    isMicEnabled,
    setIsConverting,
    setConversionProgress,
    setIsPreviewOpen,
    resetRecording,
  } = useRecordStore();

  const [compressingPlatform, setCompressingPlatform] = useState<"slack" | "jira" | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Generate object URL for video blob and immediately initialize duration
  useEffect(() => {
    if (!recordingBlob) {
      setVideoUrl(null);
      setDuration(0);
      setStartTime(0);
      setEndTime(0);
      setCurrentTime(0);
      setIsPlaying(false);
      return;
    }

    // Determine initial duration from accurately measured recordingDuration
    const initialDur = Math.max(
      0.5,
      recordingDuration && recordingDuration > 0 ? recordingDuration : 3
    );

    setDuration(initialDur);
    setStartTime(0);
    setEndTime(initialDur);
    setCurrentTime(0);
    setIsPlaying(false);

    const url = URL.createObjectURL(recordingBlob);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [recordingBlob, recordingDuration]);

  // Video metadata loaded - safely update duration without hanging seeking hacks
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    // Reset video playhead cleanly to 0
    video.currentTime = 0;

    const fallbackDur =
      recordingDuration && recordingDuration > 0 ? recordingDuration : 3;

    // In Chromium WebM, if video.duration is finite, use it. Otherwise retain our accurate fallback
    if (isFinite(video.duration) && video.duration > 0) {
      const resolved = Math.round(video.duration * 10) / 10;
      setDuration(resolved);
      setStartTime(0);
      setEndTime(resolved);
    } else {
      setDuration(fallbackDur);
      setStartTime(0);
      setEndTime(fallbackDur);
    }
    setCurrentTime(0);
  };

  // Keep playback within trimmed boundaries and loop seamlessly like a GIF
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const cur = video.currentTime;
    setCurrentTime(cur);

    // Only trigger loop if valid trim boundaries exist
    const safeEnd = endTime > 0.1 ? endTime : duration;
    if (safeEnd > startTime && cur >= safeEnd) {
      video.currentTime = startTime;
      if (!video.paused) {
        void video.play().catch(() => {});
      }
    }
  };

  // Toggle Play / Pause safely
  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
      return;
    }

    try {
      const safeEnd = endTime > 0.1 ? endTime : duration || 3;
      // If playhead is outside boundaries, reset to startTime
      if (video.currentTime < startTime || video.currentTime >= safeEnd - 0.05) {
        video.currentTime = startTime;
      }
      await video.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn("[VideoTrimModal] Play error:", err);
      setIsPlaying(false);
    }
  }, [startTime, endTime, duration]);

  // Direct seek by percentage/clientX
  const seekToPosition = useCallback(
    (clientX: number) => {
      const bar = progressBarRef.current;
      const video = videoRef.current;
      if (!bar || !duration || duration <= 0) return;

      const rect = bar.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const targetTime = ratio * duration;

      setCurrentTime(targetTime);
      if (video) {
        video.currentTime = targetTime;
      }
    },
    [duration]
  );

  // Mouse drag handling for timeline scrubber
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  const handleMouseDownScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    seekToPosition(e.clientX);
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const handleMouseMove = (e: MouseEvent) => {
      seekToPosition(e.clientX);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isScrubbing, seekToPosition]);

  // Trimming controls
  const handleSetStartToCurrent = () => {
    const newStart = Math.min(currentTime, Math.max(0, endTime - 0.2));
    setStartTime(Math.round(newStart * 10) / 10);
  };

  const handleSetEndToCurrent = () => {
    const newEnd = Math.max(currentTime, Math.min(duration, startTime + 0.2));
    setEndTime(Math.round(newEnd * 10) / 10);
  };

  const adjustStartTime = (delta: number) => {
    const newStart = Math.max(0, Math.min(endTime - 0.2, startTime + delta));
    setStartTime(Math.round(newStart * 10) / 10);
    if (videoRef.current) {
      videoRef.current.currentTime = newStart;
    }
  };

  const adjustEndTime = (delta: number) => {
    const newEnd = Math.min(duration, Math.max(startTime + 0.2, endTime + delta));
    setEndTime(Math.round(newEnd * 10) / 10);
    if (videoRef.current) {
      videoRef.current.currentTime = newEnd;
    }
  };

  const resetTrim = () => {
    setStartTime(0);
    setEndTime(duration);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  // Export as GIF via WASM
  const handleExportGif = useCallback(async () => {
    if (!recordingBlob) return;

    setIsConverting(true);
    setConversionProgress(0);

    try {
      const gifBlob = await convertWebmToGif(
        recordingBlob,
        startTime,
        endTime,
        (progress) => setConversionProgress(progress)
      );

      const fileName = `screencraft-${Date.now()}.gif`;
      const savedPath = await saveBlobFile(gifBlob, fileName);

      setFeedbackToast(
        savedPath
          ? `GIF tersimpan di Downloads: ${fileName}`
          : `GIF berhasil diekspor (${fileName})`
      );
      setTimeout(() => setFeedbackToast(null), 4000);
    } catch (err) {
      console.error("[VideoTrimModal] GIF conversion failed:", err);
      setFeedbackToast("Gagal mengonversi GIF.");
      setTimeout(() => setFeedbackToast(null), 3000);
    } finally {
      setIsConverting(false);
    }
  }, [recordingBlob, startTime, endTime, setIsConverting, setConversionProgress]);

  // Export as WebM directly (instant download)
  const handleExportWebm = useCallback(async () => {
    if (!recordingBlob) return;

    const fileName = `screencraft-record-${Date.now()}.webm`;
    const savedPath = await saveBlobFile(recordingBlob, fileName);

    setFeedbackToast(
      savedPath
        ? `WebM tersimpan di Downloads: ${fileName}`
        : `WebM berhasil diekspor!`
    );
    setTimeout(() => setFeedbackToast(null), 4000);
  }, [recordingBlob]);

  // Compress for platform (Slack < 5MB or Jira < 10MB)
  const handleCompressForPlatform = useCallback(
    async (platform: "slack" | "jira") => {
      if (!recordingBlob) return;

      setCompressingPlatform(platform);
      setIsConverting(true);
      setConversionProgress(0);

      try {
        const result = await compressVideoForPlatform(
          recordingBlob,
          startTime,
          endTime,
          platform,
          (progress) => setConversionProgress(progress)
        );

        const savedPath = await saveBlobFile(result.blob, result.fileName);
        const platformName = platform === "slack" ? "Slack (< 5MB)" : "Jira (< 10MB)";

        setFeedbackToast(
          savedPath
            ? `Video ${platformName} tersimpan di Downloads (${result.sizeMB} MB)!`
            : `Video ${platformName} berhasil diunduh (${result.sizeMB} MB)!`
        );
        setTimeout(() => setFeedbackToast(null), 5000);
      } catch (err) {
        console.error(`[VideoTrimModal] ${platform} compression failed:`, err);
        setFeedbackToast(`Gagal mengompresi video untuk ${platform}.`);
        setTimeout(() => setFeedbackToast(null), 4000);
      } finally {
        setIsConverting(false);
        setCompressingPlatform(null);
      }
    },
    [recordingBlob, startTime, endTime, setIsConverting, setConversionProgress]
  );

  if (!isPreviewOpen || !videoUrl) return null;

  const validDuration = duration > 0 ? duration : 1;
  const trimDuration = Math.max(0.1, endTime - startTime);
  const startPercent = (startTime / validDuration) * 100;
  const endPercent = (endTime / validDuration) * 100;
  const playheadPercent = (currentTime / validDuration) * 100;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50 p-4 select-none">
      <div className="w-full max-w-2xl sm:max-w-3xl bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
            <Film className="w-4 h-4" />
            <span>Hasil Rekaman Layar</span>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-rose-950/80 border border-rose-500/40 rounded-full text-rose-200">
              Durasi: {validDuration.toFixed(1)}s
            </span>
            {isMicEnabled && (
              <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 rounded-full text-emerald-300">
                <Mic className="w-3 h-3 text-emerald-400" />
                Voiceover Aktif
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsPreviewOpen(false);
              resetRecording();
              void invoke("enter_floating_bar_mode");
            }}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
            title="Tutup (Close)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Player Display */}
        <div className="relative bg-black flex items-center justify-center max-h-[340px] overflow-hidden group">
          <video
            ref={videoRef}
            src={videoUrl}
            muted={isMuted}
            playsInline
            preload="auto"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = startTime;
                void videoRef.current.play().catch(() => {});
              }
            }}
            onClick={togglePlay}
            className="max-h-[320px] w-auto max-w-full object-contain cursor-pointer"
          />

          {/* Floating Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className={`absolute inset-0 m-auto w-14 h-14 rounded-full bg-neutral-900/85 hover:bg-neutral-900 text-white flex items-center justify-center shadow-xl border border-white/20 transition-all ${
              isPlaying
                ? "opacity-0 group-hover:opacity-100"
                : "opacity-95 hover:scale-105 shadow-rose-950/40"
            }`}
            title={isPlaying ? "Jeda (Pause)" : "Putar (Play)"}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5 text-rose-400" />
            )}
          </button>

          {/* Mute/Unmute Audio Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted((prev) => !prev);
            }}
            className="absolute bottom-3 right-3 p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-white/10 shadow-lg transition-all"
            title={isMuted ? "Bunyikan Audio (Unmute)" : "Bisukan Audio (Mute)"}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>

        {/* Timeline & Trimming Controller */}
        <div className="p-5 flex flex-col gap-4 bg-neutral-950/50 border-b border-neutral-800">
          {/* 1. YouTube-style Interactive Video Timeline Bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors flex items-center justify-center"
                  title={isPlaying ? "Jeda (Pause)" : "Putar (Play)"}
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5 ml-0.5 text-rose-400" />
                  )}
                </button>
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  {currentTime.toFixed(1)}s / {validDuration.toFixed(1)}s
                </span>
              </div>
              <span className="text-rose-300 font-medium">
                Area GIF: {trimDuration.toFixed(1)}s
              </span>
            </div>

            {/* YouTube-Style Scrubber Container with Drag/Click Support */}
            <div
              ref={progressBarRef}
              onMouseDown={handleMouseDownScrub}
              className="relative w-full h-6 flex items-center cursor-pointer group select-none py-1"
              title="Klik atau geser untuk memutar video dari posisi ini"
            >
              {/* Base Track (Right/Unplayed side: Dark Neutral) */}
              <div className="relative w-full h-2 group-hover:h-2.5 bg-neutral-800 rounded-full overflow-hidden transition-all">
                {/* Trim Zone Indicator */}
                <div
                  className="absolute top-0 bottom-0 bg-neutral-700/60 border-l border-r border-rose-400/80"
                  style={{
                    left: `${startPercent}%`,
                    width: `${Math.max(1, endPercent - startPercent)}%`,
                  }}
                />

                {/* Played Progress (Left side: YouTube Rose/Red Gradient) */}
                <div
                  className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400 rounded-full transition-all duration-75"
                  style={{
                    width: `${Math.min(100, Math.max(0, playheadPercent))}%`,
                  }}
                />
              </div>

              {/* YouTube Playhead Thumb Knob */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg shadow-black/60 border-2 border-rose-500 transition-transform scale-100 group-hover:scale-125 pointer-events-none"
                style={{
                  left: `${Math.min(100, Math.max(0, playheadPercent))}%`,
                }}
              />
            </div>
          </div>

          {/* 2. Clear Trimming Controls (Start & End) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Start Trim Control */}
            <div className="flex flex-col gap-1.5 p-2.5 bg-neutral-900/80 border border-neutral-800 rounded-xl">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Mulai (Start)
              </span>
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-base font-mono font-bold text-white">
                  {startTime.toFixed(1)}s
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustStartTime(-0.2)}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-xs rounded font-mono font-bold text-neutral-200"
                    title="-0.2s"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustStartTime(0.2)}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-xs rounded font-mono font-bold text-neutral-200"
                    title="+0.2s"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleSetStartToCurrent}
                    className="px-2 py-0.5 bg-rose-950/80 border border-rose-500/40 hover:bg-rose-900 text-[10px] rounded text-rose-200"
                    title="Gunakan posisi kursor video saat ini"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>

            {/* End Trim Control */}
            <div className="flex flex-col gap-1.5 p-2.5 bg-neutral-900/80 border border-neutral-800 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Selesai (End)
                </span>
                <button
                  type="button"
                  onClick={resetTrim}
                  className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-0.5"
                  title="Reset batas trim ke durasi penuh"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-base font-mono font-bold text-white">
                  {endTime.toFixed(1)}s
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustEndTime(-0.2)}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-xs rounded font-mono font-bold text-neutral-200"
                    title="-0.2s"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustEndTime(0.2)}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-xs rounded font-mono font-bold text-neutral-200"
                    title="+0.2s"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleSetEndToCurrent}
                    className="px-2 py-0.5 bg-rose-950/80 border border-rose-500/40 hover:bg-rose-900 text-[10px] rounded text-rose-200"
                    title="Gunakan posisi kursor video saat ini"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion Progress Bar (WASM) */}
          {isConverting && (
            <div className="flex flex-col gap-1.5 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                  {compressingPlatform === "slack"
                    ? "Mengompresi video Fit to Slack (< 5MB)..."
                    : compressingPlatform === "jira"
                    ? "Mengompresi video Fit to Jira (< 10MB)..."
                    : "Mengonversi GIF via FFmpeg WebAssembly..."}
                </span>
                <span>{conversionProgress}%</span>
              </div>
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-150"
                  style={{ width: `${conversionProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-950/80">
          <button
            type="button"
            onClick={() => {
              setIsPreviewOpen(false);
              resetRecording();
              void invoke("enter_floating_bar_mode");
            }}
            disabled={isConverting}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            Tutup
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export as WebM */}
            <button
              type="button"
              onClick={() => void handleExportWebm()}
              disabled={isConverting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-all disabled:opacity-50"
              title="Simpan rekaman WebM ke folder Downloads"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>WebM</span>
            </button>

            {/* Fit to Slack (< 5MB) */}
            <button
              type="button"
              onClick={() => void handleCompressForPlatform("slack")}
              disabled={isConverting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/40 transition-all disabled:opacity-50"
              title="Kompres video otomatis agar ukuran < 5MB untuk Slack"
            >
              {compressingPlatform === "slack" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Slack (&lt; 5MB)</span>
            </button>

            {/* Fit to Jira (< 10MB) */}
            <button
              type="button"
              onClick={() => void handleCompressForPlatform("jira")}
              disabled={isConverting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-500/40 transition-all disabled:opacity-50"
              title="Kompres video otomatis agar ukuran < 10MB untuk Jira"
            >
              {compressingPlatform === "jira" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              ) : (
                <FileVideo className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>Jira (&lt; 10MB)</span>
            </button>

            {/* Export as GIF (WASM) */}
            <button
              type="button"
              onClick={() => void handleExportGif()}
              disabled={isConverting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/30 disabled:opacity-50"
              title="Konversi dan simpan animasi GIF ke folder Downloads"
            >
              {isConverting && !compressingPlatform ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Export GIF</span>
            </button>
          </div>
        </div>

        {/* Floating Feedback Toast Notification */}
        {feedbackToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 bg-neutral-900/95 border border-emerald-500/80 text-white text-xs font-bold rounded-2xl shadow-2xl shadow-emerald-500/20 animate-in fade-in zoom-in-95">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{feedbackToast}</span>
          </div>
        )}
      </div>
    </div>
  );
};
