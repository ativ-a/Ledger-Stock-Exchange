// Rule-based "insights" — no LLM involved. Every line here is a plain threshold check over
// data the app already fetched (quote + indicator-enriched history points), phrased as a
// factual observation ("here's what the data shows"), never as a recommendation to act.
// `type` drives the bullet color only — bullish/bearish describe the data point, not advice.

function crossoverInsights(points) {
  const insights = [];
  const window = points.slice(-11); // 10 day-over-day deltas
  for (let i = 1; i < window.length; i++) {
    const prev = window[i - 1];
    const cur = window[i];
    if (prev.sma20 == null || prev.sma50 == null || cur.sma20 == null || cur.sma50 == null) continue;
    const prevDiff = prev.sma20 - prev.sma50;
    const curDiff = cur.sma20 - cur.sma50;
    const daysAgo = window.length - 1 - i;
    const when = daysAgo === 0 ? "today" : `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`;
    if (prevDiff <= 0 && curDiff > 0) {
      insights.push({ type: "bullish", text: `20-day moving average crossed above the 50-day ${when} (golden cross).` });
    } else if (prevDiff >= 0 && curDiff < 0) {
      insights.push({ type: "bearish", text: `20-day moving average crossed below the 50-day ${when} (death cross).` });
    }
  }
  return insights;
}

export function getStockInsights(quote, points) {
  const insights = [];
  if (!quote || !points || points.length === 0) return insights;

  const last = points[points.length - 1];

  if (last.rsi14 != null) {
    if (last.rsi14 >= 70) {
      insights.push({ type: "bearish", text: `RSI is at ${last.rsi14.toFixed(1)}, in overbought territory (above 70).` });
    } else if (last.rsi14 <= 30) {
      insights.push({ type: "bullish", text: `RSI is at ${last.rsi14.toFixed(1)}, in oversold territory (below 30).` });
    }
  }

  if (last.sma20 != null && last.sma50 != null) {
    if (quote.price > last.sma20 && quote.price > last.sma50) {
      insights.push({ type: "bullish", text: "Trading above both its 20- and 50-day moving averages." });
    } else if (quote.price < last.sma20 && quote.price < last.sma50) {
      insights.push({ type: "bearish", text: "Trading below both its 20- and 50-day moving averages." });
    }
    insights.push(...crossoverInsights(points));
  }

  if (quote.high52w && quote.low52w) {
    const fromHigh = ((quote.high52w - quote.price) / quote.high52w) * 100;
    const fromLow = ((quote.price - quote.low52w) / quote.low52w) * 100;
    if (fromHigh <= 2) {
      insights.push({ type: "bullish", text: `Trading within 2% of its 52-week high of $${quote.high52w.toFixed(2)}.` });
    } else if (fromLow <= 2) {
      insights.push({ type: "bearish", text: `Trading within 2% of its 52-week low of $${quote.low52w.toFixed(2)}.` });
    }
  }

  if (points.length > 10) {
    const past = points[points.length - 11].close;
    const pct = ((last.close - past) / past) * 100;
    if (Math.abs(pct) >= 3) {
      insights.push({
        type: pct >= 0 ? "bullish" : "bearish",
        text: `${pct >= 0 ? "Up" : "Down"} ${Math.abs(pct).toFixed(1)}% over the last 10 trading days.`,
      });
    }
  }

  if (points.length > 20) {
    const recentCloses = points.slice(-21).map((p) => p.close);
    const dailyReturns = recentCloses.slice(1).map((c, i) => (c - recentCloses[i]) / recentCloses[i]);
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / dailyReturns.length;
    const stdevPct = Math.sqrt(variance) * 100;
    if (stdevPct > 0 && Math.abs(quote.changePercent) >= stdevPct * 1.5) {
      insights.push({
        type: quote.changePercent >= 0 ? "bullish" : "bearish",
        text: `Today's ${Math.abs(quote.changePercent).toFixed(1)}% move is larger than its typical daily swing (~${stdevPct.toFixed(1)}%) over the past month.`,
      });
    }
  }

  if (quote.peRatio) {
    const marketAvgPE = 22; // rough long-run S&P 500 average, used only as a fixed reference point
    if (quote.peRatio > marketAvgPE * 1.3) {
      insights.push({ type: "neutral", text: `P/E of ${quote.peRatio.toFixed(1)} is well above the long-run market average (~${marketAvgPE}).` });
    } else if (quote.peRatio < marketAvgPE * 0.7) {
      insights.push({ type: "neutral", text: `P/E of ${quote.peRatio.toFixed(1)} is well below the long-run market average (~${marketAvgPE}).` });
    }
  }

  return insights;
}
