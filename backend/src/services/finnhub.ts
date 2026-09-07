import axios from "axios";
import NodeCache from "node-cache";
import type { CompanyOverview, Quote } from "../types.js";

const BASE_URL = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY ?? "";

// Cache upstream responses — quotes short-lived, fundamentals long-lived.
const cache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

// --- Rate limiter -----------------------------------------------------
// Finnhub's free tier is 60 calls/min. A single Dashboard load can trigger 100+ calls
// (ticker tape + screener sample, each enriched quote costing 3 upstream calls), which
// blows through that in one burst and 429s everything after it — including whatever the
// user tries next. Rather than let that happen, queue calls and drain them at a safe rate
// so requests wait instead of failing.
const MAX_CALLS_PER_MINUTE = 50; // stay a little under the real 60 cap
let tokens = MAX_CALLS_PER_MINUTE;
const queue: (() => void)[] = [];

setInterval(() => {
  tokens = MAX_CALLS_PER_MINUTE;
  while (queue.length > 0 && tokens > 0) {
    tokens--;
    queue.shift()!();
  }
}, 60_000);

function acquireSlot(): Promise<void> {
  return new Promise((resolve) => {
    if (tokens > 0) {
      tokens--;
      resolve();
    } else {
      queue.push(resolve);
    }
  });
}
// -----------------------------------------------------------------------

async function fetchFinnhub(path: string, params: Record<string, string> = {}) {
  await acquireSlot();
  try {
    const { data } = await axios.get(`${BASE_URL}${path}`, {
      params: { ...params, token: API_KEY },
      timeout: 10_000,
    });
    if (data?.error) {
      throw new Error(data.error);
    }
    return data;
  } catch (err: any) {
    if (err.response?.status === 429) {
      throw new Error("Rate limited by Finnhub (free tier: 60 calls/min) — try again shortly.");
    }
    if (err.response?.status === 401 || err.response?.status === 403) {
      throw new Error("Finnhub rejected the request — check FINNHUB_API_KEY in backend/.env.");
    }
    throw err;
  }
}

export async function getQuote(symbol: string): Promise<Quote> {
  const cacheKey = `quote:${symbol}`;
  const cached = cache.get<Quote>(cacheKey);
  if (cached) return cached;

  const raw = await fetchFinnhub("/quote", { symbol });
  if (raw.c === 0 && raw.pc === 0) {
    throw new Error(`No quote data for symbol "${symbol}"`);
  }

  const quote: Quote = {
    symbol,
    price: raw.c,
    change: raw.d,
    changePercent: raw.dp,
    // Finnhub's free /quote has no volume field (that lives behind the paid /stock/candle
    // endpoint) — left at 0 here and backfilled from the 10-day average in getEnrichedQuote.
    volume: 0,
    latestTradingDay: new Date(raw.t * 1000).toISOString().slice(0, 10),
    previousClose: raw.pc,
    open: raw.o,
    high: raw.h,
    low: raw.l,
  };

  cache.set(cacheKey, quote, 60);
  return quote;
}

export async function getCompanyOverview(symbol: string): Promise<CompanyOverview & { avgVolume: number }> {
  const cacheKey = `overview:${symbol}`;
  const cached = cache.get<CompanyOverview & { avgVolume: number }>(cacheKey);
  if (cached) return cached;

  const [profile, metrics] = await Promise.all([
    fetchFinnhub("/stock/profile2", { symbol }),
    fetchFinnhub("/stock/metric", { symbol, metric: "all" }),
  ]);

  if (!profile?.name) {
    throw new Error(`No company data for symbol "${symbol}"`);
  }

  const m = metrics?.metric ?? {};
  const pe = m.peExclExtraTTM ?? m.peBasicExclExtraTTM ?? m.peNormalizedAnnual ?? null;
  const rawAvgVol = m["10DayAverageTradingVolume"];

  const overview: CompanyOverview & { avgVolume: number } = {
    symbol,
    name: profile.name,
    // Finnhub's free profile2 doesn't return a separate GICS sector — finnhubIndustry
    // is the closest single field, so it's used for both.
    sector: profile.finnhubIndustry ?? "",
    industry: profile.finnhubIndustry ?? "",
    marketCap: (profile.marketCapitalization ?? 0) * 1_000_000, // Finnhub reports this in millions USD
    peRatio: typeof pe === "number" ? pe : null,
    eps: typeof m.epsTTM === "number" ? m.epsTTM : null,
    dividendYield: typeof m.dividendYieldIndicatedAnnual === "number" ? m.dividendYieldIndicatedAnnual : null,
    fiftyTwoWeekHigh: typeof m["52WeekHigh"] === "number" ? m["52WeekHigh"] : null,
    fiftyTwoWeekLow: typeof m["52WeekLow"] === "number" ? m["52WeekLow"] : null,
    // 10-day average volume, in millions of shares per Finnhub's convention — this is the
    // closest free substitute for real daily volume (see getEnrichedQuote).
    avgVolume: typeof rawAvgVol === "number" ? Math.round(rawAvgVol * 1_000_000) : 0,
  };

  cache.set(cacheKey, overview, 3600);
  return overview;
}

export interface EnrichedQuote {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  high52w: number | null;
  low52w: number | null;
  marketCap: number;
  peRatio: number | null;
  volume: number;
}

export async function getEnrichedQuote(symbol: string): Promise<EnrichedQuote> {
  const cacheKey = `enriched:${symbol}`;
  const cached = cache.get<EnrichedQuote>(cacheKey);
  if (cached) return cached;

  const [quote, overview] = await Promise.all([
    getQuote(symbol),
    getCompanyOverview(symbol).catch(() => null),
  ]);

  const enriched: EnrichedQuote = {
    symbol: quote.symbol,
    name: overview?.name ?? quote.symbol,
    sector: overview?.sector ?? "",
    industry: overview?.industry ?? "",
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    dayHigh: quote.high,
    dayLow: quote.low,
    high52w: overview?.fiftyTwoWeekHigh ?? null,
    low52w: overview?.fiftyTwoWeekLow ?? null,
    marketCap: overview?.marketCap ?? 0,
    peRatio: overview?.peRatio ?? null,
    volume: overview?.avgVolume ?? 0,
  };

  cache.set(cacheKey, enriched, 180);
  return enriched;
}

// Sample large-cap universe for the screener — Finnhub's free tier has no bulk/index
// endpoint either. Swap for a real index-membership feed in production.
export const SAMPLE_UNIVERSE = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ORCL", "ADBE",
  "CRM", "AMD", "INTC", "CSCO", "QCOM", "TXN", "IBM", "NFLX", "PYPL", "UBER",
  "JPM", "BAC", "WFC", "GS", "MS", "V", "MA", "AXP",
  "JNJ", "UNH", "PFE", "ABBV", "MRK", "LLY",
  "WMT", "COST", "HD", "NKE", "MCD", "SBUX", "TGT",
  "XOM", "CVX", "DIS", "BA", "CAT",
];

export async function searchSymbols(keywords: string) {
  const cacheKey = `search:${keywords}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const data = await fetchFinnhub("/search", { q: keywords });
  const matches = (data.result || [])
    .filter((m: any) => m.type === "Common Stock")
    .map((m: any) => ({
      symbol: m.symbol,
      name: m.description,
      region: "US",
      currency: "USD",
    }));

  cache.set(cacheKey, matches, 3600);
  return matches;
}
