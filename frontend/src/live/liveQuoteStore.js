const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_URL = BASE_URL.replace(/^http/, "ws") + "/ws";

// Lightweight pub-sub outside React, backing useLiveQuote's useSyncExternalStore. One
// websocket is shared across every subscribed component; the connection opens lazily on
// the first subscribe() and reconnects with backoff, re-subscribing everything on the way
// back up. Ticks land here as {price, timestamp} per symbol — components combine that with
// their REST-fetched quote (previousClose, name, etc.) rather than this store trying to
// know anything about the rest of a quote.

const trades = new Map(); // symbol -> {price, timestamp}
const listeners = new Map(); // symbol -> Set<callback>
let ws = null;
let reconnectDelay = 1000;
const maxReconnectDelay = 15000;

function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function connect() {
  if (ws) return;
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    reconnectDelay = 1000;
    for (const symbol of listeners.keys()) send({ type: "subscribe", symbol });
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg.type !== "trade" || !msg.symbol) return;
    trades.set(msg.symbol, { price: msg.price, timestamp: msg.timestamp });
    listeners.get(msg.symbol)?.forEach((cb) => cb());
  };

  ws.onclose = () => {
    ws = null;
    if (listeners.size === 0) return;
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
  };

  ws.onerror = () => ws?.close();
}

export function subscribe(symbol, callback) {
  if (!symbol) return () => {};
  let set = listeners.get(symbol);
  const isNew = !set;
  if (!set) {
    set = new Set();
    listeners.set(symbol, set);
  }
  set.add(callback);

  connect();
  if (isNew) send({ type: "subscribe", symbol });

  return () => {
    const current = listeners.get(symbol);
    if (!current) return;
    current.delete(callback);
    if (current.size === 0) {
      listeners.delete(symbol);
      trades.delete(symbol);
      send({ type: "unsubscribe", symbol });
    }
  };
}

export function getSnapshot(symbol) {
  return trades.get(symbol) ?? null;
}
