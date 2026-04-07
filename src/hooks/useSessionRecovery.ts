"use client";

import { useEffect, useState } from "react";
import {
  idbGetSession,
  idbDeleteSession,
  decryptLocalSession,
} from "@/lib";
import { SimulationSessionPayload } from "@/types";

export function useSessionRecovery() {
  const [sessionActive, setSessionActive] = useState(false);
  const [recoverableSession, setRecoverableSession] =
    useState<SimulationSessionPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const encrypted = await idbGetSession();
        if (!encrypted) {
          setIsLoading(false);
          return;
        }
        const payload = await decryptLocalSession(encrypted);
        if (!payload) {
          await idbDeleteSession();
          setIsLoading(false);
          return;
        }

        setSessionActive(true);
        setRecoverableSession(payload);
      } catch {
        try {
          await idbDeleteSession();
        } catch {}
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const clearSession = async () => {
    try {
      await idbDeleteSession();
    } catch {}
    setSessionActive(false);
    setRecoverableSession(null);
  };

  return {
    sessionActive,
    recoverableSession,
    isLoading,
    setSessionActive,
    setRecoverableSession,
    clearSession,
  };
}
