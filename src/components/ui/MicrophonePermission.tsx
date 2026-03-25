"use client";

import { useEffect } from "react";

export function MicrophonePermission() {
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return;

    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (process.env.NODE_ENV === "development") {
          console.log("Mikrofon izni:", result.state);
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
