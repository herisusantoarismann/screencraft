import React, { useState, useEffect, useRef, useCallback } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { invoke } from "@tauri-apps/api/core";
import { useToolStore, STAMP_PRESETS } from "../stores/toolStore";
import { useFlowStore } from "../stores/flowStore";
import { useRecordStore } from "../stores/recordStore";
import { useScreenCapture } from "../hooks/useScreenCapture";
import { useScreenRecorder } from "../hooks/useScreenRecorder";
import { extractTextFromArea } from "../services/ocrService";
import type {
    Annotation,
    CropArea,
    OcrArea,
    OcrModalState,
    EyedropperState,
    Point,
    StepBadgeAnnotation,
    StampAnnotation,
} from "../types/canvas";
import type { SystemDiagnostics } from "../types/diagnostics";
import {
    getSystemDiagnostics,
    attachDiagnosticsFooter,
} from "../services/diagnosticsService";
import { ScreenCraftTemplate } from "../components/templates";

export const CapturePage: React.FC = () => {
    const {
        activeTool,
        activeStamp,
        customStamp,
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
        width:
            typeof window !== "undefined" ? window.screen.width || 1920 : 1920,
        height:
            typeof window !== "undefined" ? window.screen.height || 1080 : 1080,
    });

    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [currentDrawing, setCurrentDrawing] = useState<Annotation | null>(
        null,
    );

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

    const [isMarkdownModalOpen, setIsMarkdownModalOpen] =
        useState<boolean>(false);
    const [isWebhookModalOpen, setIsWebhookModalOpen] =
        useState<boolean>(false);
    const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] =
        useState<boolean>(false);
    const [includeDiagnosticsStamp, setIncludeDiagnosticsStamp] =
        useState<boolean>(true);
    const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(
        null,
    );

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
                    width:
                        capturedImage.naturalWidth ||
                        capturedImage.width ||
                        window.innerWidth ||
                        window.screen.width ||
                        1920,
                    height:
                        capturedImage.naturalHeight ||
                        capturedImage.height ||
                        window.innerHeight ||
                        window.screen.height ||
                        1080,
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
    const [eyedropperData, setEyedropperData] =
        useState<EyedropperState | null>(null);
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

            // Automatically fetch environment & hardware diagnostics for QA inspection & watermark
            getSystemDiagnostics()
                .then((diag) => {
                    setDiagnostics(diag);
                })
                .catch((err) => {
                    console.error(
                        "[CapturePage] Failed to fetch system diagnostics:",
                        err,
                    );
                });
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
                    const imgX = Math.min(
                        Math.max(0, Math.floor(pos.x * scaleX)),
                        canvas.width - 1,
                    );
                    const imgY = Math.min(
                        Math.max(0, Math.floor(pos.y * scaleY)),
                        canvas.height - 1,
                    );
                    const pixel = ctx.getImageData(imgX, imgY, 1, 1).data;
                    const hex =
                        `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`.toUpperCase();

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

            // Handle QA Stamp (Severity Stamps & Issue Tags)
            if (activeTool === "stamp") {
                let preset: {
                    id: string;
                    label: string;
                    emoji: string;
                    badgeColor: string;
                    bgColor: string;
                };
                if (activeStamp === "custom") {
                    preset = {
                        id: "custom",
                        label: customStamp.label,
                        emoji: customStamp.emoji,
                        badgeColor: customStamp.badgeColor,
                        bgColor: customStamp.bgColor,
                    };
                } else {
                    preset =
                        STAMP_PRESETS.find((p) => p.id === activeStamp) ||
                        STAMP_PRESETS[0];
                }
                const displayText = `${preset.emoji}  ${preset.label}`;
                const pillWidth = Math.max(
                    90,
                    Math.round(displayText.length * 8.2) + 24,
                );
                const stampAnno: StampAnnotation = {
                    id: `stamp-${Date.now()}`,
                    type: "stamp",
                    x: Math.max(0, pos.x - Math.round(pillWidth / 2)),
                    y: Math.max(0, pos.y - 14),
                    stampId: preset.id,
                    label: preset.label,
                    emoji: preset.emoji,
                    badgeColor: preset.badgeColor,
                    bgColor: preset.bgColor,
                    strokeColor: preset.badgeColor,
                    strokeWidth: 1.5,
                };
                setAnnotations((prev) => [...prev, stampAnno]);
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
            } else if (activeTool === "blur") {
                setCurrentDrawing({
                    ...base,
                    type: "blur",
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
            activeStamp,
            customStamp,
            strokeColor,
            strokeWidth,
            stepCounter,
            incrementStepCounter,
            dimensions,
            setStrokeColor,
            addNode,
        ],
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
                const imgX = Math.min(
                    Math.max(0, Math.floor(pos.x * scaleX)),
                    canvas.width - 1,
                );
                const imgY = Math.min(
                    Math.max(0, Math.floor(pos.y * scaleY)),
                    canvas.height - 1,
                );

                const pixel = ctx.getImageData(imgX, imgY, 1, 1).data;
                const r = pixel[0];
                const g = pixel[1];
                const b = pixel[2];

                const hex =
                    `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`.toUpperCase();

                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                const isLight = brightness > 128;
                const textColor = isLight ? "#000000" : "#ffffff";
                const contrastStatus = isLight
                    ? "Kontras: Hitam"
                    : "Kontras: Putih";

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

            if (
                currentDrawing.type === "rect" ||
                currentDrawing.type === "blur"
            ) {
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
        ],
    );

    // Pointer Up Handler
    const handleMouseUp = useCallback(() => {
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
                        text:
                            text ||
                            "(Tidak ada teks yang dapat dikenali pada area seleksi)",
                        copied: Boolean(text),
                    });
                } catch (err) {
                    console.error("[CapturePage] OCR failed:", err);
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

        if (currentDrawing.type === "rect" || currentDrawing.type === "blur") {
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

    // Export helper: attach optional diagnostics watermark stamp if enabled
    const getFinalExportDataUrl = useCallback(async (): Promise<
        string | null
    > => {
        const rawUrl = generateExportDataUrl();
        if (!rawUrl) return null;

        if (includeDiagnosticsStamp && diagnostics) {
            try {
                return await attachDiagnosticsFooter(rawUrl, diagnostics);
            } catch (err) {
                console.error(
                    "[CapturePage] Failed to attach diagnostics footer:",
                    err,
                );
                return rawUrl;
            }
        }
        return rawUrl;
    }, [generateExportDataUrl, includeDiagnosticsStamp, diagnostics]);

    // Export: Copy to OS Clipboard via Rust native injection
    const handleCopyToClipboard = useCallback(async () => {
        const dataUrl = await getFinalExportDataUrl();
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
            console.error("[CapturePage] Copy to clipboard failed:", err);
        } finally {
            setIsCopying(false);
        }
    }, [getFinalExportDataUrl, closeOverlay]);

    // Export: Copy Screenshot Image to OS Clipboard without closing overlay (for QA modal workflow)
    const handleCopyScreenshotOnly = useCallback(async (): Promise<boolean> => {
        const dataUrl = await getFinalExportDataUrl();
        if (!dataUrl) return false;

        try {
            await invoke("copy_to_clipboard", { base64Png: dataUrl });
            return true;
        } catch (err) {
            console.error("[CapturePage] Copy screenshot image failed:", err);
            return false;
        }
    }, [getFinalExportDataUrl]);

    // Export: Download PNG locally
    const handleDownloadPNG = useCallback(async () => {
        const dataUrl = await getFinalExportDataUrl();
        if (!dataUrl) return;

        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `screencraft-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [getFinalExportDataUrl]);

    // Full cancellation of screenshot session returning cleanly to standby floating bar
    const handleFullCancelCapture = useCallback(async () => {
        setActiveTool("select");
        setCropArea(null);
        setOcrArea(null);
        setAnnotations([]);
        setCurrentDrawing(null);
        setOcrModal({ isOpen: false, text: "", copied: false });
        setIsMarkdownModalOpen(false);
        setIsWebhookModalOpen(false);
        setIsDiagnosticsModalOpen(false);
        setActiveNodeId(null);
        resetStepCounter();
        resetFlow();
        await cancelCapture();
    }, [
        cancelCapture,
        resetStepCounter,
        resetFlow,
        setActiveTool,
        setActiveNodeId,
    ]);

    // Hierarchical Escape key handler when screenshot is active
    useEffect(() => {
        if (!capturedImage) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;

            event.preventDefault();
            event.stopPropagation();

            // 1. Priority 1: Modals and Popovers
            if (ocrModal.isOpen) {
                setOcrModal({ isOpen: false, text: "", copied: false });
                return;
            }
            if (isMarkdownModalOpen) {
                setIsMarkdownModalOpen(false);
                return;
            }
            if (isWebhookModalOpen) {
                setIsWebhookModalOpen(false);
                return;
            }
            if (isDiagnosticsModalOpen) {
                setIsDiagnosticsModalOpen(false);
                return;
            }
            if (activeNodeId) {
                setActiveNodeId(null);
                return;
            }

            // 2. Priority 2: Active Selections (Crop Box or OCR Box)
            if (cropArea) {
                setCropArea(null);
                return;
            }
            if (ocrArea) {
                setOcrArea(null);
                return;
            }

            // 3. Priority 3: Active Tools other than "select" (e.g. crop, ocr, ruler, flowBuilder)
            if (activeTool !== "select") {
                setActiveTool("select");
                return;
            }

            // 4. Priority 4: In base select mode with no active tool/modal -> cancel screenshot
            void handleFullCancelCapture();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [
        capturedImage,
        ocrModal.isOpen,
        isMarkdownModalOpen,
        isWebhookModalOpen,
        isDiagnosticsModalOpen,
        activeNodeId,
        cropArea,
        ocrArea,
        activeTool,
        setActiveTool,
        setActiveNodeId,
        handleFullCancelCapture,
    ]);

    return (
        <ScreenCraftTemplate
            isRecording={isRecording}
            recordingDuration={recordingDuration}
            isCapturing={isCapturing}
            isTransitioning={isTransitioning}
            isPreparingRecord={isPreparingRecord}
            isPreviewOpen={isPreviewOpen}
            capturedImage={capturedImage}
            dimensions={dimensions}
            containerRef={containerRef}
            activeTool={activeTool}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            stepCounter={stepCounter}
            spotlightRadius={spotlightRadius}
            setSpotlightRadius={setSpotlightRadius}
            annotations={annotations}
            currentDrawing={currentDrawing}
            cropArea={cropArea}
            ocrArea={ocrArea}
            stageRef={stageRef}
            cropLayerRef={cropLayerRef}
            ocrLayerRef={ocrLayerRef}
            eyedropperData={eyedropperData}
            eyedropperToast={eyedropperToast}
            error={error}
            flowNodes={nodes}
            activeNode={activeNode}
            isMarkdownModalOpen={isMarkdownModalOpen}
            ocrModal={ocrModal}
            isOcrProcessing={isOcrProcessing}
            isWebhookModalOpen={isWebhookModalOpen}
            isDiagnosticsModalOpen={isDiagnosticsModalOpen}
            includeDiagnosticsStamp={includeDiagnosticsStamp}
            diagnostics={diagnostics}
            ripples={ripples}
            showShutterFlash={showShutterFlash}
            isFlashActive={isFlashActive}
            isCopying={isCopying}
            copySuccess={copySuccess}
            onTriggerScreenshot={() => void triggerScreenshot()}
            onStartRecording={() => void startRecording()}
            onStopRecording={() => void stopRecording()}
            onCloseOverlay={() => void closeOverlay()}
            onSelectTool={setActiveTool}
            onSelectColor={setStrokeColor}
            onCopy={() => void handleCopyToClipboard()}
            onDownloadPNG={handleDownloadPNG}
            onOpenWebhookModal={setIsWebhookModalOpen}
            onOpenMarkdownModal={setIsMarkdownModalOpen}
            onOpenDiagnosticsModal={setIsDiagnosticsModalOpen}
            onToggleDiagnosticsStamp={() =>
                setIncludeDiagnosticsStamp((prev) => !prev)
            }
            onResetCropArea={() => setCropArea(null)}
            onClearAnnotations={clearAnnotations}
            onCancelCapture={() => void handleFullCancelCapture()}
            onCaptureScreenRetry={() => void captureScreen()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onUpdateNodePosition={updateNodePosition}
            onSelectNode={setActiveNodeId}
            onCloseActiveNode={() => setActiveNodeId(null)}
            onUpdateNodeText={updateNodeText}
            onDeleteNode={deleteNode}
            onCloseOcrModal={() =>
                setOcrModal({ isOpen: false, text: "", copied: false })
            }
            onCopyOcrAgain={(text) => {
                void navigator.clipboard.writeText(text);
                setOcrModal((prev) => ({ ...prev, copied: true }));
            }}
            onCopyToClipboardWithImage={handleCopyToClipboard}
            onCopyScreenshotOnly={handleCopyScreenshotOnly}
            onGetImageDataUrlOrBlob={async () => {
                const url = await getFinalExportDataUrl();
                return url || "";
            }}
        />
    );
};
