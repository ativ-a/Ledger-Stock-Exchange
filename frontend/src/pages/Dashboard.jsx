import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useLiveQuote } from "../hooks/useLiveQuote";
import { deriveLive } from "../live/deriveLive";

function QuoteCard({ q }) {
  const live = useLiveQuote(q.symbol);
  const { price, changePercent } = deriveLive(q, live);
  const up = changePercent >= 0;
  return (
    <Link
      to={`/stock/${q.symbol}`}
      className="block bg-panel border border-border rounded-lg p-4 hover:border-accent transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-display font-600 text-sm flex items-center gap-1.5">
          {q.symbol}
          {live && <span className="w-1 h-1 rounded-full bg-positive" title="Live" />}
        </span>
        <span className={`text-xs mono-num ${up ? "text-positive" : "text-negative"}`}>
          {up ? "▲" : "▼"} {Math.abs(changePercent).toFixed(2)}%
        </span>
      </div>
      <div className="text-2xl mono-num font-600">${price?.toFixed(2)}</div>
      <div className="text-xs text-muted mt-1 truncate">{q.name}</div>
    </Link>
  );
}

export default function Dashboard() {
  const [watchQuotes, setWatchQuotes] = useState([]);
  const [movers, setMovers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const watchlist = await api.getWatchlist().catch(() => []);
      const symbols = watchlist.length ? watchlist : ["AAPL", "MSFT", "NVDA", "TSLA"];
      const [wq, screened] = await Promise.all([
        Promise.all(symbols.map((s) => api.quote(s).catch(() => null))),
        api.screener({ limit: 6 }).catch(() => []),
      ]);
      setWatchQuotes(wq.filter(Boolean));
      setMovers(screened);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-6 space-y-8">
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display font-600 text-sm text-muted uppercase tracking-wider">Your Watchlist</h2>
          <Link to="/watchlist" className="text-xs text-accent hover:underline">Manage →</Link>
        </div>
        {loading ? (
          <div className="text-muted text-sm">Loading quotes…</div>
        ) : watchQuotes.length === 0 ? (
          <div className="text-muted text-sm bg-panel border border-border rounded-lg p-6 text-center">
            No symbols yet. Add some from the Watchlist tab.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {watchQuotes.map((q) => (
              <QuoteCard key={q.symbol} q={q} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display font-600 text-sm text-muted uppercase tracking-wider">Top Movers Today</h2>
          <Link to="/screener" className="text-xs text-accent hover:underline">Full screener →</Link>
        </div>
        {loading ? (
          <div className="text-muted text-sm">Loading…</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {movers.map((q) => (
              <QuoteCard key={q.symbol} q={{ ...q, name: q.name }} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
