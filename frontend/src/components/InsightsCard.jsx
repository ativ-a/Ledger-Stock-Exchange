import React from "react";

const DOT_COLOR = {
  bullish: "bg-positive",
  bearish: "bg-negative",
  neutral: "bg-accent",
};

export default function InsightsCard({ insights }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted mb-3">Insights</div>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-ink">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLOR[insight.type] ?? DOT_COLOR.neutral}`} />
            <span>{insight.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
