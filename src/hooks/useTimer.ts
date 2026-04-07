"use client";

import { useEffect, useState } from "react";

export function useTimer(
  remainingSeconds: number,
  isActive: boolean,
  onTick?: (seconds: number) => void
) {
  const [time, setTime] = useState(remainingSeconds);

  useEffect(() => {
    setTime(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (!isActive || time <= 0) return;

    const timer = setInterval(() => {
      setTime((prev) => {
        const next = Math.max(0, prev - 1);
        onTick?.(next);
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, time, onTick]);

  return time;
}
