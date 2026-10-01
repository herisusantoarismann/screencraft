import React from "react";

export interface FloatingBrandProps {
  title?: string;
  className?: string;
}

export const FloatingBrand: React.FC<FloatingBrandProps> = ({
  title = "SCREENCRAFT",
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-2 pl-1 ${className}`}>
      <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse ring-2 ring-purple-500/30" />
      <span className="text-xs font-extrabold tracking-widest text-neutral-200">
        {title}
      </span>
    </div>
  );
};
