export interface OcrArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrModalState {
  isOpen: boolean;
  text: string;
  copied: boolean;
}

export interface EyedropperState {
  x: number;
  y: number;
  hex: string;
  r: number;
  g: number;
  b: number;
  textColor: string;
  contrastStatus: string;
}

export interface BaseAnnotation {
  id: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface RectAnnotation extends BaseAnnotation {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: "arrow";
  points: [number, number, number, number];
}

export interface PenAnnotation extends BaseAnnotation {
  type: "pen";
  points: number[];
}

export interface StepBadgeAnnotation extends BaseAnnotation {
  type: "stepBadge";
  x: number;
  y: number;
  stepNumber: number;
  radius: number;
}

export interface BlurAnnotation extends BaseAnnotation {
  type: "blur";
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Annotation =
  | RectAnnotation
  | ArrowAnnotation
  | PenAnnotation
  | StepBadgeAnnotation
  | BlurAnnotation;

export interface Point {
  x: number;
  y: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ClickRipple {
  id: number;
  x: number;
  y: number;
}

export const COLOR_PRESETS = [
  { name: "Merah", value: "#ef4444" },
  { name: "Biru", value: "#3b82f6" },
  { name: "Hijau", value: "#10b981" },
  { name: "Kuning", value: "#eab308" },
] as const;
