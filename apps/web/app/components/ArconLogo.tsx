import React from "react";

interface ArconLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

export function ArconLogo({ size = "md", showWordmark = true }: ArconLogoProps) {
  const iconSize = {
    sm: 20,
    md: 24,
    lg: 32,
  }[size];

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Minimalist Geometric Monogram */}
      <div className="flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 p-1.5 shadow-sm">
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Minimalist modern 'A' mark */}
          <path
            d="M12 4L4 19H8L12 11L16 19H20L12 4Z"
            fill="currentColor"
            className="text-white"
          />
          <circle cx="12" cy="15.5" r="1.5" fill="currentColor" className="text-zinc-400" />
        </svg>
      </div>

      {showWordmark && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-white">
            Arcon
          </span>
          <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
            Outbound
          </span>
        </div>
      )}
    </div>
  );
}
