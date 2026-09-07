import React from "react";
import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import TickerTape from "./components/TickerTape";
import Dashboard from "./pages/Dashboard";
import Watchlist from "./pages/Watchlist";
import Screener from "./pages/Screener";
import Portfolio from "./pages/Portfolio";
import StockDetail from "./pages/StockDetail";

export default function App() {
  return (
    <div className="min-h-screen bg-base">
      <TickerTape symbols={["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "AMD"]} />
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/screener" element={<Screener />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/stock/:symbol" element={<StockDetail />} />
      </Routes>
    </div>
  );
}
