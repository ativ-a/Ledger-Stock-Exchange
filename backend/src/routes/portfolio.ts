import { Router } from "express";
import db from "../db/database.js";
import { getEnrichedQuote } from "../services/finnhub.js";

const router = Router();

interface Row {
  id: number;
  symbol: string;
  shares: number;
  cost_basis: number;
  purchased_at: string | null;
}

// Frontend expects a computed aggregate: totals plus per-holding live P&L.
router.get("/", async (_req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM portfolio ORDER BY created_at DESC").all() as Row[];

    const holdings = await Promise.all(
      rows.map(async (r) => {
        const quote = await getEnrichedQuote(r.symbol).catch(() => null);
        const currentPrice = quote?.price ?? r.cost_basis;
        const value = currentPrice * r.shares;
        const cost = r.cost_basis * r.shares;
        const gain = value - cost;
        const gainPercent = cost !== 0 ? (gain / cost) * 100 : 0;
        return {
          id: r.id,
          symbol: r.symbol,
          shares: r.shares,
          cost_basis: r.cost_basis,
          currentPrice,
          value,
          gain,
          gainPercent,
        };
      })
    );

    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.cost_basis * h.shares, 0);
    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost !== 0 ? (totalGain / totalCost) * 100 : 0;

    res.json({ holdings, totalValue, totalCost, totalGain, totalGainPercent });
  } catch (err: any) {
    console.error(err.message);
    res.status(502).json({ detail: err.message });
  }
});

router.post("/", (req, res) => {
  const { symbol, shares, cost_basis, purchased_at } = req.body as Partial<Row>;
  if (!symbol || shares === undefined || cost_basis === undefined) {
    return res.status(400).json({ detail: "symbol, shares, and cost_basis are required" });
  }

  const info = db
    .prepare("INSERT INTO portfolio (symbol, shares, cost_basis, purchased_at) VALUES (?, ?, ?, ?)")
    .run(symbol.toUpperCase(), shares, cost_basis, purchased_at ?? null);

  res.status(201).json({ id: info.lastInsertRowid });
});

router.put("/:id", (req, res) => {
  const { shares, cost_basis, purchased_at } = req.body as Partial<Row>;
  db.prepare(
    "UPDATE portfolio SET shares = COALESCE(?, shares), cost_basis = COALESCE(?, cost_basis), purchased_at = COALESCE(?, purchased_at) WHERE id = ?"
  ).run(shares, cost_basis, purchased_at, req.params.id);
  res.status(200).json({ ok: true });
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM portfolio WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

export default router;
