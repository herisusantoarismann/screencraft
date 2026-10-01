import React, { useState, useEffect } from "react";
import {
  Send,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  MessageSquare,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  getLastWebhookUrl,
  setLastWebhookUrl,
  detectWebhookType,
  sendToDiscordWebhook,
  sendToSlackWebhook,
  type WebhookType,
} from "../../services/webhookDispatcher";
import type { SystemDiagnostics } from "../../types/diagnostics";

interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  getImageDataUrlOrBlob: () => Promise<string | Blob | null>;
  initialNotes?: string;
  diagnostics?: SystemDiagnostics | null;
}

export const WebhookModal: React.FC<WebhookModalProps> = ({
  isOpen,
  onClose,
  getImageDataUrlOrBlob,
  initialNotes = "",
  diagnostics,
}) => {
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [attachSpecs, setAttachSpecs] = useState<boolean>(true);
  const [detectedType, setDetectedType] = useState<WebhookType>("unknown");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Initialize webhook URL from localStorage and initialNotes
  useEffect(() => {
    if (isOpen) {
      const savedUrl = getLastWebhookUrl();
      setWebhookUrl(savedUrl);
      setDetectedType(detectWebhookType(savedUrl));
      setNotes(initialNotes);
      setFeedback(null);
      setIsSending(false);
    }
  }, [isOpen, initialNotes]);

  // Update detected type as user types
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWebhookUrl(val);
    setDetectedType(detectWebhookType(val));
    if (feedback) setFeedback(null);
  };

  const handleSend = async () => {
    const trimmedUrl = webhookUrl.trim();
    if (!trimmedUrl) {
      setFeedback({
        type: "error",
        message: "Silakan masukkan Webhook URL Discord atau Slack.",
      });
      return;
    }

    setIsSending(true);
    setFeedback(null);

    try {
      const imageData = await getImageDataUrlOrBlob();
      if (!imageData) {
        setFeedback({
          type: "error",
          message: "Gagal mengambil data gambar dari canvas.",
        });
        setIsSending(false);
        return;
      }

      let success = false;
      const type = detectWebhookType(trimmedUrl);

      // Append environment & hardware specs table if toggle is on
      let finalMessage = notes;
      if (attachSpecs && diagnostics) {
        finalMessage = notes.trim()
          ? `${notes.trim()}\n\n${diagnostics.markdown_table}`
          : diagnostics.markdown_table;
      }

      if (type === "slack") {
        success = await sendToSlackWebhook(trimmedUrl, imageData, finalMessage);
      } else {
        // Default to Discord (or multipart)
        success = await sendToDiscordWebhook(trimmedUrl, imageData, finalMessage);
      }

      if (success) {
        setLastWebhookUrl(trimmedUrl);
        setFeedback({
          type: "success",
          message: `Berhasil dikirim ke channel ${type === "slack" ? "Slack" : "Discord"}!`,
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedback({
          type: "error",
          message: "Gagal mengirim webhook. Pastikan URL valid dan aktif.",
        });
      }
    } catch (err) {
      console.error("[WebhookModal] Submit error:", err);
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan saat memproses permintaan webhook.",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs z-50 p-4 select-none">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
            <Send className="w-4 h-4" />
            <span>Kirim ke Webhook (Discord / Slack)</span>
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
        <div className="p-5 flex flex-col gap-4">
          {/* Webhook URL Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase font-bold text-neutral-400 flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3 text-neutral-400" />
                <span>Webhook URL</span>
              </label>
              {detectedType === "discord" && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 rounded-full">
                  Discord Webhook
                </span>
              )}
              {detectedType === "slack" && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 rounded-full">
                  Slack Webhook
                </span>
              )}
            </div>
            <input
              type="url"
              value={webhookUrl}
              onChange={handleUrlChange}
              placeholder="https://discord.com/api/webhooks/... atau https://hooks.slack.com/..."
              className="w-full px-3 py-2 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Notes / Markdown message */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase font-bold text-neutral-400 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-neutral-400" />
              <span>Catatan / Keterangan (Markdown didukung)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tulis pesan pengantar atau bug report di sini..."
              className="w-full px-3 py-2 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-indigo-500 resize-none transition-colors"
            />
          </div>

          {/* Toggle: Include Hardware & Environment Specs */}
          {diagnostics && (
            <label className="flex items-center gap-2.5 p-2.5 bg-neutral-950/60 border border-neutral-800 rounded-xl cursor-pointer hover:border-indigo-500/40 transition-colors select-none">
              <input
                type="checkbox"
                checked={attachSpecs}
                onChange={(e) => setAttachSpecs(e.target.checked)}
                className="rounded accent-indigo-600 w-4 h-4 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Sertakan Spesifikasi Hardware & Environment (Pilar 1)</span>
              </div>
            </label>
          )}

          {/* Inline Feedback Toast */}
          {feedback && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium animate-in fade-in duration-150 ${
                feedback.type === "success"
                  ? "bg-emerald-950/80 border border-emerald-500/60 text-emerald-200"
                  : "bg-rose-950/80 border border-rose-500/60 text-rose-200"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>URL disimpan otomatis</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSending || !webhookUrl.trim()}
              onClick={() => void handleSend()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim ke Channel</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
