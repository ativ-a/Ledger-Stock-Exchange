import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import SymbolAutocomplete from "./SymbolAutocomplete";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/screener", label: "Screener" },
  { to: "/portfolio", label: "Portfolio" },
];

export default function Nav() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function jumpTo(symbol) {
    navigate(`/stock/${symbol.toUpperCase()}`);
    setQuery("");
  }

  function onSubmit() {
    if (query.trim()) jumpTo(query.trim());
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
      <div className="flex items-center gap-8">
        <span className="font-display font-700 text-lg tracking-tight">
          LEDGER<span className="text-accent">.</span>
        </span>
        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded-md transition-colors ${
                  isActive ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex items-center w-56">
        <SymbolAutocomplete
          value={query}
          onChange={setQuery}
          onSelect={jumpTo}
          onSubmit={onSubmit}
          placeholder="Jump to symbol (e.g. NVDA)"
          className="bg-panel border border-border rounded-md px-3 py-1.5 text-sm w-56 mono-num placeholder:font-body focus:outline-none focus:border-accent"
        />
      </div>
    </div>
  );
}
