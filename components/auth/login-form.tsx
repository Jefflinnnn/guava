"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Field } from "@/components/guava/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logIn } from "@/lib/auth-actions";
import { EMAIL_MAX, emailError } from "@/lib/auth-validation";
import { cn } from "@/lib/utils";

import { AuthHeader, authLinkClass, FormError } from "./auth-layout";
import { PasswordInput } from "./password-input";

export function LoginForm({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  // Field errors show after a submit attempt (or "Forgot password?" for email).
  const [tried, setTried] = useState(false);
  const [emailTried, setEmailTried] = useState(false);
  const [formError, setFormError] = useState("");
  const [forgotNote, setForgotNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const emailErr = emailError(email);
  const passwordErr = password ? "" : "Enter your password.";
  const showEmailErr = (tried || emailTried) && !!emailErr;
  const showPasswordErr = tried && !!passwordErr;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    setFormError("");
    if (emailErr || passwordErr) return;
    startTransition(async () => {
      // Redirects to the dashboard on success.
      const result = await logIn({ email, password });
      if (result.formError) setFormError(result.formError);
    });
  }

  function onForgot() {
    if (emailErr) {
      setEmailTried(true);
      setForgotNote("");
      return;
    }
    // TODO: request a reset email once lib/auth.ts has an email provider
    // (sendResetPassword). Until then this is only the note.
    setForgotNote(
      `If an account exists for ${email.trim()}, a reset link is on its way.`,
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex w-full max-w-[380px] flex-col gap-[18px]"
    >
      <AuthHeader title="Welcome back" />

      <Field
        label="Email"
        htmlFor="login-email"
        error={showEmailErr ? emailErr : undefined}
      >
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFormError("");
            setForgotNote("");
          }}
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={EMAIL_MAX}
          aria-invalid={showEmailErr || undefined}
          className="h-10 px-3 shadow-card"
        />
      </Field>

      <Field
        label="Password"
        htmlFor="login-password"
        aside={
          <button
            type="button"
            onClick={onForgot}
            className={cn(authLinkClass, "text-xs")}
          >
            Forgot password?
          </button>
        }
        error={showPasswordErr ? passwordErr : undefined}
        hint={forgotNote || undefined}
      >
        <PasswordInput
          id="login-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFormError("");
          }}
          placeholder="Your password"
          autoComplete="current-password"
          aria-invalid={showPasswordErr || undefined}
        />
      </Field>

      {formError && <FormError>{formError}</FormError>}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="animate-spin" />}
        Log in
      </Button>

      <p className="text-center text-[13px] text-ink-3">
        New to guava?{" "}
        <Link href="/signup" className={authLinkClass}>
          Create an account
        </Link>
      </p>
    </form>
  );
}
