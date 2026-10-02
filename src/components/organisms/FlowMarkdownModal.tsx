import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import JSZip from "jszip";
import {
    Workflow,
    X,
    Copy,
    Check,
    Download,
    ShieldCheck,
    Bug,
    Terminal,
    FileCode2,
    Sparkles,
    Minus,
    Maximize2,
    ImageIcon,
    Loader2,
    Plus,
} from "lucide-react";
import type { FlowNode } from "../../stores/flowStore";
import { exportFlowToMarkdown } from "../../stores/flowStore";
import type { SystemDiagnostics } from "../../types/diagnostics";
import type {
    Annotation,
    StampAnnotation,
    StepBadgeAnnotation,
} from "../../types/canvas";

export interface FlowMarkdownModalProps {
    isOpen: boolean;
    isFloaterActive?: boolean;
    onFloaterModeChange?: (active: boolean) => void;
    nodes: FlowNode[];
    annotations?: Annotation[];
    diagnostics?: SystemDiagnostics | null;
    onCopyToClipboardWithImage: () => Promise<void>;
    onCopyScreenshotOnly?: () => Promise<boolean>;
    onGetImageDataUrlOrBlob?: () => Promise<string | Blob>;
    onClose: () => void;
}

type OutputFormat = "jira" | "github";

const PRESET_SEVERITIES = [
    {
        id: "critical",
        label: "Critical / Blocker",
        emoji: "🔴",
        color: "text-red-400 border-red-500/50 bg-red-950/40",
    },
    {
        id: "major",
        label: "Major Defect",
        emoji: "🟠",
        color: "text-orange-400 border-orange-500/50 bg-orange-950/40",
    },
    {
        id: "minor",
        label: "Minor / Cosmetic",
        emoji: "🟡",
        color: "text-yellow-400 border-yellow-500/50 bg-yellow-950/40",
    },
];

const PRESET_CATEGORIES = [
    "[BUG]",
    "[UI/CSS GLITCH]",
    "[PERF / LAG]",
    "[SECURITY]",
    "[TYPO]",
];

const CUSTOM_SEVERITIES_KEY = "screencraft_custom_severities";
const CUSTOM_CATEGORIES_KEY = "screencraft_custom_categories";

const loadStoredCustoms = (key: string): string[] => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const saveStoredCustoms = (key: string, items: string[]) => {
    try {
        localStorage.setItem(key, JSON.stringify(items));
    } catch (err) {
        console.warn(`Failed to save ${key} to localStorage:`, err);
    }
};

