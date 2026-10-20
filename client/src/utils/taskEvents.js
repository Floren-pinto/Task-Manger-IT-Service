const TASKS_CHANGED_EVENT = "task-manager:tasks-changed";

export function emitTasksChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TASKS_CHANGED_EVENT));
}

export function subscribeTasksChanged(listener) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(TASKS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(TASKS_CHANGED_EVENT, listener);
}
