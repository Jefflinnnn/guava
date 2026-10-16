import { Sidebar, type SidebarUser } from "./sidebar";

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
      <main className="flex min-w-0 flex-1 flex-col overflow-auto">
        {children}
      </main>
    </div>
  );
}
