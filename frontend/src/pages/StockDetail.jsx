import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import PriceChart from "../components/PriceChart";
import { useLiveQuote } from "../hooks/useLiveQuote";
import { deriveLive } from "../live/deriveLive";
import { getStockInsights } from "../insights/stockInsights";
import InsightsCard from "../components/InsightsCard";

const RANGES = ["1mo", "3mo", "6mo", "1y", "2y", "5y"];

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">{label}</div>
      <div className="mono-num text-sm">{value ?? "—"}</div>
    </div>
  );
}

function fmtCap(n) {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n}`;
}

export default function StockDetail() {
  const { symbol } = useParams();
  const [quote, setQuote] = useState(null);
  const [history, setHistory] = useState(null);
  const [range, setRange] = useState("6mo");
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [q, h, watchlist] = await Promise.all([
        api.quote(symbol).catch(() => null),
        api.history(symbol, range).catch(() => null),
        api.getWatchlist().catch(() => []),
      ]);
      if (!cancelled) {
        setQuote(q);
        setHistory(h);
        setInWatchlist(watchlist.includes(symbol.toUpperCase()));
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  async function toggleWatchlist() {
    if (inWatchlist) {
      await api.removeFromWatchlist(symbol);
    } else {
      await api.addToWatchlist(symbol);
    }
    setInWatchlist(!inWatchlist);
  }

  const live = useLiveQuote(symbol.toUpperCase());

  if (loading && !quote) return <div className="p-6 text-muted text-sm">Loading {symbol}…</div>;
  if (!quote) return <div className="p-6 text-negative text-sm">Couldn't load data for {symbol}.</div>;

  const { price, change, changePercent } = deriveLive(quote, live);
  const up = change >= 0;
  const lastRSI = history?.points?.[history.points.length - 1]?.rsi14;
  const insights = history?.points ? getStockInsights(quote, history.points) : [];

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display font-700 text-2xl">{quote.symbol}</h2>
            <button
              onClick={toggleWatchlist}
              className={`text-xs px-3 py-1 rounded-full border ${
                inWatchlist ? "border-accent text-accent" : "border-border text-muted hover:text-ink"
              }`}
            >
              {inWatchlist ? "★ On Watchlist" : "☆ Add to Watchlist"}
            </button>
          </div>
          <div className="text-muted text-sm mt-1">{quote.name} {quote.sector && `· ${quote.sector}`}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl mono-num font-600">${price.toFixed(2)}</div>
          <div className={`mono-num text-sm ${up ? "text-positive" : "text-negative"}`}>
            {up ? "▲" : "▼"} {change.toFixed(2)} ({Math.abs(changePercent).toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-3">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 text-xs rounded-md ${
              range === r ? "bg-panel2 text-accent" : "text-muted hover:text-ink"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="bg-panel border border-border rounded-lg p-4 mb-6">
        <PriceChart points={history?.points} />
        <div className="flex gap-4 mt-2 text-xs text-muted">
          <span><span className="text-accent">—</span> SMA 20</span>
          <span><span className="text-muted">—</span> SMA 50</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-panel border border-border rounded-lg p-4 mb-6">
        <Stat label="Day High" value={quote.dayHigh ? `$${quote.dayHigh.toFixed(2)}` : "—"} />
        <Stat label="Day Low" value={quote.dayLow ? `$${quote.dayLow.toFixed(2)}` : "—"} />
        <Stat label="52W High" value={quote.high52w ? `$${quote.high52w.toFixed(2)}` : "—"} />
        <Stat label="52W Low" value={quote.low52w ? `$${quote.low52w.toFixed(2)}` : "—"} />
        <Stat label="Market Cap" value={fmtCap(quote.marketCap)} />
        <Stat label="P/E Ratio" value={quote.peRatio ? quote.peRatio.toFixed(1) : "—"} />
        <Stat label="Volume" value={quote.volume ? quote.volume.toLocaleString() : "—"} />
        <Stat label="RSI (14)" value={lastRSI ? lastRSI.toFixed(1) : "—"} />
        <Stat label="Industry" value={quote.industry} />
      </div>

      <InsightsCard insights={insights} />
    </div>
  );
}
