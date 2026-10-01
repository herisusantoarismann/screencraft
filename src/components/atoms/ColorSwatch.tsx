import React from "react";

export interface ColorSwatchProps {
  color: string;
  name?: string;
  isSelected: boolean;
  onClick: (color: string) => void;
  className?: string;
}

export const ColorSwatch: React.FC<ColorSwatchProps> = ({
  color,
  name,
  isSelected,
  onClick,
  className = "",
}) => {
  return (
    <button
      type="button"
      title={name || color}
      onClick={() => onClick(color)}
      className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
        isSelected
          ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110"
          : "hover:scale-105 opacity-80 hover:opacity-100"
      } ${className}`}
      style={{ backgroundColor: color }}
    />
  );
};