export const FlowMarkdownModal: React.FC<FlowMarkdownModalProps> = ({
    isOpen,
    isFloaterActive = false,
    onFloaterModeChange,
    nodes,
    annotations = [],
    diagnostics,
    onCopyToClipboardWithImage,
    onCopyScreenshotOnly,
    onGetImageDataUrlOrBlob,
    onClose,
}) => {
    // Mode tabs & format
    const [activeTab, setActiveTab] = useState<"qaTicket" | "flowDoc">(
        "qaTicket",
    );
    const [outputFormat, setOutputFormat] = useState<OutputFormat>("jira");

    // Form Fields
    const [title, setTitle] = useState("");
    const [severity, setSeverity] = useState("Critical / Blocker");
    const [category, setCategory] = useState("[BUG]");

    // Custom Options Stored in LocalStorage
    const [customSeverities, setCustomSeverities] = useState<string[]>(() =>
        loadStoredCustoms(CUSTOM_SEVERITIES_KEY),
    );
    const [customCategories, setCustomCategories] = useState<string[]>(() =>
        loadStoredCustoms(CUSTOM_CATEGORIES_KEY),
    );

    const [isAddingSeverity, setIsAddingSeverity] = useState(false);
    const [newSeverityInput, setNewSeverityInput] = useState("");

    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryInput, setNewCategoryInput] = useState("");

    const handleAddCustomSeverity = () => {
        const val = newSeverityInput.trim();
        if (!val) return;
        if (
            !customSeverities.includes(val) &&
            !PRESET_SEVERITIES.some((s) => s.label === val)
        ) {
            const updated = [...customSeverities, val];
            setCustomSeverities(updated);
            saveStoredCustoms(CUSTOM_SEVERITIES_KEY, updated);
        }
        setSeverity(val);
        setNewSeverityInput("");
        setIsAddingSeverity(false);
    };

    const handleDeleteCustomSeverity = (target: string) => {
        const updated = customSeverities.filter((s) => s !== target);
        setCustomSeverities(updated);
        saveStoredCustoms(CUSTOM_SEVERITIES_KEY, updated);
        if (severity === target) {
            setSeverity("Critical / Blocker");
        }
    };

    const handleAddCustomCategory = () => {
        let val = newCategoryInput.trim();
        if (!val) return;
        if (!val.startsWith("[")) {
            val = `[${val}]`;
        }
        if (
            !customCategories.includes(val) &&
            !PRESET_CATEGORIES.includes(val)
        ) {
            const updated = [...customCategories, val];
            setCustomCategories(updated);
            saveStoredCustoms(CUSTOM_CATEGORIES_KEY, updated);
        }
        setCategory(val);
        setNewCategoryInput("");
        setIsAddingCategory(false);
    };

    const handleDeleteCustomCategory = (target: string) => {
        const updated = customCategories.filter((c) => c !== target);
        setCustomCategories(updated);
        saveStoredCustoms(CUSTOM_CATEGORIES_KEY, updated);
        if (category === target) {
            setCategory("[BUG]");
        }
    };

    const [preconditions, setPreconditions] = useState("");
    const [steps, setSteps] = useState("");
    const [expectedResult, setExpectedResult] = useState("");
    const [actualResult, setActualResult] = useState("");
    const [stackTrace, setStackTrace] = useState("");
    const [attachSpecs, setAttachSpecs] = useState(false);

    // Loading & Copy Feedback States
    const [isCopyingImage, setIsCopyingImage] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [imageCopiedSuccess, setImageCopiedSuccess] = useState(false);
    const [textCopiedSuccess, setTextCopiedSuccess] = useState(false);
    const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

    // Initialize and auto-populate when modal opens
    useEffect(() => {
        if (!isOpen) return;

        setAttachSpecs(false);

        // Detect stamps
        const stamps = annotations.filter(
            (a): a is StampAnnotation => a.type === "stamp",
        );
        const sevStamp = stamps.find((s) => s.stampId.startsWith("severity-"));
        const catStamp = stamps.find(
            (s) => s.stampId.startsWith("category-") || s.stampId === "custom",
        );

        if (sevStamp) {
            setSeverity(sevStamp.label);
        } else {
            setSeverity((prev) => prev || "Critical / Blocker");
        }

        if (catStamp) {
            setCategory(catStamp.label);
        } else {
            setCategory((prev) => prev || "[BUG]");
        }

        // Auto-detect Title
        const appName = diagnostics?.active_window_app || "Aplikasi";
        const defaultTitle = `${appName} - Kendala fungsional / tampilan`;
        setTitle(defaultTitle);

        // Auto-detect Preconditions
        const os = diagnostics?.os_name || "Windows";
        const res = diagnostics?.display_resolution || "1920x1080";
        const scale = diagnostics?.display_scale_pct || 100;
        setPreconditions(
            `Pengguna mengakses aplikasi pada lingkungan pengujian (${os}, resolusi ${res} @ ${scale}% DPI).`,
        );

        // Auto-detect Steps from Flow Nodes or Step Badges
        if (nodes.length > 0) {
            const generated = nodes
                .map((n, i) => `${i + 1}. **${n.title}**: ${n.description}`)
                .join("\n");
            setSteps(generated);
        } else {
            const stepBadges = annotations.filter(
                (a): a is StepBadgeAnnotation => a.type === "stepBadge",
            );
            if (stepBadges.length > 0) {
                const sorted = [...stepBadges].sort(
                    (a, b) => a.stepNumber - b.stepNumber,
                );
                const generated = sorted
                    .map(
                        (s) =>
                            `${s.stepNumber}. Klik / interaksi pada area langkah ${s.stepNumber}`,
                    )
                    .join("\n");
                setSteps(generated);
            } else {
                setSteps(
                    "1. Buka aplikasi target\n2. Navigasi ke fitur / halaman terkait\n3. Lakukan interaksi / input data\n4. Amati defect / anomali yang terjadi",
                );
            }
        }

        setExpectedResult(
            "Fitur dan tata letak berjalan normal sesuai spesifikasi desain.",
        );
        setActualResult(
            "Terjadi anomali / defect seperti pada tangkapan layar terlampir.",
        );
        setStackTrace("");
        setCopiedStatus(null);
        setImageCopiedSuccess(false);
        setTextCopiedSuccess(false);
    }, [isOpen, nodes, annotations, diagnostics]);

    if (!isOpen) return null;

    const effectiveSeverity = severity.trim() || "Critical / Blocker";
    const effectiveCategory = category.trim() || "[BUG]";

    // Build Jira Wiki Format
    const buildJiraMarkup = (): string => {
        const jiraSteps = steps
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) =>
                s.match(/^\d+\.\s*(.*)$/)
                    ? `# ${s.replace(/^\d+\.\s*/, "")}`
                    : `# ${s}`,
            )
            .join("\n");

        let out = `h2. {color:#ef4444}*${effectiveSeverity}* - ${effectiveCategory} ${title}{color}\n\n`;
        out += `*Preconditions:*\n${preconditions}\n\n`;
        out += `*Steps to Reproduce:*\n${jiraSteps || "# Lakukan langkah pengujian"}\n\n`;
        out += `*Expected Result:*\n${expectedResult}\n\n`;
        out += `*Actual Result:*\n${actualResult}\n\n`;

        if (stackTrace.trim()) {
            out += `{panel:title=💥 Stack Trace / Console Error (F12)|borderStyle=solid|borderColor=#dc2626|bgColor=#18181b}\n{code:log}\n${stackTrace.trim()}\n{code}\n{panel}\n\n`;
        }

        if (attachSpecs && diagnostics) {
            const gpuDriver = diagnostics.gpu_driver_version
                ? ` (Driver: ${diagnostics.gpu_driver_version})`
                : "";
            out += `*Environment & Hardware Diagnostics:*\n`;
            out += `|| Diagnostic Metric || Detected Hardware / Environment Specification ||\n`;
            out += `| OS & Architecture | ${diagnostics.os_name} ${diagnostics.os_build} |\n`;
            out += `| Processor (CPU) | ${diagnostics.cpu_name} (${diagnostics.cpu_cores} Cores) |\n`;
            out += `| System Memory (RAM) | ${diagnostics.ram_total_gb.toFixed(1)} GB Total (${diagnostics.ram_available_gb.toFixed(1)} GB Available, Usage: ${diagnostics.ram_used_pct}%) |\n`;
            out += `| Graphics (GPU) | ${diagnostics.gpu_name}${gpuDriver} |\n`;
            out += `| Display & Scaling | ${diagnostics.display_resolution} @ ${diagnostics.display_scale_pct}% Scale (DPI) |\n`;
            out += `| Target Application | ${diagnostics.active_window_app || "Application"} |\n`;
            out += `| Active Window Title | ${diagnostics.active_window_title || "(Active Window)"} |\n`;
            out += `| Captured Timestamp | ${diagnostics.timestamp} (Local Time) |\n`;
        }

        return out.trim();
    };

    // Build GitHub / Linear GFM Format
    const buildGitHubMarkup = (): string => {
        let sevEmoji = "🟡";
        if (
            effectiveSeverity.toLowerCase().includes("critical") ||
            effectiveSeverity.toLowerCase().includes("p0")
        ) {
            sevEmoji = "🔴";
        } else if (
            effectiveSeverity.toLowerCase().includes("major") ||
            effectiveSeverity.toLowerCase().includes("p1")
        ) {
            sevEmoji = "🟠";
        }

        let out = `## 🐛 ${effectiveCategory} ${title}\n\n`;
        out += `**Severity:** ${sevEmoji} \`${effectiveSeverity}\` | **Category:** \`${effectiveCategory}\`\n\n`;
        out += `### 📋 Preconditions\n${preconditions}\n\n`;
        out += `### 🔁 Steps to Reproduce\n${steps}\n\n`;
        out += `### 🎯 Expected vs Actual Result\n- **Expected:** ${expectedResult}\n- **Actual:** ${actualResult}\n\n`;

        if (stackTrace.trim()) {
            out += `### 💥 Stack Trace & Console Error\n\`\`\`log\n${stackTrace.trim()}\n\`\`\`\n\n`;
        }

        if (attachSpecs && diagnostics) {
            out += diagnostics.markdown_table || "";
        }

        return out.trim();
    };

    const currentCompiledContent =
        activeTab === "flowDoc"
            ? attachSpecs && diagnostics
                ? `${exportFlowToMarkdown(nodes)}\n${diagnostics.markdown_table}`
                : exportFlowToMarkdown(nodes)
            : outputFormat === "jira"
              ? buildJiraMarkup()
              : buildGitHubMarkup();

    const handleCopyTextOnly = (format: OutputFormat) => {
        setOutputFormat(format);
        const text =
            format === "jira" ? buildJiraMarkup() : buildGitHubMarkup();
        void navigator.clipboard.writeText(text);
        setTextCopiedSuccess(true);
        setCopiedStatus(
            `Teks ${format === "jira" ? "Jira" : "GitHub"} tersalin! Silakan paste ke WA/Jira.`,
        );
        setTimeout(() => {
            setTextCopiedSuccess(false);
            setCopiedStatus(null);
        }, 4000);
    };

    const handleCopyScreenshotImage = async () => {
        setIsCopyingImage(true);
        setCopiedStatus(null);
        try {
            if (onCopyScreenshotOnly) {
                await onCopyScreenshotOnly();
            } else {
                await onCopyToClipboardWithImage();
            }
            setImageCopiedSuccess(true);
            setCopiedStatus(
                "Gambar screenshot berhasil disalin! Silakan paste ke WA/Jira.",
            );
        } catch (err) {
            console.error("Failed to copy image:", err);
            setCopiedStatus("Gagal menyalin gambar screenshot.");
        } finally {
            setIsCopyingImage(false);
            setTimeout(() => {
                setImageCopiedSuccess(false);
                setCopiedStatus(null);
            }, 4000);
        }
    };

    const handleDownloadZip = async () => {
        setIsDownloading(true);
        setCopiedStatus(null);
        try {
            const zip = new JSZip();

            // 1. Ambil screenshot beranotasi jika tersedia
            if (onGetImageDataUrlOrBlob) {
                try {
                    const img = await onGetImageDataUrlOrBlob();
                    if (
                        typeof img === "string" &&
                        img.startsWith("data:image")
                    ) {
                        const base64Data = img.replace(
                            /^data:image\/(png|jpeg|jpg);base64,/,
                            "",
                        );
                        zip.file("screenshot.png", base64Data, {
                            base64: true,
                        });
                    } else if (img instanceof Blob) {
                        zip.file("screenshot.png", img);
                    }
                } catch (err) {
                    console.error("Failed to include screenshot in zip:", err);
                }
            }

            // 2. Buat dokumentasi bersih yang mereferensikan ./screenshot.png
            if (activeTab === "flowDoc") {
                const flowDocContent = `${exportFlowToMarkdown(nodes)}${
                    attachSpecs && diagnostics
                        ? `\n${diagnostics.markdown_table}`
                        : ""
                }\n\n### 🖼️ Screenshot Evidence\n![Annotated Screenshot](./screenshot.png)\n`;
                zip.file("flow-documentation.md", flowDocContent);
            } else {
                // Markdown format (GitHub / Linear) dengan link gambar lokal
                const markdownContent = `${buildGitHubMarkup()}\n\n### 🖼️ Screenshot Evidence\n![Annotated Screenshot](./screenshot.png)\n`;
                zip.file("bug-report.md", markdownContent);

                // Jira wiki format teks
                const jiraContent = buildJiraMarkup();
                zip.file("jira-ticket.txt", jiraContent);
            }

            // 3. Generate berkas .zip dan trigger download
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `bug-report-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setCopiedStatus(
                "Paket tiket bug (.zip) berhasil diunduh ke folder Downloads! 🎉",
            );
        } catch (err) {
            console.error("Failed to download zip file:", err);
            setCopiedStatus("Gagal mengunduh berkas tiket .zip.");
        } finally {
            setIsDownloading(false);
            setTimeout(() => setCopiedStatus(null), 4000);
        }
    };

    // Switch to mini floater window mode in Rust
    const handleEnterFloater = async () => {
        try {
            await invoke("enter_ticket_floater_mode");
        } catch (err) {
            console.error("Failed to enter floater window mode:", err);
        }
        onFloaterModeChange?.(true);
    };

    // Exit floater window mode back to fullscreen canvas
    const handleExitFloater = async () => {
        try {
            await invoke("exit_ticket_floater_mode");
        } catch (err) {
            console.error("Failed to exit floater window mode:", err);
        }
        onFloaterModeChange?.(false);
    };

    // Close completely from floater mode
    const handleCloseFromFloater = async () => {
        try {
            await invoke("exit_ticket_floater_mode");
        } catch (err) {
            console.error("Failed to exit floater window mode:", err);
        }
        onFloaterModeChange?.(false);
        onClose();
    };

    // ---------------------------------------------------------------------------
    // 1. MINIMIZED FLOATER MODE (Window shrunk to 340x210 at bottom right)
    // ---------------------------------------------------------------------------
    if (isFloaterActive) {
        return (
            <div className="w-full h-full bg-neutral-900 border border-purple-500/80 rounded-2xl shadow-2xl p-3 text-white flex flex-col justify-between select-none">
                {/* Floater Drag Header */}
                <div
                    data-tauri-drag-region
                    className="flex items-center justify-between border-b border-neutral-800 pb-1.5 cursor-grab active:cursor-grabbing"
                >
                    <div className="flex items-center gap-1.5 text-purple-400 font-semibold text-xs pointer-events-none">
                        <Bug className="w-3.5 h-3.5 text-purple-400" />
                        <span>Bug Ticket Floater</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => void handleExitFloater()}
                            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Perbesar / Buka Modal Penuh"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleCloseFromFloater()}
                            className="p-1 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Tutup & Selesai"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Floater Info */}
                <div className="flex items-center justify-between text-[11px] bg-neutral-950/70 px-2 py-1 rounded-lg border border-neutral-800">
                    <span className="font-mono text-purple-300 font-semibold truncate max-w-[130px]">
                        {effectiveCategory}
                    </span>
                    <span className="text-neutral-400 truncate max-w-[140px] text-right">
                        {effectiveSeverity}
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        disabled={isCopyingImage || isDownloading}
                        onClick={() => handleCopyTextOnly(outputFormat)}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {textCopiedSuccess ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-300" />
                                <span>Tersalin!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Teks</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        disabled={isCopyingImage || isDownloading}
                        onClick={() => void handleCopyScreenshotImage()}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCopyingImage ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Menyalin...</span>
                            </>
                        ) : imageCopiedSuccess ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-200" />
                                <span>Tersalin!</span>
                            </>
                        ) : (
                            <>
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>Copy Gambar</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Desktop Access Tip */}
                <div className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded-lg text-center font-medium">
                    {copiedStatus ||
                        "💡 Layar desktop bebas diakses! Paste ke WA / Jira."}
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // 2. FULL MODAL VIEW (When user is in fullscreen view)
    // ---------------------------------------------------------------------------
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-xs z-50 p-3 sm:p-4 select-none">
            <div className="w-full max-w-2xl bg-neutral-900 border border-purple-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white animate-in fade-in zoom-in-95 duration-150 max-h-[92vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-950/70 shrink-0">
                    <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                        <Bug className="w-4 h-4 text-purple-400" />
                        <span>QA Defect & Bug Ticket Formatter</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Mode Switcher */}
                        <div className="flex items-center p-0.5 bg-neutral-800/90 rounded-xl border border-neutral-700/80">
                            <button
                                type="button"
                                onClick={() => setActiveTab("qaTicket")}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    activeTab === "qaTicket"
                                        ? "bg-purple-600 text-white shadow-xs"
                                        : "text-neutral-400 hover:text-white"
                                }`}
                            >
                                <FileCode2 className="w-3.5 h-3.5" />
                                <span>Bug Ticket</span>
                            </button>
                            {nodes.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("flowDoc")}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                        activeTab === "flowDoc"
                                            ? "bg-purple-600 text-white shadow-xs"
                                            : "text-neutral-400 hover:text-white"
                                    }`}
                                >
                                    <Workflow className="w-3.5 h-3.5" />
                                    <span>Flow ({nodes.length})</span>
                                </button>
                            )}
                        </div>

                        {/* Minimize to Floater button */}
                        <button
                            type="button"
                            onClick={() => void handleEnterFloater()}
                            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Minimize ke Pojok Layar (Agar desktop tidak terhalang)"
                        >
                            <Minus className="w-4 h-4" />
                        </button>

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Tutup"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Modal Scrollable Body */}
                <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(92vh-135px)]">
                    {activeTab === "qaTicket" ? (
                        <>
                            {/* 1. Format Selection Tabs (Jira vs GitHub/Linear) */}
                            <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                                <div className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Target Format Penulisan:</span>
                                </div>
                                <div className="flex items-center gap-1 bg-neutral-950/80 p-0.5 rounded-xl border border-neutral-800">
                                    <button
                                        type="button"
                                        onClick={() => setOutputFormat("jira")}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                            outputFormat === "jira"
                                                ? "bg-blue-600 text-white shadow-xs"
                                                : "text-neutral-400 hover:text-white"
                                        }`}
                                    >
                                        Jira Wiki
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOutputFormat("github")
                                        }
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                            outputFormat === "github"
                                                ? "bg-emerald-600 text-white shadow-xs"
                                                : "text-neutral-400 hover:text-white"
                                        }`}
                                    >
                                        GitHub / Linear (Markdown)
                                    </button>
                                </div>
                            </div>

                            {/* 2. Severity & Category Selectors (with Persistent Custom options) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Severity */}
                                <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-neutral-900/60 border border-neutral-800">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] uppercase font-bold text-neutral-400">
                                            QA Severity Level
                                        </label>
                                        <span className="text-[10px] font-mono text-cyan-400 truncate max-w-[150px]">
                                            {effectiveSeverity}
                                        </span>
                                    </div>

                                    {/* Scrollable Badges Container */}
                                    <div className="max-h-24 sm:max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5 scrollbar-thin scrollbar-thumb-neutral-700">
                                        {/* Presets */}
                                        {PRESET_SEVERITIES.map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() =>
                                                    setSeverity(opt.label)
                                                }
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                                    severity === opt.label
                                                        ? opt.color
                                                        : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                                                }`}
                                            >
                                                <span>{opt.emoji}</span>
                                                <span>{opt.label}</span>
                                            </button>
                                        ))}

                                        {/* Saved Custom Severities */}
                                        {customSeverities.map((sev) => (
                                            <div
                                                key={sev}
                                                onClick={() => setSeverity(sev)}
                                                className={`group flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                                    severity === sev
                                                        ? "border-cyan-500/80 bg-cyan-950/80 text-cyan-200 shadow-xs"
                                                        : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
                                                }`}
                                                title={`Pilih severity: ${sev}`}
                                            >
                                                <span className="truncate max-w-[130px]">
                                                    {sev}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteCustomSeverity(
                                                            sev,
                                                        );
                                                    }}
                                                    className="p-0.5 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800/80 transition-colors ml-0.5 cursor-pointer"
                                                    title={`Hapus "${sev}" dari daftar custom`}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}

                                        {/* Trigger Add Custom */}
                                        {!isAddingSeverity && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setIsAddingSeverity(true)
                                                }
                                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border border-dashed border-neutral-700 bg-neutral-950/40 text-neutral-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-all cursor-pointer"
                                                title="Tambah severity custom baru"
                                            >
                                                <Plus className="w-3 h-3" />
                                                <span>Custom</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Inline Add Custom Severity Input */}
                                    {isAddingSeverity && (
                                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-neutral-800 animate-in fade-in duration-100">
                                            <input
                                                type="text"
                                                autoFocus
                                                value={newSeverityInput}
                                                onChange={(e) =>
                                                    setNewSeverityInput(
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        handleAddCustomSeverity();
                                                    } else if (
                                                        e.key === "Escape"
                                                    ) {
                                                        setIsAddingSeverity(
                                                            false,
                                                        );
                                                        setNewSeverityInput("");
                                                    }
                                                }}
                                                placeholder="Severity baru (mis: P0 - Hotfix)..."
                                                className="px-2.5 py-1 bg-neutral-950 border border-cyan-500/70 rounded-lg text-xs text-white focus:outline-hidden flex-1"
                                            />
                                            <button
                                                type="button"
                                                onClick={
                                                    handleAddCustomSeverity
                                                }
                                                disabled={
                                                    !newSeverityInput.trim()
                                                }
                                                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                                            >
                                                Simpan
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAddingSeverity(false);
                                                    setNewSeverityInput("");
                                                }}
                                                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs cursor-pointer transition-colors"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Category Tags */}
                                <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-neutral-900/60 border border-neutral-800">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] uppercase font-bold text-neutral-400">
                                            Kategori Issue
                                        </label>
                                        <span className="text-[10px] font-mono text-purple-400 truncate max-w-[150px]">
                                            {effectiveCategory}
                                        </span>
                                    </div>

                                    {/* Scrollable Badges Container */}
                                    <div className="max-h-24 sm:max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5 scrollbar-thin scrollbar-thumb-neutral-700">
                                        {/* Presets */}
                                        {PRESET_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setCategory(cat)}
                                                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold font-mono border transition-all cursor-pointer ${
                                                    category === cat
                                                        ? "bg-purple-950/80 border-purple-500/80 text-purple-200"
                                                        : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}

                                        {/* Saved Custom Categories */}
                                        {customCategories.map((cat) => (
                                            <div
                                                key={cat}
                                                onClick={() => setCategory(cat)}
                                                className={`group flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg text-[11px] font-semibold font-mono border transition-all cursor-pointer ${
                                                    category === cat
                                                        ? "bg-purple-950/80 border-purple-500/80 text-purple-200 shadow-xs"
                                                        : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
                                                }`}
                                                title={`Pilih kategori: ${cat}`}
                                            >
                                                <span className="truncate max-w-[120px]">
                                                    {cat}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteCustomCategory(
                                                            cat,
                                                        );
                                                    }}
                                                    className="p-0.5 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800/80 transition-colors ml-0.5 cursor-pointer"
                                                    title={`Hapus "${cat}" dari daftar custom`}
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        ))}

                                        {/* Trigger Add Custom */}
                                        {!isAddingCategory && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setIsAddingCategory(true)
                                                }
                                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border border-dashed border-neutral-700 bg-neutral-950/40 text-neutral-400 hover:text-purple-300 hover:border-purple-500/50 transition-all cursor-pointer"
                                                title="Tambah kategori custom baru"
                                            >
                                                <Plus className="w-3 h-3" />
                                                <span>Custom</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Inline Add Custom Category Input */}
                                    {isAddingCategory && (
                                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-neutral-800 animate-in fade-in duration-100">
                                            <input
                                                type="text"
                                                autoFocus
                                                value={newCategoryInput}
                                                onChange={(e) =>
                                                    setNewCategoryInput(
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        handleAddCustomCategory();
                                                    } else if (
                                                        e.key === "Escape"
                                                    ) {
                                                        setIsAddingCategory(
                                                            false,
                                                        );
                                                        setNewCategoryInput("");
                                                    }
                                                }}
                                                placeholder="Kategori baru (mis: PAYMENT)..."
                                                className="px-2 py-0.5 bg-neutral-950 border border-purple-500/70 rounded-lg text-xs text-white focus:outline-hidden flex-1"
                                            />
                                            <button
                                                type="button"
                                                onClick={
                                                    handleAddCustomCategory
                                                }
                                                disabled={
                                                    !newCategoryInput.trim()
                                                }
                                                className="px-2.5 py-0.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                                            >
                                                Simpan
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAddingCategory(false);
                                                    setNewCategoryInput("");
                                                }}
                                                className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs cursor-pointer transition-colors"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 3. Title / Summary */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-400">
                                    Judul / Summary Tiket
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Contoh: Tombol checkout freeze saat network lambat..."
                                    className="w-full px-3 py-1.5 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-xs text-white focus:outline-hidden focus:border-purple-500"
                                />
                            </div>

                            {/* 4. Preconditions & Steps to Reproduce */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase font-bold text-neutral-400">
                                        Preconditions (Kondisi Awal)
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={preconditions}
                                        onChange={(e) =>
                                            setPreconditions(e.target.value)
                                        }
                                        className="w-full p-2.5 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-xs text-neutral-200 focus:outline-hidden focus:border-purple-500 resize-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] uppercase font-bold text-neutral-400">
                                            Steps to Reproduce
                                        </label>
                                        <span className="text-[9px] text-purple-400">
                                            {nodes.length > 0
                                                ? "Dari Flow Builder"
                                                : "Otomatis Step Badge"}
                                        </span>
                                    </div>
                                    <textarea
                                        rows={4}
                                        value={steps}
                                        onChange={(e) =>
                                            setSteps(e.target.value)
                                        }
                                        className="w-full p-2.5 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-xs font-mono text-neutral-200 focus:outline-hidden focus:border-purple-500 resize-none"
                                    />
                                </div>
                            </div>

                            {/* 5. Expected vs Actual Result */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase font-bold text-emerald-400">
                                        Expected Result (Hasil yang Diharapkan)
                                    </label>
                                    <input
                                        type="text"
                                        value={expectedResult}
                                        onChange={(e) =>
                                            setExpectedResult(e.target.value)
                                        }
                                        className="w-full px-3 py-1.5 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-xs text-neutral-200 focus:outline-hidden focus:border-emerald-500"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase font-bold text-rose-400">
                                        Actual Result (Hasil Aktual / Defect)
                                    </label>
                                    <input
                                        type="text"
                                        value={actualResult}
                                        onChange={(e) =>
                                            setActualResult(e.target.value)
                                        }
                                        className="w-full px-3 py-1.5 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-xs text-neutral-200 focus:outline-hidden focus:border-rose-500"
                                    />
                                </div>
                            </div>

                            {/* 6. Stack Trace & Console Error Slot */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1.5">
                                        <Terminal className="w-3.5 h-3.5 text-rose-400" />
                                        <span>
                                            Stack Trace & Console Error (F12 /
                                            Response 500)
                                        </span>
                                    </label>
                                    <span className="text-[9px] text-neutral-500">
                                        Opsional
                                    </span>
                                </div>
                                <textarea
                                    rows={3}
                                    value={stackTrace}
                                    onChange={(e) =>
                                        setStackTrace(e.target.value)
                                    }
                                    placeholder="Paste error stack trace console inspect element atau payload error API di sini..."
                                    className="w-full p-2.5 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-xs font-mono text-rose-300 placeholder-neutral-600 focus:outline-hidden focus:border-rose-500/80 resize-none"
                                />
                            </div>

                            {/* 7. Toggle Specs Table */}
                            {diagnostics && (
                                <label className="flex items-center gap-2.5 p-2 bg-neutral-950/60 border border-neutral-800 rounded-xl cursor-pointer hover:border-purple-500/40 transition-colors select-none">
                                    <input
                                        type="checkbox"
                                        checked={attachSpecs}
                                        onChange={(e) =>
                                            setAttachSpecs(e.target.checked)
                                        }
                                        className="rounded accent-purple-600 w-4 h-4 cursor-pointer"
                                    />
                                    <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                        <span>
                                            Sertakan Spesifikasi Hardware &
                                            Environment ({diagnostics.os_name},{" "}
                                            {diagnostics.display_resolution} @{" "}
                                            {diagnostics.display_scale_pct}%)
                                        </span>
                                    </div>
                                </label>
                            )}

                            {/* 8. Compiled Output Preview */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase font-bold">
                                    <span>
                                        Pratinjau Tiket Terkompilasi (
                                        {outputFormat.toUpperCase()})
                                    </span>
                                    <span className="text-purple-400 font-mono">
                                        Siap Paste
                                    </span>
                                </div>
                                <textarea
                                    readOnly
                                    value={currentCompiledContent}
                                    rows={5}
                                    className="w-full p-3 bg-neutral-950/90 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-200 select-text focus:outline-hidden resize-none"
                                />
                            </div>
                        </>
                    ) : (
                        /* Flow Builder Steps Only Mode */
                        <div className="flex flex-col gap-3">
                            <textarea
                                readOnly
                                value={currentCompiledContent}
                                rows={12}
                                className="w-full p-3 bg-neutral-950/90 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-200 select-text focus:outline-hidden resize-none"
                            />
                        </div>
                    )}

                    {/* Feedback Toast / Educational Alt+Tab Banner */}
                    {copiedStatus && (
                        <div className="flex items-center justify-between gap-2 p-2.5 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-medium animate-in fade-in duration-150">
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>{copiedStatus}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => void handleEnterFloater()}
                                className="px-2.5 py-1 bg-emerald-800/80 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                            >
                                Minimize ke Pojok
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer with One-Click Format Copy Buttons */}
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-neutral-800 bg-neutral-950/60 shrink-0">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={isCopyingImage || isDownloading}
                            onClick={() => void handleDownloadZip()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDownloading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Membuat .zip...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download (.zip)</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Salin Teks (mengikuti pilihan format Jira / GitHub dari switch di atas) */}
                        <button
                            type="button"
                            disabled={isCopyingImage || isDownloading}
                            onClick={() => handleCopyTextOnly(outputFormat)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                outputFormat === "jira"
                                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                            }`}
                        >
                            {textCopiedSuccess ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-white" />
                                    <span>Tersalin!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Salin Teks</span>
                                </>
                            )}
                        </button>

                        {/* Salin Gambar Screenshot */}
                        <button
                            type="button"
                            disabled={isCopyingImage || isDownloading}
                            onClick={() => void handleCopyScreenshotImage()}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCopyingImage ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Menyalin Gambar...</span>
                                </>
                            ) : imageCopiedSuccess ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-purple-200" />
                                    <span>Gambar Tersalin!</span>
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <span>Salin Gambar</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
