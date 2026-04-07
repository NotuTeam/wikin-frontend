"use client";

import { formatTime } from "@/lib";

interface TimerProps {
  remainingSeconds: number;
  className?: string;
}

export function Timer({ remainingSeconds, className = "" }: TimerProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 font-mono text-lg font-semibold ${className}`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span
        className={
          remainingSeconds < 60
            ? "text-red-600"
            : remainingSeconds < 300
            ? "text-amber-600"
            : "text-gray-900"
        }
      >
        {formatTime(remainingSeconds)}
      </span>
    </div>
  );
}
