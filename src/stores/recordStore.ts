import { create } from "zustand";

export interface RecordState {
  isRecording: boolean;
  recordingBlob: Blob | null;
  recordingDuration: number; // in seconds
  isConverting: boolean;
  conversionProgress: number; // 0 to 100
  isPreviewOpen: boolean;

  startRecording: () => void;
  stopRecording: () => void;
  setRecordingBlob: (blob: Blob | null) => void;
  setRecordingDuration: (duration: number) => void;
  incrementDuration: () => void;
  setIsConverting: (isConverting: boolean) => void;
  setConversionProgress: (progress: number) => void;
  setIsPreviewOpen: (isOpen: boolean) => void;
  resetRecording: () => void;
}

export const useRecordStore = create<RecordState>((set) => ({
  isRecording: false,
  recordingBlob: null,
  recordingDuration: 0,
  isConverting: false,
  conversionProgress: 0,
  isPreviewOpen: false,

  startRecording: () =>
    set({
      isRecording: true,
      recordingDuration: 0,
      recordingBlob: null,
      isPreviewOpen: false,
    }),

  stopRecording: () =>
    set({
      isRecording: false,
    }),

  setRecordingBlob: (recordingBlob: Blob | null) =>
    set({ recordingBlob, isPreviewOpen: Boolean(recordingBlob) }),

  setRecordingDuration: (recordingDuration: number) =>
    set({ recordingDuration }),

  incrementDuration: () =>
    set((state) => ({ recordingDuration: state.recordingDuration + 1 })),

  setIsConverting: (isConverting: boolean) => set({ isConverting }),

  setConversionProgress: (conversionProgress: number) =>
    set({ conversionProgress: Math.min(100, Math.max(0, conversionProgress)) }),

  setIsPreviewOpen: (isPreviewOpen: boolean) => set({ isPreviewOpen }),

  resetRecording: () =>
    set({
      isRecording: false,
      recordingBlob: null,
      recordingDuration: 0,
      isConverting: false,
      conversionProgress: 0,
      isPreviewOpen: false,
    }),
}));
