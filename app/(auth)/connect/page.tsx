import type { Metadata } from "next";

import { AuthHeader } from "@/components/auth/auth-layout";
import { IntegrationsForm } from "@/components/integrations/integrations-form";
import { requireUser } from "@/lib/current-user";
import { loadSavedIntegrations } from "@/lib/integrations";

export const metadata: Metadata = { title: "Bring your own keys · guava" };

/** Onboarding step 2: the user's own Plaid and Neon keys, or skip. */
export default async function ConnectPage() {
  const user = await requireUser();
  const firstName = user.name.trim().split(/\s+/)[0] || "there";
  const saved = await loadSavedIntegrations(user.id);

  return (
    <div className="flex w-full max-w-[460px] flex-col gap-[18px]">
      <AuthHeader
        step="Step 2 of 2 · Integrations"
        title={`Bring your own keys, ${firstName}`}
        subtitle="guava runs on your accounts. Plaid imports your transactions; Neon Postgres stores them. Keys are encrypted at rest and never leave your workspace."
      />
      <IntegrationsForm mode="onboarding" saved={saved} />
    </div>
  );
}
