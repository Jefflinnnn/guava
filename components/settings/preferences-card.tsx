"use client";

import { Segmented, type SegmentedOption } from "@/components/guava/segmented";
import { SwitchRow } from "@/components/guava/switch-row";
import { Card } from "@/components/shell/page";
import { useTheme, type ThemePreference } from "@/components/theme/theme";
import { useActions, useSettings } from "@/lib/guava/store";
import type { Settings } from "@/lib/guava/types";
import { cn } from "@/lib/utils";

const ROW = "px-5 py-4";

const TOGGLES: { key: keyof Settings; title: string; description: string }[] = [
  {
    key: "autoBills",
    title: "Auto-review recurring bills",
    description: "Bills that match last month’s amount skip the review queue.",
  },
  {
    key: "weekly",
    title: "Weekly review reminder",
    description: "Get a nudge on Sundays when items are waiting for review.",
  },
  {
    key: "big",
    title: "Flag large purchases",
    description: "Anything over $150 always lands in Needs review.",
  },
];

const THEME_OPTIONS: SegmentedOption<ThemePreference>[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/** A settings row with a custom control on the right (matches SwitchRow). */
function SettingRow({
  title,
  description,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", ROW)}>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{title}</div>
        {description && (
          <div className="mt-0.5 text-[13px] text-ink-3">{description}</div>
        )}
      </div>
      {children}
    </div>
  );
}

/** Review preferences and appearance. */
export function PreferencesCard() {
  const settings = useSettings();
  const { toggleSetting } = useActions();
  const [theme, setTheme] = useTheme();

  return (
    <Card className="divide-y divide-muted">
      {TOGGLES.map((t) => (
        <SwitchRow
          key={t.key}
          title={t.title}
          description={t.description}
          checked={settings[t.key]}
          onCheckedChange={() => toggleSetting(t.key)}
          className={ROW}
        />
      ))}
      <SettingRow
        title="Appearance"
        description="Use light or dark mode, or follow your system."
      >
        <Segmented
          aria-label="Theme"
          size="md"
          options={THEME_OPTIONS}
          value={theme}
          onChange={setTheme}
        />
      </SettingRow>
    </Card>
  );
}
