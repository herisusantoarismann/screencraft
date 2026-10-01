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
} from "lucide-react";
import type { CropArea } from "../../types/canvas";
import { IconButton } from "../atoms/IconButton";

export interface ExportActionGroupProps {
    isCopying: boolean;
    copySuccess: boolean;
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
    onResetCropArea: () => void;
    onClearAnnotations: () => void;
    onCancelCapture: () => void;
    className?: string;
}

export const ExportActionGroup: React.FC<ExportActionGroupProps> = ({
    isCopying,
    copySuccess,
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
    onResetCropArea,
    onClearAnnotations,
    onCancelCapture,
    className = "",
}) => {
    return (
        <div className={`flex items-center gap-1.5 ${className}`}>
            {/* 1. QA Diagnostics Capsule (Stamp Watermark & Specs Inspector) */}
            <div className="flex items-center gap-0.5 p-0.5 bg-neutral-800/80 rounded-xl border border-neutral-700/60 shadow-inner">
                <button
                    type="button"
                    title={
                        includeDiagnosticsStamp
                            ? "Watermark Footer Specs Hardware: AKTIF (Klik untuk nonaktifkan)"
                            : "Watermark Footer Specs Hardware: NONAKTIF (Klik untuk aktifkan)"
                    }
                    onClick={onToggleDiagnosticsStamp}
                    className={`relative p-1.5 rounded-lg transition-all cursor-pointer ${
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
                    title="Lihat Detail Hardware Specs & Display DPI (QA)"
                    onClick={onOpenDiagnosticsModal}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-purple-300 hover:bg-neutral-700/60 transition-all cursor-pointer"
                >
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                </button>
            </div>

            {/* 2. Primary Action: Copy to Clipboard */}
            <button
                type="button"
                title="Salin ke Clipboard (Ctrl+C)"
                disabled={isCopying}
                onClick={onCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
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

            {/* 3. Secondary Actions: Save PNG & Share Webhook */}
            <div className="flex items-center gap-1">
                <IconButton
                    title="Download PNG"
                    variant="secondary"
                    onClick={onDownloadPNG}
                    icon={<Download className="w-3.5 h-3.5" />}
                    className="p-1.5 rounded-xl"
                />

                <IconButton
                    title="Kirim ke Discord / Slack Webhook"
                    variant="secondary"
                    onClick={onOpenWebhookModal}
                    icon={<Share2 className="w-3.5 h-3.5 text-indigo-400" />}
                    className="p-1.5 rounded-xl"
                />

                <IconButton
                    title={
                        flowNodesCount > 0
                            ? `Jira / GitHub Bug Ticket & Flow (${flowNodesCount} Steps)`
                            : "Jira / Linear / GitHub Issue Auto-Formatter"
                    }
                    variant={flowNodesCount > 0 ? "primary" : "secondary"}
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
            </div>

            {/* 4. Reset Crop Area Badge if active */}
            {cropArea && (
                <button
                    type="button"
                    title="Reset Crop Area"
                    onClick={onResetCropArea}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-blue-900/60 border border-blue-500/40 text-blue-200 hover:bg-blue-800/80 cursor-pointer"
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
                    title="Hapus Semua Anotasi & Flow"
                    variant="ghost"
                    size="sm"
                    onClick={onClearAnnotations}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-950/40 rounded-xl"
                />
            )}

            {/* 6. Cancel Screenshot */}
            <IconButton
                title="Batal Screenshot (Kembali ke Floating Bar - Esc)"
                variant="ghost"
                onClick={onCancelCapture}
                icon={<X className="w-3.5 h-3.5" />}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl"
            />
        </div>
    );
};
