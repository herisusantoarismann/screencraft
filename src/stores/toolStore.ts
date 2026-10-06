import { create } from "zustand";
import type { StampType } from "../types/canvas";

export type ToolType =
  | "select"
  | "arrow"
  | "rect"
  | "pen"
  | "blur"
  | "crop"
  | "stepBadge"
  | "stamp"
  | "eyedropper"
  | "ruler"
  | "ocr"
  | "spotlight"
  | "laser"
  | "flowBuilder";

export interface StampPreset {
  id: StampType;
  label: string;
  emoji: string;
  category: "severity" | "category";
  badgeColor: string;
  bgColor: string;
}

export const STAMP_PRESETS: StampPreset[] = [
  // Priority Badges (🔴 Urgent, 🟠 High, 🟡 Low)
  {
    id: "severity-critical",
    label: "Urgent / Blocker",
    emoji: "🔴",
    category: "severity",
    badgeColor: "#ef4444",
    bgColor: "rgba(69, 10, 10, 0.95)",
  },
  {
    id: "severity-major",
    label: "High Priority",
    emoji: "🟠",
    category: "severity",
    badgeColor: "#f97316",
    bgColor: "rgba(67, 20, 7, 0.95)",
  },
  {
    id: "severity-minor",
    label: "Low Priority / Note",
    emoji: "🟡",
    category: "severity",
    badgeColor: "#eab308",
    bgColor: "rgba(66, 32, 6, 0.95)",
  },
  // Callout & Category Badges ([ISSUE], [UI REVIEW], [PERF / SPEED], [SECURITY], [COPY / TYPO])
  {
    id: "category-bug",
    label: "[ISSUE]",
    emoji: "🐛",
    category: "category",
    badgeColor: "#f43f5e",
    bgColor: "rgba(76, 5, 25, 0.95)",
  },
  {
    id: "category-ui",
    label: "[UI REVIEW]",
    emoji: "🎨",
    category: "category",
    badgeColor: "#06b6d4",
    bgColor: "rgba(8, 51, 68, 0.95)",
  },
  {
    id: "category-perf",
    label: "[PERF / SPEED]",
    emoji: "⚡",
    category: "category",
    badgeColor: "#f59e0b",
    bgColor: "rgba(69, 26, 3, 0.95)",
  },
  {
    id: "category-security",
    label: "[SECURITY]",
    emoji: "🛡️",
    category: "category",
    badgeColor: "#a855f7",
    bgColor: "rgba(59, 7, 100, 0.95)",
  },
  {
    id: "category-typo",
    label: "[COPY / TYPO]",
    emoji: "✏️",
    category: "category",
    badgeColor: "#10b981",
    bgColor: "rgba(2, 44, 34, 0.95)",
  },
];

export interface CustomStampConfig {
  label: string;
  emoji: string;
  badgeColor: string;
  bgColor: string;
}

export interface ToolState {
  activeTool: ToolType;
  activeStamp: StampType;
  customStamp: CustomStampConfig;
  strokeColor: string;
  strokeWidth: number;
  stepCounter: number;
  isOcrProcessing: boolean;
  spotlightRadius: number;
  setActiveTool: (tool: ToolType) => void;
  setActiveStamp: (stamp: StampType) => void;
  setCustomStamp: (config: CustomStampConfig) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  incrementStepCounter: () => void;
  resetStepCounter: () => void;
  setStepCounter: (step: number) => void;
  setIsOcrProcessing: (isProcessing: boolean) => void;
  setSpotlightRadius: (radius: number) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: "select",
  activeStamp: "severity-critical",
  customStamp: {
    label: "[CUSTOM]",
    emoji: "📌",
    badgeColor: "#38bdf8",
    bgColor: "rgba(12, 74, 110, 0.95)",
  },
  strokeColor: "#ef4444",
  strokeWidth: 3,
  stepCounter: 1,
  isOcrProcessing: false,
  spotlightRadius: 120,
  setActiveTool: (activeTool: ToolType) => set({ activeTool }),
  setActiveStamp: (activeStamp: StampType) => set({ activeStamp }),
  setCustomStamp: (customStamp: CustomStampConfig) => set({ customStamp }),
  setStrokeColor: (strokeColor: string) => set({ strokeColor }),
  setStrokeWidth: (strokeWidth: number) => set({ strokeWidth }),
  incrementStepCounter: () =>
    set((state) => ({ stepCounter: state.stepCounter + 1 })),
  resetStepCounter: () => set({ stepCounter: 1 }),
  setStepCounter: (stepCounter: number) => set({ stepCounter }),
  setIsOcrProcessing: (isOcrProcessing: boolean) => set({ isOcrProcessing }),
  setSpotlightRadius: (spotlightRadius: number) => set({ spotlightRadius }),
}));
