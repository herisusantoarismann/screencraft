import React, { useState, useEffect } from "react";
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
  Layers,
} from "lucide-react";
import type { FlowNode } from "../../stores/flowStore";
import { exportFlowToMarkdown } from "../../stores/flowStore";
import type { SystemDiagnostics } from "../../types/diagnostics";
import type { Annotation, StampAnnotation, StepBadgeAnnotation } from "../../types/canvas";

export interface FlowMarkdownModalProps {
  isOpen: boolean;
  nodes: FlowNode[];
  annotations?: Annotation[];
  diagnostics?: SystemDiagnostics | null;
  onCopyToClipboardWithImage: () => Promise<void>;
  onClose: () => void;
}

type OutputFormat = "jira" | "github";

const SEVERITY_OPTIONS = [
  { id: "critical", label: "Critical / Blocker", emoji: "🔴", color: "text-red-400 border-red-500/50 bg-red-950/40" },
  { id: "major", label: "Major Defect", emoji: "🟠", color: "text-orange-400 border-orange-500/50 bg-orange-950/40" },
  { id: "minor", label: "Minor / Cosmetic", emoji: "🟡", color: "text-yellow-400 border-yellow-500/50 bg-yellow-950/40" },
];

const CATEGORY_OPTIONS = [
  "[BUG]",
  "[UI/CSS GLITCH]",
  "[PERF / LAG]",
  "[SECURITY]",
  "[TYPO]",
];

