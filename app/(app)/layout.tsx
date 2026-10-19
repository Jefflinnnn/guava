import { connection } from "next/server";

import { AppShell } from "@/components/shell/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toKey } from "@/lib/guava/dates";
import { loadSnapshot } from "@/lib/guava/server/snapshot";
import { GuavaProvider } from "@/lib/guava/store";
import { getUserDb, requireWorkspace } from "@/lib/workspace";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // The proxy only checks that a session cookie exists; this verifies it,
  // sends users without a workspace database to /connect, and brings that
  // database's tables up to date.
  const { user, workspace } = await requireWorkspace();
  // Per-user data from their own database: render on every request.
  await connection();
  const snapshot = await loadSnapshot(await getUserDb());

  return (
    // The store reads `initial` only once, so remount it when the workspace
    // changes (switching databases updates the row); otherwise the old
    // database's data stays on screen until a full reload.
    <GuavaProvider
      key={workspace.updatedAt.getTime()}
      initial={snapshot}
      serverToday={toKey(new Date())}
    >
      <TooltipProvider delayDuration={150}>
        <AppShell user={{ name: user.name, email: user.email }}>
          {children}
        </AppShell>
      </TooltipProvider>
    </GuavaProvider>
  );
}
