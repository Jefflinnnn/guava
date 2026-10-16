import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

const GRID_CELLS = 18 * 7;
const GRID_TONES = [
  "bg-auth-grid-0",
  "bg-auth-grid-1",
  "bg-auth-grid-2",
  "bg-auth-grid-3",
  "bg-auth-grid-4",
];

// A fixed pseudo-random pattern (same seed as the prototype), so the grid
// looks like a month of spending but never changes between renders.
const GRID = (() => {
  const levels: number[] = [];
  let z = 7;
  for (let i = 0; i < GRID_CELLS; i++) {
    z = (z * 9301 + 49297) % 233280;
    const r = z / 233280;
    levels.push(r < 0.28 ? 0 : r < 0.5 ? 1 : r < 0.72 ? 2 : r < 0.9 ? 3 : 4);
  }
  return levels;
})();

/** Two columns that wrap on narrow screens: brand panel | form. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-wrap">
      <BrandPanel />
      <section className="flex flex-[1_1_420px] items-center justify-center bg-background px-6 py-10">
        {children}
      </section>
    </div>
  );
}

function BrandPanel() {
  return (
    <section className="flex min-h-[280px] flex-[1_1_420px] flex-col gap-8 bg-auth-panel px-6 py-10 text-auth-panel-fg sm:px-12">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary [&_svg]:size-4">
          <Star className="fill-current" strokeWidth={1.5} />
        </span>
        <span className="text-base font-semibold">guava</span>
      </div>
      <div className="flex max-w-[520px] flex-1 flex-col justify-center gap-7">
        {/* Placeholder copy until marketing provides the real lines. */}
        <h1 className="text-[40px] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
          Lorem ipsum dolor sit amet.
        </h1>
        <p className="max-w-[420px] text-base leading-[1.55] text-pretty text-auth-panel-muted">
          Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
          labore et dolore magna aliqua.
        </p>
        <div aria-hidden className="grid max-w-[440px] grid-cols-18 gap-1">
          {GRID.map((level, i) => (
            <span
              key={i}
              className={cn("aspect-square rounded-[3px]", GRID_TONES[level])}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** "STEP 1 OF 2" eyebrow, title and optional subtitle. */
export function AuthHeader({
  step,
  title,
  subtitle,
}: {
  step?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div>
      {step && (
        <div className="mb-2 text-xs font-semibold tracking-[0.04em] text-ink-3 uppercase">
          {step}
        </div>
      )}
      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-balance">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1.5 leading-normal text-pretty text-ink-3">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Red soft box for errors that aren't tied to one field. */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] leading-[1.4] text-danger"
    >
      {children}
    </div>
  );
}

/** Underlined green text link used across the auth screens. */
export const authLinkClass =
  "cursor-pointer font-medium text-primary-text underline underline-offset-3";
