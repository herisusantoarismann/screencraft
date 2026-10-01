import React from "react";
import { Loader2 } from "lucide-react";

export interface SpinnerProps {
  className?: string;
  size?: number;
}

export const Spinner: React.FC<SpinnerProps> = ({
  className = "w-3.5 h-3.5 animate-spin",
  size,
}) => {
  return <Loader2 className={className} size={size} />;
};
