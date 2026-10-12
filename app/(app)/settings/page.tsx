import { ConnectedBanksCard } from "@/components/settings/connected-banks";
import { Page, PageHeader } from "@/components/shell/page";

export default function SettingsPage() {
  return (
    <Page width="narrow">
      <PageHeader title="Settings" />
      <ConnectedBanksCard />
    </Page>
  );
}
