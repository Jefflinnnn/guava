import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { EMAIL_MAX } from "@/lib/auth-validation";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Log in · guava" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");

  // ?email= comes from signup's "Log in instead".
  const { email } = await searchParams;
  return (
    <LoginForm
      defaultEmail={typeof email === "string" ? email.slice(0, EMAIL_MAX) : ""}
    />
  );
}
