const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  quote: (symbol) => request(`/api/quote/${symbol}`),
  history: (symbol, range = "6mo", interval = "1d") =>
    request(`/api/history/${symbol}?range=${range}&interval=${interval}`),
  search: (q) => request(`/api/search?q=${encodeURIComponent(q)}`),
  screener: (params) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null))
    ).toString();
    return request(`/api/screener?${qs}`);
  },
  getWatchlist: () => request("/api/watchlist"),
  addToWatchlist: (symbol) =>
    request("/api/watchlist", { method: "POST", body: JSON.stringify({ symbol }) }),
  removeFromWatchlist: (symbol) =>
    request(`/api/watchlist/${symbol}`, { method: "DELETE" }),
  getPortfolio: () => request("/api/portfolio"),
  addHolding: (symbol, shares, cost_basis) =>
    request("/api/portfolio", {
      method: "POST",
      body: JSON.stringify({ symbol, shares, cost_basis }),
    }),
  removeHolding: (index) => request(`/api/portfolio/${index}`, { method: "DELETE" }),
};
