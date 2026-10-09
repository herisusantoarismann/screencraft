import { create } from "zustand";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../stores/settingsStore";

export interface UpdateDetails {
  version: string;
  currentVersion: string;
  date?: string;
  body?: string;
}

export interface UpdaterState {
  isChecking: boolean;
  isUpdateAvailable: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  updateDetails: UpdateDetails | null;
  activeUpdate: Update | null;
  toastMessage: string | null;
  toastType: "info" | "success" | "error";

  checkForAppUpdates: (silent?: boolean) => Promise<void>;
  downloadAndInstallUpdate: () => Promise<void>;
  closeUpdateModal: () => void;
  clearToast: () => void;
}

export const useUpdaterStore = create<UpdaterState>((set, get) => ({
  isChecking: false,
  isUpdateAvailable: false,
  isDownloading: false,
  downloadProgress: 0,
  updateDetails: null,
  activeUpdate: null,
  toastMessage: null,
  toastType: "info",

  clearToast: () => set({ toastMessage: null }),

  closeUpdateModal: () => {
    const { activeUpdate } = get();
    if (activeUpdate) {
      void activeUpdate.close();
    }
    set({ isUpdateAvailable: false, activeUpdate: null });

    // Hide window if in standby without screenshot
    const hasScreenshot = useSettingsStore.getState().hasActiveScreenshot;
    if (!hasScreenshot) {
      invoke("close_overlay").catch(() => {});
    }
  },

  checkForAppUpdates: async (silent = false) => {
    if (get().isChecking || get().isDownloading) return;

    set({ isChecking: true });

    try {
      const update = await check();

      if (update && update.available) {
        set({
          isChecking: false,
          isUpdateAvailable: true,
          activeUpdate: update,
          updateDetails: {
            version: update.version,
            currentVersion: update.currentVersion,
            date: update.date,
            body: update.body || "Pembaruan versi terbaru SnapForge dengan peningkatan performa dan stabilitas.",
          },
        });

        // Ensure window is visible to present the update dialog
        const hasScreenshot = useSettingsStore.getState().hasActiveScreenshot;
        if (!hasScreenshot) {
          try {
            await invoke("enter_modal_mode");
          } catch (err) {
            console.warn("[AutoUpdater] Failed to enter modal mode:", err);
          }
        }
      } else {
        set({ isChecking: false, isUpdateAvailable: false, activeUpdate: null });

        if (!silent) {
          const currentVer = update?.currentVersion || __APP_VERSION__ || "1.0.0";
          set({
            toastMessage: `SnapForge sudah versi terbaru (v${currentVer}).`,
            toastType: "success",
          });
          setTimeout(() => get().clearToast(), 4000);
        }
      }
    } catch (err) {
      console.warn("[AutoUpdater] Check failed:", err);
      set({ isChecking: false });

      if (!silent) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        set({
          toastMessage: `Gagal memeriksa pembaruan: ${errorMsg}`,
          toastType: "error",
        });
        setTimeout(() => get().clearToast(), 4000);
      }
    }
  },

  downloadAndInstallUpdate: async () => {
    const { activeUpdate, isDownloading } = get();
    if (!activeUpdate || isDownloading) return;

    set({ isDownloading: true, downloadProgress: 0 });

    try {
      let totalBytes = 0;
      let downloadedBytes = 0;

      await activeUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            totalBytes = event.data.contentLength || 0;
            break;
          case "Progress":
            downloadedBytes += event.data.chunkLength;
            if (totalBytes > 0) {
              const pct = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
              set({ downloadProgress: pct });
            }
            break;
          case "Finished":
            set({ downloadProgress: 100 });
            break;
        }
      });

      // Relaunch app with newly installed binary
      await relaunch();
    } catch (err) {
      console.error("[AutoUpdater] Download and install failed:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      set({
        isDownloading: false,
        toastMessage: `Gagal mengunduh atau menginstal pembaruan: ${errorMsg}`,
        toastType: "error",
      });
      setTimeout(() => get().clearToast(), 5000);
    }
  },
}));

export const useAutoUpdater = () => {
  const store = useUpdaterStore();
  return store;
};

