import axios from "axios";
import NodeCache from "node-cache";
import type { HistoryPoint } from "../types.js";

// Daily OHLCV history. Used in place of Stooq (see stooq.ts), which now gates every request
// behind a JS proof-of-work bot challenge that a plain server-side HTTP client can't solve.
// Alpha Vantage's free tier is heavily rate-limited (5 calls/min, 25/day) and outputsize=full
// is a premium-only feature now, so this only gets the last ~100 daily bars (outputsize=compact)
// — enough for the 1mo/3mo ranges and a partial 6mo+ view, not full 1y/2y/5y history.
const BASE_URL = "https://www.alphavantage.co/query";
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY ?? "";
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });

export async function getDailyHistory(symbol: string): Promise<HistoryPoint[]> {
  const cacheKey = `history:${symbol}`;
  const cached = cache.get<HistoryPoint[]>(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(BASE_URL, {
    params: {
      function: "TIME_SERIES_DAILY",
      symbol,
      outputsize: "compact",
      apikey: API_KEY,
    },
    timeout: 10_000,
  });

  if (data?.["Error Message"]) {
    throw new Error(`No history data for symbol "${symbol}"`);
  }
  if (data?.Note || data?.Information) {
    throw new Error("Rate limited by Alpha Vantage (free tier: 25 calls/day, 5/min) — try again shortly.");
  }

  const series = data?.["Time Series (Daily)"];
  if (!series) {
    throw new Error(`No history data for symbol "${symbol}"`);
  }

  const points: HistoryPoint[] = Object.entries(series)
    .map(([date, ohlcv]: [string, any]) => ({
      date,
      open: parseFloat(ohlcv["1. open"]),
      high: parseFloat(ohlcv["2. high"]),
      low: parseFloat(ohlcv["3. low"]),
      close: parseFloat(ohlcv["4. close"]),
      volume: parseInt(ohlcv["5. volume"], 10) || 0,
    }))
    .filter((p) => !Number.isNaN(p.close))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length === 0) {
    throw new Error(`No history data for symbol "${symbol}"`);
  }

  cache.set(cacheKey, points, 3600);
  return points;
}
