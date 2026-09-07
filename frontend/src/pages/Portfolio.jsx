import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import SymbolAutocomplete from "../components/SymbolAutocomplete";
import AllocationBar from "../components/AllocationBar";
import InsightsCard from "../components/InsightsCard";
import { getPortfolioInsights } from "../insights/portfolioInsights";

export default function Portfolio() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ symbol: "", shares: "", cost_basis: "" });
  const [error, setError] = useState("");

  async function refresh() {
    const d = await api.getPortfolio();
    setData(d);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd(e) {
    e?.preventDefault();
    setError("");
    const { symbol, shares, cost_basis } = form;
    if (!symbol || !shares || !cost_basis) {
      setError("Fill in symbol, shares, and cost basis.");
      return;
    }
    try {
      await api.quote(symbol.toUpperCase());
      await api.addHolding(symbol.toUpperCase(), Number(shares), Number(cost_basis));
      setForm({ symbol: "", shares: "", cost_basis: "" });
      refresh();
    } catch {
      setError(`Couldn't find "${symbol}"`);
    }
  }

  async function handleRemove(id) {
    await api.removeHolding(id);
    refresh();
  }

  if (!data) return <div className="p-6 text-muted text-sm">Loading…</div>;

  const gainUp = data.totalGain >= 0;
  const insights = getPortfolioInsights(data.holdings);

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="font-display font-600 text-lg mb-4">Portfolio</h2>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <SummaryCard label="Total Value" value={`$${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        <SummaryCard label="Total Cost" value={`$${data.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        <SummaryCard
          label="Unrealized Gain"
          value={`${gainUp ? "+" : ""}$${data.totalGain.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${data.totalGainPercent.toFixed(2)}%)`}
          color={gainUp ? "text-positive" : "text-negative"}
        />
      </div>

      <div className="bg-panel border border-border rounded-lg p-4 mb-6">
        <div className="text-[10px] uppercase tracking-wider text-muted mb-3">Allocation</div>
        <AllocationBar holdings={data.holdings} />
      </div>

      {insights.length > 0 && (
        <div className="mb-6">
          <InsightsCard insights={insights} />
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2 mb-2">
        <div className="w-28">
          <SymbolAutocomplete
            value={form.symbol}
            onChange={(v) => setForm({ ...form, symbol: v })}
            onSelect={(sym) => setForm({ ...form, symbol: sym })}
            onSubmit={handleAdd}
            placeholder="Symbol"
            className="bg-panel border border-border rounded-md px-3 py-2 text-sm w-28 mono-num focus:outline-none focus:border-accent"
          />
        </div>
        <input
          value={form.shares}
          onChange={(e) => setForm({ ...form, shares: e.target.value })}
          placeholder="Shares"
          className="bg-panel border border-border rounded-md px-3 py-2 text-sm w-28 mono-num focus:outline-none focus:border-accent"
        />
        <input
          value={form.cost_basis}
          onChange={(e) => setForm({ ...form, cost_basis: e.target.value })}
          placeholder="Cost / share"
          className="bg-panel border border-border rounded-md px-3 py-2 text-sm w-32 mono-num focus:outline-none focus:border-accent"
        />
        <button className="bg-accent text-base font-600 px-4 py-2 rounded-md text-sm hover:opacity-90">Add</button>
      </form>
      {error && <div className="text-negative text-xs mb-4">{error}</div>}

      <div className="bg-panel border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted text-xs uppercase tracking-wider border-b border-border">
              <th className="px-4 py-2">Symbol</th>
              <th className="px-4 py-2 text-right">Shares</th>
              <th className="px-4 py-2 text-right">Cost Basis</th>
              <th className="px-4 py-2 text-right">Current</th>
              <th className="px-4 py-2 text-right">Value</th>
              <th className="px-4 py-2 text-right">Gain</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.holdings.map((h) => (
              <tr key={h.id} className="hover:bg-panel2">
                <td className="px-4 py-2">
                  <Link to={`/stock/${h.symbol}`} className="font-display font-600 text-accent hover:underline">
                    {h.symbol}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right mono-num">{h.shares}</td>
                <td className="px-4 py-2 text-right mono-num">${h.cost_basis.toFixed(2)}</td>
                <td className="px-4 py-2 text-right mono-num">${h.currentPrice.toFixed(2)}</td>
                <td className="px-4 py-2 text-right mono-num">${h.value.toFixed(2)}</td>
                <td className={`px-4 py-2 text-right mono-num ${h.gain >= 0 ? "text-positive" : "text-negative"}`}>
                  {h.gain >= 0 ? "+" : ""}${h.gain.toFixed(2)} ({h.gainPercent.toFixed(2)}%)
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => handleRemove(h.id)} className="text-muted hover:text-negative text-xs">✕</button>
                </td>
              </tr>
            ))}
            {data.holdings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">No holdings yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color = "text-ink" }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted mb-1">{label}</div>
      <div className={`text-xl mono-num font-600 ${color}`}>{value}</div>
    </div>
  );
}
