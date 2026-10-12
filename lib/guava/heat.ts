import type { DayTotal } from "./types";

export type HeatLevel = 0 | 1 | 2 | 3 | 4;
export type HeatThresholds = [number, number, number];

/** 25th / 50th / 80th percentiles of all non-zero daily totals (cents). */
export function heatThresholds(days: Map<string, DayTotal>): HeatThresholds {
  const vals = [...days.values()]
    .map((d) => d.sum)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  const q = (p: number) => vals[Math.floor(p * (vals.length - 1))] || 0;
  return [q(0.25), q(0.5), q(0.8)];
}

export function heatLevel(cents: number, th: HeatThresholds): HeatLevel {
  if (!cents) return 0;
  if (cents <= th[0]) return 1;
  if (cents <= th[1]) return 2;
  if (cents <= th[2]) return 3;
  return 4;
}

/** Background + text classes per level. Colors live in globals.css (`--heat-N`). */
export const HEAT_CLASSES: Record<HeatLevel, string> = {
  0: "bg-heat-0 text-heat-fg-0",
  1: "bg-heat-1 text-heat-fg-1",
  2: "bg-heat-2 text-heat-fg-2",
  3: "bg-heat-3 text-heat-fg-3",
  4: "bg-heat-4 text-heat-fg-4",
};

export const HEAT_LEVELS: HeatLevel[] = [0, 1, 2, 3, 4];
