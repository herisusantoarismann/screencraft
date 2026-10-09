import React from "react";

export interface FloatingBrandProps {
  title?: string;
  className?: string;
}

export const FloatingBrand: React.FC<FloatingBrandProps> = ({
  title = "SNAPFORGE",
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-1.5 pl-1 ${className}`}>
      <img src="/app-icon.png" alt="SnapForge" className="w-3.5 h-3.5 rounded-sm object-cover shadow-sm" />
      <span className="text-xs font-extrabold tracking-widest text-neutral-200">
        {title}
      </span>
    </div>
  );
};
