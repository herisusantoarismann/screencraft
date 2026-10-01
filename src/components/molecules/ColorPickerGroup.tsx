import React from "react";
import { ColorSwatch } from "../atoms/ColorSwatch";
import { COLOR_PRESETS } from "../../types/canvas";

export interface ColorPickerGroupProps {
  currentColor: string;
  onSelectColor: (color: string) => void;
  className?: string;
}

export const ColorPickerGroup: React.FC<ColorPickerGroupProps> = ({
  currentColor,
  onSelectColor,
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {COLOR_PRESETS.map((color) => {
        const isSelected =
          currentColor.toLowerCase() === color.value.toLowerCase();
        return (
          <ColorSwatch
            key={color.value}
            color={color.value}
            name={color.name}
            isSelected={isSelected}
            onClick={onSelectColor}
          />
        );
      })}
    </div>
  );
};
