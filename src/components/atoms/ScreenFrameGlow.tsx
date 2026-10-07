import React from "react";

export const ScreenFrameGlow: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 select-none overflow-hidden">
      {/* Subtle Inset Glow Border */}
      <div className="absolute inset-0 border-2 border-indigo-500/70 shadow-[inset_0_0_24px_rgba(99,102,241,0.2),0_0_12px_rgba(99,102,241,0.35)] transition-all duration-300" />

      {/* 4 Precision Corner Viewfinder Accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-[3px] border-l-[3px] border-indigo-400" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-[3px] border-r-[3px] border-indigo-400" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-[3px] border-l-[3px] border-indigo-400" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-[3px] border-r-[3px] border-indigo-400" />

      {/* Top-Left Mode Indicator Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-950/85 backdrop-blur-md border border-indigo-500/40 text-[11px] font-medium text-indigo-300 shadow-lg tracking-wide animate-in fade-in slide-from-top-1 duration-300">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
        <span className="font-semibold text-white/90">Screen Frozen</span>
        <span className="text-neutral-500">•</span>
        <span className="text-neutral-300">Canvas Active</span>
        <span className="text-neutral-500">•</span>
        <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[9.5px] text-neutral-400 font-mono">
          ESC
        </kbd>
        <span className="text-neutral-400 text-[10px]">to exit</span>
      </div>
    </div>
  );
};

