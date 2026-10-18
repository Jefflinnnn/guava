import { AuthLayout } from "@/components/auth/auth-layout";

export default function AuthGroupLayout({ children }: LayoutProps<"/">) {
  return <AuthLayout>{children}</AuthLayout>;
}
