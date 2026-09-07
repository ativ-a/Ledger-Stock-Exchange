import WebSocket from "ws";

// Single upstream connection to Finnhub's trade-tick feed, shared across every connected
// browser tab. Finnhub bills this the same free tier as the REST API (same FINNHUB_API_KEY) —
// but a websocket is one long-lived connection rather than polled calls, so this relay only
// subscribes upstream to symbols someone is actually looking at right now, and unsubscribes
// the moment the last listener for a symbol goes away.

export interface Trade {
  symbol: string;
  price: number;
  timestamp: number;
}

type TradeListener = (trade: Trade) => void;

const API_KEY = process.env.FINNHUB_API_KEY ?? "";
const UPSTREAM_URL = `wss://ws.finnhub.io?token=${API_KEY}`;

class FinnhubWsRelay {
  private ws: WebSocket | null = null;
  private connecting = false;
  private reconnectDelay = 1000;
  private readonly maxReconnectDelay = 30_000;
  private readonly listeners = new Map<string, Set<TradeListener>>();

  private ensureConnected() {
    if (this.ws || this.connecting) return;
    if (!API_KEY) {
      console.warn("Finnhub WS: no FINNHUB_API_KEY set, live quotes disabled.");
      return;
    }
    this.connecting = true;
    const socket = new WebSocket(UPSTREAM_URL);

    socket.on("open", () => {
      this.connecting = false;
      this.reconnectDelay = 1000;
      this.ws = socket;
      // Re-subscribe everything this relay currently has listeners for (covers reconnects).
      for (const symbol of this.listeners.keys()) {
        this.sendSubscribe(symbol);
      }
    });

    socket.on("message", (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.type !== "trade" || !Array.isArray(msg.data)) return;
      for (const t of msg.data) {
        const symbolListeners = this.listeners.get(t.s);
        if (!symbolListeners) continue;
        const trade: Trade = { symbol: t.s, price: t.p, timestamp: t.t };
        for (const listener of symbolListeners) listener(trade);
      }
    });

    socket.on("close", () => {
      this.ws = null;
      this.connecting = false;
      if (this.listeners.size === 0) return; // nothing to reconnect for
      setTimeout(() => this.ensureConnected(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    });

    socket.on("error", (err) => {
      console.error("Finnhub WS error:", err.message);
    });
  }

  private sendSubscribe(symbol: string) {
    this.ws?.send(JSON.stringify({ type: "subscribe", symbol }));
  }

  private sendUnsubscribe(symbol: string) {
    this.ws?.send(JSON.stringify({ type: "unsubscribe", symbol }));
  }

  // Returns an unsubscribe function. Multiple callers subscribing to the same symbol share
  // one upstream subscription; the upstream unsubscribe only fires once the last one leaves.
  subscribe(symbol: string, listener: TradeListener): () => void {
    const sym = symbol.toUpperCase();
    let set = this.listeners.get(sym);
    const isNewSymbol = !set;
    if (!set) {
      set = new Set();
      this.listeners.set(sym, set);
    }
    set.add(listener);

    this.ensureConnected();
    if (isNewSymbol && this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(sym);
    }

    return () => {
      const current = this.listeners.get(sym);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) {
        this.listeners.delete(sym);
        this.sendUnsubscribe(sym);
      }
    };
  }
}

export const finnhubWsRelay = new FinnhubWsRelay();
