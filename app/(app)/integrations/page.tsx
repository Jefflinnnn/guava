import type { Metadata } from "next";

import { Page, PageHeader } from "@/components/shell/page";
import { NeonCard } from "@/components/workspace/neon-card";
import { getWorkspaceDetails, requireWorkspace } from "@/lib/workspace";

export const metadata: Metadata = { title: "Integrations · guava" };

export default async function IntegrationsPage() {
  const { user } = await requireWorkspace();
  const saved = await getWorkspaceDetails(user.id);

  return (
    <Page width="narrow" className="gap-4">
      <PageHeader
        title="Integrations"
        subtitle="Where guava keeps your data. Changes take effect after a successful test."
      />
      <NeonCard mode="page" saved={saved} />
    </Page>
  );
}
