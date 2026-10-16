import Link from "next/link";
import { Shield, Unlink, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AuthHeader } from "./auth-layout";

const BENEFITS = [
  {
    icon: Zap,
    title: "Automatic imports",
    body: "Transactions sync daily — no manual entry.",
  },
  {
    icon: Shield,
    title: "Read-only and encrypted",
    body: "guava can see transactions but can never move money.",
  },
  {
    icon: Unlink,
    title: "Disconnect anytime",
    body: "Remove a bank from Settings whenever you like.",
  },
];

/** Onboarding step 2: connect a bank through Plaid, or skip to the dashboard. */
export function ConnectBank({ firstName }: { firstName: string }) {
  return (
    <div className="flex w-full max-w-[420px] flex-col gap-[22px]">
      <AuthHeader
        step="Step 2 of 2"
        title={`Connect your bank, ${firstName}`}
        subtitle="guava uses Plaid to securely import your transactions. New ones land in Needs review so nothing slips by."
      />

      <ul className="flex flex-col gap-3.5">
        {BENEFITS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="flex size-9 flex-none items-center justify-center rounded-[9px] bg-pink-soft text-pink-ink">
              <Icon className="size-[18px]" />
            </span>
            <div>
              <div className="font-semibold">{title}</div>
              <div className="mt-0.5 text-[13px] text-ink-3">{body}</div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2.5">
        {/*
          Placeholder: Settings already runs the Plaid Link flow
          (components/plaid-link-button.tsx). The Plaid PR replaces this link
          with the in-place connect sheet.
        */}
        <Button asChild size="lg" className="w-full">
          <Link href="/settings">Connect with Plaid</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="w-full text-foreground"
        >
          <Link href="/">Skip for now</Link>
        </Button>
        <p className="text-center text-xs text-ink-3">
          You can connect later from your dashboard, or add expenses by hand.
        </p>
      </div>
    </div>
  );
}
