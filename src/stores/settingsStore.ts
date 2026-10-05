import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SettingsTab = "shortcuts" | "general" | "save" | "qa" | "webhooks";
export type SaveMode = "ask" | "auto";
export type TicketFormat = "markdown" | "jira";

export interface SettingsState {
  // Tab Shortcuts
  screenshotHotkey: string;
  recordHotkey: string;
  floatingBarHotkey: string;

  // Tab General
  launchOnStartup: boolean;
  closeToTray: boolean;
  enableFlashEffect: boolean;
  enableShutterFlash: boolean; // Backward compatibility with CapturePage

  // Tab Save & Export
  saveMode: SaveMode;
  autoSavePath: string;
  namingPattern: string;
  autoCopyToClipboard: boolean;

  // Tab QA Defaults
  attachSpecsWatermark: boolean;
  includeDiagnosticsOnCopy: boolean; // Backward compatibility with CapturePage
  defaultTicketFormat: TicketFormat;

  // Tab Webhooks
  discordWebhookUrl: string;
  slackWebhookUrl: string;

  // UI State
  isSettingsOpen: boolean;
  activeTab: SettingsTab;
  hasActiveScreenshot: boolean;

  // Actions
  setScreenshotHotkey: (key: string) => void;
  setRecordHotkey: (key: string) => void;
  setFloatingBarHotkey: (key: string) => void;

  setLaunchOnStartup: (val: boolean) => void;
  setCloseToTray: (val: boolean) => void;
  setEnableFlashEffect: (val: boolean) => void;
  setEnableShutterFlash: (val: boolean) => void;

  setSaveMode: (mode: SaveMode) => void;
  setAutoSavePath: (path: string) => void;
  setNamingPattern: (pattern: string) => void;
  setAutoCopyToClipboard: (val: boolean) => void;

  setAttachSpecsWatermark: (val: boolean) => void;
  setIncludeDiagnosticsOnCopy: (val: boolean) => void;
  setDefaultTicketFormat: (format: TicketFormat) => void;

  setDiscordWebhookUrl: (url: string) => void;
  setSlackWebhookUrl: (url: string) => void;

  setIsSettingsOpen: (open: boolean) => void;
  setActiveTab: (tab: SettingsTab) => void;
  setHasActiveScreenshot: (has: boolean) => void;
  resetToDefaults: () => void;
}

export const DEFAULT_SETTINGS = {
  screenshotHotkey: "CommandOrControl+Shift+S",
  recordHotkey: "CommandOrControl+Shift+R",
  floatingBarHotkey: "CommandOrControl+Shift+F",

  launchOnStartup: false,
  closeToTray: true,
  enableFlashEffect: true,
  enableShutterFlash: true,

  saveMode: "ask" as SaveMode,
  autoSavePath: "",
  namingPattern: "screencraft-{YYYY-MM-DD}_{HH-mm-ss}",
  autoCopyToClipboard: false,

  attachSpecsWatermark: false,
  includeDiagnosticsOnCopy: false,
  defaultTicketFormat: "markdown" as TicketFormat,

  discordWebhookUrl: "",
  slackWebhookUrl: "",

  isSettingsOpen: false,
  activeTab: "shortcuts" as SettingsTab,
  hasActiveScreenshot: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setScreenshotHotkey: (key: string) => set({ screenshotHotkey: key }),
      setRecordHotkey: (key: string) => set({ recordHotkey: key }),
      setFloatingBarHotkey: (key: string) => set({ floatingBarHotkey: key }),

      setLaunchOnStartup: (val: boolean) => set({ launchOnStartup: val }),
      setCloseToTray: (val: boolean) => set({ closeToTray: val }),
      setEnableFlashEffect: (val: boolean) =>
        set({ enableFlashEffect: val, enableShutterFlash: val }),
      setEnableShutterFlash: (val: boolean) =>
        set({ enableShutterFlash: val, enableFlashEffect: val }),

      setSaveMode: (mode: SaveMode) => set({ saveMode: mode }),
      setAutoSavePath: (path: string) => set({ autoSavePath: path }),
      setNamingPattern: (pattern: string) => set({ namingPattern: pattern }),
      setAutoCopyToClipboard: (val: boolean) =>
        set({ autoCopyToClipboard: val }),

      setAttachSpecsWatermark: (val: boolean) =>
        set({ attachSpecsWatermark: val, includeDiagnosticsOnCopy: val }),
      setIncludeDiagnosticsOnCopy: (val: boolean) =>
        set({ includeDiagnosticsOnCopy: val, attachSpecsWatermark: val }),
      setDefaultTicketFormat: (format: TicketFormat) =>
        set({ defaultTicketFormat: format }),

      setDiscordWebhookUrl: (url: string) => set({ discordWebhookUrl: url }),
      setSlackWebhookUrl: (url: string) => set({ slackWebhookUrl: url }),

      setIsSettingsOpen: (open: boolean) => set({ isSettingsOpen: open }),
      setActiveTab: (tab: SettingsTab) => set({ activeTab: tab }),
      setHasActiveScreenshot: (has: boolean) =>
        set({ hasActiveScreenshot: has }),

      resetToDefaults: () =>
        set((state) => ({
          ...DEFAULT_SETTINGS,
          isSettingsOpen: state.isSettingsOpen,
          activeTab: state.activeTab,
          hasActiveScreenshot: state.hasActiveScreenshot,
        })),
    }),
    {
      name: "screencraft_settings",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return {
            ...persistedState,
            attachSpecsWatermark: false,
            includeDiagnosticsOnCopy: false,
            autoCopyToClipboard: false,
          };
        }
        return persistedState;
      },
      partialize: (state) => {
        // Exclude ephemeral UI states from persistence
        const { isSettingsOpen, activeTab, hasActiveScreenshot, ...persisted } =
          state;
        return persisted;
      },
    }
  )
);
