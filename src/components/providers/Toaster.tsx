"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: "12px",
          fontWeight: "600",
          fontSize: "14px",
          padding: "12px 16px",
        },
        success: {
          style: { background: "#2E7D32", color: "white" },
          iconTheme: { primary: "white", secondary: "#2E7D32" },
        },
        error: {
          style: { background: "#D32F2F", color: "white" },
          iconTheme: { primary: "white", secondary: "#D32F2F" },
        },
      }}
    />
  );
}
