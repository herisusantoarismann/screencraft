import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface UseScreenCaptureReturn {
  capturedImage: HTMLImageElement | null;
  isCapturing: boolean;
  isTransitioning: boolean;
  error: string | null;
  captureScreen: () => Promise<void>;
  triggerScreenshot: () => Promise<void>;
  closeOverlay: () => Promise<void>;
  cancelCapture: () => Promise<void>;
  resetCapture: () => void;
}

const loadBase64Image = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (_event, _source, _lineno, _colno, error) => {
      reject(error || new Error("Failed to load image from captured base64 data"));
    };
    img.src = dataUrl;
  });
};

export const useScreenCapture = (): UseScreenCaptureReturn => {
  const [capturedImage, setCapturedImage] = useState<HTMLImageElement | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const captureScreen = useCallback(async (): Promise<void> => {
    setIsCapturing(true);
    setError(null);
    try {
      const base64Data = await invoke<string>("capture_fullscreen");
      const imgElement = await loadBase64Image(base64Data);

      // Fade out floating bar
      setIsTransitioning(true);
      // JEDA: 150ms to ensure bar has fully faded out
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Expand window to fullscreen while 100% transparent
      await invoke("enter_fullscreen_mode");
      setCapturedImage(imgElement);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[useScreenCapture] Capture error:", message);
      setError(message);
    } finally {
      setIsCapturing(false);
      setIsTransitioning(false);
    }
  }, []);

  const triggerScreenshot = useCallback(async (): Promise<void> => {
    setIsCapturing(true);
    setError(null);
    try {
      // 1. Capture screen while floating bar is steady at top-center (SetWindowDisplayAffinity excludes window)
      const base64Data = await invoke<string>("trigger_screenshot");
      const imgElement = await loadBase64Image(base64Data);

      // 2. Now fade out the floating bar smoothly in place
      setIsTransitioning(true);

      // 3. JEDA: 150ms to ensure floating bar has completely faded to transparent
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 4. Expand window to fullscreen while 100% transparent (no visual jump!)
      await invoke("enter_fullscreen_mode");

      // 5. Mount canvas image (triggers shutter flash)
      setCapturedImage(imgElement);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[useScreenCapture] triggerScreenshot error:", message);
      setError(message);
      await invoke("enter_floating_bar_mode");
    } finally {
      setIsCapturing(false);
      setIsTransitioning(false);
    }
  }, []);

  const closeOverlay = useCallback(async (): Promise<void> => {
    setIsTransitioning(true);
    try {
      await invoke("close_overlay");
    } catch (err) {
      console.error("[useScreenCapture] Close overlay error:", err);
    } finally {
      setCapturedImage(null);
      setError(null);
      setIsTransitioning(false);
    }
  }, []);

  const cancelCapture = useCallback(async (): Promise<void> => {
    setIsTransitioning(true);
    setCapturedImage(null);
    setError(null);
    try {
      await invoke("enter_floating_bar_mode");
      // JEDA: Wait 150ms for window to resize back before un-hiding floating bar
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch (err) {
      console.error("[useScreenCapture] Cancel capture error:", err);
    } finally {
      setIsTransitioning(false);
    }
  }, []);

  const resetCapture = useCallback((): void => {
    setCapturedImage(null);
    setError(null);
  }, []);

  // Listen to Tauri events
  useEffect(() => {
    let unlistenFloatingBar: UnlistenFn | undefined;
    let unlistenTrigger: UnlistenFn | undefined;

    const setupListener = async () => {
      try {
        unlistenFloatingBar = await listen("open-floating-bar", () => {
          setCapturedImage(null);
          setError(null);
        });

        unlistenTrigger = await listen<string | null>("trigger-capture", async (event) => {
          if (event.payload) {
            setIsCapturing(true);
            setError(null);
            try {
              const imgElement = await loadBase64Image(event.payload);
              setIsTransitioning(true);
              await new Promise((resolve) => setTimeout(resolve, 150));
              await invoke("enter_fullscreen_mode");
              setCapturedImage(imgElement);
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              setError(message);
            } finally {
              setIsCapturing(false);
              setIsTransitioning(false);
            }
          }
        });
      } catch (err) {
        console.error("[useScreenCapture] Failed to register listeners:", err);
      }
    };

    void setupListener();

    return () => {
      if (unlistenFloatingBar) unlistenFloatingBar();
      if (unlistenTrigger) unlistenTrigger();
    };
  }, []);

  // Handle Escape key when in standby floating bar mode (no image captured)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!capturedImage) {
          void closeOverlay();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [capturedImage, closeOverlay]);

  return {
    capturedImage,
    isCapturing,
    isTransitioning,
    error,
    captureScreen,
    triggerScreenshot,
    closeOverlay,
    cancelCapture,
    resetCapture,
  };
};
