import React from "react";
import type { EyedropperState } from "../../types/canvas";

export interface EyedropperLoupeProps {
  data: EyedropperState | null;
  containerWidth: number;
  containerHeight: number;
}

export const EyedropperLoupe: React.FC<EyedropperLoupeProps> = ({
  data,
  containerWidth,
  containerHeight,
}) => {
  if (!data) return null;

  const left =
    data.x + 15 + 96 > containerWidth
      ? data.x - 96 - 15
      : data.x + 15;

  const top =
    data.y + 15 + 96 > containerHeight
      ? data.y - 96 - 15
      : data.y + 15;

  return (
    <div
      className="fixed pointer-events-none z-50 rounded-full border-[3px] border-white shadow-[0_10px_30px_rgba(0,0,0,0.55)] flex flex-col items-center justify-center select-none overflow-hidden"
      style={{
        width: "96px",
        height: "96px",
        left: `${left}px`,
        top: `${top}px`,
        backgroundColor: data.hex,
        color: data.textColor,
      }}
    >
      {/* Inner Crosshair indicator */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
        <div className="w-full h-[1px] bg-current" />
        <div className="h-full w-[1px] bg-current absolute" />
      </div>

      {/* Color & Contrast text */}
      <div className="relative z-10 flex flex-col items-center justify-center px-1 text-center">
        <span className="font-mono text-xs font-black tracking-wider drop-shadow-sm">
          {data.hex}
        </span>
        <span className="text-[9px] font-semibold opacity-90 drop-shadow-sm mt-0.5">
          {data.contrastStatus}
        </span>
      </div>
    </div>
  );
};
