import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

const initialFilters = {
  min_price: "",
  max_price: "",
  min_market_cap: "",
  max_pe: "",
  min_change_pct: "",
  sector: "",
};

function fmtCap(n) {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n}`;
}

export default function Screener() {
  const [filters, setFilters] = useState(initialFilters);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  function update(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function runScreen(e) {
    e?.preventDefault();
    setLoading(true);
    setRan(true);
    const payload = {
      ...filters,
      min_price: filters.min_price || undefined,
      max_price: filters.max_price || undefined,
      min_market_cap: filters.min_market_cap ? Number(filters.min_market_cap) * 1e9 : undefined,
      max_pe: filters.max_pe || undefined,
      min_change_pct: filters.min_change_pct || undefined,
      sector: filters.sector || undefined,
      limit: 30,
    };
    const data = await api.screener(payload).catch(() => []);
    setResults(data);
    setLoading(false);
  }

  return (
    <div className="p-6">
      <h2 className="font-display font-600 text-lg mb-1">Screener</h2>
      <p className="text-xs text-muted mb-4">
        Filters a sample universe of ~45 large-cap tickers. Swap in a full index feed for production use.
      </p>

      <form onSubmit={runScreen} className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Field label="Min Price">
          <input value={filters.min_price} onChange={(e) => update("min_price", e.target.value)} className="input" placeholder="0" />
        </Field>
        <Field label="Max Price">
          <input value={filters.max_price} onChange={(e) => update("max_price", e.target.value)} className="input" placeholder="1000" />
        </Field>
        <Field label="Min Mkt Cap ($B)">
          <input value={filters.min_market_cap} onChange={(e) => update("min_market_cap", e.target.value)} className="input" placeholder="10" />
        </Field>
        <Field label="Max P/E">
          <input value={filters.max_pe} onChange={(e) => update("max_pe", e.target.value)} className="input" placeholder="40" />
        </Field>
        <Field label="Min Change %">
          <input value={filters.min_change_pct} onChange={(e) => update("min_change_pct", e.target.value)} className="input" placeholder="-5" />
        </Field>
        <Field label="Sector">
          <input value={filters.sector} onChange={(e) => update("sector", e.target.value)} className="input" placeholder="Technology" />
        </Field>
        <div className="col-span-2 md:col-span-6">
          <button className="bg-accent text-base font-600 px-4 py-2 rounded-md text-sm hover:opacity-90">
            {loading ? "Screening…" : "Run Screen"}
          </button>
        </div>
      </form>

      <div className="bg-panel border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted text-xs uppercase tracking-wider border-b border-border">
              <th className="px-4 py-2">Symbol</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2 text-right">Price</th>
              <th className="px-4 py-2 text-right">Chg %</th>
              <th className="px-4 py-2 text-right">Mkt Cap</th>
              <th className="px-4 py-2 text-right">P/E</th>
              <th className="px-4 py-2">Sector</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {results.map((r) => (
              <tr key={r.symbol} className="hover:bg-panel2">
                <td className="px-4 py-2">
                  <Link to={`/stock/${r.symbol}`} className="font-display font-600 text-accent hover:underline">
                    {r.symbol}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted truncate max-w-[180px]">{r.name}</td>
                <td className="px-4 py-2 text-right mono-num">${r.price?.toFixed(2)}</td>
                <td className={`px-4 py-2 text-right mono-num ${r.changePercent >= 0 ? "text-positive" : "text-negative"}`}>
                  {r.changePercent >= 0 ? "▲" : "▼"} {Math.abs(r.changePercent).toFixed(2)}%
                </td>
                <td className="px-4 py-2 text-right mono-num">{fmtCap(r.marketCap)}</td>
                <td className="px-4 py-2 text-right mono-num">{r.peRatio ? r.peRatio.toFixed(1) : "—"}</td>
                <td className="px-4 py-2 text-muted">{r.sector || "—"}</td>
              </tr>
            ))}
            {ran && !loading && results.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">No matches. Try loosening your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`.input { background: #12151B; border: 1px solid #22262E; border-radius: 6px; padding: 6px 10px; font-size: 13px; font-family: 'JetBrains Mono', monospace; width: 100%; }
      .input:focus { outline: none; border-color: #F5A623; }`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}
