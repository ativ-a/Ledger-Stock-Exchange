import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot } from "../live/liveQuoteStore";

// Live {price, timestamp} for a symbol via the backend's websocket relay, or null until the
// first tick arrives. Purely additive — callers keep using their REST-fetched quote for
// everything else (previousClose, name, day range, ...) and only swap in the live price.
export function useLiveQuote(symbol) {
  return useSyncExternalStore(
    (callback) => subscribe(symbol, callback),
    () => getSnapshot(symbol)
  );
}
