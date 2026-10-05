import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Keyboard,
  Settings,
  FolderDown,
  Wrench,
  Webhook,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  Send,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useSettingsStore, DEFAULT_SETTINGS } from "../../stores/settingsStore";
import { invoke } from "@tauri-apps/api/core";

export interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const {
    screenshotHotkey,
    recordHotkey,
    floatingBarHotkey,
    launchOnStartup,
    closeToTray,
    enableFlashEffect,
    saveMode,
    autoSavePath,
    namingPattern,
    autoCopyToClipboard,
    attachSpecsWatermark,
    defaultTicketFormat,
    discordWebhookUrl,
    slackWebhookUrl,
    isSettingsOpen: storeIsOpen,
    activeTab,
    hasActiveScreenshot,
    setScreenshotHotkey,
    setRecordHotkey,
    setFloatingBarHotkey,
    setLaunchOnStartup,
    setCloseToTray,
    setEnableFlashEffect,
    setSaveMode,
    setAutoSavePath,
    setNamingPattern,
    setAutoCopyToClipboard,
    setAttachSpecsWatermark,
    setDefaultTicketFormat,
    setDiscordWebhookUrl,
    setSlackWebhookUrl,
    setIsSettingsOpen,
    setActiveTab,
    resetToDefaults,
  } = useSettingsStore();

  const isSettingsOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;

  const [recordingHotkeyFor, setRecordingHotkeyFor] = useState<
    "screenshot" | "record" | "floating" | null
  >(null);
  const [testingDiscord, setTestingDiscord] = useState<boolean>(false);
  const [discordStatus, setDiscordStatus] = useState<string | null>(null);
  const [testingSlack, setTestingSlack] = useState<boolean>(false);
  const [slackStatus, setSlackStatus] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const syncHotkeysToBackend = useCallback(
    (ss?: string, rec?: string, fl?: string) => {
      const s = useSettingsStore.getState();
      invoke("apply_hotkeys", {
        screenshot: ss ?? s.screenshotHotkey,
        record: rec ?? s.recordHotkey,
        floating: fl ?? s.floatingBarHotkey,
      }).catch((err) => {
        console.warn("[SettingsModal] Failed to apply hotkeys to backend:", err);
      });
    },
    []
  );

  // Manage window always_on_top so user can freely switch tabs/apps when settings is open
  useEffect(() => {
    if (isSettingsOpen) {
      invoke("set_window_always_on_top", { alwaysOnTop: false }).catch((err) => {
        console.warn("[SettingsModal] Failed to disable always on top:", err);
      });
    }
  }, [isSettingsOpen]);

  // Close handler minimizing/hiding window cleanly to tray if not in active screenshot
  const handleClose = useCallback(async () => {
    if (propOnClose) {
      propOnClose();
    } else {
      setIsSettingsOpen(false);
    }
    setRecordingHotkeyFor(null);
    setShowResetConfirm(false);
    if (!hasActiveScreenshot) {
      try {
        await invoke("close_overlay");
      } catch (err) {
        console.warn("[SettingsModal] Failed to close overlay to tray:", err);
      }
    } else {
      try {
        await invoke("set_window_always_on_top", { alwaysOnTop: true });
      } catch (err) {
        console.warn("[SettingsModal] Failed to restore always on top:", err);
      }
    }
  }, [hasActiveScreenshot, setIsSettingsOpen, propOnClose]);

  // Disable global OS shortcuts while Settings is open so keys aren't swallowed by OS
  useEffect(() => {
    if (!isSettingsOpen) return;

    invoke("disable_global_shortcuts").catch((err) => {
      console.warn("[SettingsModal] Failed to disable global shortcuts:", err);
    });

    return () => {
      const { screenshotHotkey, recordHotkey, floatingBarHotkey } =
        useSettingsStore.getState();
      invoke("apply_hotkeys", {
        screenshot: screenshotHotkey,
        record: recordHotkey,
        floating: floatingBarHotkey,
      }).catch((err) => {
        console.warn("[SettingsModal] Failed to restore global hotkeys:", err);
      });
    };
  }, [isSettingsOpen]);

  // Escape key handler to close settings modal or cancel key recording
  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (recordingHotkeyFor) {
          setRecordingHotkeyFor(null);
          return;
        }
        void handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [isSettingsOpen, recordingHotkeyFor, handleClose]);

  // Hotkey Recorder Listener
  useEffect(() => {
    if (!recordingHotkeyFor) return;

    const handleRecordKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore single modifier key presses
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
        return;
      }

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push("CommandOrControl");
      if (e.altKey) parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");

      let keyName = e.key.toUpperCase();
      if (e.code.startsWith("Key")) {
        keyName = e.code.replace("Key", "");
      } else if (e.code.startsWith("Digit")) {
        keyName = e.code.replace("Digit", "");
      }

      if (keyName && !parts.includes(keyName)) {
        parts.push(keyName);
      }

      if (parts.length >= 2) {
        const combo = parts.join("+");
        if (recordingHotkeyFor === "screenshot") {
          setScreenshotHotkey(combo);
          syncHotkeysToBackend(combo, undefined, undefined);
        } else if (recordingHotkeyFor === "record") {
          setRecordHotkey(combo);
          syncHotkeysToBackend(undefined, combo, undefined);
        } else if (recordingHotkeyFor === "floating") {
          setFloatingBarHotkey(combo);
          syncHotkeysToBackend(undefined, undefined, combo);
        }
        setRecordingHotkeyFor(null);
      }
    };

    window.addEventListener("keydown", handleRecordKey, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleRecordKey, {
        capture: true,
      });
    };
  }, [
    recordingHotkeyFor,
    setScreenshotHotkey,
    setRecordHotkey,
    setFloatingBarHotkey,
    syncHotkeysToBackend,
  ]);

  // Live File Naming Preview
  const namingPreview = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());

    let formatted = namingPattern
      .replace(/{YYYY}/g, yyyy.toString())
      .replace(/{MM}/g, mm)
      .replace(/{DD}/g, dd)
      .replace(/{HH}/g, hh)
      .replace(/{mm}/g, min)
      .replace(/{ss}/g, ss)
      .replace(/{YYYY-MM-DD}/g, `${yyyy}-${mm}-${dd}`)
      .replace(/{HH-mm-ss}/g, `${hh}-${min}-${ss}`);

    if (!formatted.trim()) {
      formatted = `screencraft-${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
    }

    return `${formatted}.png`;
  }, [namingPattern]);

  // Test Discord Webhook Ping
  const handleTestDiscord = async () => {
    if (!discordWebhookUrl.trim()) {
      setDiscordStatus("Please enter a Discord Webhook URL first.");
      return;
    }
    setTestingDiscord(true);
    setDiscordStatus(null);
    try {
      const res = await fetch(discordWebhookUrl.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "🔔 **ScreenCraft Webhook Test**: Connection successful!",
          username: "ScreenCraft",
        }),
      });
      if (res.ok) {
        setDiscordStatus("✓ Ping succeeded! Notification delivered to Discord.");
      } else {
        setDiscordStatus(`Error: Discord returned status ${res.status}`);
      }
    } catch (err) {
      setDiscordStatus(`Connection failed: ${String(err)}`);
    } finally {
      setTestingDiscord(false);
    }
  };

  // Test Slack Webhook Ping
  const handleTestSlack = async () => {
    if (!slackWebhookUrl.trim()) {
      setSlackStatus("Please enter a Slack Webhook URL first.");
      return;
    }
    setTestingSlack(true);
    setSlackStatus(null);
    try {
      await invoke("send_slack_webhook", {
        webhookUrl: slackWebhookUrl.trim(),
        messageText: "🔔 *ScreenCraft Webhook Test*: Connection verified!",
      });
      setSlackStatus("✓ Ping succeeded! Notification delivered to Slack.");
    } catch (err) {
      setSlackStatus(`Failed to send: ${String(err)}`);
    } finally {
      setTestingSlack(false);
    }
  };

  if (!isSettingsOpen) return null;

  // Render Kbd visual badges
  const renderKbdBadges = (hotkeyStr: string) => {
    const tokens = hotkeyStr.split("+").map((t) => {
      if (t === "CommandOrControl") return "Ctrl";
      return t;
    });

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {tokens.map((token, idx) => (
          <kbd
            key={idx}
            className="px-2.5 py-1 text-xs font-mono font-semibold text-neutral-200 bg-neutral-800 border border-neutral-700/80 rounded-lg shadow-sm"
          >
            {token}
          </kbd>
        ))}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) void handleClose();
      }}
    >
      <div className="w-full max-w-2xl h-[560px] bg-neutral-900/95 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-100 animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Settings & Preferences
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                  v0.1.0
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Configure shortcuts, export behaviors, QA watermarks & webhooks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleClose()}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Sidebar Tabs + Content Panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tab Navigation (Left) */}
          <div className="w-52 border-r border-neutral-800 bg-neutral-950/40 p-3 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("shortcuts")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "shortcuts"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
              }`}
            >
              <Keyboard className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Shortcuts</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "general"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
              }`}
            >
              <Settings className="w-4 h-4 text-blue-400 shrink-0" />
              <span>General</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("save")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "save"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
              }`}
            >
              <FolderDown className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Save & Export</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("qa")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "qa"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
              }`}
            >
              <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
              <span>QA Defaults</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("webhooks")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "webhooks"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
              }`}
            >
              <Webhook className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Webhooks</span>
            </button>
          </div>

          {/* Right Panel: Content Area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {/* TAB 1: SHORTCUTS */}
            {activeTab === "shortcuts" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Global System Shortcuts
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Hotkeys registered across the operating system. Click
                    &quot;Record Key&quot; and press your desired modifier
                    combination.
                  </p>
                </div>

                {/* Shortcut 1: Screenshot */}
                <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-neutral-200">
                      Take Screenshot
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Freezes screen & opens markup canvas
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {recordingHotkeyFor === "screenshot" ? (
                      <span className="px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white animate-pulse rounded-lg shadow">
                        Press keys now...
                      </span>
                    ) : (
                      renderKbdBadges(screenshotHotkey)
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setRecordingHotkeyFor(
                          recordingHotkeyFor === "screenshot"
                            ? null
                            : "screenshot"
                        )
                      }
                      className="px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors cursor-pointer"
                    >
                      {recordingHotkeyFor === "screenshot"
                        ? "Cancel"
                        : "Record Key"}
                    </button>
                  </div>
                </div>

                {/* Shortcut 2: Record Screen */}
                <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-neutral-200">
                      Record Screen
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Launches video screen selection
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {recordingHotkeyFor === "record" ? (
                      <span className="px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white animate-pulse rounded-lg shadow">
                        Press keys now...
                      </span>
                    ) : (
                      renderKbdBadges(recordHotkey)
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setRecordingHotkeyFor(
                          recordingHotkeyFor === "record" ? null : "record"
                        )
                      }
                      className="px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors cursor-pointer"
                    >
                      {recordingHotkeyFor === "record" ? "Cancel" : "Record Key"}
                    </button>
                  </div>
                </div>

                {/* Shortcut 3: Toggle Floating Bar */}
                <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-neutral-200">
                      Show Floating HUD
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Brings top standby floating bar into focus
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {recordingHotkeyFor === "floating" ? (
                      <span className="px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white animate-pulse rounded-lg shadow">
                        Press keys now...
                      </span>
                    ) : (
                      renderKbdBadges(floatingBarHotkey)
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setRecordingHotkeyFor(
                          recordingHotkeyFor === "floating" ? null : "floating"
                        )
                      }
                      className="px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors cursor-pointer"
                    >
                      {recordingHotkeyFor === "floating"
                        ? "Cancel"
                        : "Record Key"}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-950/40 border border-neutral-800/80 text-[11px] text-neutral-400">
                  <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    Global hotkeys are stored automatically. Custom shortcuts
                    are synchronized with the system service.
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: GENERAL */}
            {activeTab === "general" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    General Preferences
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Manage application startup, tray presence, and visual
                    effects
                  </p>
                </div>

                {/* Toggle: Launch on Startup */}
                <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-neutral-200">
                      Launch on Windows Startup
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Automatically start ScreenCraft in the system tray when
                      you log in
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={launchOnStartup}
                      onChange={(e) => setLaunchOnStartup(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>

                {/* Toggle: Close to Tray */}
                <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-neutral-200">
                      Minimize to Tray when Closed
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Keep ScreenCraft running quietly in the background taskbar
                      overflow
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={closeToTray}
                      onChange={(e) => setCloseToTray(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>

                {/* Toggle: Flash Effect */}
                <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-neutral-200">
                      Shutter Flash Animation
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Show an instant white camera shutter flash animation upon
                      capturing
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableFlashEffect}
                      onChange={(e) => setEnableFlashEffect(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 3: SAVE & EXPORT */}
            {activeTab === "save" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Save & Export Options
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Control export destinations, automated clipboard copying, and
                    file naming
                  </p>
                </div>

                {/* Save Mode Selection */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-neutral-300">
                    Save Destination Mode
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSaveMode("ask")}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        saveMode === "ask"
                          ? "bg-purple-600/15 border-purple-500/40 text-purple-200"
                          : "bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <span className="text-xs font-bold text-white">
                        Always Ask
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Prompt folder dialog for every export
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSaveMode("auto")}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        saveMode === "auto"
                          ? "bg-purple-600/15 border-purple-500/40 text-purple-200"
                          : "bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <span className="text-xs font-bold text-white">
                        Auto-Save Directory
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Silently save to predefined folder
                      </span>
                    </button>
                  </div>
                </div>

                {/* Auto-Save Path Input (if auto mode) */}
                {saveMode === "auto" && (
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                    <span className="text-xs font-medium text-neutral-300">
                      Destination Folder Path
                    </span>
                    <input
                      type="text"
                      value={autoSavePath}
                      onChange={(e) => setAutoSavePath(e.target.value)}
                      placeholder="e.g. C:\Users\Username\Pictures\ScreenCraft"
                      className="px-3 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                {/* Naming Pattern Input */}
                <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-200">
                      Filename Pattern
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Supported: &#123;YYYY&#125;, &#123;MM&#125;, &#123;DD&#125;,
                      &#123;HH&#125;, &#123;mm&#125;, &#123;ss&#125;
                    </span>
                  </div>
                  <input
                    type="text"
                    value={namingPattern}
                    onChange={(e) => setNamingPattern(e.target.value)}
                    className="px-3 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex items-center gap-2 text-[11px] text-purple-300 bg-purple-950/30 px-3 py-1.5 rounded-lg border border-purple-900/50">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="truncate">
                      Preview: <strong>{namingPreview}</strong>
                    </span>
                  </div>
                </div>

                {/* Toggle: Auto-copy on capture */}
                <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-neutral-200">
                      Auto-Copy Image to Clipboard
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Automatically copy newly captured screenshot to clipboard
                      immediately
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCopyToClipboard}
                      onChange={(e) => setAutoCopyToClipboard(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 4: QA DEFAULTS */}
            {activeTab === "qa" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    QA & Bug Tracking Defaults
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Configure telemetry stamps, system diagnostics, and ticket
                    markdown formats
                  </p>
                </div>

                {/* Toggle: Hardware Specs Watermark */}
                <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-neutral-200">
                      Attach Hardware & OS Specs Stamp
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Include resolution, OS version, GPU, and RAM telemetry
                      watermark on exports
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachSpecsWatermark}
                      onChange={(e) =>
                        setAttachSpecsWatermark(e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>

                {/* Default Ticket Format */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-neutral-300">
                    Default Ticket Syntax Format
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDefaultTicketFormat("markdown")}
                      className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        defaultTicketFormat === "markdown"
                          ? "bg-purple-600/15 border-purple-500/40 text-purple-200"
                          : "bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <span className="text-xs font-bold text-white">
                        GitHub / Linear (Markdown)
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        GFM tables, bold highlights, checklist syntax
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDefaultTicketFormat("jira")}
                      className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        defaultTicketFormat === "jira"
                          ? "bg-purple-600/15 border-purple-500/40 text-purple-200"
                          : "bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <span className="text-xs font-bold text-white">
                        Jira Wiki Format
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Atlassian Jira markup tables and callout panels
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: WEBHOOKS */}
            {activeTab === "webhooks" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Instant Team Webhooks
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Directly dispatch screenshots and QA tickets to your team
                    channels
                  </p>
                </div>

                {/* Discord Webhook */}
                <div className="flex flex-col gap-2 p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Webhook className="w-3.5 h-3.5 text-indigo-400" />
                      Discord Incoming Webhook URL
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={discordWebhookUrl}
                      onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="flex-1 px-3 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      disabled={testingDiscord || !discordWebhookUrl}
                      onClick={() => void handleTestDiscord()}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {testingDiscord ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Test Ping</span>
                    </button>
                  </div>
                  {discordStatus && (
                    <span
                      className={`text-[11px] ${
                        discordStatus.startsWith("✓")
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {discordStatus}
                    </span>
                  )}
                </div>

                {/* Slack Webhook */}
                <div className="flex flex-col gap-2 p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Webhook className="w-3.5 h-3.5 text-emerald-400" />
                      Slack Incoming Webhook URL
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={slackWebhookUrl}
                      onChange={(e) => setSlackWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      className="flex-1 px-3 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      disabled={testingSlack || !slackWebhookUrl}
                      onClick={() => void handleTestSlack()}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {testingSlack ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Test Ping</span>
                    </button>
                  </div>
                  {slackStatus && (
                    <span
                      className={`text-[11px] ${
                        slackStatus.startsWith("✓")
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {slackStatus}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-neutral-800 bg-neutral-950/70">
          <div>
            {showResetConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-300">
                  Reset all settings?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetToDefaults();
                    setShowResetConfirm(false);
                    syncHotkeysToBackend(
                      DEFAULT_SETTINGS.screenshotHotkey,
                      DEFAULT_SETTINGS.recordHotkey,
                      DEFAULT_SETTINGS.floatingBarHotkey,
                    );
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Yes, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleClose()}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-md shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Done / Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
