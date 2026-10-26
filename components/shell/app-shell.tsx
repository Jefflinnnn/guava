import { Sidebar, type SidebarUser } from "./sidebar";
import { SyncErrorBanner } from "./sync-error-banner";

/** Full-viewport `Sidebar | Main` layout; only Main scrolls. */
export function AppShell({
  user,
  children,
}: {
  user: SidebarUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh">
      <Sidebar user={user} />
      <main className="flex min-w-0 flex-1 scrollbar-thin flex-col overflow-auto">
        <SyncErrorBanner />
        {children}
      </main>
    </div>
  );
}
