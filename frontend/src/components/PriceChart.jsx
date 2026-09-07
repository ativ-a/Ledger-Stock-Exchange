import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";

export default function PriceChart({ points, height = 340, showSMA = true }) {
  if (!points || points.length === 0) {
    return <div className="h-[340px] flex items-center justify-center text-muted text-sm">No data</div>;
  }

  const isUp = points[points.length - 1].close >= points[0].close;
  const strokeColor = isUp ? "#00D9A3" : "#FF5C5C";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#22262E" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#7A8290", fontSize: 11, fontFamily: "JetBrains Mono" }}
          axisLine={{ stroke: "#22262E" }}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fill: "#7A8290", fontSize: 11, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          contentStyle={{
            background: "#171B22",
            border: "1px solid #22262E",
            borderRadius: 8,
            fontSize: 12,
            fontFamily: "JetBrains Mono",
          }}
          labelStyle={{ color: "#7A8290" }}
        />
        <Area type="monotone" dataKey="close" stroke={strokeColor} fill="url(#priceFill)" strokeWidth={2} />
        {showSMA && (
          <>
            <Line type="monotone" dataKey="sma20" stroke="#F5A623" dot={false} strokeWidth={1.25} name="SMA 20" />
            <Line type="monotone" dataKey="sma50" stroke="#7A8290" dot={false} strokeWidth={1.25} name="SMA 50" />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
