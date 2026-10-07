import { Sparkles, X, Keyboard, Shield, Zap, MessageSquarePlus } from "lucide-react";

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFeedback?: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  onOpenFeedback,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 flex items-center justify-center bg-transparent z-50 p-4 select-none animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col text-white animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm text-neutral-100">About ScreenCraft</span>
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
        <div className="p-6 flex flex-col items-center text-center gap-4">
          {/* Logo / Badge */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-600/20 border border-white/20">
              <span className="text-2xl font-black text-white tracking-wider font-mono">SC</span>
            </div>
            <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-950 border border-neutral-700 text-purple-300 font-mono">
              v{__APP_VERSION__}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">ScreenCraft</h3>
            <p className="text-xs text-purple-300/90 font-medium mt-0.5">
              Zero-latency developer & QA screen utility
            </p>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
            High-performance desktop tool built with Tauri v2, Rust, and React. Engineered for instantaneous screenshot annotations, pixel-level slicing inspection, OCR text extraction, and video recording.
          </p>

          {/* Feature Badges */}
          <div className="w-full grid grid-cols-2 gap-2 text-left pt-2 border-t border-neutral-800/80">
            <div className="flex items-center gap-2 p-2 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <Keyboard className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-400">Global Capture</span>
                <span className="text-[11px] font-mono text-neutral-200 font-bold">Ctrl+Shift+S</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-400">Architecture</span>
                <span className="text-[11px] text-neutral-200 font-bold">Tauri v2 + Rust</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-950/60 text-xs">
          {onOpenFeedback ? (
            <button
              type="button"
              onClick={() => {
                onOpenFeedback();
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 hover:text-white font-medium transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-purple-300" />
              <span>Send Feedback & Ideas</span>
            </button>
          ) : (
            <span className="text-[11px] text-neutral-500 font-mono flex items-center gap-1">
              <Shield className="w-3 h-3 text-neutral-500" />
              100% Local & Privacy-first
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-semibold transition-colors cursor-pointer active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
