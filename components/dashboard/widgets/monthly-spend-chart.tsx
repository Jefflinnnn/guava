"use client";

import { useId, useRef, useState } from "react";

import { MONTHS, MONTHS_LONG, sameMonth } from "@/lib/guava/dates";
import { compact, money, money0, money0Fit } from "@/lib/guava/format";
import { useMonthlyTotals, useSelectedMonth } from "@/lib/guava/store";
import { cn } from "@/lib/utils";

import { WidgetHeader } from "./widget-header";

// Chart geometry in viewBox units.
const W = 720;
const H = 240;
const PAD = { l: 48, r: 16, t: 16, b: 30 };
const WINDOW = 12;
const STEP = (W - PAD.l - PAD.r) / (WINDOW - 1);
/** Y-axis rounding step: $500. */
const Y_STEP = 500_00;

const x = (i: number) => PAD.l + i * STEP;
const tick = (cents: number) =>
  cents >= 1000_00 ? compact(cents) : money0(cents);

type Drag = { x: number; end: number; moved: boolean };

/**
 * Month-over-month totals in a 12-month window that can be dragged through
 * history. The unfinished current month is dashed; clicking a point opens it.
 */
export function MonthlySpendWidget() {
  const months = useMonthlyTotals();
  const [selected, setSelected] = useSelectedMonth();
  const last = months.length - 1;

  const [endIdx, setEndIdx] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [moved, setMoved] = useState(false);
  const drag = useRef<Drag | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = `spend-fill-${useId().replace(/[^\w-]/g, "")}`;

  const end = Math.min(last, Math.max(WINDOW - 1, endIdx ?? last));
  const visible = months.slice(end - WINDOW + 1, end + 1);
  const maxV =
    Math.ceil((Math.max(...months.map((m) => m.total)) * 1.1) / Y_STEP) *
      Y_STEP || Y_STEP;
  const y = (v: number) => PAD.t + (1 - v / maxV) * (H - PAD.t - PAD.b);
  const pts = visible.map((m, i) => [x(i), y(m.total)] as const);
  const partialAt = visible.findIndex((m) => m.partial);
  const solid = partialAt >= 1 ? pts.slice(0, partialAt) : pts;

  const full = visible.filter((m) => !m.partial);
  const avg = full.reduce((a, m) => a + m.total, 0) / (full.length || 1);
  const first = visible[0].month;
  const lastM = visible[visible.length - 1].month;
  const showHover = hover != null && !moved ? hover : null;
  const hovered = showHover != null ? visible[showHover] : null;

  function indexAt(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect?.width) return null;
    const vx = ((clientX - rect.left) / rect.width) * W;
    return Math.min(WINDOW - 1, Math.max(0, Math.round((vx - PAD.l) / STEP)));
  }

  function endDrag() {
    drag.current = null;
    setDragging(false);
    setMoved(false);
  }

  return (
    <>
      <WidgetHeader
        title="Monthly spend"
        subtitle={`${MONTHS[first.month]} ${first.year} – ${MONTHS[lastM.month]} ${lastM.year} · drag to scroll, click a point to open`}
        aside={
          <div className="text-[13px] text-ink-3">
            12-mo average{" "}
            <span className="font-semibold text-foreground tabular">
              {money0Fit(avg, 9)}
            </span>
          </div>
        }
      />
      <div
        className={cn(
          "relative mt-3 touch-pan-y select-none",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, end, moved: false };
          setDragging(true);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return setHover(indexAt(e.clientX));
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) > 4) {
            d.moved = true;
            setMoved(true);
          }
          const width = svgRef.current?.getBoundingClientRect().width ?? W;
          // One month per point spacing, in screen pixels.
          const perMonth = (width * STEP) / W;
          const next = Math.min(
            last,
            Math.max(WINDOW - 1, d.end - Math.round(dx / perMonth)),
          );
          if (next !== end) setEndIdx(next);
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          if (d && !d.moved) {
            const i = indexAt(e.clientX);
            if (i != null) setSelected(visible[i].month);
          }
          endDrag();
        }}
        onPointerCancel={endDrag}
        onPointerLeave={() => setHover(null)}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          className="block overflow-visible"
          role="img"
          aria-label="Monthly spend line chart"
        >
          <defs>
            <linearGradient id={gradientId} x1={0} y1={0} x2={0} y2={1}>
              <stop
                offset="0%"
                className="[stop-color:var(--primary)] [stop-opacity:0.12]"
              />
              <stop
                offset="100%"
                className="[stop-color:var(--primary)] [stop-opacity:0]"
              />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3, 4].map((g) => {
            const v = (maxV * g) / 4;
            return (
              <g key={g}>
                <line
                  x1={PAD.l}
                  x2={W - PAD.r}
                  y1={y(v)}
                  y2={y(v)}
                  className="stroke-chart-grid"
                />
                <text
                  x={PAD.l - 10}
                  y={y(v) + 4}
                  textAnchor="end"
                  fontSize={11}
                  className="fill-chart-axis"
                >
                  {tick(v)}
                </text>
              </g>
            );
          })}

          <path
            d={`M${pts[0][0]},${y(0)}${pts.map(([px, py]) => ` L${px},${py}`).join("")} L${pts[pts.length - 1][0]},${y(0)} Z`}
            fill={`url(#${gradientId})`}
          />
          <polyline
            points={solid.map((p) => p.join(",")).join(" ")}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="round"
            className="stroke-primary"
          />
          {partialAt >= 1 && (
            <line
              x1={pts[partialAt - 1][0]}
              y1={pts[partialAt - 1][1]}
              x2={pts[partialAt][0]}
              y2={pts[partialAt][1]}
              strokeWidth={2}
              strokeDasharray="4 4"
              className="stroke-primary"
            />
          )}

          {showHover != null && (
            <line
              x1={pts[showHover][0]}
              x2={pts[showHover][0]}
              y1={PAD.t}
              y2={y(0)}
              strokeDasharray="3 3"
              className="stroke-chart-guide"
            />
          )}

          {visible.map((m, i) => {
            const sel = sameMonth(m.month, selected);
            const big = sel || showHover === i;
            return (
              <g key={`${m.month.year}-${m.month.month}`}>
                <circle
                  cx={pts[i][0]}
                  cy={pts[i][1]}
                  r={big ? 5 : 3.5}
                  strokeWidth={2}
                  strokeDasharray={m.partial && !sel ? "2 2" : undefined}
                  className={cn(
                    "stroke-primary",
                    sel ? "fill-primary" : "fill-card",
                  )}
                />
                <text
                  x={pts[i][0]}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={11}
                  className={
                    sel ? "fill-foreground font-semibold" : "fill-chart-axis"
                  }
                >
                  {MONTHS[m.month.month]}
                  {(m.month.month === 0 || i === 0) &&
                    ` ’${String(m.month.year).slice(2)}`}
                </text>
              </g>
            );
          })}
        </svg>

        {hovered && showHover != null && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border bg-card px-2.5 py-1.5 whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,.08)]"
            style={{
              left: `${(pts[showHover][0] / W) * 100}%`,
              top: `${(pts[showHover][1] / H) * 100}%`,
            }}
          >
            <div className="text-[11px] text-ink-3">
              {MONTHS_LONG[hovered.month.month]} {hovered.month.year}
              {hovered.partial && " (so far)"}
            </div>
            <div className="text-[13px] font-semibold tabular">
              {money(hovered.total)}
            </div>
          </div>
        )}
      </div>

      <div className="relative mt-3 h-1 rounded-full bg-muted">
        <div
          className="absolute inset-y-0 rounded-full bg-faint"
          style={{
            left: `${((end - WINDOW + 1) / months.length) * 100}%`,
            width: `${(WINDOW / months.length) * 100}%`,
          }}
        />
      </div>
    </>
  );
}
