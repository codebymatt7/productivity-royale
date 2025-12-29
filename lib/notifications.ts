/**
 * Notification system for LifeMaxxing Royale
 * Supports iOS web app notifications when added to home screen
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

export function scheduleNotifications() {
  if (typeof window === "undefined") return;

  // Check and schedule morning notification (8 AM)
  checkAndScheduleNotification(8, 0, {
    title: "🌅 Morning Check-In",
    body: "Time for your daily affirmation and to start your quests!",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    tag: "morning-checkin",
    requireInteraction: false,
  });

  // Check and schedule evening notification (8 PM)
  checkAndScheduleNotification(20, 0, {
    title: "🌙 Evening Reflection",
    body: "How did you battle today? Time to reflect on your journey.",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    tag: "evening-reflection",
    requireInteraction: false,
  });

  // Set up interval to check every minute if we should show a notification
  setInterval(() => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Morning check-in (8:00 AM)
    if (hour === 8 && minute === 0) {
      showNotification({
        title: "🌅 Morning Check-In",
        body: "Time for your daily affirmation and to start your quests!",
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        tag: "morning-checkin",
        requireInteraction: false,
      });
    }

    // Evening reflection (8:00 PM)
    if (hour === 20 && minute === 0) {
      showNotification({
        title: "🌙 Evening Reflection",
        body: "How did you battle today? Time to reflect on your journey.",
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        tag: "evening-reflection",
        requireInteraction: false,
      });
    }

    // Weekly ritual reminder (Sunday at 9:00 AM)
    if (hour === 9 && minute === 0 && now.getDay() === 0) {
      showNotification({
        title: "📊 Weekly Ritual",
        body: "Time to complete your weekly review! Face the reality of your week.",
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        tag: "weekly-ritual",
        requireInteraction: false,
      });
    }
  }, 60000); // Check every minute
}

function checkAndScheduleNotification(
  hour: number,
  minute: number,
  options: NotificationOptions
) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // If it's the right time, show notification immediately
  if (currentHour === hour && currentMinute === minute) {
    showNotification(options);
  }
}

async function showNotification(options: NotificationOptions) {
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(options.title || "", options);
      } catch (error) {
        // Fallback to regular notification if service worker fails
        new Notification(options.title || "", options);
      }
    } else {
      new Notification(options.title || "", options);
    }
  }
}

export function initializeNotifications() {
  if (typeof window === "undefined") return;

  // Request permission on load
  requestNotificationPermission().then((granted) => {
    if (granted) {
      scheduleNotifications();
    }
  });

  // Handle notification clicks
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "notificationclick") {
        window.focus();
        // Navigate to the app
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
    });
  }
}

