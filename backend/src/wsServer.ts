import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { finnhubWsRelay } from "./services/finnhubWs.js";

// Fan-out layer: each browser tab opens one connection here and subscribes only to the
// symbols it's currently displaying. This server is the only thing that talks to
// finnhubWsRelay, which in turn holds the single upstream Finnhub connection.
export function attachWsServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (client) => {
    const unsubscribers = new Map<string, () => void>();

    client.on("message", (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!msg?.symbol || typeof msg.symbol !== "string") return;
      const symbol = msg.symbol.toUpperCase();

      if (msg.type === "subscribe") {
        if (unsubscribers.has(symbol)) return;
        const unsubscribe = finnhubWsRelay.subscribe(symbol, (trade) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "trade", ...trade }));
          }
        });
        unsubscribers.set(symbol, unsubscribe);
      } else if (msg.type === "unsubscribe") {
        unsubscribers.get(symbol)?.();
        unsubscribers.delete(symbol);
      }
    });

    client.on("close", () => {
      for (const unsubscribe of unsubscribers.values()) unsubscribe();
      unsubscribers.clear();
    });
  });
}
