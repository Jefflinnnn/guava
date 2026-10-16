import { connection } from "next/server";

import { AppShell } from "@/components/shell/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentUserId } from "@/lib/current-user";
import { toKey } from "@/lib/guava/dates";
import { loadSnapshot } from "@/lib/guava/server/snapshot";
import { GuavaProvider } from "@/lib/guava/store";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Per-user data from the database: render on every request.
  await connection();
  const snapshot = await loadSnapshot(await getCurrentUserId());

  return (
    <GuavaProvider initial={snapshot} serverToday={toKey(new Date())}>
      <TooltipProvider delayDuration={150}>
        <AppShell>{children}</AppShell>
      </TooltipProvider>
    </GuavaProvider>
  );
}
