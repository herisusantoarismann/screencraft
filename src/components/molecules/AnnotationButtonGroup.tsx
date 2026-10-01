import React, { useState, useRef, useEffect } from "react";
import {
  MousePointer,
  ArrowUpRight,
  Square,
  Pencil,
  EyeOff,
  Crop,
  ListOrdered,
  Tag,
  Pipette,
  Ruler,
  ScanText,
  Sun,
  Zap,
  Workflow,
  Loader2,
} from "lucide-react";
import { useToolStore, STAMP_PRESETS } from "../../stores/toolStore";
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
  const { activeStamp, setActiveStamp } = useToolStore();
  const [isStampMenuOpen, setIsStampMenuOpen] = useState(false);
  const stampMenuRef = useRef<HTMLDivElement>(null);

  const currentStampPreset =
    STAMP_PRESETS.find((p) => p.id === activeStamp) || STAMP_PRESETS[0];

  // Close stamp popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        stampMenuRef.current &&
        !stampMenuRef.current.contains(e.target as Node)
      ) {
        setIsStampMenuOpen(false);
      }
    };
    if (isStampMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isStampMenuOpen]);

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

      {/* Smart Redact (Blur & Pixelate - Pilar 2) */}
      <IconButton
        title="Smart Redact / Blur & Pixelate (Samarkan Data Sensitif - Pilar 2)"
        active={activeTool === "blur"}
        activeColor="rose"
        onClick={() => onSelectTool("blur")}
        icon={<EyeOff className="w-4 h-4" />}
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

      {/* QA Severity & Issue Tags Stamp (Pilar 3) */}
      <div className="relative" ref={stampMenuRef}>
        <IconButton
          title={`QA Severity & Issue Tag Stamp: ${currentStampPreset.emoji} ${currentStampPreset.label} (Klik untuk pilih)`}
          active={activeTool === "stamp"}
          activeColor="rose"
          onClick={() => {
            onSelectTool("stamp");
            setIsStampMenuOpen((prev) => !prev);
          }}
          icon={<Tag className="w-4 h-4" />}
          badge={
            <span className="text-[10px] select-none">
              {currentStampPreset.emoji}
            </span>
          }
        />

        {isStampMenuOpen && (
          <div className="absolute top-full left-0 mt-2 p-2 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl z-50 flex flex-col gap-2 min-w-[210px] animate-in fade-in slide-in-from-top-2 duration-150">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-0.5">
                Severity Level
              </div>
              <div className="flex flex-col gap-0.5 mt-0.5">
                {STAMP_PRESETS.filter((p) => p.category === "severity").map(
                  (preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setActiveStamp(preset.id);
                        onSelectTool("stamp");
                        setIsStampMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                        activeStamp === preset.id
                          ? "bg-neutral-800 text-white border border-neutral-600"
                          : "text-neutral-300 hover:bg-neutral-800/60 hover:text-white"
                      }`}
                    >
                      <span className="text-sm">{preset.emoji}</span>
                      <span style={{ color: preset.badgeColor }}>
                        {preset.label}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="border-t border-neutral-800 pt-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-0.5">
                Category Tags
              </div>
              <div className="flex flex-col gap-0.5 mt-0.5">
                {STAMP_PRESETS.filter((p) => p.category === "category").map(
                  (preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setActiveStamp(preset.id);
                        onSelectTool("stamp");
                        setIsStampMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                        activeStamp === preset.id
                          ? "bg-neutral-800 text-white border border-neutral-600"
                          : "text-neutral-300 hover:bg-neutral-800/60 hover:text-white"
                      }`}
                    >
                      <span className="text-sm">{preset.emoji}</span>
                      <span style={{ color: preset.badgeColor }}>
                        {preset.label}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

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
