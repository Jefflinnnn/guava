import { AppShell } from "@/components/shell/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GuavaProvider } from "@/lib/guava/store";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <GuavaProvider>
      <TooltipProvider delayDuration={150}>
        <AppShell>{children}</AppShell>
      </TooltipProvider>
    </GuavaProvider>
  );
}
