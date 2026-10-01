import React from "react";

export interface SeparatorProps {
  orientation?: "vertical" | "horizontal";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = "vertical",
  className = "",
  size = "md",
}) => {
  if (orientation === "horizontal") {
    return <div className={`w-full h-px bg-neutral-700/80 ${className}`} />;
  }

  const heightClass =
    size === "sm" ? "h-3.5" : size === "lg" ? "h-6" : "h-4 sm:h-5";

  return <div className={`${heightClass} w-px bg-neutral-700/80 ${className}`} />;
};
