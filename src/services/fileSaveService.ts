import { invoke } from "@tauri-apps/api/core";

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
 * Universal Save File Dialog:
 * Opens native OS "Save As..." dialog via Rust (rfd) with the last used directory,
 * allows user to pick a folder and rename the file, remembers the chosen folder for next time,
 * and handles cancellation gracefully.
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

        const lastDir = getLastSaveDir();

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
                lastDir,
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
