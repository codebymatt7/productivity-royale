"use client";

import { useEffect } from "react";
import { initializeNotifications } from "@/lib/notifications";

export default function NotificationSetup() {
  useEffect(() => {
    // Register service worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
        })
        .catch((error) => {
          console.log("Service Worker registration failed:", error);
        });
    }

    // Initialize notifications
    initializeNotifications();
  }, []);

  return null; // This component doesn't render anything
}

