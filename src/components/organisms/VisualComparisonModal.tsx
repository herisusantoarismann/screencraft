import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Layers,
    ArrowLeftRight,
    Sparkles,
    Upload,
    Download,
    Copy,
    Check,
    X,
    RotateCcw,
    Maximize2,
    Minimize2,
    Loader2,
    Columns2,
    Zap,
    Move,
} from "lucide-react";

import { saveFileWithDialog } from "../../services/fileSaveService";

export type ComparisonMode = "slider" | "overlay" | "difference" | "sideBySide";

export interface VisualComparisonModalProps {
    isOpen: boolean;
    capturedImage: HTMLImageElement | null;
    onClose: () => void;
    getImageDataUrlOrBlob?: () => Promise<string | Blob>;
}

export const VisualComparisonModal: React.FC<VisualComparisonModalProps> = ({
    isOpen,
    capturedImage,
    onClose,
    getImageDataUrlOrBlob,
}) => {
    // Modal display states
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [comparisonMode, setComparisonMode] =
        useState<ComparisonMode>("slider");

    // Comparison & Alignment states
    const [mockupImage, setMockupImage] = useState<HTMLImageElement | null>(
        null,
    );
    const [mockupDataUrl, setMockupDataUrl] = useState<string | null>(null);
    const [mockupDimensions, setMockupDimensions] = useState<{
        width: number;
        height: number;
    } | null>(null);

    // Live screenshot data
    const [liveDataUrl, setLiveDataUrl] = useState<string | null>(null);
    const [liveDimensions, setLiveDimensions] = useState<{
        width: number;
        height: number;
    } | null>(null);

    // Slider & Opacity
    const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0 - 100
    const [overlayOpacity, setOverlayOpacity] = useState<number>(50); // percentage 0 - 100
    const [isSwapped, setIsSwapped] = useState<boolean>(false); // Left vs Right in slider
    const [isFlickering, setIsFlickering] = useState<boolean>(false); // Auto blink 500ms
    const [flickerState, setFlickerState] = useState<boolean>(false);

    // Alignment offsets (pan & scale)
    const [offsetX, setOffsetX] = useState<number>(0);
    const [offsetY, setOffsetY] = useState<number>(0);
    const [scale, setScale] = useState<number>(100); // percentage 50 - 200

    // Dragging slider or mockup alignment
    const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
    const [isDraggingMockup, setIsDraggingMockup] = useState<boolean>(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number }>({
        x: 0,
        y: 0,
    });

    // Status feedback
    const [isCopying, setIsCopying] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 1. Initialize live screenshot image
    useEffect(() => {
        if (!isOpen) return;

        if (capturedImage) {
            setLiveDimensions({
                width:
                    capturedImage.naturalWidth || capturedImage.width || 1920,
                height:
                    capturedImage.naturalHeight || capturedImage.height || 1080,
            });
            setLiveDataUrl(capturedImage.src);
        } else if (getImageDataUrlOrBlob) {
            void (async () => {
                try {
                    const res = await getImageDataUrlOrBlob();
                    if (typeof res === "string") {
                        setLiveDataUrl(res);
                        const img = new Image();
                        img.onload = () => {
                            setLiveDimensions({
                                width: img.naturalWidth,
                                height: img.naturalHeight,
                            });
                        };
                        img.src = res;
                    }
                } catch (err) {
                    console.error(
                        "Failed to load live screenshot for comparison:",
                        err,
                    );
                }
            })();
        }
    }, [isOpen, capturedImage, getImageDataUrlOrBlob]);

    // 2. Global clipboard paste handler (Ctrl+V directly imports mockup from Figma)
    useEffect(() => {
        if (!isOpen) return;

        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.indexOf("image") !== -1) {
                    const blob = item.getAsFile();
                    if (blob) {
                        loadMockupFromBlob(blob);
                        setStatusMessage(
                            "Figma mockup pasted from clipboard! 📋",
                        );
                        setTimeout(() => setStatusMessage(null), 3000);
                        break;
                    }
                }
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [isOpen]);

    // 3. Flicker timer
    useEffect(() => {
        if (!isFlickering) return;
        const interval = setInterval(() => {
            setFlickerState((prev) => !prev);
        }, 450);
        return () => clearInterval(interval);
    }, [isFlickering]);

    // Helper to load mockup from Blob/File
    const loadMockupFromBlob = (file: Blob) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (!dataUrl) return;

            setMockupDataUrl(dataUrl);
            const img = new Image();
            img.onload = () => {
                setMockupImage(img);
                setMockupDimensions({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                });
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            loadMockupFromBlob(file);
            setStatusMessage("Mockup loaded successfully! 🎨");
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    // Keyboard nudge with Arrow keys
    useEffect(() => {
        if (!isOpen || !mockupImage) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is focusing an input
            if (
                ["INPUT", "TEXTAREA"].includes(
                    (e.target as HTMLElement)?.tagName,
                )
            )
                return;

            const step = e.shiftKey ? 10 : 1;
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                setOffsetX((prev) => prev - step);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setOffsetX((prev) => prev + step);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setOffsetY((prev) => prev - step);
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setOffsetY((prev) => prev + step);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, mockupImage]);

    // Mouse drag handler for Slider & Mockup repositioning
    const handleMouseDownOnSlider = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingSlider(true);
    };

    const handleMouseDownOnViewport = (e: React.MouseEvent) => {
        if (e.button === 0 && (e.altKey || comparisonMode !== "slider")) {
            e.preventDefault();
            setIsDraggingMockup(true);
            setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
        }
    };

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (isDraggingSlider && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
                setSliderPosition(Math.round(pct * 10) / 10);
            } else if (isDraggingMockup) {
                setOffsetX(e.clientX - dragStart.x);
                setOffsetY(e.clientY - dragStart.y);
            }
        },
        [isDraggingSlider, isDraggingMockup, dragStart],
    );

    const handleMouseUp = useCallback(() => {
        setIsDraggingSlider(false);
        setIsDraggingMockup(false);
    }, []);

    // Fit mockup width to live width
    const handleAutoFitWidth = () => {
        if (!liveDimensions || !mockupDimensions) return;
        const targetScale = Math.round(
            (liveDimensions.width / mockupDimensions.width) * 100,
        );
        setScale(targetScale);
        setOffsetX(0);
        setOffsetY(0);
        setStatusMessage(`Skala disesuaikan: ${targetScale}%`);
        setTimeout(() => setStatusMessage(null), 2000);
    };

    const handleResetAlignment = () => {
        setOffsetX(0);
        setOffsetY(0);
        setScale(100);
        setSliderPosition(50);
        setOverlayOpacity(50);
    };

    // Generate composite Canvas snapshot of the comparison
    const generateComparisonCanvas =
        async (): Promise<HTMLCanvasElement | null> => {
            if (!liveDataUrl || !mockupDataUrl) return null;

            const canvas = document.createElement("canvas");
            const width = liveDimensions?.width || 1920;
            const height = liveDimensions?.height || 1080;
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) return null;

            // Load both images as HTMLImageElement
            const imgLive = new Image();
            imgLive.crossOrigin = "anonymous";
            await new Promise((res) => {
                imgLive.onload = res;
                imgLive.src = liveDataUrl;
            });

            const imgMockup = new Image();
            imgMockup.crossOrigin = "anonymous";
            await new Promise((res) => {
                imgMockup.onload = res;
                imgMockup.src = mockupDataUrl;
            });

            const mockupScaledWidth = (imgMockup.naturalWidth * scale) / 100;
            const mockupScaledHeight = (imgMockup.naturalHeight * scale) / 100;

            if (comparisonMode === "slider") {
                const splitX = (width * sliderPosition) / 100;

                if (!isSwapped) {
                    // Left: Mockup, Right: Live
                    // Draw Mockup on left
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0, 0, splitX, height);
                    ctx.clip();
                    ctx.drawImage(
                        imgMockup,
                        offsetX,
                        offsetY,
                        mockupScaledWidth,
                        mockupScaledHeight,
                    );
                    ctx.restore();

                    // Draw Live on right
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(splitX, 0, width - splitX, height);
                    ctx.clip();
                    ctx.drawImage(imgLive, 0, 0, width, height);
                    ctx.restore();
                } else {
                    // Left: Live, Right: Mockup
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0, 0, splitX, height);
                    ctx.clip();
                    ctx.drawImage(imgLive, 0, 0, width, height);
                    ctx.restore();

                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(splitX, 0, width - splitX, height);
                    ctx.clip();
                    ctx.drawImage(
                        imgMockup,
                        offsetX,
                        offsetY,
                        mockupScaledWidth,
                        mockupScaledHeight,
                    );
                    ctx.restore();
                }

                // Draw subtle divider line
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(splitX, 0);
                ctx.lineTo(splitX, height);
                ctx.stroke();
            } else if (comparisonMode === "overlay") {
                // Draw live
                ctx.drawImage(imgLive, 0, 0, width, height);
                // Draw mockup with opacity
                ctx.globalAlpha = overlayOpacity / 100;
                ctx.drawImage(
                    imgMockup,
                    offsetX,
                    offsetY,
                    mockupScaledWidth,
                    mockupScaledHeight,
                );
            } else if (comparisonMode === "difference") {
                // Draw live
                ctx.drawImage(imgLive, 0, 0, width, height);
                // Composite difference
                ctx.globalCompositeOperation = "difference";
                ctx.drawImage(
                    imgMockup,
                    offsetX,
                    offsetY,
                    mockupScaledWidth,
                    mockupScaledHeight,
                );
            } else if (comparisonMode === "sideBySide") {
                // Expand canvas width for side-by-side
                canvas.width = width * 2;
                ctx.drawImage(imgMockup, 0, 0, width, height);
                ctx.drawImage(imgLive, width, 0, width, height);
            }

            return canvas;
        };

    // Copy snapshot to clipboard
    const handleCopyDiffImage = async () => {
        setIsCopying(true);
        try {
            const canvas = await generateComparisonCanvas();
            if (!canvas) throw new Error("Failed to render comparison canvas.");

            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error("Failed to generate image blob.");
                await navigator.clipboard.write([
                    new ClipboardItem({ "image/png": blob }),
                ]);
                setStatusMessage(
                    "Comparison image copied to clipboard! 📋",
                );
                setIsCopying(false);
                setTimeout(() => setStatusMessage(null), 3000);
            }, "image/png");
        } catch (err) {
            console.error("Failed to copy diff image:", err);
            setStatusMessage("Failed to copy comparison image.");
            setIsCopying(false);
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    // Download snapshot as PNG via native Save As dialog
    const handleDownloadDiffImage = async () => {
        setIsDownloading(true);
        try {
            const canvas = await generateComparisonCanvas();
            if (!canvas) throw new Error("Failed to render comparison canvas.");

            const dataUrl = canvas.toDataURL("image/png");
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);
            const timeStr = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
            const targetName = `slicing-diff-${dateStr}_${timeStr}.png`;

            const res = await saveFileWithDialog({
                defaultName: targetName,
                data: dataUrl,
                filterName: "PNG Image",
                filterExtension: "png",
            });

            if (res.canceled) return;

            setStatusMessage(`Comparison image (${res.fileName || targetName}) saved successfully! 🎉`);
        } catch (err) {
            console.error("Failed to download diff image:", err);
            setStatusMessage("Failed to save comparison image.");
        } finally {
            setIsDownloading(false);
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-md z-50 p-2 sm:p-4 select-none animate-in fade-in duration-150"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            <div
                className={`w-full bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white transition-all ${
                    isFullscreen
                        ? "h-full max-w-full"
                        : "max-w-6xl max-h-[94vh] h-[88vh]"
                }`}
            >
                {/* 1. Modal Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-950/70 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-pink-500/20 text-pink-400 rounded-xl border border-pink-500/30">
                            <Columns2 className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-neutral-100">
                                    Figma vs Live Comparison
                                </span>
                                <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-pink-950/80 text-pink-300 border border-pink-500/30">
                                    UI/UX Slicing QA
                                </span>
                                <span className="font-bold text-sm text-neutral-100">
                                    (BETA)
                                </span>
                            </div>
                            <p className="text-[11px] text-neutral-400">
                                Inspeksi presisi margin, padding, font, dan
                                alignment slicing web terhadap desain mockup
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                            title={
                                isFullscreen
                                    ? "Keluar Fullscreen"
                                    : "Fullscreen"
                            }
                        >
                            {isFullscreen ? (
                                <Minimize2 className="w-4 h-4" />
                            ) : (
                                <Maximize2 className="w-4 h-4" />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 2. Controls Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-b border-neutral-800 bg-neutral-900/90 text-xs shrink-0">
                    {/* Comparison Mode Tabs */}
                    <div className="flex items-center gap-1 bg-neutral-950/80 p-0.5 rounded-xl border border-neutral-800">
                        <button
                            type="button"
                            onClick={() => setComparisonMode("slider")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                                comparisonMode === "slider"
                                    ? "bg-pink-600 text-white shadow-xs"
                                    : "text-neutral-400 hover:text-white"
                            }`}
                        >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>Diff Slider</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setComparisonMode("overlay")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                                comparisonMode === "overlay"
                                    ? "bg-pink-600 text-white shadow-xs"
                                    : "text-neutral-400 hover:text-white"
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Overlay Opacity</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setComparisonMode("difference")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                                comparisonMode === "difference"
                                    ? "bg-pink-600 text-white shadow-xs"
                                    : "text-neutral-400 hover:text-white"
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Pixel Diff</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setComparisonMode("sideBySide")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                                comparisonMode === "sideBySide"
                                    ? "bg-pink-600 text-white shadow-xs"
                                    : "text-neutral-400 hover:text-white"
                            }`}
                        >
                            <Columns2 className="w-3.5 h-3.5" />
                            <span>Side-by-Side</span>
                        </button>
                    </div>

                    {/* Mode-Specific Sliders & Controls */}
                    {mockupImage && (
                        <div className="flex items-center gap-3">
                            {comparisonMode === "slider" && (
                                <div className="flex items-center gap-2 bg-neutral-950/60 px-3 py-1 rounded-xl border border-neutral-800">
                                    <span className="text-[11px] text-neutral-400">
                                        Posisi:
                                    </span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={sliderPosition}
                                        onChange={(e) =>
                                            setSliderPosition(
                                                Number(e.target.value),
                                            )
                                        }
                                        className="w-24 sm:w-32 accent-pink-500 cursor-pointer"
                                    />
                                    <span className="font-mono text-pink-400 font-bold w-9 text-right text-xs">
                                        {Math.round(sliderPosition)}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsSwapped(!isSwapped)}
                                        className="p-1 rounded-md hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                                        title="Tukar Posisi Sisi (Kiri/Kanan)"
                                    >
                                        <ArrowLeftRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {comparisonMode === "overlay" && (
                                <div className="flex items-center gap-2 bg-neutral-950/60 px-3 py-1 rounded-xl border border-neutral-800">
                                    <span className="text-[11px] text-neutral-400">
                                        Opacity:
                                    </span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={overlayOpacity}
                                        onChange={(e) =>
                                            setOverlayOpacity(
                                                Number(e.target.value),
                                            )
                                        }
                                        className="w-24 sm:w-32 accent-pink-500 cursor-pointer"
                                    />
                                    <span className="font-mono text-pink-400 font-bold w-9 text-right text-xs">
                                        {overlayOpacity}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsFlickering(!isFlickering)
                                        }
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                            isFlickering
                                                ? "bg-amber-500 text-black font-bold animate-pulse"
                                                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                                        }`}
                                        title="Auto-blink comparison to detect 1px shift"
                                    >
                                        <Zap className="w-3 h-3" />
                                        <span>Flicker</span>
                                    </button>
                                </div>
                            )}

                            {/* Calibration / Alignment Controls */}
                            <div className="flex items-center gap-1.5 bg-neutral-950/60 px-2.5 py-1 rounded-xl border border-neutral-800">
                                <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                                    <Move className="w-3 h-3 text-neutral-400" />
                                    <span className="font-mono text-neutral-300">
                                        X:{offsetX} Y:{offsetY}
                                    </span>
                                </span>

                                <div className="flex items-center gap-0.5 ml-1">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOffsetX((prev) => prev - 1)
                                        }
                                        className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-mono cursor-pointer"
                                        title="Nudge Left 1px (ArrowLeft)"
                                    >
                                        ◀
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOffsetX((prev) => prev + 1)
                                        }
                                        className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-mono cursor-pointer"
                                        title="Nudge Right 1px (ArrowRight)"
                                    >
                                        ▶
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOffsetY((prev) => prev - 1)
                                        }
                                        className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-mono cursor-pointer"
                                        title="Nudge Up 1px (ArrowUp)"
                                    >
                                        ▲
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOffsetY((prev) => prev + 1)
                                        }
                                        className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-mono cursor-pointer"
                                        title="Nudge Down 1px (ArrowDown)"
                                    >
                                        ▼
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAutoFitWidth}
                                    className="ml-1 px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] transition-colors cursor-pointer"
                                    title="Fit mockup width to screenshot width"
                                >
                                    Fit Width
                                </button>

                                <button
                                    type="button"
                                    onClick={handleResetAlignment}
                                    className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors cursor-pointer"
                                    title="Reset Position & Scale"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Change / Upload Mockup File button */}
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileInputChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold transition-colors cursor-pointer"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                                {mockupImage
                                    ? "Change Figma Mockup"
                                    : "Select Mockup File"}
                            </span>
                        </button>
                    </div>
                </div>

                {/* 3. Main Comparison Viewport / Dropzone */}
                <div className="flex-1 bg-neutral-950 p-4 overflow-auto flex items-center justify-center relative select-none">
                    {!mockupImage ? (
                        /* Upload & Paste Dropzone State */
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const file = e.dataTransfer.files?.[0];
                                if (file) loadMockupFromBlob(file);
                            }}
                            className="max-w-md w-full p-8 border-2 border-dashed border-pink-500/40 hover:border-pink-500 rounded-3xl bg-pink-950/10 hover:bg-pink-950/20 text-center flex flex-col items-center gap-3 cursor-pointer transition-all animate-in zoom-in-95 duration-200"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-lg shadow-pink-500/10">
                                <Upload className="w-8 h-8" />
                            </div>

                            <div>
                                <h4 className="font-bold text-base text-neutral-100 mb-1">
                                    Import Design Mockup (Figma)
                                </h4>
                                <p className="text-xs text-neutral-400 leading-relaxed">
                                    Drag & drop an image file (.png, .jpg) here,
                                    click to browse, or{" "}
                                    <strong className="text-pink-300">
                                        press Ctrl + V
                                    </strong>{" "}
                                    to paste directly from clipboard.
                                </p>
                            </div>

                            <div className="p-2 bg-neutral-900/90 border border-neutral-800 rounded-xl text-[11px] text-neutral-300 flex items-center gap-1.5 mt-2">
                                <span className="font-semibold text-pink-400">
                                    💡 QA Tip:
                                </span>
                                <span>
                                    In Figma, select your frame, press Ctrl +
                                    Shift + C (Copy as PNG), then press Ctrl + V
                                    here!
                                </span>
                            </div>
                        </div>
                    ) : (
                        /* Active Comparison Canvas Container */
                        <div
                            ref={containerRef}
                            onMouseDown={handleMouseDownOnViewport}
                            className="relative max-w-full max-h-full overflow-hidden shadow-2xl rounded-xl border border-neutral-800 cursor-crosshair"
                            style={{
                                width: liveDimensions
                                    ? `${liveDimensions.width}px`
                                    : "100%",
                                height: liveDimensions
                                    ? `${liveDimensions.height}px`
                                    : "auto",
                            }}
                        >
                            {/* Layer A: Base Live Screenshot */}
                            {liveDataUrl && (
                                <img
                                    src={liveDataUrl}
                                    alt="Live Screenshot"
                                    className="w-full h-full object-contain pointer-events-none select-none block"
                                    draggable={false}
                                />
                            )}

                            {/* Layer B: Mockup Image with comparison modes */}
                            {mockupDataUrl && (
                                <>
                                    {/* Mode 1: Diff Slider */}
                                    {comparisonMode === "slider" && (
                                        <div
                                            className="absolute inset-0 overflow-hidden pointer-events-none select-none"
                                            style={{
                                                width: `${sliderPosition}%`,
                                                borderRight:
                                                    "2px solid #ec4899",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: liveDimensions
                                                        ? `${liveDimensions.width}px`
                                                        : "100%",
                                                    height: liveDimensions
                                                        ? `${liveDimensions.height}px`
                                                        : "100%",
                                                    transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale / 100})`,
                                                    transformOrigin: "top left",
                                                }}
                                            >
                                                <img
                                                    src={
                                                        !isSwapped
                                                            ? mockupDataUrl
                                                            : liveDataUrl || ""
                                                    }
                                                    alt="Comparison Layer"
                                                    className="w-full h-full object-contain pointer-events-none select-none block"
                                                    draggable={false}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Mode 2: Overlay Opacity */}
                                    {comparisonMode === "overlay" && (
                                        <div
                                            className="absolute inset-0 pointer-events-none select-none"
                                            style={{
                                                opacity: isFlickering
                                                    ? flickerState
                                                        ? 1
                                                        : 0
                                                    : overlayOpacity / 100,
                                                transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale / 100})`,
                                                transformOrigin: "top left",
                                                transition: isFlickering
                                                    ? "opacity 0.05s ease"
                                                    : "none",
                                            }}
                                        >
                                            <img
                                                src={mockupDataUrl}
                                                alt="Figma Mockup Overlay"
                                                className="w-full h-full object-contain pointer-events-none select-none block"
                                                draggable={false}
                                            />
                                        </div>
                                    )}

                                    {/* Mode 3: Pixel Difference Blend Mode */}
                                    {comparisonMode === "difference" && (
                                        <div
                                            className="absolute inset-0 pointer-events-none select-none"
                                            style={{
                                                mixBlendMode: "difference",
                                                transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale / 100})`,
                                                transformOrigin: "top left",
                                            }}
                                        >
                                            <img
                                                src={mockupDataUrl}
                                                alt="Pixel Difference Layer"
                                                className="w-full h-full object-contain pointer-events-none select-none block"
                                                draggable={false}
                                            />
                                        </div>
                                    )}

                                    {/* Mode 4: Side-by-Side Dual View */}
                                    {comparisonMode === "sideBySide" && (
                                        <div className="absolute inset-0 grid grid-cols-2 pointer-events-none select-none bg-neutral-950">
                                            <div className="relative border-r border-neutral-800 p-2 overflow-hidden flex items-center justify-center">
                                                <span className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-pink-950/80 text-pink-300 border border-pink-500/40 rounded text-[10px] font-bold">
                                                    📐 Figma Mockup
                                                </span>
                                                <img
                                                    src={mockupDataUrl}
                                                    alt="Figma Mockup"
                                                    className="w-full h-full object-contain pointer-events-none"
                                                    draggable={false}
                                                />
                                            </div>
                                            <div className="relative p-2 overflow-hidden flex items-center justify-center">
                                                <span className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-blue-950/80 text-blue-300 border border-blue-500/40 rounded text-[10px] font-bold">
                                                    🌐 Live Web Slicing
                                                </span>
                                                <img
                                                    src={liveDataUrl || ""}
                                                    alt="Live Screenshot"
                                                    className="w-full h-full object-contain pointer-events-none"
                                                    draggable={false}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Slider Handle in Slider Mode */}
                            {comparisonMode === "slider" && (
                                <div
                                    onMouseDown={handleMouseDownOnSlider}
                                    className="absolute top-0 bottom-0 z-30 cursor-ew-resize flex items-center justify-center"
                                    style={{
                                        left: `${sliderPosition}%`,
                                        transform: "translateX(-50%)",
                                    }}
                                >
                                    <div className="w-8 h-8 rounded-full bg-pink-600 text-white shadow-xl shadow-pink-600/50 border-2 border-white flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-ew-resize">
                                        <ArrowLeftRight className="w-4 h-4" />
                                    </div>
                                </div>
                            )}

                            {/* Watermark Badges on corners */}
                            {comparisonMode === "slider" && (
                                <>
                                    <div className="absolute top-3 left-3 z-20 pointer-events-none bg-neutral-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-700 text-[11px] font-semibold text-pink-300">
                                        {!isSwapped
                                            ? "📐 Figma Mockup"
                                            : "🌐 Live Screenshot"}
                                    </div>
                                    <div className="absolute top-3 right-3 z-20 pointer-events-none bg-neutral-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-700 text-[11px] font-semibold text-sky-300">
                                        {!isSwapped
                                            ? "🌐 Live Screenshot"
                                            : "📐 Figma Mockup"}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* 4. Modal Footer: Info & Export Actions */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-neutral-800 bg-neutral-950/80 shrink-0 text-xs">
                    {/* Left: Resolution & Diagnostics Info */}
                    <div className="flex items-center gap-3 text-neutral-400">
                        {liveDimensions && (
                            <span className="flex items-center gap-1 font-mono">
                                <span className="text-neutral-500">Live:</span>
                                <span className="text-neutral-300">
                                    {liveDimensions.width}×
                                    {liveDimensions.height}px
                                </span>
                            </span>
                        )}
                        {mockupDimensions && (
                            <span className="flex items-center gap-1 font-mono">
                                <span className="text-neutral-500">Figma:</span>
                                <span className="text-pink-300">
                                    {mockupDimensions.width}×
                                    {mockupDimensions.height}px
                                </span>
                            </span>
                        )}

                        {statusMessage && (
                            <span className="text-emerald-400 font-medium animate-in fade-in flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                <span>{statusMessage}</span>
                            </span>
                        )}
                    </div>

                    {/* Right: Export Snapshot Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={
                                !mockupImage || isCopying || isDownloading
                            }
                            onClick={() => void handleDownloadDiffImage()}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isDownloading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Downloading...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download Diff (.png)</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            disabled={
                                !mockupImage || isCopying || isDownloading
                            }
                            onClick={() => void handleCopyDiffImage()}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold bg-pink-600 hover:bg-pink-500 text-white transition-all shadow-md shadow-pink-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isCopying ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Copying Image...</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy Diff Image</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
