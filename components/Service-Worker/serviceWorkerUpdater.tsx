"use client";

import { useEffect } from "react";

export default function ServiceWorkerUpdater() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let handleVisibilityChange: (() => void) | undefined;

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        // Check for a new deploy every time the resident opens or returns to the app
        handleVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            reg.update();
          }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
      });

    // Reload the installed app automatically when the new sw.js takes over
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      if (handleVisibilityChange) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
