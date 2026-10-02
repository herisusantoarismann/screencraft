import React from "react";
import { ScanText, X, Check, Copy } from "lucide-react";
import type { OcrModalState } from "../../types/canvas";

export interface OcrResultModalProps {
  modalState: OcrModalState;
  onCopyAgain: (text: string) => void;
  onClose: () => void;
}

export const OcrResultModal: React.FC<OcrResultModalProps> = ({
  modalState,
  onCopyAgain,
  onClose,
}) => {
  if (!modalState.isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-xs z-50 p-4">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
            <ScanText className="w-4 h-4" />
            <span>OCR Text Extraction Result</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Text Area */}
        <div className="p-5 flex flex-col gap-3">
          <textarea
            readOnly
            value={modalState.text}
            rows={6}
            className="w-full p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-200 select-text focus:outline-hidden focus:border-indigo-500/50 resize-y"
          />
          {modalState.copied && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>Text automatically copied to clipboard!</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-800 bg-neutral-950/30">
          <button
            type="button"
            onClick={() => onCopyAgain(modalState.text)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Again</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
