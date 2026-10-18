"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { PasswordInput } from "@/components/auth/password-input";
import { Field } from "@/components/guava/field";
import { Button } from "@/components/ui/button";
import { connectWorkspace, testWorkspace } from "@/lib/workspace-actions";
import {
  NEON_URL_MAX,
  neonDetail,
  neonUrlError,
  stripWhitespace,
  type NeonDetails,
  type TestResult,
} from "@/lib/workspace-validation";

import {
  IntegrationCard,
  IntegrationCardFooter,
  TestOutcome,
  type TestStatus,
} from "./integration-card";

type Test = { status: TestStatus; detail: string; error: string };

const UNTESTED: Test = { status: "idle", detail: "", error: "" };

function fromResult(result: TestResult): Test {
  return result.ok
    ? { status: "ok", detail: result.detail, error: "" }
    : { status: "fail", detail: "", error: result.error };
}

/**
 * The Neon Postgres card: the user's own database for their expenses and
 * categories.
 *
 * - `onboarding` (sign-up step 2): "Save and continue" tests the string,
 *   creates guava's tables and saves it, then opens the dashboard.
 * - `page` (Integrations): shows the connected database. Pasting a new string
 *   and testing it offers "Switch to this database".
 */
export function NeonCard({
  mode,
  saved,
}: {
  mode: "onboarding" | "page";
  saved: NeonDetails | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [tried, setTried] = useState(false);
  const [tested, setTested] = useState(false);
  const [test, setTest] = useState<Test>(
    saved ? { status: "ok", detail: neonDetail(saved), error: "" } : UNTESTED,
  );
  const [isSaving, startSaving] = useTransition();
  // Drops a test result that arrives after the field changed.
  const run = useRef(0);

  const urlErr = neonUrlError(url);
  // On the page, the saved database shows as Connected until a new string
  // is typed in.
  const editing = url !== "";

  function onChange(value: string) {
    run.current++;
    setUrl(stripWhitespace(value, NEON_URL_MAX));
    setTest(UNTESTED);
  }

  async function onTest() {
    setTried(true);
    if (urlErr) return;
    const id = ++run.current;
    setTested(true);
    setTest({ ...UNTESTED, status: "testing" });
    const result = await testWorkspace(url).catch((): TestResult => ({
      ok: false,
      error: "Something went wrong. Try again.",
    }));
    if (id === run.current) setTest(fromResult(result));
  }

  function save() {
    setTried(true);
    if (urlErr) return;
    startSaving(async () => {
      run.current++;
      const result = await connectWorkspace(url).catch((): TestResult => ({
        ok: false,
        error: "Something went wrong. Try again.",
      }));
      setTest(fromResult(result));
      if (!result.ok) return;
      if (mode === "onboarding") {
        router.push("/");
      } else {
        setUrl("");
        setTried(false);
        router.refresh();
      }
    });
  }

  const card = (
    <IntegrationCard
      mark="N"
      name="Neon Postgres"
      purpose="Database for your expenses and categories"
      status={isSaving ? "testing" : test.status}
    >
      <Field
        label="Connection string"
        htmlFor="neon-url"
        error={tried ? urlErr || undefined : undefined}
        hint={
          mode === "page" && saved
            ? "Switching databases doesn’t copy your data from the current one."
            : "guava creates its tables on first connect. A dedicated database is recommended."
        }
      >
        <PasswordInput
          id="neon-url"
          value={url}
          maxLength={NEON_URL_MAX}
          revealLabel="connection string"
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            saved
              ? "Saved · paste a new string to switch databases"
              : "postgresql://user:password@ep-….neon.tech/neondb?sslmode=require"
          }
          autoComplete="off"
          spellCheck={false}
          aria-invalid={tried && !!urlErr}
          className="h-10 pl-3 font-mono text-[13px] shadow-card"
        />
      </Field>
      <TestOutcome
        status={test.status}
        detail={test.detail}
        error={test.error}
      />
      <IntegrationCardFooter
        docsHref="https://console.neon.tech"
        docsLabel="Neon Console → Connect → copy string"
        status={test.status}
        tested={tested}
        onTest={onTest}
      />
    </IntegrationCard>
  );

  if (mode === "page") {
    return (
      <div className="flex flex-col gap-3">
        {card}
        {editing && test.status === "ok" && (
          <Button
            type="button"
            className="self-end"
            disabled={isSaving}
            onClick={save}
          >
            {isSaving && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            Switch to this database
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col gap-[18px]"
    >
      {card}
      <div className="flex flex-col gap-2.5">
        <Button type="submit" size="lg" className="w-full" disabled={isSaving}>
          {isSaving && (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          )}
          {isSaving ? "Setting up your database…" : "Save and continue"}
        </Button>
        <p className="text-center text-xs text-ink-3">
          Switch databases anytime on the Integrations page.
        </p>
      </div>
    </form>
  );
}
