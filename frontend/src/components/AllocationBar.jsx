import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Fixed-order categorical palette, stepped for this app's dark panel surface and validated
// (adjacent-pair CVD + contrast) against it — see the dataviz skill's palette method.
// Never reassign a slot by value; order is identity only.
const SLOT_COLORS = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
];
const OTHER_COLOR = "#4A5160";
const GAP_COLOR = "#12151B"; // matches the card's bg-panel — renders as a 2px surface gap

function fmtUsd(n) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, fill, percent } = payload[0].payload.__meta[payload[0].dataKey];
  return (
    <div className="bg-panel2 border border-border rounded-lg px-3 py-2 text-xs font-mono">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: fill }} />
        <span className="text-ink font-600">{name}</span>
      </div>
      <div className="text-ink">{fmtUsd(value)}</div>
      <div className="text-muted">{percent.toFixed(1)}% of portfolio</div>
    </div>
  );
}

export default function AllocationBar({ holdings }) {
  const withValue = holdings.filter((h) => h.value > 0);
  if (withValue.length === 0) {
    return <div className="text-muted text-sm">No holdings to allocate yet.</div>;
  }

  const sorted = [...withValue].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, h) => sum + h.value, 0);

  // Token ceiling: past 7 direct series, fold the tail into "Other" (see dataviz skill's
  // series-count ladder) rather than generating more hues.
  const direct = sorted.length > 8 ? sorted.slice(0, 7) : sorted;
  const rest = sorted.length > 8 ? sorted.slice(7) : [];
  const otherValue = rest.reduce((sum, h) => sum + h.value, 0);

  const segments = direct.map((h, i) => ({
    key: h.symbol,
    name: h.symbol,
    value: h.value,
    fill: SLOT_COLORS[i],
    percent: (h.value / total) * 100,
  }));
  if (otherValue > 0) {
    segments.push({
      key: "Other",
      name: `Other (${rest.length})`,
      value: otherValue,
      fill: OTHER_COLOR,
      percent: (otherValue / total) * 100,
    });
  }

  const row = { name: "Allocation" };
  const meta = {};
  segments.forEach((s) => {
    row[s.key] = s.value;
    meta[s.key] = s;
  });
  row.__meta = meta;

  return (
    <div>
      <ResponsiveContainer width="100%" height={32}>
        <BarChart data={[row]} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis type="number" hide domain={[0, total]} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          {segments.map((s, i) => {
            const isFirst = i === 0;
            const isLast = i === segments.length - 1;
            // Round only the bar's true outer ends; square where segments meet.
            const radius =
              isFirst && isLast ? [4, 4, 4, 4] : isFirst ? [4, 0, 0, 4] : isLast ? [0, 4, 4, 0] : 0;
            return (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="alloc"
                fill={s.fill}
                stroke={GAP_COLOR}
                strokeWidth={2}
                radius={radius}
                isAnimationActive={false}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.fill }} />
            <span className="font-display font-600 text-ink">{s.name}</span>
            <span className="text-muted mono-num">{s.percent.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
