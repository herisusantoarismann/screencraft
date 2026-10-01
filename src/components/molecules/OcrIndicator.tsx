import React from "react";
import { Loader2 } from "lucide-react";

export interface OcrIndicatorProps {
  isProcessing: boolean;
}

export const OcrIndicator: React.FC<OcrIndicatorProps> = ({ isProcessing }) => {
  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 pointer-events-none">
      <div className="flex items-center gap-3 px-6 py-3.5 bg-neutral-900/95 border border-indigo-500/50 rounded-2xl shadow-2xl text-white">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Extracting text...</span>
          <span className="text-[11px] text-neutral-400">
            Processing OCR pipeline
          </span>
        </div>
      </div>
    </div>
  );
};
