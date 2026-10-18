import type { Metadata } from "next";

import { IntegrationsForm } from "@/components/integrations/integrations-form";
import { LinkedBanksCard } from "@/components/integrations/linked-banks";
import { Page, PageHeader } from "@/components/shell/page";
import { requireUser } from "@/lib/current-user";
import { loadSavedIntegrations } from "@/lib/integrations";

export const metadata: Metadata = { title: "Integrations · guava" };

export default async function IntegrationsPage() {
  const user = await requireUser();
  const saved = await loadSavedIntegrations(user.id);

  return (
    <Page width="narrow" className="gap-4">
      <PageHeader
        title="Integrations"
        subtitle="Your own Plaid and Neon keys. Changes take effect after a successful test."
      />
      <IntegrationsForm mode="page" saved={saved} />
      <LinkedBanksCard plaidReady={!!saved.plaid} />
    </Page>
  );
}
