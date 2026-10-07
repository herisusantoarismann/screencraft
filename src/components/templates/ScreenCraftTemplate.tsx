import React, { useState } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import type { ToolType } from "../../stores/toolStore";
import type { FlowNode } from "../../stores/flowStore";
import { exportFlowToMarkdown } from "../../stores/flowStore";
import { useSettingsStore } from "../../stores/settingsStore";
import type {
  Annotation,
  CropArea,
  OcrArea,
  OcrModalState,
  EyedropperState,
  ClickRipple,
} from "../../types/canvas";
import {
  StandbyFloatingBar,
  RecordingControlWidget,
  CanvasToolbar,
  KonvaStageCanvas,
  FlowNodeEditPopover,
  FlowMarkdownModal,
  OcrResultModal,
  SmartRuler,
  PresentationOverlay,
  VideoTrimModal,
  WebhookModal,
  DiagnosticsModal,
  VisualComparisonModal,
} from "../organisms";
import { EyedropperLoupe, OcrIndicator, Toast } from "../molecules";
import { ShutterFlash, RippleEffect } from "../atoms";
import type { SystemDiagnostics } from "../../types/diagnostics";

export interface ScreenCraftTemplateProps {
  // Layout & Recording State
  isRecording: boolean;
  recordingDuration: number;
  isCapturing: boolean;
  isTransitioning: boolean;
  isPreparingRecord: boolean;
  isPreviewOpen: boolean;
  capturedImage: HTMLImageElement | null;
  dimensions: { width: number; height: number };
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Tool & Canvas State
  activeTool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  stepCounter: number;
  spotlightRadius: number;
  setSpotlightRadius: (radius: number) => void;
  annotations: Annotation[];
  currentDrawing: Annotation | null;
  cropArea: CropArea | null;
  ocrArea: OcrArea | null;
  stageRef: React.RefObject<Konva.Stage | null>;
  cropLayerRef: React.RefObject<Konva.Layer | null>;
  ocrLayerRef: React.RefObject<Konva.Layer | null>;
  eyedropperData: EyedropperState | null;
  eyedropperToast: string | null;
  error: string | null;

  // Flow & Modal State
  flowNodes: FlowNode[];
  activeNode: FlowNode | null;
  isMarkdownModalOpen: boolean;
  ocrModal: OcrModalState;
  isOcrProcessing: boolean;
  isWebhookModalOpen: boolean;
  isDiagnosticsModalOpen: boolean;
  isComparisonModalOpen?: boolean;
  isAboutModalOpen?: boolean;
  isFeedbackModalOpen?: boolean;
  isFloatingBarOpen?: boolean;
  onCloseFloatingBar?: () => void;
  includeDiagnosticsStamp: boolean;
  diagnostics: SystemDiagnostics | null;
  ripples: ClickRipple[];
  showShutterFlash: boolean;
  isFlashActive: boolean;
  isCopying: boolean;
  copySuccess: boolean;
  isDownloading?: boolean;
  downloadSuccess?: boolean;
  downloadToast?: string | null;

  // Event Handlers
  onTriggerScreenshot: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCloseOverlay: () => void;
  onSelectTool: (tool: ToolType) => void;
  onSelectColor: (color: string) => void;
  onCopy: () => void;
  onDownloadPNG: () => void;
  onOpenWebhookModal: (open: boolean) => void;
  onOpenMarkdownModal: (open: boolean) => void;
  onOpenDiagnosticsModal: (open: boolean) => void;
  onOpenComparisonModal?: (open: boolean) => void;
  onToggleDiagnosticsStamp: () => void;
  onResetCropArea: () => void;
  onClearAnnotations: () => void;
  onCancelCapture: () => void;
  onCaptureScreenRetry: () => void;
  onMouseDown: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp: (e: KonvaEventObject<MouseEvent>) => void;
  onUpdateNodePosition: (id: string, x: number, y: number) => void;
  onSelectNode: (id: string) => void;
  onCloseActiveNode: () => void;
  onUpdateNodeText: (id: string, title: string, description: string) => void;
  onDeleteNode: (id: string) => void;
  onCloseOcrModal: () => void;
  onCopyOcrAgain: (text: string) => void;
  onCopyToClipboardWithImage: () => Promise<void>;
  onCopyScreenshotOnly?: () => Promise<boolean>;
  onGetImageDataUrlOrBlob: () => Promise<string | Blob>;
}

