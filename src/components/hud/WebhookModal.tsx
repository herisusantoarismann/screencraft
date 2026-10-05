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
    AppWindow,
    Terminal,
} from "lucide-react";
import {
    getLastWebhookUrl,
    setLastWebhookUrl,
    detectWebhookType,
    sendToDiscordWebhook,
    sendToSlackWebhook,
    type WebhookType,
} from "../../services/webhookDispatcher";
import { useSettingsStore } from "../../stores/settingsStore";
import type { SystemDiagnostics } from "../../types/diagnostics";

interface WebhookModalProps {
    isOpen: boolean;
    onClose: () => void;
    getImageDataUrlOrBlob: () => Promise<string | Blob | null>;
    initialNotes?: string;
    diagnostics?: SystemDiagnostics | null;
}

const generateSpecsMarkdown = (
    diag: SystemDiagnostics,
    customApp: string,
    customTitle: string
): string => {
    const finalApp = customApp.trim() || diag.active_window_app || "Application";
    const finalTitle = customTitle.trim() || diag.active_window_title || "(Active Window)";
    const appVer = diag.active_window_version ? ` \`${diag.active_window_version}\`` : "";
    const gpuDriver = diag.gpu_driver_version ? ` (Driver: \`${diag.gpu_driver_version}\`)` : "";

    return `### 🏛️ Environment & Hardware Diagnostics\n\n\
| Diagnostic Metric | Detected Hardware / Environment Specification |\n\
| :--- | :--- |\n\
| **OS & Architecture** | \`${diag.os_name}\` \`${diag.os_build}\` |\n\
| **Processor (CPU)** | \`${diag.cpu_name}\` (${diag.cpu_cores}) |\n\
| **System Memory (RAM)** | \`${diag.ram_total_gb.toFixed(1)} GB Total\` (Available: \`${diag.ram_available_gb.toFixed(1)} GB\`, Usage: \`${diag.ram_used_pct}\`%) |\n\
| **Graphics (GPU)** | \`${diag.gpu_name}\`${gpuDriver} |\n\
| **Display & Scaling** | \`${diag.display_resolution}\` @ \`${diag.display_scale_pct}% Scale (DPI)\` |\n\
| **Target Application** | \`${finalApp}\`${appVer} |\n\
| **Active Window Title** | \`${finalTitle}\` |\n\
| **Captured Timestamp** | \`${diag.timestamp}\` (Local Time) |\n`;
};

