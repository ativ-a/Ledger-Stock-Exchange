import { Router } from "express";
import { SAMPLE_UNIVERSE, getEnrichedQuote, searchSymbols } from "../services/finnhub.js";
import { getDailyHistory } from "../services/alphavantage.js";
import { sliceRange, trimToRange, withIndicators } from "../services/indicators.js";

const router = Router();

router.get("/quote/:symbol", async (req, res) => {
  try {
    const quote = await getEnrichedQuote(req.params.symbol.toUpperCase());
    res.json(quote);
  } catch (err: any) {
    console.error(err.message);
    res.status(502).json({ detail: err.message });
  }
});

router.get("/history/:symbol", async (req, res) => {
  try {
    const range = String(req.query.range || "6mo");
    const symbol = req.params.symbol.toUpperCase();
    const raw = await getDailyHistory(symbol);
    const windowed = sliceRange(raw, range);
    const enriched = withIndicators(windowed);
    const points = trimToRange(enriched, range);
    res.json({ symbol, points });
  } catch (err: any) {
    console.error(err.message);
    res.status(502).json({ detail: err.message });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "");
    if (!q) return res.json([]);
    const results = await searchSymbols(q);
    res.json(results);
  } catch (err: any) {
    console.error(err.message);
    res.status(502).json({ detail: err.message });
  }
});

// GET screener over a curated sample universe (free-tier Finnhub has no bulk endpoint either).
router.get("/screener", async (req, res) => {
  try {
    const {
      min_price,
      max_price,
      min_market_cap,
      max_pe,
      min_change_pct,
      sector,
      limit,
    } = req.query as Record<string, string | undefined>;

    // Note: when filters are active this takes its candidate pool from the first N symbols
    // rather than the full universe, so a tight filter may return fewer than `limit` matches.
    // That's a deliberate tradeoff to keep unfiltered calls (like the Dashboard's movers
    // panel, which asks for limit=6) cheap instead of scanning the whole 45-symbol universe.
    const requested = Number(limit) > 0 ? Number(limit) : SAMPLE_UNIVERSE.length;
    const universe = SAMPLE_UNIVERSE.slice(0, requested);

    const quotes = await Promise.all(universe.map((s) => getEnrichedQuote(s).catch(() => null)));

    let results = quotes.filter((q): q is NonNullable<typeof q> => q !== null);

    if (min_price) results = results.filter((q) => q.price >= Number(min_price));
    if (max_price) results = results.filter((q) => q.price <= Number(max_price));
    if (min_market_cap) results = results.filter((q) => q.marketCap >= Number(min_market_cap));
    if (max_pe) results = results.filter((q) => (q.peRatio ?? Infinity) <= Number(max_pe));
    if (min_change_pct) results = results.filter((q) => q.changePercent >= Number(min_change_pct));
    if (sector) results = results.filter((q) => q.sector.toLowerCase().includes(sector.toLowerCase()));

    if (limit) results = results.slice(0, Number(limit));

    res.json(results);
  } catch (err: any) {
    console.error(err.message);
    res.status(502).json({ detail: err.message });
  }
});

export default router;
