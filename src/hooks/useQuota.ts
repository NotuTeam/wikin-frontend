"use client";

import { useEffect, useState } from "react";

export interface QuotaData {
  used: number;
  remaining: number;
  limit: number;
  resetsAt: string;
}

export function useQuota() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const res = await fetch("/api/quota", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setQuota(json.data);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchQuota();
  }, []);

  return { quota, loading };
}
