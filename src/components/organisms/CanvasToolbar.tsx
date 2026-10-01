import React from "react";
import type { ToolType } from "../../stores/toolStore";
import type { CropArea } from "../../types/canvas";
import { AnnotationButtonGroup } from "../molecules/AnnotationButtonGroup";
import { ColorPickerGroup } from "../molecules/ColorPickerGroup";
import { ExportActionGroup } from "../molecules/ExportActionGroup";
import { Separator } from "../atoms/Separator";

export interface CanvasToolbarProps {
  activeTool: ToolType;
  strokeColor: string;
  stepCounter: number;
  flowNodesCount: number;
  isOcrProcessing: boolean;
  cropArea: CropArea | null;
  hasAnnotationsOrNodes: boolean;
  isCopying: boolean;
  copySuccess: boolean;
  includeDiagnosticsStamp: boolean;
  onToggleDiagnosticsStamp: () => void;
  onOpenDiagnosticsModal: () => void;
  onSelectTool: (tool: ToolType) => void;
  onSelectColor: (color: string) => void;
  onCopy: () => void;
  onDownloadPNG: () => void;
  onOpenWebhookModal: () => void;
  onOpenMarkdownModal: () => void;
  onResetCropArea: () => void;
  onClearAnnotations: () => void;
  onCancelCapture: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  activeTool,
  strokeColor,
  stepCounter,
  flowNodesCount,
  isOcrProcessing,
  cropArea,
  hasAnnotationsOrNodes,
  isCopying,
  copySuccess,
  includeDiagnosticsStamp,
  onToggleDiagnosticsStamp,
  onOpenDiagnosticsModal,
  onSelectTool,
  onSelectColor,
  onCopy,
  onDownloadPNG,
  onOpenWebhookModal,
  onOpenMarkdownModal,
  onResetCropArea,
  onClearAnnotations,
  onCancelCapture,
}) => {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 bg-neutral-900/90 hover:bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-2xl shadow-2xl text-white transition-all max-w-[96vw] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden animate-in fade-in slide-in-from-top-4 duration-300">
      {/* 1. Tool Selectors */}
      <AnnotationButtonGroup
        activeTool={activeTool}
        stepCounter={stepCounter}
        flowNodesCount={flowNodesCount}
        isOcrProcessing={isOcrProcessing}
        onSelectTool={onSelectTool}
      />

      {/* Separator */}
      <Separator />

      {/* 2. Color Presets */}
      <ColorPickerGroup
        currentColor={strokeColor}
        onSelectColor={onSelectColor}
      />

      {/* Separator */}
      <Separator />

      {/* 3. Export and Action Buttons */}
      <ExportActionGroup
        isCopying={isCopying}
        copySuccess={copySuccess}
        flowNodesCount={flowNodesCount}
        cropArea={cropArea}
        hasAnnotationsOrNodes={hasAnnotationsOrNodes}
        includeDiagnosticsStamp={includeDiagnosticsStamp}
        onToggleDiagnosticsStamp={onToggleDiagnosticsStamp}
        onOpenDiagnosticsModal={onOpenDiagnosticsModal}
        onCopy={onCopy}
        onDownloadPNG={onDownloadPNG}
        onOpenWebhookModal={onOpenWebhookModal}
        onOpenMarkdownModal={onOpenMarkdownModal}
        onResetCropArea={onResetCropArea}
        onClearAnnotations={onClearAnnotations}
        onCancelCapture={onCancelCapture}
      />
    </div>
  );
};
