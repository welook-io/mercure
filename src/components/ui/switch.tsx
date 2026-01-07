"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends React.HTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "default";
}

export function Switch({
  checked = false,
  onCheckedChange,
  disabled = false,
  size = "default",
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out",
        "focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-orange-500" : "bg-neutral-200",
        size === "sm" ? "h-4 w-7" : "h-5 w-9",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
          size === "sm" ? "h-3 w-3" : "h-4 w-4",
          checked 
            ? size === "sm" ? "translate-x-3.5" : "translate-x-4.5"
            : "translate-x-0.5",
          "mt-0.5"
        )}
      />
    </button>
  );
}












