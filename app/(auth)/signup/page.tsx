import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Create your account · guava" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");
  return <SignupForm />;
}
