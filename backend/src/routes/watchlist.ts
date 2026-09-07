import { Router } from "express";
import db from "../db/database.js";

const router = Router();

// Frontend expects a flat array of symbol strings, not row objects.
router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT symbol FROM watchlist ORDER BY added_at DESC").all() as { symbol: string }[];
  res.json(rows.map((r) => r.symbol));
});

router.post("/", (req, res) => {
  const { symbol } = req.body as { symbol?: string };
  if (!symbol) return res.status(400).json({ detail: "symbol is required" });

  try {
    db.prepare("INSERT OR IGNORE INTO watchlist (symbol) VALUES (?)").run(symbol.toUpperCase());
    res.status(201).json({ symbol: symbol.toUpperCase() });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

router.delete("/:symbol", (req, res) => {
  db.prepare("DELETE FROM watchlist WHERE symbol = ?").run(req.params.symbol.toUpperCase());
  res.status(204).send();
});

export default router;
