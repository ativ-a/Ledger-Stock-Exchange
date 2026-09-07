// Same rule-based approach as stockInsights.js, applied to portfolio composition/performance.

export function getPortfolioInsights(holdings) {
  const insights = [];
  const withValue = (holdings || []).filter((h) => h.value > 0);
  if (withValue.length === 0) return insights;

  const totalValue = withValue.reduce((sum, h) => sum + h.value, 0);
  const topHolding = [...withValue].sort((a, b) => b.value - a.value)[0];
  const topPct = (topHolding.value / totalValue) * 100;
  if (topPct >= 40) {
    insights.push({
      type: "neutral",
      text: `${topHolding.symbol} makes up ${topPct.toFixed(0)}% of your portfolio — your largest concentration.`,
    });
  }

  if (withValue.length === 1) {
    insights.push({ type: "neutral", text: "Portfolio is a single holding — no diversification across positions." });
  } else if (withValue.length <= 3) {
    insights.push({ type: "neutral", text: `Portfolio holds only ${withValue.length} positions — fairly concentrated.` });
  }

  if (withValue.length > 1) {
    const byGain = [...withValue].sort((a, b) => b.gainPercent - a.gainPercent);
    const best = byGain[0];
    const worst = byGain[byGain.length - 1];
    insights.push({ type: "bullish", text: `${best.symbol} is your top performer, up ${best.gainPercent.toFixed(1)}%.` });
    insights.push({
      type: worst.gainPercent >= 0 ? "neutral" : "bearish",
      text: `${worst.symbol} is your ${worst.gainPercent >= 0 ? "smallest gainer" : "biggest laggard"}, ${
        worst.gainPercent >= 0 ? "up" : "down"
      } ${Math.abs(worst.gainPercent).toFixed(1)}%.`,
    });
  }

  return insights;
}
