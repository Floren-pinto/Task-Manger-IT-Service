const CLIENTS_CHANGED_EVENT = "task-manager:clients-changed";

export function emitClientsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLIENTS_CHANGED_EVENT));
}

export function subscribeClientsChanged(listener) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(CLIENTS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(CLIENTS_CHANGED_EVENT, listener);
}
