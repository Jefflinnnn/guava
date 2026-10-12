import { HEAT_CLASSES, HEAT_LEVELS, type HeatLevel } from "@/lib/guava/heat";
import { cn } from "@/lib/utils";

/** A cell shaded on the spend heat scale (text color follows the level). */
export function HeatCell({ level, className, ...props }: React.ComponentProps<"div"> & { level: HeatLevel }) {
  return <div className={cn(HEAT_CLASSES[level], className)} {...props} />;
}

/** "Less ■■■■■ More" */
export function HeatLegend({
  size = 10,
  titles,
  className,
}: {
  size?: 10 | 11;
  /** Optional tooltip per level, e.g. "≤ $48". */
  titles?: string[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-none items-center gap-[3px] text-ink-3", className)}>
      <span className="mr-[3px]">Less</span>
      {HEAT_LEVELS.map((l) => (
        <span
          key={l}
          title={titles?.[l]}
          className={cn("rounded-[2px]", HEAT_CLASSES[l], size === 10 ? "size-2.5" : "size-[11px]")}
        />
      ))}
      <span className="ml-[3px]">More</span>
    </div>
  );
}
