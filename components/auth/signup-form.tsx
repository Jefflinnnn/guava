"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";

import { Field } from "@/components/guava/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isEmailRegistered, signUp } from "@/lib/auth-actions";
import {
  EMAIL_MAX,
  emailError,
  NAME_MAX,
  normalizeEmail,
  PASSWORD_RULES,
  passwordOk,
} from "@/lib/auth-validation";
import { cn } from "@/lib/utils";

import { AuthHeader, authLinkClass, FormError } from "./auth-layout";
import { PasswordInput } from "./password-input";

// Wait for a pause in typing before asking the server about the email.
const EMAIL_CHECK_DELAY_MS = 400;

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [tried, setTried] = useState(false);
  const [formError, setFormError] = useState("");
  // The last emails the server said are taken (normalized).
  const [takenEmails, setTakenEmails] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const normalized = normalizeEmail(email);
  const formatErr = emailError(email);
  const taken = !formatErr && takenEmails.includes(normalized);

  // Live "already exists" check, debounced.
  useEffect(() => {
    if (formatErr) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      isEmailRegistered(normalized)
        .then((exists) => {
          if (cancelled || !exists) return;
          setTakenEmails((list) =>
            list.includes(normalized) ? list : [...list, normalized],
          );
        })
        // The submit still catches a taken email, so a failed check is fine.
        .catch(() => {});
    }, EMAIL_CHECK_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalized, formatErr]);

  const nameErr = name.trim() ? "" : "Enter your name.";
  const pwOk = passwordOk(password);
  const showNameErr = tried && !!nameErr;
  const showEmailErr = (tried && !!formatErr) || taken;
  const showPwErr = tried && !pwOk;
  const showTermsErr = tried && !terms;

  const emailMessage = taken ? (
    <>
      An account with this email already exists.{" "}
      <Link
        href={`/login?email=${encodeURIComponent(email.trim())}`}
        className="font-medium underline underline-offset-3"
      >
        Log in instead
      </Link>
    </>
  ) : (
    formatErr
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    setFormError("");
    if (nameErr || formatErr || taken || !pwOk || !terms) return;
    startTransition(async () => {
      // Redirects to step 2 (connect your database) on success.
      const result = await signUp({ name, email, password });
      if (result.emailTaken) {
        setTakenEmails((list) => [...list, normalized]);
      } else if (result.formError) {
        setFormError(result.formError);
      }
    });
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex w-full max-w-[380px] flex-col gap-4"
    >
      <AuthHeader
        step="Step 1 of 2"
        title="Create your account"
        subtitle="It takes about a minute."
      />

      <Field
        label="Full name"
        htmlFor="signup-name"
        error={showNameErr ? nameErr : undefined}
      >
        <Input
          id="signup-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Buzz Peterson"
          autoComplete="name"
          maxLength={NAME_MAX}
          aria-invalid={showNameErr || undefined}
          className="h-10 px-3 shadow-card"
        />
      </Field>

      <Field
        label="Email"
        htmlFor="signup-email"
        error={showEmailErr ? emailMessage : undefined}
      >
        <Input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={EMAIL_MAX}
          aria-invalid={showEmailErr || undefined}
          className="h-10 px-3 shadow-card"
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-password" className="text-[13px]">
          Password
        </Label>
        <PasswordInput
          id="signup-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          autoComplete="new-password"
          aria-invalid={showPwErr || undefined}
          aria-describedby="signup-password-rules"
        />
        <ul
          id="signup-password-rules"
          className="mt-0.5 flex flex-wrap gap-x-3.5 gap-y-1.5"
        >
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password);
            return (
              <li
                key={rule.label}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs",
                  ok ? "text-foreground" : tried ? "text-danger" : "text-ink-3",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full text-white",
                    ok ? "bg-primary" : "bg-border-strong",
                  )}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {rule.label}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="signup-terms"
            checked={terms}
            onCheckedChange={(v) => setTerms(v === true)}
            aria-invalid={showTermsErr || undefined}
            className="mt-px"
          />
          <Label
            htmlFor="signup-terms"
            className="text-[13px] leading-[1.45] font-normal text-ink-2"
          >
            I agree to the Terms of Service and Privacy Policy.
          </Label>
        </div>
        {showTermsErr && (
          <p role="alert" className="text-xs text-danger">
            Please accept the terms to continue.
          </p>
        )}
      </div>

      {formError && <FormError>{formError}</FormError>}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="animate-spin" />}
        Create account
      </Button>

      <p className="text-center text-[13px] text-ink-3">
        Already have an account?{" "}
        <Link href="/login" className={authLinkClass}>
          Log in
        </Link>
      </p>
    </form>
  );
}