export const FlowMarkdownModal: React.FC<FlowMarkdownModalProps> = ({
  isOpen,
  nodes,
  annotations = [],
  diagnostics,
  onCopyToClipboardWithImage,
  onClose,
}) => {
  // Mode tabs
  const [activeTab, setActiveTab] = useState<"qaTicket" | "flowDoc">("qaTicket");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("jira");

  // Form Fields
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("Critical / Blocker");
  const [category, setCategory] = useState("[BUG]");
  const [preconditions, setPreconditions] = useState("");
  const [steps, setSteps] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [stackTrace, setStackTrace] = useState("");
  const [attachSpecs, setAttachSpecs] = useState(true);

  // Copy Feedback
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // Initialize and auto-populate when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Detect stamps
    const stamps = annotations.filter((a): a is StampAnnotation => a.type === "stamp");
    const sevStamp = stamps.find((s) => s.stampId.startsWith("severity-"));
    const catStamp = stamps.find((s) => s.stampId.startsWith("category-"));

    if (sevStamp) {
      setSeverity(sevStamp.label);
    } else {
      setSeverity("Critical / Blocker");
    }

    if (catStamp) {
      setCategory(catStamp.label);
    } else {
      setCategory("[BUG]");
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
      `Pengguna mengakses aplikasi pada lingkungan pengujian (${os}, resolusi ${res} @ ${scale}% DPI).`
    );

    // Auto-detect Steps from Flow Nodes or Step Badges
    if (nodes.length > 0) {
      const generated = nodes
        .map((n, i) => `${i + 1}. **${n.title}**: ${n.description}`)
        .join("\n");
      setSteps(generated);
    } else {
      const stepBadges = annotations.filter(
        (a): a is StepBadgeAnnotation => a.type === "stepBadge"
      );
      if (stepBadges.length > 0) {
        const sorted = [...stepBadges].sort((a, b) => a.stepNumber - b.stepNumber);
        const generated = sorted
          .map((s) => `${s.stepNumber}. Klik / interaksi pada area langkah ${s.stepNumber}`)
          .join("\n");
        setSteps(generated);
      } else {
        setSteps(
          "1. Buka aplikasi target\n2. Navigasi ke fitur / halaman terkait\n3. Lakukan interaksi / input data\n4. Amati defect / anomali yang terjadi"
        );
      }
    }

    setExpectedResult("Fitur dan tata letak berjalan normal sesuai spesifikasi desain.");
    setActualResult("Terjadi anomali / defect seperti pada tangkapan layar terlampir.");
    setStackTrace("");
    setCopiedStatus(null);
  }, [isOpen, nodes, annotations, diagnostics]);

  if (!isOpen) return null;

  // Build Jira Wiki Format
  const buildJiraMarkup = (): string => {
    const jiraSteps = steps
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) =>
        s.match(/^\d+\.\s*(.*)$/)
          ? `# ${s.replace(/^\d+\.\s*/, "")}`
          : `# ${s}`
      )
      .join("\n");

    let out = `h2. {color:#ef4444}*${severity}* - ${category} ${title}{color}\n\n`;
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
    if (severity.toLowerCase().includes("critical")) sevEmoji = "🔴";
    else if (severity.toLowerCase().includes("major")) sevEmoji = "🟠";

    let out = `## 🐛 ${category} ${title}\n\n`;
    out += `**Severity:** ${sevEmoji} \`${severity}\` | **Category:** \`${category}\`\n\n`;
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

  const handleCopyFormatted = (format: OutputFormat) => {
    setOutputFormat(format);
    const text = format === "jira" ? buildJiraMarkup() : buildGitHubMarkup();
    void navigator.clipboard.writeText(text);
    setCopiedStatus(format === "jira" ? "Jira format tersalin!" : "GitHub/Linear markdown tersalin!");
    setTimeout(() => setCopiedStatus(null), 2500);
  };

  const handleCopyTicketAndImage = async () => {
    void navigator.clipboard.writeText(currentCompiledContent);
    await onCopyToClipboardWithImage();
    setCopiedStatus("Tiket & screenshot berhasil disalin ke clipboard!");
    setTimeout(() => {
      onClose();
      setCopiedStatus(null);
    }, 1000);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([currentCompiledContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bug-ticket-${Date.now()}.${outputFormat === "jira" ? "txt" : "md"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-xs z-50 p-3 sm:p-4 select-none">
      <div className="w-full max-w-2xl bg-neutral-900 border border-purple-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white animate-in fade-in zoom-in-95 duration-150 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-950/70 shrink-0">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
            <Bug className="w-4 h-4 text-purple-400" />
            <span>QA Defect & Bug Ticket Formatter (Pilar 3)</span>
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
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(92vh-130px)]">
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
                    onClick={() => setOutputFormat("github")}
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

              {/* 2. Severity & Category Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Severity */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-neutral-400">
                    QA Severity Level
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {SEVERITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSeverity(opt.label)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          severity === opt.label
                            ? opt.color
                            : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Tags */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-neutral-400">
                    Kategori Issue
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold font-mono border transition-all cursor-pointer ${
                          category === cat
                            ? "bg-purple-950/70 border-purple-500/70 text-purple-200"
                            : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
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
                    onChange={(e) => setPreconditions(e.target.value)}
                    className="w-full p-2.5 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-xs text-neutral-200 focus:outline-hidden focus:border-purple-500 resize-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-neutral-400">
                      Steps to Reproduce
                    </label>
                    <span className="text-[9px] text-purple-400">
                      {nodes.length > 0 ? "Dari Flow Builder" : "Otomatis Step Badge"}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
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
                    onChange={(e) => setExpectedResult(e.target.value)}
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
                    onChange={(e) => setActualResult(e.target.value)}
                    className="w-full px-3 py-1.5 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-xs text-neutral-200 focus:outline-hidden focus:border-rose-500"
                  />
                </div>
              </div>

              {/* 6. Feature 7: Stack Trace & Console Error Slot */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-rose-400" />
                    <span>Stack Trace & Console Error (F12 / Response 500)</span>
                  </label>
                  <span className="text-[9px] text-neutral-500">Opsional</span>
                </div>
                <textarea
                  rows={3}
                  value={stackTrace}
                  onChange={(e) => setStackTrace(e.target.value)}
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
                    onChange={(e) => setAttachSpecs(e.target.checked)}
                    className="rounded accent-purple-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>
                      Sertakan Spesifikasi Hardware & Environment (Pilar 1 - {diagnostics.os_name}, {diagnostics.display_resolution} @ {diagnostics.display_scale_pct}%)
                    </span>
                  </div>
                </label>
              )}

              {/* 8. Compiled Output Preview */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase font-bold">
                  <span>Pratinjau Tiket Terkompilasi ({outputFormat.toUpperCase()})</span>
                  <span className="text-purple-400 font-mono">Siap Paste</span>
                </div>
                <textarea
                  readOnly
                  value={currentCompiledContent}
                  rows={6}
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

          {/* Feedback Toast */}
          {copiedStatus && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl animate-in fade-in duration-150">
              <Check className="w-3.5 h-3.5" />
              <span>{copiedStatus}</span>
            </div>
          )}
        </div>

        {/* Footer with One-Click Format Copy Buttons */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-neutral-800 bg-neutral-950/60 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownloadMd}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .{outputFormat === "jira" ? "txt" : "md"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy for Jira */}
            <button
              type="button"
              onClick={() => handleCopyFormatted("jira")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                outputFormat === "jira"
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy for Jira</span>
            </button>

            {/* Copy for GitHub / Linear */}
            <button
              type="button"
              onClick={() => handleCopyFormatted("github")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                outputFormat === "github"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy for GitHub</span>
            </button>

            {/* Copy Ticket & Image */}
            <button
              type="button"
              onClick={() => void handleCopyTicketAndImage()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Copy Ticket & Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
