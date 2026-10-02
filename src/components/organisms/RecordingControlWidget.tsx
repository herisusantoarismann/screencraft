import React from "react";
import { Square, Mic } from "lucide-react";
import { Separator } from "../atoms/Separator";
import { useRecordStore } from "../../stores/recordStore";

export interface RecordingControlWidgetProps {
  recordingDuration: number;
  onStopRecording: () => void;
}

export const RecordingControlWidget: React.FC<RecordingControlWidgetProps> = ({
  recordingDuration,
  onStopRecording,
}) => {
  const isMicEnabled = useRecordStore((state) => state.isMicEnabled);

  return (
    <div className="w-full h-full flex items-center justify-center p-1 bg-transparent select-none overflow-hidden box-border">
      <div className="w-[330px] h-[56px] flex items-center justify-between px-3.5 py-1.5 bg-neutral-950/95 border border-rose-500/80 rounded-2xl shadow-2xl text-white select-none overflow-hidden animate-in fade-in duration-150 box-border">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-300">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>
          <span>
            REC 00:{Math.floor(recordingDuration).toString().padStart(2, "0")} / 00:30
          </span>
          {isMicEnabled && (
            <span
              className="flex items-center gap-1 text-[10px] text-emerald-300 font-bold px-1.5 py-0.5 bg-emerald-950/90 border border-emerald-500/50 rounded-md animate-pulse"
              title="Microphone voiceover active"
            >
              <Mic className="w-3 h-3" />
              <span>Mic</span>
            </span>
          )}
        </div>

        <Separator size="sm" />

        <button
          type="button"
          title="Stop screen recording"
          onClick={onStopRecording}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/30 cursor-pointer"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Stop</span>
        </button>
      </div>
    </div>
  );
};
