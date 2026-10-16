import { ConnectedBanksCard } from "@/components/settings/connected-banks";
import { PreferencesCard } from "@/components/settings/preferences-card";
import { Page, PageHeader } from "@/components/shell/page";

export default function SettingsPage() {
  return (
    <Page width="narrow">
      <PageHeader
        title="Settings"
        subtitle="How guava sorts new transactions."
      />
      <PreferencesCard />
      <ConnectedBanksCard />
    </Page>
  );
}
