import { create } from "zustand";

export interface SettingsState {
  autoCopyToClipboard: boolean;
  enableShutterFlash: boolean;
  includeDiagnosticsOnCopy: boolean;
  
  setAutoCopyToClipboard: (enabled: boolean) => void;
  setEnableShutterFlash: (enabled: boolean) => void;
  setIncludeDiagnosticsOnCopy: (enabled: boolean) => void;
}

const SETTINGS_KEY = "screencraft_user_settings";

const loadPersistedSettings = (): Partial<SettingsState> => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Failed to load settings from localStorage:", err);
  }
  return {};
};

const saveSettings = (state: {
  autoCopyToClipboard: boolean;
  enableShutterFlash: boolean;
  includeDiagnosticsOnCopy: boolean;
}) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Failed to save settings to localStorage:", err);
  }
};

const initialPersisted = loadPersistedSettings();

export const useSettingsStore = create<SettingsState>((set) => ({
  autoCopyToClipboard: initialPersisted.autoCopyToClipboard ?? false,
  enableShutterFlash: initialPersisted.enableShutterFlash ?? true,
  includeDiagnosticsOnCopy: initialPersisted.includeDiagnosticsOnCopy ?? false,

  setAutoCopyToClipboard: (enabled: boolean) =>
    set((state) => {
      const next = { ...state, autoCopyToClipboard: enabled };
      saveSettings(next);
      return { autoCopyToClipboard: enabled };
    }),

  setEnableShutterFlash: (enabled: boolean) =>
    set((state) => {
      const next = { ...state, enableShutterFlash: enabled };
      saveSettings(next);
      return { enableShutterFlash: enabled };
    }),

  setIncludeDiagnosticsOnCopy: (enabled: boolean) =>
    set((state) => {
      const next = { ...state, includeDiagnosticsOnCopy: enabled };
      saveSettings(next);
      return { includeDiagnosticsOnCopy: enabled };
    }),
}));
