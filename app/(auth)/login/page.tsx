import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { googleEnabled } from "@/lib/auth";
import { EMAIL_MAX } from "@/lib/auth-validation";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Log in · guava" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");

  // ?email= comes from signup's "Log in instead"; ?error= from a failed
  // Google sign-in (Better Auth's errorCallbackURL).
  const { email, error } = await searchParams;
  return (
    <LoginForm
      defaultEmail={typeof email === "string" ? email.slice(0, EMAIL_MAX) : ""}
      defaultError={
        error ? "Google sign-in didn’t go through. Try again." : undefined
      }
      googleEnabled={googleEnabled}
    />
  );
}
