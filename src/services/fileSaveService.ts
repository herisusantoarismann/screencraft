import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../stores/settingsStore";

export const LAST_SAVE_DIR_KEY = "screencraft_last_saved_dir";

export function getLastSaveDir(): string | null {
    try {
        return localStorage.getItem(LAST_SAVE_DIR_KEY);
    } catch {
        return null;
    }
}

export function setLastSaveDir(dir: string): void {
    try {
        if (dir && typeof dir === "string") {
            localStorage.setItem(LAST_SAVE_DIR_KEY, dir);
        }
    } catch {}
}

/**
 * Format dynamic filename according to user's naming pattern setting
 * (Supports {YYYY}, {MM}, {DD}, {HH}, {mm}, {ss}, {YYYY-MM-DD}, {HH-mm-ss})
 */
export function formatNamingPattern(ext = "png"): string {
    const settings = useSettingsStore.getState();
    const pattern = settings.namingPattern || "screencraft-{YYYY-MM-DD}_{HH-mm-ss}";

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());

    let formatted = pattern
        .replace(/{YYYY}/g, yyyy.toString())
        .replace(/{MM}/g, mm)
        .replace(/{DD}/g, dd)
        .replace(/{HH}/g, hh)
        .replace(/{mm}/g, min)
        .replace(/{ss}/g, ss)
        .replace(/{YYYY-MM-DD}/g, `${yyyy}-${mm}-${dd}`)
        .replace(/{HH-mm-ss}/g, `${hh}-${min}-${ss}`);

    // Strip any hardcoded image/video extension user might have entered in the pattern
    formatted = formatted.replace(/\.(png|jpe?g|webp|gif|webm|mp4)$/i, "");
    if (!formatted.trim()) {
        formatted = `screencraft-${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
    }

    const cleanExt = ext.replace(/^\.+/, "");
    return `${formatted}.${cleanExt}`;
}

export interface SaveFileOptions {
    defaultName: string;
    data: string | Blob; // base64, dataUrl, or Blob
    filterName?: string;
    filterExtension?: string;
}

export interface SaveFileResult {
    success: boolean;
    savedPath: string | null;
    savedDir: string | null;
    fileName: string | null;
    canceled?: boolean;
    error?: string;
}

/**
 * Helper to convert Blob to base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Universal Save File Service:
 * Obeys user preferences:
 * - If saveMode === 'auto' and autoSavePath is configured: directly saves to the folder without popup.
 * - If saveMode === 'ask' (or fallback): opens native OS "Save As..." dialog with autoSavePath or last used directory.
 */
export async function saveFileWithDialog(
    options: SaveFileOptions
): Promise<SaveFileResult> {
    const { defaultName, data, filterName = "All Files", filterExtension = "*" } = options;

    try {
        let base64Data: string;
        if (data instanceof Blob) {
            base64Data = await blobToBase64(data);
        } else {
            base64Data = data;
        }

        const { saveMode, autoSavePath } = useSettingsStore.getState();
        const trimmedAutoPath = autoSavePath ? autoSavePath.trim() : "";

        // Mode 1: Auto-Save silently to user's configured directory if enabled
        if (saveMode === "auto" && trimmedAutoPath) {
            try {
                const sep = trimmedAutoPath.includes("/") && !trimmedAutoPath.includes("\\") ? "/" : "\\";
                const cleanDir = trimmedAutoPath.replace(/[/\\]+$/, "");
                const targetPath = `${cleanDir}${sep}${defaultName}`;

                const autoRes = await invoke<{
                    success: boolean;
                    saved_path: string | null;
                    saved_dir: string | null;
                    file_name: string | null;
                }>("save_file_to_path", {
                    targetPath,
                    base64Data,
                });

                if (autoRes.success) {
                    setLastSaveDir(cleanDir);
                    return {
                        success: true,
                        savedPath: autoRes.saved_path,
                        savedDir: autoRes.saved_dir || cleanDir,
                        fileName: autoRes.file_name || defaultName,
                        canceled: false,
                    };
                }
            } catch (autoErr) {
                console.warn(
                    "[fileSaveService] Auto-save to predefined folder failed, falling back to dialog:",
                    autoErr
                );
            }
        }

        // Mode 2: Always Ask (or fallback) -> Open native Save As dialog
        // Priority for starting directory: user's configured autoSavePath, then last used directory
        const initialDir = trimmedAutoPath || getLastSaveDir();

        // 1. Attempt native Tauri Save As Dialog via Rust
        try {
            const res = await invoke<{
                success: boolean;
                saved_path: string | null;
                saved_dir: string | null;
                file_name: string | null;
            }>("save_file_with_dialog", {
                defaultName,
                base64Data,
                lastDir: initialDir,
                filterName,
                filterExtension,
            });

            if (res.success && res.saved_dir) {
                setLastSaveDir(res.saved_dir);
            }

            return {
                success: res.success,
                savedPath: res.saved_path,
                savedDir: res.saved_dir,
                fileName: res.file_name,
                canceled: !res.success,
            };
        } catch (tauriErr) {
            console.warn(
                "[fileSaveService] Tauri save_file_with_dialog unavailable or failed, falling back to browser download:",
                tauriErr
            );

            // 2. Browser fallback (if running in plain web browser or preview)
            const downloadUrl =
                base64Data.startsWith("data:")
                    ? base64Data
                    : `data:application/octet-stream;base64,${base64Data}`;

            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = defaultName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            return {
                success: true,
                savedPath: null,
                savedDir: null,
                fileName: defaultName,
                canceled: false,
            };
        }
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[fileSaveService] Save failed:", errorMsg);
        return {
            success: false,
            savedPath: null,
            savedDir: null,
            fileName: null,
            canceled: false,
            error: errorMsg,
        };
    }
}
