"use client";

import { Toaster } from "react-hot-toast";

export function GlobalToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: "10px",
          fontSize: "14px",
        },
      }}
    />
  );
}
