import React from "react";
import type { ClickRipple } from "../../types/canvas";

export interface RippleEffectProps {
  ripples: ClickRipple[];
}

export const RippleEffect: React.FC<RippleEffectProps> = ({ ripples }) => {
  return (
    <>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="fixed pointer-events-none rounded-full border-2 border-rose-500 bg-rose-500/20 animate-ping z-50 select-none"
          style={{
            left: `${ripple.x - 20}px`,
            top: `${ripple.y - 20}px`,
            width: "40px",
            height: "40px",
          }}
        />
      ))}
    </>
  );
};
