import React, { useState } from "react";
import { Workflow, X, Copy, Check, Download, ShieldCheck } from "lucide-react";
import type { FlowNode } from "../../stores/flowStore";
import { exportFlowToMarkdown } from "../../stores/flowStore";
import type { SystemDiagnostics } from "../../types/diagnostics";

export interface FlowMarkdownModalProps {
  isOpen: boolean;
  nodes: FlowNode[];
  diagnostics?: SystemDiagnostics | null;
  onCopyToClipboardWithImage: () => Promise<void>;
  onClose: () => void;
}

export const FlowMarkdownModal: React.FC<FlowMarkdownModalProps> = ({
  isOpen,
  nodes,
  diagnostics,
  onCopyToClipboardWithImage,
  onClose,
}) => {
  const [markdownCopied, setMarkdownCopied] = useState(false);
  const [attachSpecs, setAttachSpecs] = useState(true);

  if (!isOpen) return null;

  const flowMarkdown = exportFlowToMarkdown(nodes);
  const markdownContent =
    attachSpecs && diagnostics
      ? `${flowMarkdown}\n${diagnostics.markdown_table}`
      : flowMarkdown;

  const handleCopyMarkdownOnly = () => {
    void navigator.clipboard.writeText(markdownContent);
    setMarkdownCopied(true);
    setTimeout(() => setMarkdownCopied(false), 2000);
  };

  const handleCopyBoth = async () => {
    void navigator.clipboard.writeText(markdownContent);
    await onCopyToClipboardWithImage();
    setMarkdownCopied(true);
    setTimeout(() => {
      onClose();
      setMarkdownCopied(false);
    }, 800);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([markdownContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reproduction-steps-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
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
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-3">
          <textarea
            readOnly
            value={markdownContent}
            rows={8}
            className="w-full p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-200 select-text focus:outline-hidden focus:border-purple-500/60 resize-y"
          />

          {/* Toggle Specs Table */}
          {diagnostics && (
            <label className="flex items-center gap-2.5 p-2 bg-neutral-950/60 border border-neutral-800 rounded-xl cursor-pointer hover:border-purple-500/40 transition-colors select-none">
              <input
                type="checkbox"
                checked={attachSpecs}
                onChange={(e) => setAttachSpecs(e.target.checked)}
                className="rounded accent-purple-600 w-4 h-4 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Sertakan Spesifikasi Hardware & Environment (Pilar 1)</span>
              </div>
            </label>
          )}

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
            onClick={handleCopyMarkdownOnly}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Markdown</span>
          </button>

          {/* Copy Flow & Image */}
          <button
            type="button"
            onClick={() => void handleCopyBoth()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Copy Flow & Image</span>
          </button>

          {/* Download .md file */}
          <button
            type="button"
            onClick={handleDownloadMd}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .md</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
