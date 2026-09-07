import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useLiveQuote } from "../hooks/useLiveQuote";
import { deriveLive } from "../live/deriveLive";

function TickerItem({ quote }) {
  const live = useLiveQuote(quote.symbol);
  const { price, change, changePercent } = deriveLive(quote, live);
  const up = change >= 0;

  return (
    <span className="inline-flex items-center gap-2 px-4 text-xs mono-num">
      <span className="text-muted">{quote.symbol}</span>
      <span className={live ? "transition-colors" : ""}>{price?.toFixed(2)}</span>
      <span className={up ? "text-positive" : "text-negative"}>
        {up ? "▲" : "▼"} {Math.abs(changePercent).toFixed(2)}%
      </span>
      {live && <span className="w-1 h-1 rounded-full bg-positive" title="Live" />}
    </span>
  );
}

export default function TickerTape({ symbols }) {
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const list = symbols && symbols.length ? symbols : ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL"];
      const results = await Promise.all(
        list.map((s) => api.quote(s).catch(() => null))
      );
      if (!cancelled) setQuotes(results.filter(Boolean));
    }
    load();
    // The websocket keeps price/change fresh tick-by-tick; this poll just refreshes the
    // previousClose baseline and picks up symbols the live feed hasn't ticked yet.
    const id = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbols]);

  if (quotes.length === 0) return <div className="h-9 border-b border-border bg-panel" />;

  const doubled = [...quotes, ...quotes];

  return (
    <div className="h-9 border-b border-border bg-panel overflow-hidden whitespace-nowrap">
      <div className="ticker-track inline-flex items-center h-9">
        {doubled.map((q, i) => (
          <TickerItem key={i} quote={q} />
        ))}
      </div>
    </div>
  );
}
