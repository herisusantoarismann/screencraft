import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;

/**
 * Get or initialize the singleton FFmpeg WASM instance
 */
export const getFFmpeg = async (
  onLog?: (message: string) => void
): Promise<FFmpeg> => {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();

  if (onLog) {
    ffmpeg.on("log", ({ message }) => {
      onLog(message);
    });
  }

  // Load ffmpeg-core from local public folder for instant, offline WASM loading
  try {
    const localBase = "/ffmpeg";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${localBase}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${localBase}/ffmpeg-core.wasm`, "application/wasm"),
    });
  } catch (err) {
    console.warn("[FFmpeg] Local load failed, falling back to unpkg CDN:", err);
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
  }

  ffmpegInstance = ffmpeg;
  return ffmpegInstance;
};

/**
 * Convert a recorded WebM video blob into an optimized GIF using WebAssembly
 *
 * @param webmBlob The recorded screen video Blob
 * @param startTime Start trim time in seconds
 * @param endTime End trim time in seconds
 * @param onProgress Callback receiving progress percentage (0 - 100)
 * @returns Promise resolving to a high-quality GIF Blob
 */
export const convertWebmToGif = async (
  webmBlob: Blob,
  startTime: number,
  endTime: number,
  onProgress: (p: number) => void
): Promise<Blob> => {
  onProgress(5);
  const ffmpeg = await getFFmpeg();
  onProgress(15);

  // Bind progress listener
  const progressHandler = ({ progress }: { progress: number }) => {
    // Map ffmpeg progress (0.0 - 1.0) to 15% - 95%
    const mapped = Math.round(15 + progress * 80);
    onProgress(Math.min(95, Math.max(15, mapped)));
  };

  ffmpeg.on("progress", progressHandler);

  try {
    // 1. Write the input WebM video into FFmpeg virtual memory
    const inputData = await fetchFile(webmBlob);
    await ffmpeg.writeFile("input.webm", inputData);
    onProgress(25);

    // Format safe duration string
    const startStr = Math.max(0, startTime).toFixed(2);
    const endStr = Math.max(startTime + 0.1, endTime).toFixed(2);

    // 2. Execute two-pass palettegen + paletteuse for sharp, compact GIF output
    // Filter chain: 15 fps, scale max width 800px maintaining aspect ratio with lanczos resampling
    const filterChain =
      "fps=15,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse";

    await ffmpeg.exec([
      "-ss",
      startStr,
      "-to",
      endStr,
      "-i",
      "input.webm",
      "-vf",
      filterChain,
      "-y",
      "output.gif",
    ]);

    onProgress(95);

    // 3. Read back the generated GIF buffer
    const rawOutput = await ffmpeg.readFile("output.gif");
    let uint8: Uint8Array;
    if (rawOutput instanceof Uint8Array) {
      uint8 = rawOutput;
    } else if (typeof rawOutput === "string") {
      const encoder = new TextEncoder();
      uint8 = encoder.encode(rawOutput);
    } else {
      uint8 = new Uint8Array(rawOutput);
    }

    const gifBlob = new Blob([uint8.buffer as ArrayBuffer], { type: "image/gif" });
    onProgress(100);

    return gifBlob;
  } finally {
    // Clean up temporary files in virtual memory
    try {
      await ffmpeg.deleteFile("input.webm");
    } catch {
      // Ignore if file was not created
    }
    try {
      await ffmpeg.deleteFile("output.gif");
    } catch {
      // Ignore
    }
  }
};
