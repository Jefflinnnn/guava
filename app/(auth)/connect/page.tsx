import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthHeader, authLinkClass } from "@/components/auth/auth-layout";
import { NeonCard } from "@/components/workspace/neon-card";
import { logOut } from "@/lib/auth-actions";
import { requireUser } from "@/lib/current-user";
import { getWorkspace } from "@/lib/workspace";

export const metadata: Metadata = { title: "Connect your database · guava" };

/** Onboarding step 2 (required): the user's own Neon database. */
export default async function ConnectPage() {
  const user = await requireUser();
  if (await getWorkspace(user.id)) redirect("/");
  const firstName = user.name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="flex w-full max-w-[460px] flex-col gap-[18px]">
      <AuthHeader
        step="Step 2 of 2 · Your database"
        title={`Connect your database, ${firstName}`}
        subtitle="guava keeps your expenses and categories in your own Neon Postgres database. Your login stays with guava; the connection string is encrypted at rest."
      />
      <NeonCard mode="onboarding" saved={null} />
      <form action={logOut} className="text-center text-[13px] text-ink-3">
        Not {user.email}?{" "}
        <button type="submit" className={authLinkClass}>
          Log out
        </button>
      </form>
    </div>
  );
}
