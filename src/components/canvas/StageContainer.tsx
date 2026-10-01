import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Arrow,
  Line,
  Circle,
  Text,
  Group,
  Shape,
} from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { invoke } from "@tauri-apps/api/core";
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
  FileText,
  Video,
  Camera,
  Copy,
  Download,
  Share2,
  Check,
  X,
  Trash2,
  Loader2,
} from "lucide-react";
import { useToolStore } from "../../stores/toolStore";
import { useFlowStore, exportFlowToMarkdown } from "../../stores/flowStore";
import { useRecordStore } from "../../stores/recordStore";
import { useScreenCapture } from "../../hooks/useScreenCapture";
import { useScreenRecorder } from "../../hooks/useScreenRecorder";
import { SmartRuler } from "./SmartRuler";
import { PresentationOverlay } from "./PresentationOverlay";
import { VideoTrimModal } from "../recorder/VideoTrimModal";
import { WebhookModal } from "../hud/WebhookModal";
import { extractTextFromArea } from "../../services/ocrService";

interface OcrArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OcrModalState {
  isOpen: boolean;
  text: string;
  copied: boolean;
}

interface EyedropperState {
  x: number;
  y: number;
  hex: string;
  r: number;
  g: number;
  b: number;
  textColor: string;
  contrastStatus: string;
}

interface BaseAnnotation {
  id: string;
  strokeColor: string;
  strokeWidth: number;
}

interface RectAnnotation extends BaseAnnotation {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ArrowAnnotation extends BaseAnnotation {
  type: "arrow";
  points: [number, number, number, number];
}

interface PenAnnotation extends BaseAnnotation {
  type: "pen";
  points: number[];
}

interface StepBadgeAnnotation extends BaseAnnotation {
  type: "stepBadge";
  x: number;
  y: number;
  stepNumber: number;
  radius: number;
}

type Annotation =
  | RectAnnotation
  | ArrowAnnotation
  | PenAnnotation
  | StepBadgeAnnotation;

interface Point {
  x: number;
  y: number;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const COLOR_PRESETS = [
  { name: "Merah", value: "#ef4444" },
  { name: "Biru", value: "#3b82f6" },
  { name: "Hijau", value: "#10b981" },
  { name: "Kuning", value: "#eab308" },
] as const;

export const StageContainer: React.FC = () => {
  const {
    activeTool,
    strokeColor,
    strokeWidth,
    stepCounter,
    isOcrProcessing,
    spotlightRadius,
    setActiveTool,
    setStrokeColor,
    incrementStepCounter,
    resetStepCounter,
    setIsOcrProcessing,
    setSpotlightRadius,
  } = useToolStore();

  const {
    capturedImage,
    isCapturing,
    isTransitioning,
    error,
    captureScreen,
    triggerScreenshot,
    closeOverlay,
    cancelCapture,
  } = useScreenCapture();

  const isPreviewOpen = useRecordStore((state) => state.isPreviewOpen);

  const {
    isRecording,
    isPreparingRecord,
    recordingDuration,
    ripples,
    startRecording,
    stopRecording,
  } = useScreenRecorder();

  // Mobile-Style Camera Shutter Flash State & Animation
  const [showShutterFlash, setShowShutterFlash] = useState<boolean>(false);
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);
  const prevCapturedImageRef = useRef<HTMLImageElement | null>(null);

  const triggerShutterFlash = useCallback(() => {
    setShowShutterFlash(true);
    setIsFlashActive(true);

    const fadeTimer = setTimeout(() => {
      setIsFlashActive(false);
    }, 60);

    const endTimer = setTimeout(() => {
      setShowShutterFlash(false);
    }, 380);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, []);

  // Trigger shutter flash as soon as a new screenshot image is captured
  useEffect(() => {
    if (capturedImage && !prevCapturedImageRef.current) {
      triggerShutterFlash();
    }
    prevCapturedImageRef.current = capturedImage;
  }, [capturedImage, triggerShutterFlash]);

  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? (window.screen.width || 1920) : 1920,
    height: typeof window !== "undefined" ? (window.screen.height || 1080) : 1080,
  });

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<Annotation | null>(null);

