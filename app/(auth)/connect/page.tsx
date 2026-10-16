import type { Metadata } from "next";

import { ConnectBank } from "@/components/auth/connect-bank";
import { requireUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Connect your bank · guava" };

export default async function ConnectPage() {
  const user = await requireUser();
  const firstName = user.name.trim().split(/\s+/)[0] || "there";
  return <ConnectBank firstName={firstName} />;
}
