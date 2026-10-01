import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "purple" | "blue" | "rose" | "emerald";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  className = "",
}) => {
  const variantStyles = {
    default: "bg-neutral-800 text-neutral-200 border-neutral-700/60",
    purple: "bg-purple-950/80 text-purple-200 border-purple-400/40",
    blue: "bg-blue-900/60 text-blue-200 border-blue-500/40",
    rose: "bg-rose-950/80 text-rose-200 border-rose-500/40",
    emerald: "bg-emerald-950/80 text-emerald-200 border-emerald-400/40",
  }[variant];

  return (
    <span
      className={`inline-flex items-center justify-center text-[10px] font-mono px-1 py-0.2 rounded-full border font-bold ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
};
