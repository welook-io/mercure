"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface CheckboxProps extends React.HTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "default";
}

export function Checkbox({
  checked = false,
  onCheckedChange,
  disabled = false,
  size = "default",
  className,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      className={cn(
        "shrink-0 border-2 rounded transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-40",
        checked 
          ? "bg-neutral-900 border-neutral-900" 
          : "bg-white border-neutral-300 hover:border-neutral-400",
        size === "sm" ? "h-4 w-4" : "h-5 w-5",
        className
      )}
      {...props}
    >
      {checked && (
        <Check 
          className={cn(
            "text-white",
            size === "sm" ? "h-3 w-3" : "h-4 w-4"
          )} 
          strokeWidth={3}
        />
      )}
    </button>
  );
}











