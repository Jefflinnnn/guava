import { initialOf } from "@/lib/guava/format";
import { cn } from "@/lib/utils";

/** First-letter avatar tile for merchants (square) or people (circle). */
export function InitialAvatar({
  name,
  text,
  size = 28,
  shape = "square",
  className,
}: {
  name: string;
  /** Override the letter(s), e.g. "BP". */
  text?: string;
  size?: 28 | 32 | 40;
  shape?: "square" | "circle";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex flex-none items-center justify-center border bg-muted font-semibold text-ink-2",
        { 28: "size-7 text-xs", 32: "size-8 text-xs", 40: "size-10 text-sm" }[
          size
        ],
        shape === "circle"
          ? "rounded-full border-transparent bg-border"
          : size === 40
            ? "rounded-lg"
            : "rounded-md",
        className,
      )}
    >
      {text ?? initialOf(name)}
    </span>
  );
}