  // Crop selection state
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropStartPoint, setCropStartPoint] = useState<Point | null>(null);

  // OCR selection and modal state
  const [ocrArea, setOcrArea] = useState<OcrArea | null>(null);
  const [isOcrSelecting, setIsOcrSelecting] = useState<boolean>(false);
  const [ocrStartPoint, setOcrStartPoint] = useState<Point | null>(null);
  const [ocrModal, setOcrModal] = useState<OcrModalState>({
    isOpen: false,
    text: "",
    copied: false,
  });

  // Flow & Documentation Builder state
  const {
    nodes,
    activeNodeId,
    addNode,
    updateNodeText,
    updateNodePosition,
    deleteNode,
    setActiveNodeId,
    resetFlow,
  } = useFlowStore();

  const [isMarkdownModalOpen, setIsMarkdownModalOpen] = useState<boolean>(false);
  const [markdownCopied, setMarkdownCopied] = useState<boolean>(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState<boolean>(false);

  const activeNode = nodes.find((n) => n.id === activeNodeId) || null;

  // Export action state
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const stageRef = useRef<Konva.Stage>(null);
  const cropLayerRef = useRef<Konva.Layer>(null);
  const ocrLayerRef = useRef<Konva.Layer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize and dimension sync listener
  useEffect(() => {
    const handleResize = () => {
      if (capturedImage) {
        setDimensions({
          width: capturedImage.naturalWidth || capturedImage.width || window.innerWidth || window.screen.width || 1920,
          height: capturedImage.naturalHeight || capturedImage.height || window.innerHeight || window.screen.height || 1080,
        });
      } else {
        setDimensions({
          width: window.screen.width || 1920,
          height: window.screen.height || 1080,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [capturedImage]);

  // Eyedropper state & in-memory canvas references
  const [eyedropperData, setEyedropperData] = useState<EyedropperState | null>(null);
  const [eyedropperToast, setEyedropperToast] = useState<string | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // 1. In-Memory Hidden Canvas: Draw screenshot to hidden canvas on load
  useEffect(() => {
    if (!capturedImage) {
      hiddenCanvasRef.current = null;
      hiddenCtxRef.current = null;
      return;
    }

    const canvas = document.createElement("canvas");
    const natWidth = capturedImage.naturalWidth || capturedImage.width;
    const natHeight = capturedImage.naturalHeight || capturedImage.height;
    canvas.width = natWidth;
    canvas.height = natHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(capturedImage, 0, 0);
      hiddenCanvasRef.current = canvas;
      hiddenCtxRef.current = ctx;
    }
  }, [capturedImage]);

  // Clear eyedropper preview when switching away from eyedropper
  useEffect(() => {
    if (activeTool !== "eyedropper") {
      setEyedropperData(null);
    }
  }, [activeTool]);

  // Reset annotations, crop, step counter, and flow when new screenshot arrives
  useEffect(() => {
    if (capturedImage) {
      setAnnotations([]);
      setCurrentDrawing(null);
      setCropArea(null);
      resetStepCounter();
      resetFlow();
    }
  }, [capturedImage, resetStepCounter, resetFlow]);

  // Pointer Down Handler
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (
        activeTool === "select" ||
        activeTool === "ruler" ||
        activeTool === "spotlight" ||
        activeTool === "laser"
      ) {
        return;
      }

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      // Handle Flow Builder Tool: click on background canvas creates a new node
      if (activeTool === "flowBuilder") {
        if (e.target === stage) {
          addNode(pos.x, pos.y);
        }
        return;
      }

      // Handle Eyedropper Click: Copy HEX to clipboard and show feedback toast
      if (activeTool === "eyedropper") {
        const ctx = hiddenCtxRef.current;
        const canvas = hiddenCanvasRef.current;
        if (ctx && canvas) {
          const scaleX = canvas.width / dimensions.width;
          const scaleY = canvas.height / dimensions.height;
          const imgX = Math.min(Math.max(0, Math.floor(pos.x * scaleX)), canvas.width - 1);
          const imgY = Math.min(Math.max(0, Math.floor(pos.y * scaleY)), canvas.height - 1);
          const pixel = ctx.getImageData(imgX, imgY, 1, 1).data;
          const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`.toUpperCase();

          void navigator.clipboard.writeText(hex);
          setStrokeColor(hex);
          setEyedropperToast(`Color ${hex} Copied!`);
          setTimeout(() => {
            setEyedropperToast(null);
          }, 1800);
        }
        return;
      }

      // Handle Step Badge (click to stamp)
      if (activeTool === "stepBadge") {
        const badge: StepBadgeAnnotation = {
          id: `step-${Date.now()}-${stepCounter}`,
          type: "stepBadge",
          x: pos.x,
          y: pos.y,
          stepNumber: stepCounter,
          radius: 14,
          strokeColor,
          strokeWidth,
        };
        setAnnotations((prev) => [...prev, badge]);
        incrementStepCounter();
        return;
      }

      // Handle Crop Selection
      if (activeTool === "crop") {
        setIsCropping(true);
        setCropStartPoint({ x: pos.x, y: pos.y });
        setCropArea({
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
        });
        return;
      }

      // Handle OCR Area Selection
      if (activeTool === "ocr") {
        setIsOcrSelecting(true);
        setOcrStartPoint({ x: pos.x, y: pos.y });
        setOcrArea({
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
        });
        return;
      }

      // Handle Standard Drawing (rect, arrow, pen)
      setIsDrawing(true);
      setStartPoint({ x: pos.x, y: pos.y });

      const base = {
        id: `shape-${Date.now()}`,
        strokeColor,
        strokeWidth,
      };

      if (activeTool === "rect") {
        setCurrentDrawing({
          ...base,
          type: "rect",
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
        });
      } else if (activeTool === "arrow") {
        setCurrentDrawing({
          ...base,
          type: "arrow",
          points: [pos.x, pos.y, pos.x, pos.y],
        });
      } else if (activeTool === "pen") {
        setCurrentDrawing({
          ...base,
          type: "pen",
          points: [pos.x, pos.y],
        });
      }
    },
    [
      activeTool,
      strokeColor,
      strokeWidth,
      stepCounter,
      incrementStepCounter,
      dimensions,
      setStrokeColor,
      addNode,
    ]
  );

  // Pointer Move Handler
  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      // Handle Eyedropper Live Sampling
      if (activeTool === "eyedropper") {
        const ctx = hiddenCtxRef.current;
        const canvas = hiddenCanvasRef.current;
        if (!ctx || !canvas) return;

        const scaleX = canvas.width / dimensions.width;
        const scaleY = canvas.height / dimensions.height;
        const imgX = Math.min(Math.max(0, Math.floor(pos.x * scaleX)), canvas.width - 1);
        const imgY = Math.min(Math.max(0, Math.floor(pos.y * scaleY)), canvas.height - 1);

        const pixel = ctx.getImageData(imgX, imgY, 1, 1).data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];

        // Format to HEX
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`.toUpperCase();

        // Contrast calculation
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const isLight = brightness > 128;
        const textColor = isLight ? "#000000" : "#ffffff";
        const contrastStatus = isLight ? "Kontras: Hitam" : "Kontras: Putih";

        setEyedropperData({
          x: pos.x,
          y: pos.y,
          hex,
          r,
          g,
          b,
          textColor,
          contrastStatus,
        });
        return;
      }

      // Update Crop Drag Selection
      if (activeTool === "crop" && isCropping && cropStartPoint) {
        const x = Math.min(cropStartPoint.x, pos.x);
        const y = Math.min(cropStartPoint.y, pos.y);
        const width = Math.abs(pos.x - cropStartPoint.x);
        const height = Math.abs(pos.y - cropStartPoint.y);

        setCropArea({ x, y, width, height });
        return;
      }

      // Update OCR Drag Selection
      if (activeTool === "ocr" && isOcrSelecting && ocrStartPoint) {
        const x = Math.min(ocrStartPoint.x, pos.x);
        const y = Math.min(ocrStartPoint.y, pos.y);
        const width = Math.abs(pos.x - ocrStartPoint.x);
        const height = Math.abs(pos.y - ocrStartPoint.y);

        setOcrArea({ x, y, width, height });
        return;
      }

      // Update Standard Drawing Drag Preview
      if (!isDrawing || !currentDrawing || !startPoint) return;

      if (currentDrawing.type === "rect") {
        const x = Math.min(startPoint.x, pos.x);
        const y = Math.min(startPoint.y, pos.y);
        const width = Math.abs(pos.x - startPoint.x);
        const height = Math.abs(pos.y - startPoint.y);

        setCurrentDrawing({
          ...currentDrawing,
          x,
          y,
          width,
          height,
        });
      } else if (currentDrawing.type === "arrow") {
        setCurrentDrawing({
          ...currentDrawing,
          points: [startPoint.x, startPoint.y, pos.x, pos.y],
        });
      } else if (currentDrawing.type === "pen") {
        setCurrentDrawing({
          ...currentDrawing,
          points: [...currentDrawing.points, pos.x, pos.y],
        });
      }
    },
    [
      activeTool,
      isCropping,
      cropStartPoint,
      isOcrSelecting,
      ocrStartPoint,
      isDrawing,
      currentDrawing,
      startPoint,
      dimensions,
    ]
  );

  // Pointer Up Handler
  const handleMouseUp = useCallback(() => {
    // If Eyedropper, do not draw shapes
    if (activeTool === "eyedropper") {
      return;
    }

    // Finalize OCR Selection & Trigger Extraction
    if (activeTool === "ocr" && isOcrSelecting) {
      setIsOcrSelecting(false);
      setOcrStartPoint(null);

      if (!ocrArea || ocrArea.width < 10 || ocrArea.height < 10) {
        setOcrArea(null);
        return;
      }

      const targetArea = { ...ocrArea };
      void (async () => {
        const stage = stageRef.current;
        if (!stage) return;

        // Hide overlays temporarily for clean image slice
        if (cropLayerRef.current) cropLayerRef.current.hide();
        if (ocrLayerRef.current) ocrLayerRef.current.hide();

        const dataUrl = stage.toDataURL({
          x: targetArea.x,
          y: targetArea.y,
          width: targetArea.width,
          height: targetArea.height,
          pixelRatio: 1,
        });

        if (ocrLayerRef.current) ocrLayerRef.current.show();
        if (cropLayerRef.current) cropLayerRef.current.show();

        setIsOcrProcessing(true);
        try {
          const text = await extractTextFromArea(dataUrl);
          if (text) {
            await navigator.clipboard.writeText(text);
          }
          setOcrModal({
            isOpen: true,
            text: text || "(Tidak ada teks yang dapat dikenali pada area seleksi)",
            copied: Boolean(text),
          });
        } catch (err) {
          console.error("[StageContainer] OCR failed:", err);
          setOcrModal({
            isOpen: true,
            text: `Gagal membaca teks: ${err instanceof Error ? err.message : String(err)}`,
            copied: false,
          });
        } finally {
          setIsOcrProcessing(false);
          setOcrArea(null);
        }
      })();
      return;
    }

    // Finalize Crop
    if (activeTool === "crop" && isCropping) {
      setIsCropping(false);
      setCropStartPoint(null);
      if (cropArea && (cropArea.width < 5 || cropArea.height < 5)) {
        setCropArea(null);
      }
      return;
    }

    // Finalize Standard Annotation
    if (!isDrawing || !currentDrawing) {
      setIsDrawing(false);
      setCurrentDrawing(null);
      setStartPoint(null);
      return;
    }

    let isValid = false;

    if (currentDrawing.type === "rect") {
      isValid = currentDrawing.width > 3 && currentDrawing.height > 3;
    } else if (currentDrawing.type === "arrow") {
      const [x1, y1, x2, y2] = currentDrawing.points;
      const dist = Math.hypot(x2 - x1, y2 - y1);
      isValid = dist > 5;
    } else if (currentDrawing.type === "pen") {
      isValid = currentDrawing.points.length >= 4;
    }

    if (isValid) {
      setAnnotations((prev) => [...prev, currentDrawing]);
    }

    setIsDrawing(false);
    setCurrentDrawing(null);
    setStartPoint(null);
  }, [
    activeTool,
    isCropping,
    cropArea,
    isOcrSelecting,
    ocrArea,
    isDrawing,
    currentDrawing,
    setIsOcrProcessing,
  ]);

  // Clear all annotations and reset crop & OCR
  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
    setCurrentDrawing(null);
    setCropArea(null);
    setOcrArea(null);
    setOcrModal({ isOpen: false, text: "", copied: false });
    resetStepCounter();
    resetFlow();
  }, [resetStepCounter, resetFlow]);

  // Export helper: generate clean Data URL without crop overlays
  const generateExportDataUrl = useCallback((): string | null => {
    const stage = stageRef.current;
    if (!stage) return null;

    const cropLayer = cropLayerRef.current;
    if (cropLayer) {
      cropLayer.hide();
    }

    let dataUrl: string;
    if (cropArea && cropArea.width > 5 && cropArea.height > 5) {
      dataUrl = stage.toDataURL({
        x: cropArea.x,
        y: cropArea.y,
        width: cropArea.width,
        height: cropArea.height,
        pixelRatio: 1,
      });
    } else {
      dataUrl = stage.toDataURL({
        pixelRatio: 1,
      });
    }

    if (cropLayer) {
      cropLayer.show();
    }

    return dataUrl;
  }, [cropArea]);

  // Export: Copy to OS Clipboard via Rust native injection
  const handleCopyToClipboard = useCallback(async () => {
    const dataUrl = generateExportDataUrl();
    if (!dataUrl) return;

    setIsCopying(true);
    try {
      await invoke("copy_to_clipboard", { base64Png: dataUrl });
      setCopySuccess(true);
      setTimeout(async () => {
        await closeOverlay();
        setCopySuccess(false);
      }, 350);
    } catch (err) {
      console.error("[StageContainer] Copy to clipboard failed:", err);
    } finally {
      setIsCopying(false);
    }
  }, [generateExportDataUrl, closeOverlay]);

  // Export: Download PNG locally
  const handleDownloadPNG = useCallback(() => {
    const dataUrl = generateExportDataUrl();
    if (!dataUrl) return;

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `screencraft-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [generateExportDataUrl]);

  // Helper to render an annotation shape
  const renderShape = (shape: Annotation) => {
    if (shape.type === "rect") {
      return (
        <Rect
          key={shape.id}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          stroke={shape.strokeColor}
          strokeWidth={shape.strokeWidth}
          cornerRadius={4}
          listening={activeTool === "select"}
          draggable={activeTool === "select"}
        />
      );
    }

    if (shape.type === "arrow") {
      return (
        <Arrow
          key={shape.id}
          points={shape.points}
          stroke={shape.strokeColor}
          strokeWidth={shape.strokeWidth}
          fill={shape.strokeColor}
          pointerLength={12}
          pointerWidth={12}
          listening={activeTool === "select"}
          draggable={activeTool === "select"}
        />
      );
    }

    if (shape.type === "pen") {
      return (
        <Line
          key={shape.id}
          points={shape.points}
          stroke={shape.strokeColor}
          strokeWidth={shape.strokeWidth}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          listening={activeTool === "select"}
          draggable={activeTool === "select"}
        />
      );
    }

    if (shape.type === "stepBadge") {
      return (
        <Group
          key={shape.id}
          x={shape.x}
          y={shape.y}
          listening={activeTool === "select"}
          draggable={activeTool === "select"}
        >
          <Circle
            radius={shape.radius}
            fill={shape.strokeColor}
            stroke="#ffffff"
            strokeWidth={2}
            shadowColor="#000000"
            shadowBlur={6}
            shadowOpacity={0.4}
          />
          <Text
            text={String(shape.stepNumber)}
            fontSize={13}
            fontStyle="bold"
            fontFamily="sans-serif"
            fill="#ffffff"
            align="center"
            verticalAlign="middle"
            width={shape.radius * 2}
            height={shape.radius * 2}
            offsetX={shape.radius}
            offsetY={shape.radius}
          />
        </Group>
      );
    }

    return null;
  };

  // Cursor selector
  const getCursor = () => {
    switch (activeTool) {
      case "select":
      case "spotlight":
        return "default";
      case "stepBadge":
        return "pointer";
      case "flowBuilder":
      case "laser":
      case "ocr":
      case "crop":
      case "rect":
      case "arrow":
      case "pen":
      default:
        return "crosshair";
    }
  };

  // Dedicated mini widget mode when live recording is active (window is shrunk to 310x70 in bottom-right corner)
  if (isRecording) {
    return (
      <div className="w-full h-full flex items-center justify-center p-1 bg-transparent select-none overflow-hidden box-border">
        <div className="w-[295px] h-[56px] flex items-center justify-between px-3.5 py-1.5 bg-neutral-950/95 border border-rose-500/80 rounded-2xl shadow-2xl text-white select-none overflow-hidden animate-in fade-in duration-150 box-border">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-300">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>
            <span>
              REC 00:{Math.floor(recordingDuration).toString().padStart(2, "0")} / 00:30
            </span>
          </div>

          <div className="h-4 w-px bg-neutral-700/80" />

          <button
            type="button"
            title="Selesai merekam layar"
            onClick={() => void stopRecording()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/30 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Selesai</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden select-none bg-transparent"
    >
      {/* 1. Standby Floating Bar (when NOT frozen and NOT previewing video) */}
      {!capturedImage && !isPreviewOpen && (
        <div
          className={`fixed top-1 left-1/2 -translate-x-1/2 w-[370px] h-[56px] pointer-events-auto flex items-center justify-between px-3.5 py-2 bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-2xl shadow-2xl text-white select-none box-border z-50 transition-all duration-150 ease-out ${
            isTransitioning || isPreparingRecord
              ? "opacity-0 scale-95 pointer-events-none"
              : "opacity-100 scale-100"
          }`}
        >
          {/* Brand / Logo */}
          <div className="flex items-center gap-2 pl-1">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-xs font-bold tracking-wider text-neutral-200">SCREENCRAFT</span>
          </div>

          <div className="h-4 w-px bg-neutral-700/80" />

          {/* Action Buttons: Screenshot & Record */}
          <div className="flex items-center gap-2">
            {/* Screenshot Button */}
            <button
              type="button"
              title="Ambil Screenshot & Buka Alat Edit (Crop, Coret-coret)"
              disabled={isCapturing || isTransitioning || isPreparingRecord}
              onClick={() => void triggerScreenshot()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-70"
            >
              {isCapturing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-200" />
                  <span>Menangkap...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>Screenshot</span>
                </>
              )}
            </button>

            {/* Record Button */}
            <button
              type="button"
              title="Rekam Layar (GIF / WebM)"
              disabled={isPreparingRecord || isCapturing || isTransitioning}
              onClick={() => void startRecording()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700/60 transition-all cursor-pointer disabled:opacity-70"
            >
              {isPreparingRecord ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                  <span>Menyiapkan...</span>
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5 text-rose-400" />
                  <span>Record</span>
                </>
              )}
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-700/80" />

          {/* Close Button */}
          <button
            type="button"
            title="Tutup (Esc)"
            onClick={() => void closeOverlay()}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Floating HUD Toolbar (when screen is frozen with captured image) */}
      {capturedImage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 bg-neutral-900/90 hover:bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-2xl shadow-2xl text-white transition-all max-w-[96vw] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden animate-in fade-in slide-in-from-top-4 duration-300">
        {/* Tool Selectors */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Select Mode"
            onClick={() => setActiveTool("select")}
            className={`p-2 rounded-xl transition-all ${
              activeTool === "select"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <MousePointer className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Panah (Arrow)"
            onClick={() => setActiveTool("arrow")}
            className={`p-2 rounded-xl transition-all ${
              activeTool === "arrow"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Kotak (Rectangle)"
            onClick={() => setActiveTool("rect")}
            className={`p-2 rounded-xl transition-all ${
              activeTool === "rect"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Pena (Pen)"
            onClick={() => setActiveTool("pen")}
            className={`p-2 rounded-xl transition-all ${
              activeTool === "pen"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Step Badge (1-2-3)"
            onClick={() => setActiveTool("stepBadge")}
            className={`flex items-center gap-1 p-2 rounded-xl transition-all ${
              activeTool === "stepBadge"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span className="text-[10px] font-mono px-1 py-0.2 bg-neutral-800 rounded font-bold">
              {stepCounter}
            </span>
          </button>

          <button
            type="button"
            title="Crop Area Selection"
            onClick={() => setActiveTool("crop")}
            className={`p-2 rounded-xl transition-all ${
              activeTool === "crop"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Crop className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Eyedropper & Color Sampler"
            onClick={() => setActiveTool("eyedropper")}
            className={`p-2 rounded-xl transition-all ${
              activeTool === "eyedropper"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Pipette className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Smart Pixel Ruler"
            onClick={() => setActiveTool("ruler")}
            className={`p-2 rounded-xl transition-all ${
              activeTool === "ruler"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Ruler className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Screen Area OCR (Text Extractor)"
            disabled={isOcrProcessing}
            onClick={() => setActiveTool("ocr")}
            className={`flex items-center gap-1 p-2 rounded-xl transition-all ${
              activeTool === "ocr"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            } disabled:opacity-50`}
          >
            {isOcrProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
            ) : (
              <ScanText className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            title="Spotlight (Scroll to resize)"
            onClick={() => setActiveTool("spotlight")}
            className={`p-2 rounded-xl transition-all ${
              activeTool === "spotlight"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Sun className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Laser Pointer (Fades in 1.5s)"
            onClick={() => setActiveTool("laser")}
            className={`p-2 rounded-xl transition-all ${
              activeTool === "laser"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Zap className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Flow & Documentation Builder"
            onClick={() => setActiveTool("flowBuilder")}
            className={`flex items-center gap-1 p-2 rounded-xl transition-all ${
              activeTool === "flowBuilder"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Workflow className="w-4 h-4" />
            {nodes.length > 0 && (
              <span className="text-[10px] font-mono px-1 py-0.2 bg-purple-950/80 border border-purple-400/40 rounded-full font-bold text-purple-200">
                {nodes.length}
              </span>
            )}
          </button>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-neutral-700/80" />

        {/* Color Presets */}
        <div className="flex items-center gap-1.5">
          {COLOR_PRESETS.map((color) => {
            const isSelected =
              strokeColor.toLowerCase() === color.value.toLowerCase();
            return (
              <button
                key={color.value}
                type="button"
                title={color.name}
                onClick={() => setStrokeColor(color.value)}
                className={`w-5 h-5 rounded-full transition-transform ${
                  isSelected
                    ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110"
                    : "hover:scale-105 opacity-80 hover:opacity-100"
                }`}
                style={{ backgroundColor: color.value }}
              />
            );
          })}
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-neutral-700/80" />

        {/* Export and Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Copy to Clipboard */}
          <button
            type="button"
            title="Salin ke Clipboard"
            disabled={isCopying}
            onClick={() => void handleCopyToClipboard()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50"
          >
            {isCopying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : copySuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copySuccess ? "Tersalin!" : "Copy"}</span>
          </button>

          {/* Download PNG */}
          <button
            type="button"
            title="Download PNG"
            onClick={handleDownloadPNG}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          {/* Share to Webhook (Discord / Slack) */}
          <button
            type="button"
            title="Kirim ke Discord / Slack Webhook"
            onClick={() => setIsWebhookModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Share</span>
          </button>

          {/* View & Export Markdown */}
          {nodes.length > 0 && (
            <button
              type="button"
              title={`Buka Dokumentasi Markdown (${nodes.length} Steps)`}
              onClick={() => setIsMarkdownModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/90 hover:bg-purple-600 text-white transition-all shadow-md shadow-purple-600/25"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Markdown</span>
              <span className="text-[10px] font-mono px-1 py-0.2 bg-purple-900/90 rounded font-bold">
                {nodes.length}
              </span>
            </button>
          )}

          {/* Reset Crop Area Badge if active */}
          {cropArea && (
            <button
              type="button"
              title="Reset Crop Area"
              onClick={() => setCropArea(null)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-blue-900/60 border border-blue-500/40 text-blue-200 hover:bg-blue-800/80"
            >
              <span>
                {Math.round(cropArea.width)}×{Math.round(cropArea.height)}
              </span>
              <X className="w-3 h-3 text-blue-300" />
            </button>
          )}

          {/* Clear Annotations */}
          {(annotations.length > 0 || cropArea || nodes.length > 0) && (
            <button
              type="button"
              title="Hapus Semua Anotasi & Flow"
              onClick={clearAnnotations}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Cancel Screenshot (Return to Floating Bar) */}
          <button
            type="button"
            title="Batal Screenshot (Kembali ke Floating Bar - Esc)"
            onClick={() => void cancelCapture()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Batal</span>
          </button>
        </div>
      </div>
      )}

      {/* Helper Notification if error occurred */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-red-950/90 border border-red-700 text-red-200 text-xs rounded-xl shadow-lg">
          <span>Error: {error}</span>
          <button
            type="button"
            onClick={() => void captureScreen()}
            className="underline font-bold ml-2 hover:text-white"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Konva Canvas */}
      {capturedImage && (
        <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          cursor: getCursor(),
        }}
      >
        {/* Layer 1: Native screenshot freeze background */}
        <Layer listening={false}>
          {capturedImage && (
            <KonvaImage
              image={capturedImage}
              x={0}
              y={0}
              width={dimensions.width}
              height={dimensions.height}
              listening={false}
            />
          )}
        </Layer>

        {/* Layer 2: Annotations & Active Drawing Drag Preview */}
        <Layer>
          {annotations.map(renderShape)}
          {currentDrawing && renderShape(currentDrawing)}
        </Layer>

        {/* Layer 3: Crop Area Selection Overlay & Dimensions Badge */}
        <Layer ref={cropLayerRef}>
          {cropArea && cropArea.width > 2 && cropArea.height > 2 && (
            <Group>
              {/* Semi-transparent Crop Box */}
              <Rect
                x={cropArea.x}
                y={cropArea.y}
                width={cropArea.width}
                height={cropArea.height}
                fill="rgba(59, 130, 246, 0.12)"
                stroke="#3b82f6"
                strokeWidth={1.5}
                dash={[6, 3]}
                cornerRadius={2}
              />

              {/* Dimensions Badge (e.g. 1920 × 1080 px) */}
              <Group
                x={cropArea.x + 6}
                y={
                  cropArea.y + cropArea.height + 26 > dimensions.height
                    ? Math.max(0, cropArea.y - 26)
                    : cropArea.y + cropArea.height + 6
                }
              >
                <Rect
                  width={110}
                  height={22}
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth={1}
                  cornerRadius={6}
                  opacity={0.92}
                  shadowColor="#000000"
                  shadowBlur={4}
                  shadowOpacity={0.3}
                />
                <Text
                  text={`${Math.round(cropArea.width)} × ${Math.round(cropArea.height)} px`}
                  fontSize={11}
                  fontFamily="sans-serif"
                  fontStyle="bold"
                  fill="#38bdf8"
                  width={110}
                  height={22}
                  align="center"
                  verticalAlign="middle"
                />
              </Group>
            </Group>
          )}
        </Layer>

        {/* Layer 4: OCR Drag Selection Overlay */}
        <Layer ref={ocrLayerRef}>
          {ocrArea && ocrArea.width > 2 && ocrArea.height > 2 && (
            <Group>
              <Rect
                x={ocrArea.x}
                y={ocrArea.y}
                width={ocrArea.width}
                height={ocrArea.height}
                fill="rgba(99, 102, 241, 0.15)"
                stroke="#6366f1"
                strokeWidth={1.5}
                dash={[5, 4]}
                cornerRadius={2}
              />
              <Group
                x={ocrArea.x + 6}
                y={
                  ocrArea.y + ocrArea.height + 26 > dimensions.height
                    ? Math.max(0, ocrArea.y - 26)
                    : ocrArea.y + ocrArea.height + 6
                }
              >
                <Rect
                  width={84}
                  height={22}
                  fill="#1e1b4b"
                  stroke="#4f46e5"
                  strokeWidth={1}
                  cornerRadius={6}
                  opacity={0.92}
                  shadowColor="#000000"
                  shadowBlur={4}
                  shadowOpacity={0.3}
                />
                <Text
                  text="OCR Scan"
                  fontSize={11}
                  fontFamily="sans-serif"
                  fontStyle="bold"
                  fill="#a5b4fc"
                  width={84}
                  height={22}
                  align="center"
                  verticalAlign="middle"
                />
              </Group>
            </Group>
          )}
        </Layer>

        {/* Layer 5: Flow & Documentation Builder (Bezier curves & Nodes) */}
        <Layer>
          {/* Cubic Bezier Curves connecting consecutive nodes */}
          {nodes.map((node, i) => {
            if (i >= nodes.length - 1) return null;
            const nextNode = nodes[i + 1];

            const R = 18;
            const dx = nextNode.x - node.x;
            const dy = nextNode.y - node.y;
            const dist = Math.hypot(dx, dy);

            if (dist <= R * 2) return null;

            const uX = dx / dist;
            const uY = dy / dist;

            const startX = node.x + uX * R;
            const startY = node.y + uY * R;
            const endX = nextNode.x - uX * (R + 8);
            const endY = nextNode.y - uY * (R + 8);

            // Natural S/C-curve curvature
            const curvature = Math.min(Math.max(dist * 0.45, 30), 180);
            let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

            if (Math.abs(dx) >= Math.abs(dy)) {
              cp1x = startX + (dx > 0 ? curvature : -curvature);
              cp1y = startY;
              cp2x = endX - (dx > 0 ? curvature : -curvature);
              cp2y = endY;
            } else {
              cp1x = startX;
              cp1y = startY + (dy > 0 ? curvature : -curvature);
              cp2x = endX;
              cp2y = endY - (dy > 0 ? curvature : -curvature);
            }

            const tangentX = endX - cp2x;
            const tangentY = endY - cp2y;
            const arrowAngle = Math.atan2(tangentY, tangentX);
            const arrowLength = 9;
            const tipX = nextNode.x - uX * R;
            const tipY = nextNode.y - uY * R;

            return (
              <Shape
                key={`flow-edge-${node.id}-${nextNode.id}`}
                sceneFunc={(ctx, shape) => {
                  ctx.save();
                  // Bezier curve
                  ctx.beginPath();
                  ctx.moveTo(startX, startY);
                  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
                  ctx.strokeStyle = "#8b5cf6";
                  ctx.lineWidth = 3;
                  ctx.shadowColor = "rgba(139, 92, 246, 0.55)";
                  ctx.shadowBlur = 6;
                  ctx.lineCap = "round";
                  ctx.stroke();

                  // Arrowhead
                  ctx.beginPath();
                  ctx.moveTo(tipX, tipY);
                  ctx.lineTo(
                    tipX - arrowLength * Math.cos(arrowAngle - Math.PI / 6),
                    tipY - arrowLength * Math.sin(arrowAngle - Math.PI / 6)
                  );
                  ctx.lineTo(
                    tipX - arrowLength * Math.cos(arrowAngle + Math.PI / 6),
                    tipY - arrowLength * Math.sin(arrowAngle + Math.PI / 6)
                  );
                  ctx.closePath();
                  ctx.fillStyle = "#8b5cf6";
                  ctx.shadowColor = "rgba(139, 92, 246, 0.55)";
                  ctx.shadowBlur = 6;
                  ctx.fill();
                  ctx.restore();
                  ctx.fillStrokeShape(shape);
                }}
              />
            );
          })}

          {/* Flow Nodes */}
          {nodes.map((node) => {
            const isSelected = activeNodeId === node.id;
            const titleWidth = Math.min(120, Math.max(50, node.title.length * 6.5 + 16));

            return (
              <Group
                key={node.id}
                x={node.x}
                y={node.y}
                draggable={activeTool === "select" || activeTool === "flowBuilder"}
                onDragMove={(e) => {
                  updateNodePosition(node.id, e.target.x(), e.target.y());
                }}
                onClick={(e) => {
                  e.cancelBubble = true;
                  setActiveNodeId(node.id);
                }}
              >
                {/* Active selection dashed ring */}
                {isSelected && (
                  <Circle
                    radius={24}
                    stroke="#c4b5fd"
                    strokeWidth={2}
                    dash={[4, 3]}
                  />
                )}

                {/* Node circular badge */}
                <Circle
                  radius={18}
                  fill="#7c3aed"
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  shadowColor="#7c3aed"
                  shadowBlur={8}
                  shadowOpacity={0.5}
                />

                {/* Step number */}
                <Text
                  text={String(node.stepNumber)}
                  fontSize={13}
                  fontFamily="sans-serif"
                  fontStyle="bold"
                  fill="#ffffff"
                  align="center"
                  verticalAlign="middle"
                  width={36}
                  height={36}
                  offsetX={18}
                  offsetY={18}
                />

                {/* Step Title Label Tag */}
                {node.title && (
                  <Group y={22}>
                    <Rect
                      x={-titleWidth / 2}
                      width={titleWidth}
                      height={18}
                      fill="#1e1b4b"
                      stroke="#6d28d9"
                      strokeWidth={1}
                      cornerRadius={5}
                      opacity={0.92}
                      shadowColor="#000000"
                      shadowBlur={4}
                      shadowOpacity={0.3}
                    />
                    <Text
                      text={
                        node.title.length > 15
                          ? `${node.title.slice(0, 14)}…`
                          : node.title
                      }
                      fontSize={10}
                      fontFamily="sans-serif"
                      fontStyle="bold"
                      fill="#ddd6fe"
                      width={titleWidth}
                      height={18}
                      offsetX={titleWidth / 2}
                      align="center"
                      verticalAlign="middle"
                    />
                  </Group>
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
      )}

      {/* 2. Floating Loupe / Kaca Pembesar Preview */}
      {activeTool === "eyedropper" && eyedropperData && (
        <div
          className="fixed pointer-events-none z-50 rounded-full border-[3px] border-white shadow-[0_10px_30px_rgba(0,0,0,0.55)] flex flex-col items-center justify-center select-none overflow-hidden"
          style={{
            width: "96px",
            height: "96px",
            left: `${
              eyedropperData.x + 15 + 96 > dimensions.width
                ? eyedropperData.x - 96 - 15
                : eyedropperData.x + 15
            }px`,
            top: `${
              eyedropperData.y + 15 + 96 > dimensions.height
                ? eyedropperData.y - 96 - 15
                : eyedropperData.y + 15
            }px`,
            backgroundColor: eyedropperData.hex,
            color: eyedropperData.textColor,
          }}
        >
          {/* Inner Crosshair indicator */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <div className="w-full h-[1px] bg-current" />
            <div className="h-full w-[1px] bg-current absolute" />
          </div>

          {/* Color & Contrast text */}
          <div className="relative z-10 flex flex-col items-center justify-center px-1 text-center">
            <span className="font-mono text-xs font-black tracking-wider drop-shadow-sm">
              {eyedropperData.hex}
            </span>
            <span className="text-[9px] font-semibold opacity-90 drop-shadow-sm mt-0.5">
              {eyedropperData.contrastStatus}
            </span>
          </div>
        </div>
      )}

      {/* Eyedropper Toast Feedback */}
      {eyedropperToast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 bg-neutral-900/95 border border-emerald-500/80 text-white text-xs font-bold rounded-2xl shadow-2xl shadow-emerald-500/20 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{eyedropperToast}</span>
        </div>
      )}

      {/* OCR Processing Overlay */}
      {isOcrProcessing && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 pointer-events-none">
          <div className="flex items-center gap-3 px-6 py-3.5 bg-neutral-900/95 border border-indigo-500/50 rounded-2xl shadow-2xl text-white">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Extracting text...</span>
              <span className="text-[11px] text-neutral-400">Processing OCR pipeline</span>
            </div>
          </div>
        </div>
      )}

      {/* OCR Result Floating Modal */}
      {ocrModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-xs z-50 p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/50">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                <ScanText className="w-4 h-4" />
                <span>Hasil Ekstraksi OCR</span>
              </div>
              <button
                type="button"
                onClick={() => setOcrModal({ isOpen: false, text: "", copied: false })}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Text Area */}
            <div className="p-5 flex flex-col gap-3">
              <textarea
                readOnly
                value={ocrModal.text}
                rows={6}
                className="w-full p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-200 select-text focus:outline-hidden focus:border-indigo-500/50 resize-y"
              />
              {ocrModal.copied && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Teks otomatis disalin ke clipboard!</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-800 bg-neutral-950/30">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(ocrModal.text);
                  setOcrModal((prev) => ({ ...prev, copied: true }));
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Ulang (Copy Again)</span>
              </button>
              <button
                type="button"
                onClick={() => setOcrModal({ isOpen: false, text: "", copied: false })}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
              >
                Tutup (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Flow Node Edit Floating Card Popover */}
      {activeNode && (
        <div
          className="fixed z-50 bg-neutral-900/95 border border-purple-500/70 rounded-2xl shadow-2xl p-4 w-72 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none text-white"
          style={{
            left: `${Math.min(Math.max(16, activeNode.x - 144), dimensions.width - 304)}px`,
            top: `${
              activeNode.y + 45 + 230 > dimensions.height
                ? Math.max(16, activeNode.y - 240)
                : activeNode.y + 45
            }px`,
          }}
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
              <Workflow className="w-3.5 h-3.5" />
              <span>Edit Step #{activeNode.stepNumber}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveNodeId(null)}
              className="text-neutral-400 hover:text-white p-0.5 rounded-lg hover:bg-neutral-800 transition-colors"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-1 mb-2.5">
            <label className="text-[10px] uppercase font-bold text-neutral-400">Judul Langkah</label>
            <input
              type="text"
              value={activeNode.title}
              onChange={(e) => updateNodeText(activeNode.id, e.target.value, activeNode.description)}
              className="w-full px-2.5 py-1.5 bg-neutral-950/80 border border-neutral-700/80 rounded-lg text-xs text-white focus:outline-hidden focus:border-purple-500"
              placeholder="Contoh: Klik tombol submit"
            />
          </div>

          <div className="flex flex-col gap-1 mb-3">
            <label className="text-[10px] uppercase font-bold text-neutral-400">Deskripsi / Detail</label>
            <textarea
              rows={3}
              value={activeNode.description}
              onChange={(e) => updateNodeText(activeNode.id, activeNode.title, e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-950/80 border border-neutral-700/80 rounded-lg text-xs text-neutral-200 focus:outline-hidden focus:border-purple-500 resize-none"
              placeholder="Contoh: Form validasi gagal dan toast error muncul"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => deleteNode(activeNode.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveNodeId(null)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-purple-600/30 transition-all"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* 4. Markdown Documentation Exporter Modal */}
      {isMarkdownModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs z-50 p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-purple-500/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/50">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                <Workflow className="w-4 h-4" />
                <span>Workflow / Reproduction Steps ({nodes.length} Steps)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMarkdownModalOpen(false);
                  setMarkdownCopied(false);
                }}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-3">
              <textarea
                readOnly
                value={exportFlowToMarkdown(nodes)}
                rows={8}
                className="w-full p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-200 select-text focus:outline-hidden focus:border-purple-500/60 resize-y"
              />
              {markdownCopied && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Dokumentasi Markdown berhasil disalin ke clipboard!</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-800 bg-neutral-950/30">
              {/* Copy Markdown */}
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(exportFlowToMarkdown(nodes));
                  setMarkdownCopied(true);
                  setTimeout(() => setMarkdownCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Markdown</span>
              </button>

              {/* Copy Flow & Image */}
              <button
                type="button"
                onClick={async () => {
                  void navigator.clipboard.writeText(exportFlowToMarkdown(nodes));
                  await handleCopyToClipboard();
                  setMarkdownCopied(true);
                  setTimeout(() => {
                    setIsMarkdownModalOpen(false);
                    setMarkdownCopied(false);
                  }, 800);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/30"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Copy Flow & Image</span>
              </button>

              {/* Download .md file */}
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([exportFlowToMarkdown(nodes)], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `reproduction-steps-${Date.now()}.md`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .md</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMarkdownModalOpen(false);
                  setMarkdownCopied(false);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="fixed pointer-events-none rounded-full border-2 border-rose-500 bg-rose-500/20 animate-ping z-50 select-none"
          style={{
            left: `${ripple.x - 20}px`,
            top: `${ripple.y - 20}px`,
            width: "40px",
            height: "40px",
          }}
        />
      ))}

      {/* Video Preview & Trimming Modal */}
      <VideoTrimModal />

      {/* Webhook Dispatcher Modal (Discord / Slack) */}
      <WebhookModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        getImageDataUrlOrBlob={async () => generateExportDataUrl()}
        initialNotes={nodes.length > 0 ? exportFlowToMarkdown(nodes) : ""}
      />

      {/* Mobile-Style Camera Shutter Flash Overlay */}
      {showShutterFlash && (
        <div
          className={`fixed inset-0 pointer-events-none z-[999] transition-opacity duration-300 ease-out bg-white ${
            isFlashActive ? "opacity-85" : "opacity-0"
          }`}
        >
          {/* Subtle mobile screen capture border contraction effect */}
          <div
            className={`absolute inset-0 border-[6px] border-white/90 transition-transform duration-300 ease-out ${
              isFlashActive ? "scale-100" : "scale-[1.02]"
            }`}
          />
        </div>
      )}
    </div>
  );
};
