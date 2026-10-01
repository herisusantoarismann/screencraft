import React from "react";
import {
  MousePointer,
  ArrowUpRight,
  Square,
  Pencil,
  Crop,
  ListOrdered,
  Pipette,
  Ruler,
  ScanText,
  Sun,
  Zap,
  Workflow,
  Loader2,
} from "lucide-react";
import type { ToolType } from "../../stores/toolStore";
import { IconButton } from "../atoms/IconButton";

export interface AnnotationButtonGroupProps {
  activeTool: ToolType;
  stepCounter: number;
  flowNodesCount: number;
  isOcrProcessing: boolean;
  onSelectTool: (tool: ToolType) => void;
  className?: string;
}

export const AnnotationButtonGroup: React.FC<AnnotationButtonGroupProps> = ({
  activeTool,
  stepCounter,
  flowNodesCount,
  isOcrProcessing,
  onSelectTool,
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Select Mode */}
      <IconButton
        title="Select Mode"
        active={activeTool === "select"}
        activeColor="blue"
        onClick={() => onSelectTool("select")}
        icon={<MousePointer className="w-4 h-4" />}
      />

      {/* Arrow */}
      <IconButton
        title="Panah (Arrow)"
        active={activeTool === "arrow"}
        activeColor="blue"
        onClick={() => onSelectTool("arrow")}
        icon={<ArrowUpRight className="w-4 h-4" />}
      />

      {/* Rect */}
      <IconButton
        title="Kotak (Rectangle)"
        active={activeTool === "rect"}
        activeColor="blue"
        onClick={() => onSelectTool("rect")}
        icon={<Square className="w-4 h-4" />}
      />

      {/* Pen */}
      <IconButton
        title="Pena (Pen)"
        active={activeTool === "pen"}
        activeColor="blue"
        onClick={() => onSelectTool("pen")}
        icon={<Pencil className="w-4 h-4" />}
      />

      {/* Step Badge */}
      <IconButton
        title="Step Badge (1-2-3)"
        active={activeTool === "stepBadge"}
        activeColor="blue"
        onClick={() => onSelectTool("stepBadge")}
        icon={<ListOrdered className="w-4 h-4" />}
        badge={
          <span className="text-[10px] font-mono px-1 py-0.2 bg-neutral-800 rounded font-bold">
            {stepCounter}
          </span>
        }
      />

      {/* Crop */}
      <IconButton
        title="Crop Area Selection"
        active={activeTool === "crop"}
        activeColor="blue"
        onClick={() => onSelectTool("crop")}
        icon={<Crop className="w-4 h-4" />}
      />

      {/* Eyedropper */}
      <IconButton
        title="Eyedropper & Color Sampler"
        active={activeTool === "eyedropper"}
        activeColor="blue"
        onClick={() => onSelectTool("eyedropper")}
        icon={<Pipette className="w-4 h-4" />}
      />

      {/* Smart Ruler */}
      <IconButton
        title="Smart Pixel Ruler"
        active={activeTool === "ruler"}
        activeColor="blue"
        onClick={() => onSelectTool("ruler")}
        icon={<Ruler className="w-4 h-4" />}
      />

      {/* OCR */}
      <IconButton
        title="Screen Area OCR (Text Extractor)"
        disabled={isOcrProcessing}
        active={activeTool === "ocr"}
        activeColor="indigo"
        onClick={() => onSelectTool("ocr")}
        icon={
          isOcrProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
          ) : (
            <ScanText className="w-4 h-4" />
          )
        }
      />

      {/* Spotlight */}
      <IconButton
        title="Spotlight (Scroll to resize)"
        active={activeTool === "spotlight"}
        activeColor="amber"
        onClick={() => onSelectTool("spotlight")}
        icon={<Sun className="w-4 h-4" />}
      />

      {/* Laser */}
      <IconButton
        title="Laser Pointer (Fades in 1.5s)"
        active={activeTool === "laser"}
        activeColor="rose"
        onClick={() => onSelectTool("laser")}
        icon={<Zap className="w-4 h-4" />}
      />

      {/* Flow Builder */}
      <IconButton
        title="Flow & Documentation Builder"
        active={activeTool === "flowBuilder"}
        activeColor="purple"
        onClick={() => onSelectTool("flowBuilder")}
        icon={<Workflow className="w-4 h-4" />}
        badge={
          flowNodesCount > 0 ? (
            <span className="text-[10px] font-mono px-1 py-0.2 bg-purple-950/80 border border-purple-400/40 rounded-full font-bold text-purple-200">
              {flowNodesCount}
            </span>
          ) : undefined
        }
      />
    </div>
  );
};
