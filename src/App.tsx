import React, { useEffect } from "react";
import { CapturePage } from "./pages";
import { SettingsModal } from "./components/settings";
import { useSettingsStore } from "./stores/settingsStore";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";
import "./App.css";

const App: React.FC = () => {
  const isSettingsOpen = useSettingsStore((state) => state.isSettingsOpen);
  const setIsSettingsOpen = useSettingsStore((state) => state.setIsSettingsOpen);

  // Apply persisted global hotkeys and sync autostart on application launch
  useEffect(() => {
    const { screenshotHotkey, recordHotkey, floatingBarHotkey, launchOnStartup } =
      useSettingsStore.getState();
    invoke("apply_hotkeys", {
      screenshot: screenshotHotkey,
      record: recordHotkey,
      floating: floatingBarHotkey,
    }).catch((err) => {
      console.warn("[App] Failed to apply startup hotkeys:", err);
    });

    // Ensure OS autostart matches persisted user setting
    isEnabled()
      .then(async (currentlyEnabled) => {
        if (launchOnStartup && !currentlyEnabled) {
          await enable();
        } else if (!launchOnStartup && currentlyEnabled) {
          await disable();
        }
      })
      .catch((err) => {
        console.warn("[App] Failed to sync autostart status:", err);
      });
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setupListener = async () => {
      try {
        unlisten = await listen("open-settings", async () => {
          const hasScreenshot = useSettingsStore.getState().hasActiveScreenshot;
          if (!hasScreenshot) {
            try {
              await invoke("enter_modal_mode");
            } catch (err) {
              console.warn("[App] Failed to expand for settings:", err);
            }
          }
          setIsSettingsOpen(true);
        });
      } catch (err) {
        console.error("[App] Failed to listen to open-settings:", err);
      }
    };

    void setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [setIsSettingsOpen]);

  return (
    <main className="w-screen h-screen overflow-hidden bg-transparent">
      <CapturePage />
      {isSettingsOpen && <SettingsModal />}
    </main>
  );
};

export default App;
