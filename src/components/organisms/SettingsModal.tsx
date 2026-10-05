import React from "react";
import { Settings, X, Clipboard, Camera, Mic, Keyboard, CheckCircle2, Shield } from "lucide-react";
import { useSettingsStore } from "../../stores/settingsStore";
import { useRecordStore } from "../../stores/recordStore";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    autoCopyToClipboard,
    enableShutterFlash,
    includeDiagnosticsOnCopy,
    setAutoCopyToClipboard,
    setEnableShutterFlash,
    setIncludeDiagnosticsOnCopy,
  } = useSettingsStore();

  const { isMicEnabled, setIsMicEnabled } = useRecordStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300">
              <Settings className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm text-neutral-100">Settings / Preferences</span>
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

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Capture & Clipboard Preferences */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Capture & Clipboard
            </span>

            {/* Toggle: Auto-copy on capture */}
            <div className="flex items-center justify-between p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-0.5">
                  <Clipboard className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-neutral-200">
                    Auto-copy to Clipboard
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Automatically copy captured image to clipboard upon taking a screenshot
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoCopyToClipboard(!autoCopyToClipboard)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoCopyToClipboard ? "bg-purple-600" : "bg-neutral-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoCopyToClipboard ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Toggle: Shutter Flash Animation */}
            <div className="flex items-center justify-between p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 mt-0.5">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-neutral-200">
                    Camera Shutter Animation
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Flash camera shutter animation on screenshot capture for visual feedback
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnableShutterFlash(!enableShutterFlash)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enableShutterFlash ? "bg-pink-600" : "bg-neutral-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    enableShutterFlash ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Toggle: Diagnostics Watermark Stamp */}
            <div className="flex items-center justify-between p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-neutral-200">
                    QA Diagnostics Watermark
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Include OS & hardware specs banner when copying screenshots for bug reporting
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIncludeDiagnosticsOnCopy(!includeDiagnosticsOnCopy)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  includeDiagnosticsOnCopy ? "bg-indigo-600" : "bg-neutral-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    includeDiagnosticsOnCopy ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 2: Screen Recorder */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Screen Recording
            </span>

            {/* Toggle: Mic Voiceover Memo */}
            <div className="flex items-center justify-between p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                  <Mic className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-neutral-200">
                    Microphone Voiceover Memo
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Record voice comments simultaneously with screen video
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMicEnabled(!isMicEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isMicEnabled ? "bg-emerald-600" : "bg-neutral-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isMicEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 3: Shortcuts & System Integration */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Shortcuts & Integration
            </span>

            <div className="flex items-center justify-between p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-neutral-200">Global Screenshot Hotkey</span>
                  <span className="text-[11px] text-neutral-400">Works anywhere in your OS</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-1 rounded-md bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-neutral-200">
                  Ctrl + Shift + S
                </span>
                <span title="Active & Registered">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-neutral-800 bg-neutral-950/60 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors cursor-pointer shadow-md shadow-purple-600/30 active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
