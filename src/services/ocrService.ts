import { createWorker, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

/**
 * Mendapatkan atau menginisialisasi singleton Tesseract Worker.
 * Default bahasa: 'eng+ind' dengan fallback otomatis ke 'eng'.
 */
async function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        const worker = await createWorker("eng+ind");
        return worker;
      } catch (err) {
        console.warn(
          "[ocrService] Inisialisasi 'eng+ind' gagal, beralih ke 'eng':",
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
 * Mengekstrak teks dari potongan area gambar (Data URL base64) menggunakan Tesseract.js.
 * @param imageDataUrl Data URL gambar (image/png atau image/jpeg)
 * @returns Teks hasil ekstraksi OCR
 */
export async function extractTextFromArea(
  imageDataUrl: string
): Promise<string> {
  if (!imageDataUrl) {
    throw new Error("Data URL gambar kosong");
  }

  try {
    const worker = await getOcrWorker();
    const result = await worker.recognize(imageDataUrl);
    return result.data.text.trim();
  } catch (err) {
    console.error("[ocrService] Gagal menjalankan OCR, merefresh worker:", err);
    // Jika worker lama bermasalah, reset promise dan buat worker bersih baru
    workerPromise = null;
    const freshWorker = await createWorker("eng");
    const result = await freshWorker.recognize(imageDataUrl);
    return result.data.text.trim();
  }
}

/**
 * Membersihkan worker Tesseract saat tidak digunakan lagi.
 */
export async function terminateOcrWorker(): Promise<void> {
  if (workerPromise) {
    try {
      const worker = await workerPromise;
      await worker.terminate();
    } catch (e) {
      console.error("[ocrService] Gagal terminate worker:", e);
    } finally {
      workerPromise = null;
    }
  }
}
