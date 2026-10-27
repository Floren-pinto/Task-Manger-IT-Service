const NOTIFICATIONS_CHANGED_EVENT = "task-manager:notifications-changed";

export function emitNotificationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export function subscribeNotificationsChanged(listener) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
  return () =>
    window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
}