export const WebhookModal: React.FC<WebhookModalProps> = ({
    isOpen,
    onClose,
    getImageDataUrlOrBlob,
    initialNotes = "",
    diagnostics,
}) => {
    const { discordWebhookUrl, slackWebhookUrl } = useSettingsStore();
    const [webhookUrl, setWebhookUrl] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [stackTrace, setStackTrace] = useState<string>("");
    const [attachSpecs, setAttachSpecs] = useState<boolean>(
        () => useSettingsStore.getState().attachSpecsWatermark
    );
    const [targetApp, setTargetApp] = useState<string>("");
    const [windowTitle, setWindowTitle] = useState<string>("");
    const [isCustomApp, setIsCustomApp] = useState<boolean>(false);
    const [detectedType, setDetectedType] = useState<WebhookType>("unknown");
    const [isSending, setIsSending] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    // Initialize webhook URL from localStorage/settings and initialNotes
    useEffect(() => {
        if (isOpen) {
            const {
                discordWebhookUrl: storeDiscord,
                slackWebhookUrl: storeSlack,
                attachSpecsWatermark,
            } = useSettingsStore.getState();
            const savedUrl = getLastWebhookUrl();
            const initialUrl =
                savedUrl || storeDiscord || storeSlack || "";
            setWebhookUrl(initialUrl);
            setDetectedType(detectWebhookType(initialUrl));
            setNotes(initialNotes);
            setStackTrace("");
            setFeedback(null);
            setIsSending(false);
            setAttachSpecs(attachSpecsWatermark);
            if (diagnostics) {
                setTargetApp(diagnostics.active_window_app || "");
                setWindowTitle(diagnostics.active_window_title || "");
                setIsCustomApp(false);
            }
        }
    }, [isOpen, initialNotes, diagnostics]);

    const handleAppSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === "__custom__") {
            setIsCustomApp(true);
            setTargetApp("");
        } else {
            setIsCustomApp(false);
            setTargetApp(val);
            const matched = diagnostics?.available_apps?.find((a) => a.app_name === val);
            if (matched && matched.window_title) {
                setWindowTitle(matched.window_title);
            }
        }
    };

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
                message: "Please enter a valid Discord or Slack Webhook URL.",
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
                    message: "Failed to capture image data from canvas.",
                });
                setIsSending(false);
                return;
            }

            let success = false;
            const type = detectWebhookType(trimmedUrl);

            // Feature 7: Format stack trace and append specs table
            let baseMessage = notes.trim();
            if (stackTrace.trim()) {
                const stackBlock = `### 💥 Stack Trace & Console Error\n\`\`\`log\n${stackTrace.trim()}\n\`\`\``;
                baseMessage = baseMessage ? `${baseMessage}\n\n${stackBlock}` : stackBlock;
            }

            let finalMessage = baseMessage;
            if (attachSpecs && diagnostics) {
                const specsMarkdown = generateSpecsMarkdown(
                    diagnostics,
                    targetApp,
                    windowTitle
                );
                finalMessage = baseMessage
                    ? `${baseMessage}\n\n${specsMarkdown}`
                    : specsMarkdown;
            }

            if (type === "slack") {
                success = await sendToSlackWebhook(
                    trimmedUrl,
                    imageData,
                    finalMessage,
                );
            } else {
                // Default to Discord (or multipart)
                success = await sendToDiscordWebhook(
                    trimmedUrl,
                    imageData,
                    finalMessage,
                );
            }

            if (success) {
                setLastWebhookUrl(trimmedUrl);
                setFeedback({
                    type: "success",
                    message: `Successfully sent to ${type === "slack" ? "Slack" : "Discord"} channel!`,
                });
                setTimeout(() => {
                    onClose();
                }, 1200);
            } else {
                setFeedback({
                    type: "error",
                    message:
                        "Failed to send webhook. Please verify that the URL is valid and active.",
                });
            }
        } catch (err) {
            console.error("[WebhookModal] Submit error:", err);
            setFeedback({
                type: "error",
                message: "An error occurred while processing the webhook request.",
            });
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs z-50 p-4 select-none">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/60 shrink-0">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                        <Send className="w-4 h-4" />
                        <span>Send to Webhook (Discord / Slack)</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-4 overflow-y-auto">
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

                        {/* Quick Presets from Settings */}
                        {(discordWebhookUrl || slackWebhookUrl) && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-neutral-500 font-medium">Settings Presets:</span>
                                {discordWebhookUrl && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setWebhookUrl(discordWebhookUrl);
                                            setDetectedType(detectWebhookType(discordWebhookUrl));
                                            if (feedback) setFeedback(null);
                                        }}
                                        className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                                    >
                                        Discord
                                    </button>
                                )}
                                {slackWebhookUrl && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setWebhookUrl(slackWebhookUrl);
                                            setDetectedType(detectWebhookType(slackWebhookUrl));
                                            if (feedback) setFeedback(null);
                                        }}
                                        className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                                    >
                                        Slack
                                    </button>
                                )}
                            </div>
                        )}

                        <input
                            type="url"
                            value={webhookUrl}
                            onChange={handleUrlChange}
                            placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/..."
                            className="w-full px-3 py-2 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    {/* Notes / Markdown message */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] uppercase font-bold text-neutral-400 flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3 text-neutral-400" />
                            <span>
                                Notes / Description (Markdown supported)
                            </span>
                        </label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Write introductory notes or bug report summary here..."
                            className="w-full px-3 py-2 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-indigo-500 resize-none transition-colors"
                        />
                    </div>

                    {/* Feature 7: Stack Trace & Console Error Slot */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] uppercase font-bold text-rose-400 flex items-center gap-1.5">
                                <Terminal className="w-3 h-3 text-rose-400" />
                                <span>Stack Trace / Console Error (F12 / API 500)</span>
                            </label>
                            <span className="text-[10px] text-neutral-500 font-normal">
                                Optional
                            </span>
                        </div>
                        <textarea
                            rows={3}
                            value={stackTrace}
                            onChange={(e) => setStackTrace(e.target.value)}
                            placeholder="Paste console inspect error (F12) or API 500 payload here..."
                            className="w-full px-3 py-2 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-xs font-mono text-rose-300 placeholder-neutral-600 focus:outline-hidden focus:border-rose-500/80 resize-none transition-colors"
                        />
                    </div>

                    {/* Toggle: Include Hardware & Environment Specs */}
                    {diagnostics && (
                        <div className="flex flex-col gap-2.5 p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={attachSpecs}
                                    onChange={(e) => {
                                        setAttachSpecs(e.target.checked);
                                        useSettingsStore.getState().setAttachSpecsWatermark(e.target.checked);
                                    }}
                                    className="rounded accent-indigo-600 w-4 h-4 cursor-pointer"
                                />
                                <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
                                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    <span>
                                        Include Hardware & Environment Specifications
                                    </span>
                                </div>
                            </label>

                            {attachSpecs && (
                                <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800/80 animate-in fade-in duration-150">
                                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                                        <span className="flex items-center gap-1.5 font-semibold">
                                            <AppWindow className="w-3.5 h-3.5 text-purple-400" />
                                            <span>Target Application & Title</span>
                                        </span>
                                        <span className="text-[10px] text-indigo-400 font-mono">Editable</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {/* Active Application Dropdown */}
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-semibold text-neutral-400">
                                                Active Application
                                            </label>
                                            <select
                                                value={isCustomApp ? "__custom__" : targetApp}
                                                onChange={handleAppSelect}
                                                className="w-full px-2 py-1.5 bg-neutral-900 border border-neutral-700/80 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500 transition-colors cursor-pointer"
                                            >
                                                {/* Detected current active app */}
                                                {diagnostics.active_window_app && (
                                                    <option value={diagnostics.active_window_app}>
                                                        {diagnostics.active_window_app} (Detected)
                                                    </option>
                                                )}

                                                {/* Other open application windows */}
                                                {diagnostics.available_apps
                                                    ?.filter((a) => a.app_name !== diagnostics.active_window_app)
                                                    .map((a, idx) => (
                                                        <option key={`${a.app_name}-${idx}`} value={a.app_name}>
                                                            {a.app_name}
                                                        </option>
                                                    ))}

                                                <option value="__custom__">✏️ Custom Input...</option>
                                            </select>

                                            {/* Input manual if custom selected */}
                                            {isCustomApp && (
                                                <input
                                                    type="text"
                                                    value={targetApp}
                                                    onChange={(e) => setTargetApp(e.target.value)}
                                                    placeholder="Application name..."
                                                    autoFocus
                                                    className="w-full mt-1 px-2.5 py-1.5 bg-neutral-900 border border-indigo-500/80 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-indigo-400 transition-colors"
                                                />
                                            )}
                                        </div>

                                        {/* Judul Window / Tab (Input Bebas) */}
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-semibold text-neutral-400">
                                                Window / Tab Title
                                            </label>
                                            <input
                                                type="text"
                                                value={windowTitle}
                                                onChange={(e) => setWindowTitle(e.target.value)}
                                                placeholder="e.g. Jira Ticket #12, Login Page"
                                                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700/80 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
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
                        <span>URL saved automatically</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSending}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                        >
                            Cancel
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
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Send to Channel</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
