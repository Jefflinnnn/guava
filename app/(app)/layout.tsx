import { AppShell } from "@/components/shell/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GuavaProvider } from "@/lib/guava/store";
import { requireWorkspace } from "@/lib/workspace";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // The proxy only checks that a session cookie exists; this verifies it,
  // sends users without a workspace database to /connect, and brings that
  // database's tables up to date.
  const { user } = await requireWorkspace();

  return (
    <GuavaProvider>
      <TooltipProvider delayDuration={150}>
        <AppShell user={{ name: user.name, email: user.email }}>
          {children}
        </AppShell>
      </TooltipProvider>
    </GuavaProvider>
  );
}
