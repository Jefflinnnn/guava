import { cn } from "@/lib/utils";

const WIDTHS = {
  wide: "max-w-[1320px]",
  medium: "max-w-[880px]",
  narrow: "max-w-[720px]",
} as const;

/** Page content container: 24px padding, a max width and a vertical rhythm. */
export function Page({
  width = "wide",
  className,
  children,
}: {
  width?: keyof typeof WIDTHS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("flex w-full flex-col gap-5 p-6", WIDTHS[width], className)}
    >
      {children}
    </div>
  );
}

/** H1 with an optional subtitle on the left and actions on the right. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Section heading inside a page, e.g. "Widgets". */
export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-[-0.01em]">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

/** The standard white card: 1px border, 12px radius, faint shadow. */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("min-w-0 rounded-xl border bg-card shadow-card", className)}
      {...props}
    />
  );
}
