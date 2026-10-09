import { getFFmpeg } from "./gifConverter";
import { fetchFile } from "@ffmpeg/util";

export interface CompressionResult {
  blob: Blob;
  fileName: string;
  sizeMB: number;
  originalSizeMB: number;
  platform: "slack" | "jira";
}

/**
 * Compresses a recorded video to fit within platform upload constraints:
 * - Slack: guaranteed < 5MB (target ~3.2 - 4.2 MB)
 * - Jira: guaranteed < 10MB (target ~6.5 - 8.5 MB)
 */
export const compressVideoForPlatform = async (
  inputBlob: Blob,
  startTime: number,
  endTime: number,
  platform: "slack" | "jira",
  onProgress: (percent: number) => void
): Promise<CompressionResult> => {
  onProgress(5);
  const ffmpeg = await getFFmpeg();
  onProgress(15);

  const progressHandler = ({ progress }: { progress: number }) => {
    const mapped = Math.round(15 + progress * 80);
    onProgress(Math.min(95, Math.max(15, mapped)));
  };
  ffmpeg.on("progress", progressHandler);

  const originalSizeMB =
    Math.round((inputBlob.size / (1024 * 1024)) * 100) / 100;
  const durationSec = Math.max(0.5, endTime - startTime);

  try {
    const inputData = await fetchFile(inputBlob);
    await ffmpeg.writeFile("input_video.webm", inputData);
    onProgress(25);

    const startStr = Math.max(0, startTime).toFixed(2);
    const endStr = Math.max(startTime + 0.1, endTime).toFixed(2);

    // Calculate maximum safe bitrates
    // 5MB = 40,960 kilobits. Target ~4MB = 32,768 kb.
    // 10MB = 81,920 kilobits. Target ~8.5MB = 69,632 kb.
    const targetKiloBits = platform === "slack" ? 32000 : 68000;
    const calculatedBitrateKbps = Math.floor(targetKiloBits / durationSec);
    const maxBitrate = platform === "slack" ? 2200 : 4200;
    const minBitrate = 400;
    const videoBitrateKbps = Math.min(
      maxBitrate,
      Math.max(minBitrate, calculatedBitrateKbps - 96)
    );

    const scaleFilter =
      platform === "slack"
        ? "scale='min(1280,iw)':-2"
        : "scale='min(1600,iw)':-2";

    const outputName = `compressed_${platform}.mp4`;
    let usedOutputName = outputName;

    // First attempt: MP4 with H.264
    let succeeded = false;
    try {
      await ffmpeg.exec([
        "-ss",
        startStr,
        "-to",
        endStr,
        "-i",
        "input_video.webm",
        "-vf",
        scaleFilter,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-b:v",
        `${videoBitrateKbps}k`,
        "-maxrate",
        `${Math.round(videoBitrateKbps * 1.25)}k`,
        "-bufsize",
        `${Math.round(videoBitrateKbps * 2)}k`,
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "96k",
        "-y",
        outputName,
      ]);
      succeeded = true;
    } catch (mp4Err) {
      console.warn(
        "[videoCompressor] libx264 failed, falling back to WebM compression:",
        mp4Err
      );
    }

    if (!succeeded) {
      usedOutputName = `compressed_${platform}.webm`;
      await ffmpeg.exec([
        "-ss",
        startStr,
        "-to",
        endStr,
        "-i",
        "input_video.webm",
        "-vf",
        scaleFilter,
        "-b:v",
        `${videoBitrateKbps}k`,
        "-y",
        usedOutputName,
      ]);
    }

    onProgress(95);

    const rawOutput = await ffmpeg.readFile(usedOutputName);
    let uint8: Uint8Array;
    if (rawOutput instanceof Uint8Array) {
      uint8 = rawOutput;
    } else if (typeof rawOutput === "string") {
      uint8 = new TextEncoder().encode(rawOutput);
    } else {
      uint8 = new Uint8Array(rawOutput);
    }

    const mimeType = usedOutputName.endsWith(".mp4")
      ? "video/mp4"
      : "video/webm";
    const compressedBlob = new Blob([uint8.buffer as ArrayBuffer], {
      type: mimeType,
    });
    const sizeMB =
      Math.round((compressedBlob.size / (1024 * 1024)) * 100) / 100;
    const finalExt = usedOutputName.split(".").pop();
    const finalFileName = `snapforge-${platform}-${Date.now()}.${finalExt}`;

    onProgress(100);

    return {
      blob: compressedBlob,
      fileName: finalFileName,
      sizeMB,
      originalSizeMB,
      platform,
    };
  } finally {
    try {
      await ffmpeg.deleteFile("input_video.webm");
    } catch {}
    try {
      await ffmpeg.deleteFile(`compressed_${platform}.mp4`);
    } catch {}
    try {
      await ffmpeg.deleteFile(`compressed_${platform}.webm`);
    } catch {}
  }
};
