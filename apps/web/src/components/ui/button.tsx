"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
          size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs",
          variant === "primary" && "bg-brand-500 text-white hover:bg-brand-600",
          variant === "secondary" && "bg-white text-ink border border-line-hairline hover:bg-plane dark:bg-white/5 dark:text-white dark:border-white/10",
          variant === "ghost" && "text-ink-secondary hover:bg-plane dark:text-white/70 dark:hover:bg-white/5",
          variant === "danger" && "bg-status-critical text-white hover:opacity-90",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
