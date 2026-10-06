import React, { useState } from "react";
import {
    Cpu,
    Monitor,
    HardDrive,
    AppWindow,
    X,
    Copy,
    Check,
    ShieldCheck,
    Activity,
    Layers,
} from "lucide-react";
import type { SystemDiagnostics } from "../../types/diagnostics";

export interface DiagnosticsModalProps {
    isOpen: boolean;
    diagnostics: SystemDiagnostics | null;
    onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
    isOpen,
    diagnostics,
    onClose,
}) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !diagnostics) return null;

    const handleCopyMarkdown = () => {
        void navigator.clipboard.writeText(diagnostics.markdown_table);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // RAM usage color status
    const ramColor =
        diagnostics.ram_used_pct > 85
            ? "text-red-400 bg-red-950/60 border-red-500/50"
            : diagnostics.ram_used_pct > 70
              ? "text-amber-400 bg-amber-950/60 border-amber-500/50"
              : "text-emerald-400 bg-emerald-950/60 border-emerald-500/50";

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs z-50 p-4 select-none animate-in fade-in duration-150">
            <div className="w-full max-w-xl bg-neutral-900 border border-indigo-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/60">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                        <span>System & Hardware Specs Inspector</span>
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

                {/* Content Body Grid */}
                <div className="p-5 flex flex-col gap-3.5 max-h-[75vh] overflow-y-auto">
                    {/* Top Banner Overview */}
                    <div className="flex items-center justify-between p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl">
                        <div className="flex items-center gap-2.5">
                            <Activity className="w-5 h-5 text-indigo-400 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-neutral-200">
                                    {diagnostics.os_name}
                                </span>
                                <span className="text-[11px] font-mono text-neutral-400">
                                    {diagnostics.os_build}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-950 border border-indigo-500/40 text-indigo-300">
                                🕒 {diagnostics.timestamp}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* CPU Card */}
                        <div className="p-3 bg-neutral-950/50 border border-neutral-800/80 rounded-xl flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold">
                                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                                <span>Processor (CPU)</span>
                            </div>
                            <span
                                className="text-xs font-semibold text-neutral-100 truncate"
                                title={diagnostics.cpu_name}
                            >
                                {diagnostics.cpu_name}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                                {diagnostics.cpu_cores}
                            </span>
                        </div>

                        {/* RAM Status Card */}
                        <div className="p-3 bg-neutral-950/50 border border-neutral-800/80 rounded-xl flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold">
                                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Memory (RAM Status)</span>
                                </div>
                                <span
                                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-bold ${ramColor}`}
                                >
                                    {diagnostics.ram_used_pct}% Used
                                </span>
                            </div>
                            <span className="text-xs font-semibold text-neutral-100">
                                {diagnostics.ram_total_gb} GB Total
                            </span>
                            <span className="text-[10px] text-neutral-400">
                                Free:{" "}
                                <strong className="text-emerald-300 font-mono">
                                    {diagnostics.ram_available_gb} GB
                                </strong>{" "}
                                available
                            </span>
                        </div>

                        {/* GPU & Driver Card */}
                        <div className="p-3 bg-neutral-950/50 border border-neutral-800/80 rounded-xl flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold">
                                <Layers className="w-3.5 h-3.5 text-amber-400" />
                                <span>Graphics (GPU)</span>
                            </div>
                            <span
                                className="text-xs font-semibold text-neutral-100 truncate"
                                title={diagnostics.gpu_name}
                            >
                                {diagnostics.gpu_name}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                                {diagnostics.gpu_driver_version
                                    ? `Driver v${diagnostics.gpu_driver_version}`
                                    : "Standard Graphics Driver"}
                            </span>
                        </div>

                        {/* Display & DPI Scale Card */}
                        <div className="p-3 bg-neutral-950/50 border border-neutral-800/80 rounded-xl flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold">
                                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                                <span>Display & DPI Scaling</span>
                            </div>
                            <span className="text-xs font-semibold text-neutral-100 font-mono">
                                {diagnostics.display_resolution}
                            </span>
                            <span className="text-[10px] text-blue-300 font-semibold">
                                Scale:{" "}
                                <strong>
                                    {diagnostics.display_scale_pct}%
                                </strong>{" "}
                                (DPI Factor:{" "}
                                {(diagnostics.display_scale_pct / 100).toFixed(
                                    2,
                                )}
                                )
                            </span>
                        </div>
                    </div>

                    {/* Active Target Application */}
                    <div className="p-3 bg-neutral-950/50 border border-neutral-800/80 rounded-xl flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold">
                                <AppWindow className="w-3.5 h-3.5 text-rose-400" />
                                <span>Target Application Under Test</span>
                            </div>
                            {diagnostics.active_window_version && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                                    {diagnostics.active_window_version}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                                {diagnostics.active_window_app}
                            </span>
                            <span
                                className="text-xs text-neutral-400 truncate"
                                title={diagnostics.active_window_title}
                            >
                                - {diagnostics.active_window_title}
                            </span>
                        </div>
                    </div>

                    {/* Compact Stamp Preview */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                            Footer Watermark Stamp Preview
                        </span>
                        <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-[11px] font-mono text-neutral-300 select-all overflow-x-auto whitespace-nowrap">
                            {diagnostics.compact_stamp}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-950/40">
                    <div className="text-[11px] text-neutral-400">
                        {copied ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Markdown
                                copied to clipboard!
                            </span>
                        ) : (
                            <span>
                                Ready to attach to Jira / GitHub ticket
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCopyMarkdown}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Specs Table</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
