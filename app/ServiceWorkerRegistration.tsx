"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // A previously served production build can otherwise keep controlling
      // this origin and mask current source changes during local development.
      navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))).catch(() => undefined);
      return;
    }
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/sw.js`).catch(() => {
        // Offline caching is a progressive enhancement. Browser storage and
        // export remain usable even when service workers are unavailable.
      });
    }
  }, []);
  return null;
}
