"use client";

import { useRef, useState } from "react";
import { formatDate, formatPrice } from "@/lib/format";

const WIDTH = 640;
const HEIGHT = 220;
const PADDING_LEFT = 64;
const PADDING_RIGHT = 12;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;
const MAX_X_TICKS = 6;

const innerWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
const innerHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

// Single series (revenue) — per dataviz convention, a lone series needs no
// legend box, the section heading above this component already names it.
// Zero-based y-domain (not min-to-max) since a revenue trend should read
// against an absolute floor, not a squeezed local range.
export function RevenueTrendChart({ data }: { data: { date: string; revenue: number }[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">მონაცემი არ არის</p>
      </div>
    );
  }

  const max = Math.max(1, ...data.map((row) => row.revenue));
  const xFor = (index: number) =>
    data.length === 1 ? PADDING_LEFT : PADDING_LEFT + (index / (data.length - 1)) * innerWidth;
  const yFor = (revenue: number) => PADDING_TOP + innerHeight - (revenue / max) * innerHeight;

  const linePoints = data.map((row, index) => `${xFor(index)},${yFor(row.revenue)}`).join(" L ");
  const linePath = `M ${linePoints}`;
  const areaPath = `${linePath} L ${xFor(data.length - 1)},${PADDING_TOP + innerHeight} L ${xFor(0)},${PADDING_TOP + innerHeight} Z`;

  const gridLines = [0, 0.5, 1].map((fraction) => ({
    y: PADDING_TOP + innerHeight - fraction * innerHeight,
    value: max * fraction,
  }));

  const tickStep = Math.max(1, Math.ceil(data.length / MAX_X_TICKS));
  const xTicks = data
    .map((row, index) => ({ index, date: row.date }))
    .filter((row) => row.index % tickStep === 0 || row.index === data.length - 1);

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let closest = 0;
    let closestDistance = Infinity;
    data.forEach((_, index) => {
      const distance = Math.abs(xFor(index) - relativeX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = index;
      }
    });
    setHoverIndex(closest);
  }

  const hoverRow = hoverIndex != null ? data[hoverIndex] : null;
  const latest = data[data.length - 1];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        role="img"
        aria-label="შემოსავალი დროში"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {gridLines.map((line) => (
          <g key={line.y}>
            <line
              x1={PADDING_LEFT}
              x2={WIDTH - PADDING_RIGHT}
              y1={line.y}
              y2={line.y}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={PADDING_LEFT - 8}
              y={line.y}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[9px] tabular-nums"
            >
              {formatPrice(line.value)}
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <text
            key={tick.index}
            x={xFor(tick.index)}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px]"
          >
            {formatDate(tick.date)}
          </text>
        ))}

        <path d={areaPath} className="fill-primary/10" />
        <path
          d={linePath}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Direct label on the last point — selective, not one per point */}
        <circle cx={xFor(data.length - 1)} cy={yFor(latest.revenue)} r={3} className="fill-primary" />

        {hoverRow && hoverIndex != null && (
          <g>
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={PADDING_TOP}
              y2={PADDING_TOP + innerHeight}
              className="stroke-muted-foreground/40"
              strokeWidth={1}
            />
            <circle
              cx={xFor(hoverIndex)}
              cy={yFor(hoverRow.revenue)}
              r={4}
              className="fill-card stroke-primary"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      {hoverRow ? (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{formatDate(hoverRow.date)}</span>
          <span className="font-semibold tabular-nums text-foreground">{formatPrice(hoverRow.revenue)}</span>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">ბოლო დღე — {formatDate(latest.date)}</span>
          <span className="font-semibold tabular-nums text-foreground">{formatPrice(latest.revenue)}</span>
        </div>
      )}
    </div>
  );
}
