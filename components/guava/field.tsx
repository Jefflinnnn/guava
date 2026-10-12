import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + hint/error line. The error replaces the hint. */
export function Field({
  label,
  htmlFor,
  aside,
  hint,
  error,
  hintTone = "muted",
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  /** Right-aligned text in the label row, e.g. a "12/24" counter. */
  aside?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  hintTone?: "muted" | "warning";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-[13px]">
          {label}
        </Label>
        {aside != null && <span className="text-xs text-ink-3 tabular">{aside}</span>}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className={cn("text-xs", hintTone === "warning" ? "text-warning" : "text-ink-3")}>{hint}</p>
      ) : null}
    </div>
  );
}
