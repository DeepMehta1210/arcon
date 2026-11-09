import React from "react";

interface ArconLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

export function ArconLogo({ size = "md", showWordmark = true }: ArconLogoProps) {
  const iconSize = {
    sm: 18,
    md: 20,
    lg: 24,
  }[size];

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 shadow-sm">
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4L4.5 19.5H8.5L12 12L15.5 19.5H19.5L12 4Z"
            fill="currentColor"
            className="text-white"
          />
        </svg>
      </div>

      {showWordmark && (
        <span className="text-sm font-semibold tracking-tight text-white font-sans">
          Arcon
        </span>
      )}
    </div>
  );
}
