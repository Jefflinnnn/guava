import type { Metadata } from "next";

import { Page, PageHeader } from "@/components/shell/page";
import { NeonCard } from "@/components/workspace/neon-card";
import { PlaidCard } from "@/components/workspace/plaid-card";
import { loadPlaidKeyDetails } from "@/lib/plaid";
import {
  getUserDb,
  getWorkspaceDetails,
  requireWorkspace,
} from "@/lib/workspace";

export const metadata: Metadata = { title: "Integrations · guava" };

export default async function IntegrationsPage() {
  const { user } = await requireWorkspace();
  const [saved, plaid] = await Promise.all([
    getWorkspaceDetails(user.id),
    getUserDb().then(loadPlaidKeyDetails),
  ]);

  return (
    <Page width="narrow" className="gap-4">
      <PageHeader
        title="Integrations"
        subtitle="Where guava keeps your data. Changes take effect after a successful test."
      />
      <NeonCard mode="page" saved={saved} />
      <PlaidCard saved={plaid} />
    </Page>
  );
}
