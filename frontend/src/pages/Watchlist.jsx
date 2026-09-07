import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import SymbolAutocomplete from "../components/SymbolAutocomplete";
import { useLiveQuote } from "../hooks/useLiveQuote";
import { deriveLive } from "../live/deriveLive";

function WatchlistRow({ sym, q, onRemove }) {
  const live = useLiveQuote(sym);
  const derived = q ? deriveLive(q, live) : null;
  const up = derived?.changePercent >= 0;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <Link to={`/stock/${sym}`} className="flex items-center gap-3">
        <span className="font-display font-600 text-sm w-16 flex items-center gap-1.5">
          {sym}
          {live && <span className="w-1 h-1 rounded-full bg-positive" title="Live" />}
        </span>
        <span className="text-xs text-muted truncate max-w-[240px]">{q?.name}</span>
      </Link>
      <div className="flex items-center gap-4">
        {derived ? (
          <>
            <span className="mono-num text-sm">${derived.price?.toFixed(2)}</span>
            <span className={`mono-num text-xs w-16 text-right ${up ? "text-positive" : "text-negative"}`}>
              {up ? "▲" : "▼"} {Math.abs(derived.changePercent).toFixed(2)}%
            </span>
          </>
        ) : (
          <span className="text-muted text-xs">—</span>
        )}
        <button onClick={onRemove} className="text-muted hover:text-negative text-xs px-2" title="Remove">
          ✕
        </button>
      </div>
    </div>
  );
}

export default function Watchlist() {
  const [symbols, setSymbols] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const list = await api.getWatchlist();
    setSymbols(list);
    const results = await Promise.all(list.map((s) => api.quote(s).catch(() => null)));
    const map = {};
    results.forEach((q, i) => {
      if (q) map[list[i]] = q;
    });
    setQuotes(map);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addSymbol(raw) {
    setError("");
    const sym = raw.trim().toUpperCase();
    if (!sym) return;
    try {
      await api.quote(sym); // validate it exists
      await api.addToWatchlist(sym);
      setInput("");
      refresh();
    } catch (err) {
      setError(`Couldn't find "${sym}"`);
    }
  }

  function handleAdd(e) {
    e.preventDefault();
    addSymbol(input);
  }

  async function handleRemove(sym) {
    await api.removeFromWatchlist(sym);
    refresh();
  }

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="font-display font-600 text-lg mb-4">Watchlist</h2>

      <form onSubmit={handleAdd} className="flex gap-2 mb-2">
        <div className="flex-1">
          <SymbolAutocomplete
            value={input}
            onChange={setInput}
            onSelect={addSymbol}
            onSubmit={() => addSymbol(input)}
            placeholder="Add symbol (e.g. AMD)"
            className="bg-panel border border-border rounded-md px-3 py-2 text-sm w-full mono-num focus:outline-none focus:border-accent"
          />
        </div>
        <button className="bg-accent text-base font-600 px-4 py-2 rounded-md text-sm hover:opacity-90">
          Add
        </button>
      </form>
      {error && <div className="text-negative text-xs mb-4">{error}</div>}

      <div className="bg-panel border border-border rounded-lg divide-y divide-border">
        {symbols.length === 0 && (
          <div className="p-6 text-center text-muted text-sm">Your watchlist is empty.</div>
        )}
        {symbols.map((sym) => (
          <WatchlistRow key={sym} sym={sym} q={quotes[sym]} onRemove={() => handleRemove(sym)} />
        ))}
      </div>
    </div>
  );
}
