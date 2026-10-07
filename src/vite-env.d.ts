/// <reference types="vite/client" />

/** App version injected from package.json via Vite `define` (see vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_DISCORD_CRASH_WEBHOOK_URL?: string;
  readonly VITE_DISCORD_FEEDBACK_WEBHOOK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
