/**
 * ScreenCraft Automated Crash & Error Reporter
 * Dispatches application runtime errors and unhandled exceptions to Discord Webhook.
 */

import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../stores/settingsStore";

export interface CrashReportOptions {
  errorType: "React Error Boundary" | "Unhandled Error" | "Unhandled Promise Rejection" | "Manual Error";
  error: unknown;
  componentStack?: string;
}

// In-memory cache to prevent infinite spam loops or duplicated crash reports
const recentErrorTimestamps = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 30_000; // 30 seconds debounce per identical error
let lastReportTimestamp = 0;
const MIN_REPORT_INTERVAL_MS = 2_000; // At least 2 seconds between any reports
let isInitialized = false;

/**
 * Resolves Discord Webhook URL.
 * Priority:
 * 1. Environment variable (.env: VITE_DISCORD_CRASH_WEBHOOK_URL)
 * 2. User settings (Settings -> Webhooks tab: discordWebhookUrl)
 */
export const getCrashWebhookUrl = (): string => {
  const envUrl = (import.meta.env.VITE_DISCORD_CRASH_WEBHOOK_URL || "").trim();
  if (envUrl) return envUrl;

  const settingUrl = useSettingsStore.getState().discordWebhookUrl.trim();
  return settingUrl;
};

/**
 * Dispatches an error or crash report to the configured Discord Webhook.
 */
export const reportCrash = async (options: CrashReportOptions): Promise<boolean> => {
  const webhookUrl = getCrashWebhookUrl();
  if (!webhookUrl) {
    // Webhook URL is not configured yet, log quietly to console
    console.warn(
      "[CrashReporter] Discord crash webhook URL is not configured in .env or Settings. Skipping automated report.",
      options.error
    );
    return false;
  }

  // Extract message and stack
  let message = "Unknown error occurred";
  let stack = "";

  if (options.error instanceof Error) {
    message = options.error.message || options.error.name;
    stack = options.error.stack || "";
  } else if (typeof options.error === "string") {
    message = options.error;
  } else if (options.error && typeof options.error === "object") {
    try {
      message = JSON.stringify(options.error);
    } catch {
      message = String(options.error);
    }
  }

  // Deduplication check
  const errorSignature = `${options.errorType}:${message}:${(stack || "").slice(0, 120)}`;
  const now = Date.now();

  const lastSeen = recentErrorTimestamps.get(errorSignature);
  if (lastSeen && now - lastSeen < DEDUPLICATION_WINDOW_MS) {
    console.warn("[CrashReporter] Suppressing duplicated crash report:", message);
    return false;
  }

  if (now - lastReportTimestamp < MIN_REPORT_INTERVAL_MS) {
    console.warn("[CrashReporter] Throttling rapid crash report:", message);
    return false;
  }

  recentErrorTimestamps.set(errorSignature, now);
  lastReportTimestamp = now;

  const appVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.0.0";

  try {
    // 1. Primary: Native Rust IPC (immune to CORS and webview CSP)
    await invoke("send_discord_error_report", {
      webhookUrl,
      errorType: options.errorType,
      message,
      stack: stack || null,
      componentStack: options.componentStack || null,
      appVersion,
    });
    console.info("[CrashReporter] Successfully sent crash report to Discord Webhook.");
    return true;
  } catch (ipcError) {
    console.warn("[CrashReporter] Native Rust dispatch failed, attempting browser fetch fallback:", ipcError);

    // 2. Fallback: Direct HTTP POST fetch
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "ScreenCraft Crash Reporter",
          embeds: [
            {
              title: "🚨 ScreenCraft Error Report",
              color: 15548997,
              fields: [
                { name: "Error Type", value: `\`${options.errorType}\``, inline: true },
                { name: "Version", value: `\`v${appVersion}\``, inline: true },
                { name: "Message", value: `\`\`\`\n${message.slice(0, 950)}\n\`\`\``, inline: false },
                ...(stack
                  ? [{ name: "Stack Trace", value: `\`\`\`\n${stack.slice(0, 950)}\n\`\`\``, inline: false }]
                  : []),
              ],
              footer: { text: "ScreenCraft Diagnostic Telemetry" },
            },
          ],
        }),
      });
      return res.ok;
    } catch (fetchError) {
      console.error("[CrashReporter] Failed to send error report via fetch fallback:", fetchError);
      return false;
    }
  }
};

/**
 * Initializes global uncaught exception and unhandled rejection listeners.
 */
export const initGlobalCrashReporting = (): void => {
  if (isInitialized) return;
  isInitialized = true;

  // Catch unhandled JavaScript runtime exceptions
  window.addEventListener("error", (event) => {
    // Ignore harmless resize-observer loop errors or canvas benign warnings
    if (event.message?.includes("ResizeObserver loop completed")) return;

    reportCrash({
      errorType: "Unhandled Error",
      error: event.error || event.message,
    }).catch(() => {});
  });

  // Catch unhandled Promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    reportCrash({
      errorType: "Unhandled Promise Rejection",
      error: event.reason,
    }).catch(() => {});
  });

  console.info("[CrashReporter] Global error and crash listeners active.");
};

