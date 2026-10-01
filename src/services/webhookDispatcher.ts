/**
 * Webhook Dispatcher Service
 * Dispatches Discord and Slack webhooks natively via Rust backend to bypass browser CORS restrictions.
 */
import { invoke } from "@tauri-apps/api/core";

const STORAGE_KEY_WEBHOOK_URL = "screencraft_webhook_url";

export type WebhookType = "discord" | "slack" | "unknown";

/**
 * Retrieves the last stored webhook URL from localStorage.
 */
export const getLastWebhookUrl = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY_WEBHOOK_URL) || "";
  } catch {
    return "";
  }
};

/**
 * Saves the last used webhook URL to localStorage.
 */
export const setLastWebhookUrl = (url: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY_WEBHOOK_URL, url.trim());
  } catch (err) {
    console.warn("[WebhookDispatcher] Failed to save webhook URL:", err);
  }
};

/**
 * Detects whether a webhook URL is for Discord, Slack, or unknown.
 */
export const detectWebhookType = (url: string): WebhookType => {
  const lower = url.toLowerCase().trim();
  if (lower.includes("discord.com/api/webhooks") || lower.includes("discordapp.com/api/webhooks")) {
    return "discord";
  }
  if (lower.includes("hooks.slack.com")) {
    return "slack";
  }
  return "unknown";
};

/**
 * Helper to convert Blob or data-URL string to Base64 string.
 */
export const toBase64 = async (input: Blob | string): Promise<string> => {
  if (typeof input === "string") {
    return input;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(input);
  });
};

/**
 * Dispatches image capture and Markdown notes to a Discord Webhook natively via Rust (bypassing CORS).
 */
export const sendToDiscordWebhook = async (
  webhookUrl: string,
  imageBase64OrBlob: Blob | string,
  contentText: string
): Promise<boolean> => {
  try {
    const base64Data = await toBase64(imageBase64OrBlob);

    // Primary: Native Rust execution (Zero CORS)
    await invoke("send_discord_webhook", {
      webhookUrl: webhookUrl.trim(),
      imageBase64: base64Data,
      content: contentText,
    });

    setLastWebhookUrl(webhookUrl);
    return true;
  } catch (error) {
    console.error("[WebhookDispatcher] Discord native dispatch error:", error);
    return false;
  }
};

/**
 * Dispatches Markdown message to a Slack Incoming Webhook natively via Rust (bypassing browser CORS).
 */
export const sendToSlackWebhook = async (
  webhookUrl: string,
  _imageBase64OrBlob: Blob | string,
  messageText: string
): Promise<boolean> => {
  try {
    // Primary: Native Rust execution (Zero CORS)
    await invoke("send_slack_webhook", {
      webhookUrl: webhookUrl.trim(),
      messageText,
    });

    setLastWebhookUrl(webhookUrl);
    return true;
  } catch (error) {
    console.error("[WebhookDispatcher] Slack native dispatch error:", error);
    return false;
  }
};
