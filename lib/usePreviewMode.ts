"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("bglrr-preview-change", onStoreChange);
  return () => window.removeEventListener("bglrr-preview-change", onStoreChange);
}

function getSnapshot() {
  if (process.env.NODE_ENV === "production") return false;

  const hasPreviewCookie = document.cookie.split("; ").includes("bglrr_preview=1");
  const hasPreviewQuery = new URLSearchParams(window.location.search).get("preview") === "1";
  return hasPreviewCookie || hasPreviewQuery;
}

function getServerSnapshot() {
  return false;
}

export function usePreviewMode() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
