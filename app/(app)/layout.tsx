import { AppShell } from "@/components/shell/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireUser } from "@/lib/current-user";
import { GuavaProvider } from "@/lib/guava/store";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // The proxy only checks that a session cookie exists; this verifies it.
  const user = await requireUser();

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