export const ScreenCraftTemplate: React.FC<ScreenCraftTemplateProps> = ({
  isRecording,
  recordingDuration,
  isCapturing,
  isTransitioning,
  isPreparingRecord,
  isPreviewOpen,
  capturedImage,
  dimensions,
  containerRef,
  activeTool,
  strokeColor,
  stepCounter,
  spotlightRadius,
  setSpotlightRadius,
  annotations,
  currentDrawing,
  cropArea,
  ocrArea,
  stageRef,
  cropLayerRef,
  ocrLayerRef,
  eyedropperData,
  eyedropperToast,
  error,
  flowNodes,
  activeNode,
  isMarkdownModalOpen,
  ocrModal,
  isOcrProcessing,
  isWebhookModalOpen,
  isDiagnosticsModalOpen,
  isComparisonModalOpen,
  isAboutModalOpen,
  isFeedbackModalOpen,
  isFloatingBarOpen,
  onCloseFloatingBar,
  includeDiagnosticsStamp,
  diagnostics,
  ripples,
  showShutterFlash,
  isFlashActive,
  isCopying,
  copySuccess,
  isDownloading,
  downloadSuccess,
  downloadToast,
  onTriggerScreenshot,
  onStartRecording,
  onStopRecording,
  onCloseOverlay,
  onSelectTool,
  onSelectColor,
  onCopy,
  onDownloadPNG,
  onOpenWebhookModal,
  onOpenMarkdownModal,
  onOpenDiagnosticsModal,
  onOpenComparisonModal,
  onToggleDiagnosticsStamp,
  onResetCropArea,
  onClearAnnotations,
  onCancelCapture,
  onCaptureScreenRetry,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onUpdateNodePosition,
  onSelectNode,
  onCloseActiveNode,
  onUpdateNodeText,
  onDeleteNode,
  onCloseOcrModal,
  onCopyOcrAgain,
  onCopyToClipboardWithImage,
  onCopyScreenshotOnly,
  onGetImageDataUrlOrBlob,
}) => {
  const [isFloaterActive, setIsFloaterActive] = useState(false);
  const isSettingsOpen = useSettingsStore((state) => state.isSettingsOpen);

  const isAnyModalActive =
    isSettingsOpen ||
    Boolean(isAboutModalOpen) ||
    Boolean(isFeedbackModalOpen) ||
    isMarkdownModalOpen ||
    isWebhookModalOpen ||
    isDiagnosticsModalOpen ||
    Boolean(isComparisonModalOpen);

  // Dedicated mini floater mode when QA ticket modal is minimized to floater
  if (isFloaterActive && isMarkdownModalOpen) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-transparent select-none p-1">
        <FlowMarkdownModal
          isOpen={isMarkdownModalOpen}
          isFloaterActive={isFloaterActive}
          onFloaterModeChange={setIsFloaterActive}
          nodes={flowNodes}
          annotations={annotations}
          diagnostics={diagnostics}
          onCopyToClipboardWithImage={onCopyToClipboardWithImage}
          onCopyScreenshotOnly={onCopyScreenshotOnly}
          onGetImageDataUrlOrBlob={onGetImageDataUrlOrBlob}
          onClose={() => {
            setIsFloaterActive(false);
            onOpenMarkdownModal(false);
          }}
        />
      </div>
    );
  }

  // Dedicated mini widget mode when live recording is active
  if (isRecording) {
    return (
      <RecordingControlWidget
        recordingDuration={recordingDuration}
        onStopRecording={onStopRecording}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden select-none bg-transparent"
    >
      {/* 1. Standby Floating Bar (ONLY when explicitly active, NOT frozen, and NO modal is active) */}
      {isFloatingBarOpen && !capturedImage && !isPreviewOpen && !isAnyModalActive && (
        <StandbyFloatingBar
          isCapturing={isCapturing}
          isTransitioning={isTransitioning}
          isPreparingRecord={isPreparingRecord}
          onTriggerScreenshot={onTriggerScreenshot}
          onStartRecording={onStartRecording}
          onCloseOverlay={() => {
            onCloseFloatingBar?.();
            onCloseOverlay();
          }}
        />
      )}

      {/* 2. Floating HUD Toolbar (when screen is frozen with captured image AND no modal is active) */}
      {capturedImage && !isAnyModalActive && (
        <CanvasToolbar
          activeTool={activeTool}
          strokeColor={strokeColor}
          stepCounter={stepCounter}
          flowNodesCount={flowNodes.length}
          isOcrProcessing={isOcrProcessing}
          cropArea={cropArea}
          hasAnnotationsOrNodes={
            annotations.length > 0 || cropArea !== null || flowNodes.length > 0
          }
          isCopying={isCopying}
          copySuccess={copySuccess}
          isDownloading={isDownloading}
          downloadSuccess={downloadSuccess}
          includeDiagnosticsStamp={includeDiagnosticsStamp}
          onToggleDiagnosticsStamp={onToggleDiagnosticsStamp}
          onOpenDiagnosticsModal={() => onOpenDiagnosticsModal(true)}
          onSelectTool={onSelectTool}
          onSelectColor={onSelectColor}
          onCopy={onCopy}
          onDownloadPNG={onDownloadPNG}
          onOpenWebhookModal={() => onOpenWebhookModal(true)}
          onOpenMarkdownModal={() => onOpenMarkdownModal(true)}
          onOpenComparisonModal={() => onOpenComparisonModal?.(true)}
          onResetCropArea={onResetCropArea}
          onClearAnnotations={onClearAnnotations}
          onCancelCapture={onCancelCapture}
        />
      )}

      {/* Helper Notification if error occurred */}
      <Toast
        message={error}
        type="error"
        actionLabel="Retry"
        onAction={onCaptureScreenRetry}
      />

      {/* Konva Canvas Stage */}
      {capturedImage && (
        <KonvaStageCanvas
          stageRef={stageRef}
          cropLayerRef={cropLayerRef}
          ocrLayerRef={ocrLayerRef}
          dimensions={dimensions}
          capturedImage={capturedImage}
          activeTool={activeTool}
          annotations={annotations}
          currentDrawing={currentDrawing}
          cropArea={cropArea}
          ocrArea={ocrArea}
          flowNodes={flowNodes}
          activeNodeId={activeNode ? activeNode.id : null}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onUpdateNodePosition={onUpdateNodePosition}
          onSelectNode={onSelectNode}
        />
      )}

      {/* Eyedropper Magnifier Loupe */}
      {activeTool === "eyedropper" && (
        <EyedropperLoupe
          data={eyedropperData}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
        />
      )}

      {/* Eyedropper Toast Feedback */}
      <Toast message={eyedropperToast} type="success" />

      {/* Download PNG Toast Feedback */}
      <Toast
        message={downloadToast || null}
        type={
          downloadToast?.toLowerCase().includes("fail") ||
          downloadToast?.startsWith("Gagal")
            ? "error"
            : "success"
        }
      />

      {/* OCR Processing Overlay */}
      <OcrIndicator isProcessing={isOcrProcessing} />

      {/* OCR Result Floating Modal */}
      <OcrResultModal
        modalState={ocrModal}
        onCopyAgain={onCopyOcrAgain}
        onClose={onCloseOcrModal}
      />

      {/* Flow Node Edit Floating Card Popover */}
      <FlowNodeEditPopover
        activeNode={activeNode}
        containerWidth={dimensions.width}
        containerHeight={dimensions.height}
        onUpdateNodeText={onUpdateNodeText}
        onDeleteNode={onDeleteNode}
        onClose={onCloseActiveNode}
      />

      {/* Markdown Documentation Exporter Modal */}
      <FlowMarkdownModal
        isOpen={isMarkdownModalOpen}
        isFloaterActive={isFloaterActive}
        onFloaterModeChange={setIsFloaterActive}
        nodes={flowNodes}
        annotations={annotations}
        diagnostics={diagnostics}
        onCopyToClipboardWithImage={onCopyToClipboardWithImage}
        onCopyScreenshotOnly={onCopyScreenshotOnly}
        onGetImageDataUrlOrBlob={onGetImageDataUrlOrBlob}
        onClose={() => {
          setIsFloaterActive(false);
          onOpenMarkdownModal(false);
        }}
      />

      {/* Smart Ruler */}
      <SmartRuler
        dimensions={dimensions}
        isActive={activeTool === "ruler"}
      />

      {/* Presentation & Meeting Tools: Spotlight & Ephemeral Laser Pointer */}
      <PresentationOverlay
        dimensions={dimensions}
        activeTool={activeTool}
        spotlightRadius={spotlightRadius}
        setSpotlightRadius={setSpotlightRadius}
        strokeColor={strokeColor}
      />

      {/* Mouse Click Ripples during screen recording */}
      <RippleEffect ripples={ripples} />

      {/* Video Preview & Trimming Modal */}
      <VideoTrimModal />

      {/* Webhook Dispatcher Modal (Discord / Slack) */}
      <WebhookModal
        isOpen={isWebhookModalOpen}
        onClose={() => onOpenWebhookModal(false)}
        getImageDataUrlOrBlob={onGetImageDataUrlOrBlob}
        initialNotes={
          flowNodes.length > 0 ? exportFlowToMarkdown(flowNodes) : ""
        }
        diagnostics={diagnostics}
      />

      {/* QA Hardware & Environment Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsModalOpen}
        diagnostics={diagnostics}
        onClose={() => onOpenDiagnosticsModal(false)}
      />

      {/* Figma vs Live Slicing Comparison Modal */}
      <VisualComparisonModal
        isOpen={Boolean(isComparisonModalOpen)}
        capturedImage={capturedImage}
        getImageDataUrlOrBlob={onGetImageDataUrlOrBlob}
        onClose={() => onOpenComparisonModal?.(false)}
      />

      {/* Mobile-Style Camera Shutter Flash Overlay */}
      <ShutterFlash show={showShutterFlash} isActive={isFlashActive} />
    </div>
  );
};
