import { Segmented } from "@/components/guava/segmented";
import type { WidgetSize } from "@/lib/guava/types";

const LABELS: Record<WidgetSize, string> = { half: "Half", full: "Full" };

/** Half | Full segmented control for a widget's allowed sizes. */
export function WidgetSizePicker({
  sizes,
  value,
  onChange,
  disabled,
}: {
  sizes: readonly WidgetSize[];
  value: WidgetSize;
  onChange: (size: WidgetSize) => void;
  disabled?: boolean;
}) {
  return (
    <Segmented
      aria-label="Widget size"
      options={sizes.map((s) => ({ value: s, label: LABELS[s], disabled }))}
      value={value}
      onChange={onChange}
    />
  );
}
