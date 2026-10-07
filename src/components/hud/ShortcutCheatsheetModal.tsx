import React, { useEffect } from "react";
import { Keyboard, X, Sparkles } from "lucide-react";
import { useSettingsStore } from "../../stores/settingsStore";

export interface ShortcutCheatsheetModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ShortcutItem {
    id: string;
    label: string;
    keys: string[];
    description: string;
}

export const ShortcutCheatsheetModal: React.FC<ShortcutCheatsheetModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { screenshotHotkey, recordHotkey, floatingBarHotkey } =
        useSettingsStore();

    // ESC key listener to dismiss
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown, { capture: true });
        return () => {
            window.removeEventListener("keydown", handleKeyDown, {
                capture: true,
            });
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const parseHotkey = (hotkeyStr: string): string[] => {
        return hotkeyStr.split("+").map((token) => {
            if (token === "CommandOrControl") return "Ctrl";
            return token;
        });
    };

    const shortcuts: ShortcutItem[] = [
        {
            id: "screenshot",
            label: "Take Screenshot / Freeze",
            keys: parseHotkey(screenshotHotkey),
            description: "Capture screen instantly and launch canvas annotation tools",
        },
        {
            id: "copy",
            label: "Copy to Clipboard",
            keys: ["Ctrl", "C"],
            description: "Copy canvas drawing or cropped region directly to clipboard",
        },
        {
            id: "save",
            label: "Save Image (Download)",
            keys: ["Ctrl", "S"],
            description: "Save high-resolution annotated screenshot to disk",
        },
        {
            id: "undo",
            label: "Undo Annotation",
            keys: ["Ctrl", "Z"],
            description: "Revert the last drawn shape, stamp, or step badge",
        },
        {
            id: "redo",
            label: "Redo Annotation",
            keys: ["Ctrl", "Y"],
            description: "Restore previously undone shape or canvas change",
        },
        {
            id: "record",
            label: "Screen Recorder",
            keys: parseHotkey(recordHotkey),
            description: "Start or stop video recording widget",
        },
        {
            id: "floating",
            label: "Standby Floating Bar",
            keys: parseHotkey(floatingBarHotkey),
            description: "Toggle mini quick-action floating toolbar",
        },
        {
            id: "cheatsheet",
            label: "Toggle Cheatsheet",
            keys: ["?"],
            description: "Show or hide this keyboard shortcut guide",
        },
        {
            id: "escape",
            label: "Cancel / Dismiss",
            keys: ["Esc"],
            description: "Deselect active tool, close open modal, or exit overlay",
        },
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-150"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col text-neutral-100 animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <Keyboard className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                Keyboard Shortcuts Cheatsheet
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                                    Quick Reference
                                </span>
                            </h2>
                            <p className="text-[11px] text-neutral-400">
                                Hotkeys for instant screenshot, annotation, and capture workflows
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Close Cheatsheet (Esc)"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Shortcuts Grid List */}
                <div className="p-5 flex flex-col gap-2 max-h-[65vh] overflow-y-auto">
                    {shortcuts.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-800/80 hover:border-neutral-700/80 transition-colors"
                        >
                            <div className="flex flex-col pr-3">
                                <span className="text-xs font-semibold text-neutral-200">
                                    {item.label}
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                    {item.description}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                {item.keys.map((key, idx) => (
                                    <React.Fragment key={idx}>
                                        <kbd className="px-2 py-1 text-[11px] font-mono font-bold text-neutral-200 bg-neutral-800 border border-neutral-700/80 rounded-lg shadow-xs min-w-[24px] text-center">
                                            {key}
                                        </kbd>
                                        {idx < item.keys.length - 1 && (
                                            <span className="text-neutral-500 text-[10px] font-mono">
                                                +
                                            </span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Note */}
                <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/40 flex items-center justify-between text-xs text-neutral-400">
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Shortcuts are customizable in Settings & Preferences</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};
