import type { HistoryPoint } from "../types.js";

export interface EnrichedHistoryPoint extends HistoryPoint {
  sma20: number | null;
  sma50: number | null;
  rsi14: number | null;
}

function sma(values: number[], index: number, period: number): number | null {
  if (index + 1 < period) return null;
  const slice = values.slice(index - period + 1, index + 1);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Wilder's RSI, computed once over the full closes array for efficiency.
function rsiSeries(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return result;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gainSum += delta;
    else lossSum -= delta;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

export function withIndicators(points: HistoryPoint[]): EnrichedHistoryPoint[] {
  const closes = points.map((p) => p.close);
  const rsi = rsiSeries(closes, 14);

  return points.map((p, i) => ({
    ...p,
    sma20: sma(closes, i, 20),
    sma50: sma(closes, i, 50),
    rsi14: rsi[i],
  }));
}

const RANGE_DAYS: Record<string, number> = {
  "1mo": 22,
  "3mo": 66,
  "6mo": 132,
  "1y": 252,
  "2y": 504,
  "5y": 1260,
};

export function sliceRange(points: HistoryPoint[], range: string): HistoryPoint[] {
  const days = RANGE_DAYS[range] ?? 132;
  // Keep extra lookback so SMA50/RSI14 are populated near the start of the visible window.
  const lookback = Math.min(points.length, days + 60);
  return points.slice(-lookback);
}

export function trimToRange<T extends { date: string }>(enriched: T[], range: string): T[] {
  const days = RANGE_DAYS[range] ?? 132;
  return enriched.slice(-days);
}
