"use client";

import { useEffect, useState } from "react";
import { Timer, Lightning } from "@phosphor-icons/react";
import { QuotaData } from "@/hooks/useQuota";
import AnimatedWLogo from "@/components/AnimatedLogo";

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

interface QuotaIndicatorProps {
  quota: QuotaData | null;
  loading: boolean;
}

export function QuotaIndicator({ quota, loading }: QuotaIndicatorProps) {
  const resetsAt = quota ? new Date(quota.resetsAt) : null;
  const countdown = useCountdown(resetsAt || new Date());

  if (loading) {
    return (
      <div className="flex flex-col items-end gap-1 absolute right-10 top-5">
        <div className="flex items-center gap-2 rounded-full bg-[var(--color-neutral-100)] px-4 py-2">
          <AnimatedWLogo size={20} />
          <span className="text-sm font-medium text-[var(--color-neutral-400)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (!quota) return null;

  const exhausted = quota.remaining === 0;

  return (
    <div className="flex flex-col items-end gap-1 absolute right-10 top-5">
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-4 py-2 text-sm font-semibold text-white flex items-center gap-3 ${
            exhausted ? "bg-red-500" : "bg-[var(--color-primary)]"
          }`}
        >
          <Lightning size={16} weight="fill" className="text-white" />
          <span className="text-sm font-semibold text-white">
            {quota.remaining} / {quota.limit}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Timer size={12} className="text-[var(--color-neutral-600)]" />
        <span className="text-[11px] font-mono tabular-nums text-[var(--color-neutral-600)]">
          Resets in {countdown}
        </span>
      </div>
    </div>
  );
}
