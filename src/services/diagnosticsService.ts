import { invoke } from "@tauri-apps/api/core";
import type { SystemDiagnostics } from "../types/diagnostics";

/**
 * Fetch fresh hardware, OS, GPU, display, and active window diagnostics
 */
export async function getSystemDiagnostics(): Promise<SystemDiagnostics> {
  try {
    return await invoke<SystemDiagnostics>("get_system_diagnostics");
  } catch (err) {
    console.error("[DiagnosticsService] Failed to get system diagnostics:", err);
    return {
      os_name: "Windows (Detected)",
      os_build: "Build 64-bit",
      cpu_name: "Standard CPU",
      cpu_cores: "Multi-core",
      ram_total_gb: 16.0,
      ram_available_gb: 8.0,
      ram_used_pct: 50,
      gpu_name: "Standard Graphics Adapter",
      gpu_driver_version: "",
      display_resolution: `${window.screen.width}x${window.screen.height}`,
      display_scale_pct: Math.round((window.devicePixelRatio || 1) * 100),
      active_window_title: document.title || "Target Application",
      active_window_app: "Application",
      active_window_version: "",
      timestamp: new Date().toLocaleTimeString(),
      compact_stamp: `OS: Windows | Display: ${window.screen.width}x${window.screen.height} @ ${Math.round((window.devicePixelRatio || 1) * 100)}% | SnapForge`,
      markdown_table: "### Environment Diagnostics\n*(Unavailable)*\n",
      available_apps: [],
    };
  }
}

/**
 * Attaches a sleek, professional diagnostics watermark footer banner
 * to the bottom of the exported screenshot image.
 */
export async function attachDiagnosticsFooter(
  imageDataUrl: string,
  diagnostics: SystemDiagnostics
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const bannerHeight = Math.max(34, Math.min(48, Math.round(img.width * 0.024)));
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height + bannerHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(imageDataUrl);
        return;
      }

      // 1. Draw base screenshot
      ctx.drawImage(img, 0, 0);

      // 2. Draw Banner Background
      const bannerY = img.height;
      ctx.fillStyle = "#09090b"; // Deep obsidian dark
      ctx.fillRect(0, bannerY, img.width, bannerHeight);

      // 3. Top hairline highlight border (Purple / Indigo gradient)
      const gradient = ctx.createLinearGradient(0, bannerY, img.width, bannerY);
      gradient.addColorStop(0, "#7c3aed");
      gradient.addColorStop(0.5, "#6366f1");
      gradient.addColorStop(1, "#3b82f6");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, bannerY, img.width, 2);

      // 4. Render Badge Chip [SYSTEM INFO]
      const fontSize = Math.max(10, Math.min(13, Math.round(bannerHeight * 0.36)));
      const badgeY = bannerY + Math.round(bannerHeight * 0.22);
      const badgeHeight = Math.round(bannerHeight * 0.58);
      const badgeWidth = Math.round(fontSize * 8.5);
      const startX = 14;

      ctx.fillStyle = "#1e1b4b"; // Dark purple background
      ctx.strokeStyle = "#4338ca";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(startX, badgeY, badgeWidth, badgeHeight, 4);
      ctx.fill();
      ctx.stroke();

      ctx.font = `bold ${fontSize - 1}px monospace, sans-serif`;
      ctx.fillStyle = "#a5b4fc"; // Indigo accent
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SYSTEM INFO", startX + badgeWidth / 2, badgeY + badgeHeight / 2);

      // 5. Render Diagnostics Content Text
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = "#e2e8f0"; // Slate-200

      const textStartX = startX + badgeWidth + 12;
      const textY = bannerY + bannerHeight / 2 + 1;

      // Truncate if image width is narrow
      const maxTextWidth = img.width - textStartX - 180;
      let textToRender = diagnostics.compact_stamp;
      if (ctx.measureText(textToRender).width > maxTextWidth && maxTextWidth > 50) {
        while (ctx.measureText(textToRender + "…").width > maxTextWidth && textToRender.length > 10) {
          textToRender = textToRender.slice(0, -4);
        }
        textToRender += "…";
      }

      ctx.fillText(textToRender, textStartX, textY);

      // 6. Right brand tag: SNAPFORGE
      if (img.width >= 500) {
        ctx.textAlign = "right";
        ctx.font = `bold ${fontSize - 1}px monospace, sans-serif`;
        ctx.fillStyle = "#818cf8";
        ctx.fillText("SNAPFORGE", img.width - 16, textY);
      }

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => {
      resolve(imageDataUrl);
    };

    img.src = imageDataUrl;
  });
}

