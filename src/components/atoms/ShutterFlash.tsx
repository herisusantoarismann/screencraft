import React from "react";

export interface ShutterFlashProps {
  show: boolean;
  isActive: boolean;
}

export const ShutterFlash: React.FC<ShutterFlashProps> = ({ show, isActive }) => {
  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[999] transition-opacity duration-300 ease-out bg-white ${
        isActive ? "opacity-85" : "opacity-0"
      }`}
    >
      {/* Subtle mobile screen capture border contraction effect */}
      <div
        className={`absolute inset-0 border-[6px] border-white/90 transition-transform duration-300 ease-out ${
          isActive ? "scale-100" : "scale-[1.02]"
        }`}
      />
    </div>
  );
};
