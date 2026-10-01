import React from "react";
import { Check, AlertCircle } from "lucide-react";

export interface ToastProps {
  message: string | null;
  type?: "success" | "error" | "info";
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  actionLabel,
  onAction,
  className = "",
}) => {
  if (!message) return null;

  if (type === "error") {
    return (
      <div
        className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-red-950/90 border border-red-700 text-red-200 text-xs rounded-xl shadow-lg select-none ${className}`}
      >
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span>Error: {message}</span>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="underline font-bold ml-2 hover:text-white cursor-pointer"
          >
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 bg-neutral-900/95 border border-emerald-500/80 text-white text-xs font-bold rounded-2xl shadow-2xl shadow-emerald-500/20 animate-bounce select-none ${className}`}
    >
      <Check className="w-4 h-4 text-emerald-400" />
      <span>{message}</span>
    </div>
  );
};
