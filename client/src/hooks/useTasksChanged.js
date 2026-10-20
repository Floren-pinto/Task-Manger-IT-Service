import { useEffect } from "react";
import { subscribeTasksChanged } from "../utils/taskEvents.js";

export function useTasksChanged(callback) {
  useEffect(() => subscribeTasksChanged(callback), [callback]);
}
