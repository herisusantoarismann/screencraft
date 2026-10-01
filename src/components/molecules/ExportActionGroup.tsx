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
      {/* Diagnostics Watermark Stamp Toggle */}
      <IconButton
        title={
          includeDiagnosticsStamp
            ? "Watermark Footer Specs Hardware Aktif (Klik untuk nonaktifkan)"
            : "Aktifkan Watermark Footer Specs Hardware (Pilar 1)"
        }
        variant={includeDiagnosticsStamp ? "primary" : "secondary"}
        onClick={onToggleDiagnosticsStamp}
        icon={
          <ShieldCheck
            className={`w-3.5 h-3.5 ${
              includeDiagnosticsStamp ? "text-emerald-300" : "text-neutral-400"
            }`}
          />
        }
        label="Stamp"
        className={
          includeDiagnosticsStamp
            ? "bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-400/50 shadow-md shadow-indigo-600/25"
            : ""
        }
      />

      {/* Diagnostics Hardware Specs Inspector Modal */}
      <IconButton
        title="Lihat Detail Hardware Specs & Display DPI (QA)"
        variant="secondary"
        onClick={onOpenDiagnosticsModal}
        icon={<Cpu className="w-3.5 h-3.5 text-purple-400" />}
        label="Specs"
      />

      {/* Copy to Clipboard */}
      <IconButton
        title="Salin ke Clipboard"
        variant="success"
        disabled={isCopying}
        onClick={onCopy}
        icon={
          isCopying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : copySuccess ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )
        }
        label={copySuccess ? "Tersalin!" : "Copy"}
        className="px-3 py-1.5"
      />

      {/* Download PNG */}
      <IconButton
        title="Download PNG"
        variant="secondary"
        onClick={onDownloadPNG}
        icon={<Download className="w-3.5 h-3.5" />}
        label="Save"
      />

      {/* Share to Webhook */}
      <IconButton
        title="Kirim ke Discord / Slack Webhook"
        variant="secondary"
        onClick={onOpenWebhookModal}
        icon={<Share2 className="w-3.5 h-3.5 text-indigo-400" />}
        label="Share"
      />

      {/* View & Export Markdown */}
      {flowNodesCount > 0 && (
        <IconButton
          title={`Buka Dokumentasi Markdown (${flowNodesCount} Steps)`}
          variant="primary"
          onClick={onOpenMarkdownModal}
          icon={<FileText className="w-3.5 h-3.5" />}
          label="Markdown"
          badge={
            <span className="text-[10px] font-mono px-1 py-0.2 bg-purple-900/90 rounded font-bold">
              {flowNodesCount}
            </span>
          }
          className="px-3 py-1.5"
        />
      )}

      {/* Reset Crop Area Badge if active */}
      {cropArea && (
        <button
          type="button"
          title="Reset Crop Area"
          onClick={onResetCropArea}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-blue-900/60 border border-blue-500/40 text-blue-200 hover:bg-blue-800/80 cursor-pointer"
        >
          <span>
            {Math.round(cropArea.width)}×{Math.round(cropArea.height)}
          </span>
          <X className="w-3 h-3 text-blue-300" />
        </button>
      )}

      {/* Clear Annotations */}
      {hasAnnotationsOrNodes && (
        <IconButton
          title="Hapus Semua Anotasi & Flow"
          variant="ghost"
          size="sm"
          onClick={onClearAnnotations}
          icon={<Trash2 className="w-4 h-4" />}
          className="hover:text-red-400"
        />
      )}

      {/* Cancel Screenshot */}
      <IconButton
        title="Batal Screenshot (Kembali ke Floating Bar - Esc)"
        variant="secondary"
        onClick={onCancelCapture}
        icon={<X className="w-3.5 h-3.5" />}
        label="Batal"
      />
    </div>
  );
};
