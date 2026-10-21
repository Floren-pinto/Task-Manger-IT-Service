import { useEffect } from "react";
import { subscribeClientsChanged } from "../utils/clientEvents.js";

export function useClientsChanged(callback) {
  useEffect(() => subscribeClientsChanged(callback), [callback]);
}
