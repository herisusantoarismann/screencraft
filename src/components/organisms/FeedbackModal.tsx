import React, { useState, useEffect, useCallback } from "react";
import {
    X,
    Send,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Bug,
    Lightbulb,
    MessageSquare,
    Mail,
    Cpu,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../../stores/settingsStore";

export interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type FeedbackCategory = "bug" | "feature" | "general";

const CATEGORIES: Array<{
    id: FeedbackCategory;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    placeholder: string;
}> = [
    {
        id: "bug",
        label: "Bug Report",
        icon: Bug,
        color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
        placeholder:
            "Describe the bug you encountered, what happened, and steps to reproduce...",
    },
    {
        id: "feature",
        label: "Feature Request",
        icon: Lightbulb,
        color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        placeholder:
            "What feature or improvement would you love to see in ScreenCraft? How would it help you?",
    },
    {
        id: "general",
        label: "General Feedback",
        icon: MessageSquare,
        color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
        placeholder:
            "Share your thoughts, suggestions, or general feedback about using ScreenCraft...",
    },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
}) => {
    const [category, setCategory] = useState<FeedbackCategory>("feature");
    const [message, setMessage] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [includeSpecs, setIncludeSpecs] = useState<boolean>(false);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [status, setStatus] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    // Ensure window expands to full dimensions when modal opens
    useEffect(() => {
        if (isOpen) {
            invoke("enter_fullscreen_mode").catch((err) => {
                console.warn(
                    "[FeedbackModal] Failed to enter fullscreen mode:",
                    err,
                );
            });
            setMessage("");
            setStatus(null);
            setIsSending(false);
        }
    }, [isOpen]);

    // Handle ESC key to close
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopImmediatePropagation();
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown, { capture: true });
        return () =>
            window.removeEventListener("keydown", handleKeyDown, {
                capture: true,
            });
    }, [isOpen, onClose]);

    const resolveWebhookUrl = useCallback((): string => {
        const feedbackUrl = (
            import.meta.env.VITE_DISCORD_FEEDBACK_WEBHOOK_URL || ""
        ).trim();
        if (feedbackUrl) return feedbackUrl;

        const crashUrl = (
            import.meta.env.VITE_DISCORD_CRASH_WEBHOOK_URL || ""
        ).trim();
        if (crashUrl) return crashUrl;

        const settingUrl = useSettingsStore.getState().discordWebhookUrl.trim();
        return settingUrl;
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) {
            setStatus({
                type: "error",
                text: "Please enter your message before sending.",
            });
            return;
        }

        const webhookUrl = resolveWebhookUrl();
        if (!webhookUrl) {
            setStatus({
                type: "error",
                text: "No Discord Webhook URL configured. Please set VITE_DISCORD_FEEDBACK_WEBHOOK_URL in .env or configure Webhooks in Settings.",
            });
            return;
        }

        setIsSending(true);
        setStatus(null);

        try {
            let systemSpecs: string | null = null;
            if (includeSpecs) {
                try {
                    systemSpecs = await invoke<string>(
                        "get_system_diagnostics",
                        {
                            activeWindowOverride: null,
                        },
                    );
                } catch (diagErr) {
                    console.warn(
                        "[FeedbackModal] Failed to collect diagnostics:",
                        diagErr,
                    );
                }
            }

            const appVersion =
                typeof __APP_VERSION__ !== "undefined"
                    ? __APP_VERSION__
                    : "1.0.0";

            await invoke("send_discord_feedback", {
                webhookUrl,
                category,
                message: message.trim(),
                userEmail: email.trim() || null,
                appVersion,
                systemSpecs,
            });

            setStatus({
                type: "success",
                text: "Thank you! Your feedback has been received and forwarded to the team.",
            });

            setTimeout(() => {
                onClose();
            }, 1600);
        } catch (err) {
            console.error("[FeedbackModal] Failed to send feedback:", err);
            setStatus({
                type: "error",
                text:
                    typeof err === "string"
                        ? err
                        : "Failed to send feedback. Please check your network connection.",
            });
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    const currentCategoryObj =
        CATEGORIES.find((c) => c.id === category) || CATEGORIES[1];

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            className="fixed inset-0 flex items-center justify-center bg-transparent z-50 p-4 select-none animate-in fade-in duration-150"
        >
            <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col text-white animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                            <Mail className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-bold text-sm text-neutral-100">
                                Send Feedback & Suggestions
                            </h2>
                            <p className="text-[11px] text-neutral-400">
                                Direct mailbox to the ScreenCraft development
                                team
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSend} className="p-6 flex flex-col gap-4">
                    {/* Category Select Pills */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-neutral-300">
                            Feedback Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {CATEGORIES.map((cat) => {
                                const Icon = cat.icon;
                                const isSelected = category === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id)}
                                        className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                            isSelected
                                                ? `${cat.color} shadow-sm shadow-purple-900/20 ring-1 ring-white/10`
                                                : "bg-neutral-950/50 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40"
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">
                                            {cat.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Message Textarea */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                            <span>
                                Your Message{" "}
                                <span className="text-rose-400">*</span>
                            </span>
                            <span className="text-[10px] text-neutral-500">
                                {message.length}/1000
                            </span>
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={currentCategoryObj.placeholder}
                            maxLength={1000}
                            rows={4}
                            required
                            className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
                        />
                    </div>

                    {/* Contact Email (Optional) */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                            <span>
                                Contact Email{" "}
                                <span className="text-neutral-500 font-normal">
                                    (Optional)
                                </span>
                            </span>
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com (if you'd like a response)"
                            className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>

                    {/* Include System Specs Toggle */}
                    <label className="flex items-center gap-2.5 p-2.5 bg-neutral-950/50 border border-neutral-800/80 rounded-xl cursor-pointer hover:bg-neutral-950/80 transition-colors">
                        <input
                            type="checkbox"
                            checked={includeSpecs}
                            onChange={(e) => setIncludeSpecs(e.target.checked)}
                            className="w-4 h-4 rounded border-neutral-700 text-purple-600 focus:ring-0 focus:ring-offset-0 bg-neutral-900 cursor-pointer accent-purple-600"
                        />
                        <div className="flex items-center gap-1.5 text-xs text-neutral-300 select-none">
                            <Cpu className="w-3.5 h-3.5 text-neutral-400" />
                            <span>
                                Attach basic system & hardware environment
                                telemetry
                            </span>
                        </div>
                    </label>

                    {/* Feedback Status / Alerts */}
                    {status && (
                        <div
                            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-100 ${
                                status.type === "success"
                                    ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                                    : "bg-rose-950/30 border-rose-500/30 text-rose-300"
                            }`}
                        >
                            {status.type === "success" ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                            ) : (
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                            )}
                            <span className="leading-relaxed">
                                {status.text}
                            </span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSending}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800/60 hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSending || !message.trim()}
                            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Send Feedback</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
