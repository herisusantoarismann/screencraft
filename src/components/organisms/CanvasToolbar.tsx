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
  isDownloading?: boolean;
  downloadSuccess?: boolean;
  includeDiagnosticsStamp: boolean;
  onToggleDiagnosticsStamp: () => void;
  onOpenDiagnosticsModal: () => void;
  onSelectTool: (tool: ToolType) => void;
  onSelectColor: (color: string) => void;
  onCopy: () => void;
  onDownloadPNG: () => void;
  onOpenWebhookModal: () => void;
  onOpenMarkdownModal: () => void;
  onOpenComparisonModal?: () => void;
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
  isDownloading = false,
  downloadSuccess = false,
  includeDiagnosticsStamp,
  onToggleDiagnosticsStamp,
  onOpenDiagnosticsModal,
  onSelectTool,
  onSelectColor,
  onCopy,
  onDownloadPNG,
  onOpenWebhookModal,
  onOpenMarkdownModal,
  onOpenComparisonModal,
  onResetCropArea,
  onClearAnnotations,
  onCancelCapture,
}) => {
  const isBusy = isCopying || isDownloading;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 bg-neutral-900/90 hover:bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-2xl shadow-2xl text-white transition-all max-w-[96vw] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden animate-in fade-in slide-from-top-4 duration-300">
      {/* 1. Tool Selectors */}
      <AnnotationButtonGroup
        activeTool={activeTool}
        stepCounter={stepCounter}
        flowNodesCount={flowNodesCount}
        isOcrProcessing={isOcrProcessing}
        onSelectTool={isBusy ? () => {} : onSelectTool}
        className={isBusy ? "pointer-events-none opacity-50" : ""}
      />

      {/* Separator */}
      <Separator />

      {/* 2. Color Presets */}
      <ColorPickerGroup
        currentColor={strokeColor}
        onSelectColor={isBusy ? () => {} : onSelectColor}
        className={isBusy ? "pointer-events-none opacity-50" : ""}
      />

      {/* Separator */}
      <Separator />

      {/* 3. Export and Action Buttons */}
      <ExportActionGroup
        isCopying={isCopying}
        copySuccess={copySuccess}
        isDownloading={isDownloading}
        downloadSuccess={downloadSuccess}
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
        onOpenComparisonModal={onOpenComparisonModal}
        onResetCropArea={onResetCropArea}
        onClearAnnotations={onClearAnnotations}
        onCancelCapture={onCancelCapture}
      />
    </div>
  );
};
