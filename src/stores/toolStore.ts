import { create } from "zustand";

export type ToolType =
  | "select"
  | "arrow"
  | "rect"
  | "pen"
  | "crop"
  | "stepBadge"
  | "eyedropper"
  | "ruler"
  | "ocr"
  | "spotlight"
  | "laser"
  | "flowBuilder";

export interface ToolState {
  activeTool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  stepCounter: number;
  isOcrProcessing: boolean;
  spotlightRadius: number;
  setActiveTool: (tool: ToolType) => void;
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
  strokeColor: "#ef4444",
  strokeWidth: 3,
  stepCounter: 1,
  isOcrProcessing: false,
  spotlightRadius: 120,
  setActiveTool: (activeTool: ToolType) => set({ activeTool }),
  setStrokeColor: (strokeColor: string) => set({ strokeColor }),
  setStrokeWidth: (strokeWidth: number) => set({ strokeWidth }),
  incrementStepCounter: () =>
    set((state) => ({ stepCounter: state.stepCounter + 1 })),
  resetStepCounter: () => set({ stepCounter: 1 }),
  setStepCounter: (stepCounter: number) => set({ stepCounter }),
  setIsOcrProcessing: (isOcrProcessing: boolean) => set({ isOcrProcessing }),
  setSpotlightRadius: (spotlightRadius: number) => set({ spotlightRadius }),
}));
