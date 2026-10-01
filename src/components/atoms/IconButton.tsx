import React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label?: string;
  badge?: React.ReactNode;
  active?: boolean;
  activeColor?: "blue" | "indigo" | "amber" | "rose" | "purple" | "emerald";
  variant?: "ghost" | "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  badge,
  active = false,
  activeColor = "blue",
  variant = "ghost",
  size = "md",
  className = "",
  disabled,
  children,
  ...props
}) => {
  // Active color map
  const activeColorMap: Record<string, string> = {
    blue: "bg-blue-600 text-white shadow-md shadow-blue-600/30",
    indigo: "bg-indigo-600 text-white shadow-md shadow-indigo-600/30",
    amber: "bg-amber-600 text-white shadow-md shadow-amber-600/30",
    rose: "bg-rose-600 text-white shadow-md shadow-rose-600/30",
    purple: "bg-purple-600 text-white shadow-md shadow-purple-600/30",
    emerald: "bg-emerald-600 text-white shadow-md shadow-emerald-600/30",
  };

  const variantStyles = {
    ghost: active
      ? activeColorMap[activeColor]
      : "text-neutral-400 hover:text-white hover:bg-neutral-800",
    primary:
      "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30",
    secondary:
      "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700/60",
    danger:
      "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30",
    success:
      "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30",
  }[variant];

  const sizeStyles = {
    sm: "p-1.5 rounded-lg text-xs",
    md: label ? "px-2.5 py-1.5 rounded-xl text-xs" : "p-2 rounded-xl text-xs",
    lg: "px-3 py-2 rounded-xl text-sm",
  }[size];

  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {icon}
      {label && <span>{label}</span>}
      {badge}
      {children}
    </button>
  );
};
