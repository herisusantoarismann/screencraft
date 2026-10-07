import {
    Copy,
    Download,
    Share2,
    FileText,
    Trash2,
    X,
    Check,
    Loader2,
    ShieldCheck,
    Cpu,
    Columns2,
    HelpCircle,
} from "lucide-react";
import type { CropArea } from "../../types/canvas";
import { IconButton } from "../atoms/IconButton";

export interface ExportActionGroupProps {
    isCopying: boolean;
    copySuccess: boolean;
    isDownloading?: boolean;
    downloadSuccess?: boolean;
    flowNodesCount: number;
    cropArea: CropArea | null;
    hasAnnotationsOrNodes: boolean;
    includeDiagnosticsStamp: boolean;
    onToggleDiagnosticsStamp: () => void;
    onOpenDiagnosticsModal: () => void;
    onCopy: () => void;
    onDownloadPNG: () => void;
    onOpenWebhookModal: () => void;
    onOpenMarkdownModal: () => void;
    onOpenComparisonModal?: () => void;
    onResetCropArea: () => void;
    onClearAnnotations: () => void;
    onCancelCapture: () => void;
    onOpenCheatsheet?: () => void;
    className?: string;
}

export const ExportActionGroup: React.FC<ExportActionGroupProps> = ({
    isCopying,
    copySuccess,
    isDownloading = false,
    downloadSuccess = false,
    flowNodesCount,
    cropArea,
    hasAnnotationsOrNodes,
    includeDiagnosticsStamp,
    onToggleDiagnosticsStamp,
    onOpenDiagnosticsModal,
    onCopy,
    onDownloadPNG,
    onOpenWebhookModal,
    onOpenMarkdownModal,
    onOpenComparisonModal,
    onResetCropArea,
    onClearAnnotations,
    onCancelCapture,
    onOpenCheatsheet,
    className = "",
}) => {
    const isBusy = isCopying || isDownloading;

    return (
        <div className={`flex items-center gap-1.5 ${className}`}>
            {/* 1. System & Device Specs Capsule (Context Banner & Hardware Inspector) */}
            <div className="flex items-center gap-0.5 p-0.5 bg-neutral-800/80 rounded-xl border border-neutral-700/60 shadow-inner">
                <button
                    type="button"
                    disabled={isBusy}
                    title={
                        includeDiagnosticsStamp
                            ? "Device & System Specs Banner: ON (Click to disable)"
                            : "Device & System Specs Banner: OFF (Click to enable)"
                    }
                    onClick={onToggleDiagnosticsStamp}
                    className={`relative p-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        includeDiagnosticsStamp
                            ? "bg-indigo-600/90 text-white shadow-sm shadow-indigo-600/40"
                            : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/60"
                    }`}
                >
                    <ShieldCheck
                        className={`w-3.5 h-3.5 ${
                            includeDiagnosticsStamp
                                ? "text-emerald-300"
                                : "text-neutral-400"
                        }`}
                    />
                    {includeDiagnosticsStamp && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    )}
                </button>

                <button
                    type="button"
                    disabled={isBusy}
                    title="View System & Hardware Specs Inspector"
                    onClick={onOpenDiagnosticsModal}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-purple-300 hover:bg-neutral-700/60 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                </button>
            </div>

            {/* 2. Primary Action: Copy to Clipboard */}
            <button
                type="button"
                title="Copy to Clipboard (Ctrl+C)"
                disabled={isBusy}
                onClick={onCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isCopying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : copySuccess ? (
                    <Check className="w-3.5 h-3.5" />
                ) : (
                    <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copySuccess ? "Copied!" : "Copy"}</span>
            </button>

            {/* 3. Secondary Actions: Save PNG & Share Webhook */}
            <div className="flex items-center gap-1">
                <IconButton
                    title={
                        isDownloading
                            ? "Downloading PNG..."
                            : downloadSuccess
                            ? "PNG Saved!"
                            : "Download PNG"
                    }
                    variant={downloadSuccess ? "success" : "secondary"}
                    disabled={isBusy}
                    onClick={onDownloadPNG}
                    icon={
                        isDownloading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-200" />
                        ) : downloadSuccess ? (
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                        ) : (
                            <Download className="w-3.5 h-3.5" />
                        )
                    }
                    className="p-1.5 rounded-xl"
                />

                <IconButton
                    title="Send to Discord / Slack Webhook"
                    variant="secondary"
                    disabled={isBusy}
                    onClick={onOpenWebhookModal}
                    icon={<Share2 className="w-3.5 h-3.5 text-indigo-400" />}
                    className="p-1.5 rounded-xl"
                />

                <IconButton
                    title={
                        flowNodesCount > 0
                            ? `Smart Report & Workflow Guide (${flowNodesCount} Steps)`
                            : "Smart Report & Documentation Generator"
                    }
                    variant={flowNodesCount > 0 ? "primary" : "secondary"}
                    disabled={isBusy}
                    onClick={onOpenMarkdownModal}
                    icon={<FileText className="w-3.5 h-3.5 text-purple-400" />}
                    badge={
                        flowNodesCount > 0 ? (
                            <span className="text-[10px] font-mono px-1 py-0.2 bg-purple-900/90 rounded font-bold">
                                {flowNodesCount}
                            </span>
                        ) : undefined
                    }
                    className="p-1.5 rounded-xl"
                />

                {onOpenComparisonModal && (
                    <IconButton
                        title="Design vs Screen Visual Diff (Mockup Comparison Slider)"
                        variant="secondary"
                        disabled={isBusy}
                        onClick={onOpenComparisonModal}
                        icon={<Columns2 className="w-3.5 h-3.5 text-pink-400" />}
                        className="p-1.5 rounded-xl"
                    />
                )}
            </div>

            {/* 4. Reset Crop Area Badge if active */}
            {cropArea && (
                <button
                    type="button"
                    title="Reset Crop Area"
                    disabled={isBusy}
                    onClick={onResetCropArea}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-blue-900/60 border border-blue-500/40 text-blue-200 hover:bg-blue-800/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span>
                        {Math.round(cropArea.width)}×
                        {Math.round(cropArea.height)}
                    </span>
                    <X className="w-3 h-3 text-blue-300" />
                </button>
            )}

            {/* 5. Clear Annotations */}
            {hasAnnotationsOrNodes && (
                <IconButton
                    title="Clear All Annotations & Flow"
                    variant="ghost"
                    size="sm"
                    disabled={isBusy}
                    onClick={onClearAnnotations}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-950/40 rounded-xl"
                />
            )}

            {/* 6. Cancel Screenshot */}
            <IconButton
                title="Cancel Screenshot (Back to Floating Bar - Esc)"
                variant="ghost"
                disabled={isBusy}
                onClick={onCancelCapture}
                icon={<X className="w-3.5 h-3.5" />}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl"
            />

            {/* 7. Shortcuts Cheatsheet */}
            {onOpenCheatsheet && (
                <IconButton
                    title="Shortcuts Cheatsheet (?)"
                    variant="ghost"
                    disabled={isBusy}
                    onClick={onOpenCheatsheet}
                    icon={<HelpCircle className="w-3.5 h-3.5 text-neutral-400 hover:text-indigo-300" />}
                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl"
                />
            )}
        </div>
    );
};
