import { Sidebar } from "./sidebar";

/** Full-viewport `Sidebar | Main` layout; only Main scrolls. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-auto">{children}</main>
    </div>
  );
}
