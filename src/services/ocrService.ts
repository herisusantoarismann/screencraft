import { createWorker, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

/**
 * Get or initialize the singleton Tesseract Worker.
 * Default languages: 'eng+ind' with automatic fallback to 'eng'.
 */
async function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        const worker = await createWorker("eng+ind");
        return worker;
      } catch (err) {
        console.warn(
          "[ocrService] 'eng+ind' initialization failed, falling back to 'eng':",
          err
        );
        const fallbackWorker = await createWorker("eng");
        return fallbackWorker;
      }
    })();
  }
  return workerPromise;
}

/**
 * Extracts text from an image region (base64 Data URL) using Tesseract.js.
 * @param imageDataUrl Image data URL (image/png or image/jpeg)
 * @returns Extracted OCR text
 */
export async function extractTextFromArea(
  imageDataUrl: string
): Promise<string> {
  if (!imageDataUrl) {
    throw new Error("Image data URL is empty");
  }

  try {
    const worker = await getOcrWorker();
    const result = await worker.recognize(imageDataUrl);
    return result.data.text.trim();
  } catch (err) {
    console.error("[ocrService] OCR execution failed, refreshing worker:", err);
    // If old worker failed, reset promise and create a fresh worker
    workerPromise = null;
    const freshWorker = await createWorker("eng");
    const result = await freshWorker.recognize(imageDataUrl);
    return result.data.text.trim();
  }
}

/**
 * Clean up Tesseract worker when no longer needed.
 */
export async function terminateOcrWorker(): Promise<void> {
  if (workerPromise) {
    try {
      const worker = await workerPromise;
      await worker.terminate();
    } catch (e) {
      console.error("[ocrService] Failed to terminate worker:", e);
    } finally {
      workerPromise = null;
    }
  }
}
