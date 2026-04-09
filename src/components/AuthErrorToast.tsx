"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";

export function AuthErrorToast({ hasLoginError }: { hasLoginError: boolean }) {
  useEffect(() => {
    if (!hasLoginError) return;
    toast.error("Login gagal. Silakan coba lagi.");
  }, [hasLoginError]);

  return null;
}
