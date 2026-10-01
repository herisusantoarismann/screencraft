import React from "react";
import { Camera, Video, X, Loader2, Mic, MicOff } from "lucide-react";
import { FloatingBrand } from "../molecules/FloatingBrand";
import { Separator } from "../atoms/Separator";
import { useRecordStore } from "../../stores/recordStore";

export interface StandbyFloatingBarProps {
  isCapturing: boolean;
  isTransitioning: boolean;
  isPreparingRecord: boolean;
  onTriggerScreenshot: () => void;
  onStartRecording: () => void;
  onCloseOverlay: () => void;
}

export const StandbyFloatingBar: React.FC<StandbyFloatingBarProps> = ({
  isCapturing,
  isTransitioning,
  isPreparingRecord,
  onTriggerScreenshot,
  onStartRecording,
  onCloseOverlay,
}) => {
  const isHidden = isTransitioning || isPreparingRecord;
  const { isMicEnabled, setIsMicEnabled } = useRecordStore();

  return (
    <div
      className={`fixed top-1 left-1/2 -translate-x-1/2 w-[590px] h-[64px] pointer-events-auto flex items-center justify-between px-5 py-2.5 bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-2xl shadow-2xl text-white select-none box-border z-50 transition-all duration-150 ease-out ${
        isHidden ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Brand / Logo */}
      <FloatingBrand className="pr-2" />

      <Separator size="sm" />

      {/* Action Buttons: Screenshot & Record */}
      <div className="flex items-center gap-2.5 px-1">
        {/* Screenshot Button */}
        <button
          type="button"
          title="Ambil Screenshot & Buka Alat Edit (Crop, Coret-coret)"
          disabled={isCapturing || isTransitioning || isPreparingRecord}
          onClick={onTriggerScreenshot}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-70 active:scale-95"
        >
          {isCapturing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
              <span>Menangkap...</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>Screenshot</span>
            </>
          )}
        </button>

        {/* Record Button */}
        <button
          type="button"
          title="Rekam Layar (GIF / WebM)"
          disabled={isPreparingRecord || isCapturing || isTransitioning}
          onClick={onStartRecording}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700/60 transition-all cursor-pointer disabled:opacity-70 active:scale-95"
        >
          {isPreparingRecord ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
              <span>Menyiapkan...</span>
            </>
          ) : (
            <>
              <Video className="w-4 h-4 text-rose-400" />
              <span>Record</span>
            </>
          )}
        </button>

        {/* Quick Audio Memo / Voiceover Mic Toggle */}
        <button
          type="button"
          title={
            isMicEnabled
              ? "Audio Memo (Mic): AKTIF (Suara Anda akan direkam bersama video)"
              : "Audio Memo (Mic): NONAKTIF (Klik untuk rekam suara penjelasan bug)"
          }
          disabled={isPreparingRecord || isCapturing || isTransitioning}
          onClick={() => setIsMicEnabled(!isMicEnabled)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-70 active:scale-95 ${
            isMicEnabled
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
              : "bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700/60"
          }`}
        >
          {isMicEnabled ? (
            <>
              <Mic className="w-4 h-4 text-emerald-200 animate-pulse" />
              <span className="text-xs text-emerald-100 font-bold">Mic ON</span>
            </>
          ) : (
            <>
              <MicOff className="w-4 h-4 text-neutral-400" />
              <span className="text-xs text-neutral-400 font-medium">Mic</span>
            </>
          )}
        </button>
      </div>

      <Separator size="sm" />

      {/* Close Button */}
      <button
        type="button"
        title="Tutup (Esc)"
        onClick={onCloseOverlay}
        className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
