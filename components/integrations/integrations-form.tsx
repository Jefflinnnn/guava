"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { FormError } from "@/components/auth/auth-layout";
import { PasswordInput } from "@/components/auth/password-input";
import { Field } from "@/components/guava/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveIntegrations,
  testNeon,
  testPlaid,
} from "@/lib/integration-actions";
import type { SavedIntegrations, TestResult } from "@/lib/integrations";
import {
  NEON_URL_MAX,
  neonDetail,
  neonUrlError,
  PLAID_CLIENT_ID_LENGTH,
  PLAID_ENVS,
  PLAID_SECRET_LENGTH,
  plaidClientIdError,
  plaidDetail,
  plaidEnvLabel,
  plaidSecretError,
  stripWhitespace,
  type PlaidEnv,
} from "@/lib/integrations-validation";
import { cn } from "@/lib/utils";

import {
  IntegrationCard,
  IntegrationCardFooter,
  TestOutcome,
  type TestStatus,
} from "./integration-card";

const keyInputClass = "h-10 px-3 font-mono text-[13px] shadow-card";

type Test = { status: TestStatus; detail: string; error: string };

const UNTESTED: Test = { status: "idle", detail: "", error: "" };

function fromResult(result: TestResult): Test {
  return result.ok
    ? { status: "ok", detail: result.detail, error: "" }
    : { status: "fail", detail: "", error: result.error };
}

/**
 * One card's test state. Editing a field calls `reset`, and a result that
 * arrives after an edit (or a newer test) is dropped.
 */
function useConnectionTest(initial: Test) {
  const [test, setTest] = useState(initial);
  const [tested, setTested] = useState(false);
  const run = useRef(0);

  return {
    ...test,
    tested,
    reset() {
      run.current++;
      setTest(UNTESTED);
    },
    async start(action: () => Promise<TestResult>) {
      const id = ++run.current;
      setTested(true);
      setTest({ ...UNTESTED, status: "testing" });
      let result: TestResult;
      try {
        result = await action();
      } catch {
        result = { ok: false, error: "Something went wrong. Try again." };
      }
      if (id === run.current) setTest(fromResult(result));
    },
    set(result: TestResult) {
      run.current++;
      setTest(fromResult(result));
    },
  };
}

/**
 * The bring-your-own-keys form: a Plaid card and a Neon card.
 *
 * - `onboarding` (sign-up step 2): tests are dry runs; "Save and connect a
 *   bank" re-tests both on the server and saves them together.
 * - `page` (the Integrations page): a passing test saves that card's keys
 *   right away. Saved secrets are never sent back, so their fields start
 *   empty and the card shows the last verified details.
 */
export function IntegrationsForm({
  mode,
  saved,
}: {
  mode: "onboarding" | "page";
  saved: SavedIntegrations;
}) {
  const router = useRouter();
  const save = mode === "page";

  const [env, setEnv] = useState<PlaidEnv>(saved.plaid?.env ?? "sandbox");
  const [clientId, setClientId] = useState(saved.plaid?.clientId ?? "");
  const [secret, setSecret] = useState("");
  const [plaidTried, setPlaidTried] = useState(false);
  const plaid = useConnectionTest(
    saved.plaid
      ? { status: "ok", detail: plaidDetail(saved.plaid.env), error: "" }
      : UNTESTED,
  );

  const [neonUrl, setNeonUrl] = useState("");
  const [neonTried, setNeonTried] = useState(false);
  const neon = useConnectionTest(
    saved.neon
      ? { status: "ok", detail: neonDetail(saved.neon), error: "" }
      : UNTESTED,
  );

  const [formTried, setFormTried] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const clientIdErr = plaidClientIdError(clientId);
  const secretErr = plaidSecretError(secret);
  const neonErr = neonUrlError(neonUrl);
  const bothOk = plaid.status === "ok" && neon.status === "ok";

  function testPlaidKeys() {
    setPlaidTried(true);
    if (clientIdErr || secretErr) return;
    plaid.start(() => testPlaid({ env, clientId, secret }, { save }));
  }

  function testNeonUrl() {
    setNeonTried(true);
    if (neonErr) return;
    neon.start(() => testNeon(neonUrl, { save }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!bothOk) {
      setPlaidTried(true);
      setNeonTried(true);
      setFormTried(true);
      return;
    }
    startSaving(async () => {
      const result = await saveIntegrations({
        plaid: { env, clientId, secret },
        neon: neonUrl,
      });
      plaid.set(result.plaid);
      neon.set(result.neon);
      // TODO(plaid): open the bank connect sheet (Plaid Link with the user's
      // keys) here, ending in "Go to dashboard". Until then, the Integrations
      // page has "Add a bank".
      if (result.saved) router.push("/integrations");
    });
  }

  const cards = (
    <>
      <IntegrationCard
        mark="P"
        name="Plaid"
        purpose="Bank connections and transaction sync"
        status={plaid.status}
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Environment</span>
          <div
            role="radiogroup"
            aria-label="Plaid environment"
            className="flex gap-0.5 rounded-lg bg-muted p-[3px]"
          >
            {PLAID_ENVS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={env === value}
                onClick={() => {
                  if (env === value) return;
                  setEnv(value);
                  plaid.reset();
                }}
                className={cn(
                  "h-[30px] flex-1 cursor-pointer rounded-md text-[13px] font-medium transition-colors",
                  env === value
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,.12)]"
                    : "text-ink-3 hover:text-foreground",
                )}
              >
                {plaidEnvLabel(value)}
              </button>
            ))}
          </div>
        </div>
        <Field
          label="Client ID"
          htmlFor="plaid-client-id"
          error={plaidTried ? clientIdErr : undefined}
        >
          <Input
            id="plaid-client-id"
            value={clientId}
            onChange={(e) => {
              setClientId(
                stripWhitespace(e.target.value, PLAID_CLIENT_ID_LENGTH),
              );
              plaid.reset();
            }}
            placeholder="24-character client_id"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={plaidTried && !!clientIdErr}
            className={keyInputClass}
          />
        </Field>
        <Field
          label={
            <>
              Secret{" "}
              <span className="font-normal text-ink-3">
                · {plaidEnvLabel(env)}
              </span>
            </>
          }
          htmlFor="plaid-secret"
          error={plaidTried ? secretErr : undefined}
        >
          <PasswordInput
            id="plaid-secret"
            value={secret}
            maxLength={PLAID_SECRET_LENGTH}
            revealLabel="secret"
            onChange={(e) => {
              setSecret(stripWhitespace(e.target.value, PLAID_SECRET_LENGTH));
              plaid.reset();
            }}
            placeholder={
              saved.plaid
                ? "Saved · paste a new secret to replace it"
                : "30-character secret"
            }
            autoComplete="off"
            spellCheck={false}
            aria-invalid={plaidTried && !!secretErr}
            className={keyInputClass}
          />
        </Field>
        <TestOutcome
          status={plaid.status}
          detail={plaid.detail}
          error={plaid.error}
        />
        <IntegrationCardFooter
          docsHref="https://dashboard.plaid.com/developers/keys"
          docsLabel="Find these in Plaid Dashboard → Keys"
          status={plaid.status}
          tested={plaid.tested}
          onTest={testPlaidKeys}
        />
      </IntegrationCard>

      <IntegrationCard
        mark="N"
        name="Neon Postgres"
        purpose="Database for your expenses and categories"
        status={neon.status}
      >
        <Field
          label="Connection string"
          htmlFor="neon-url"
          error={neonTried ? neonErr : undefined}
          hint="guava creates its tables on first connect. A dedicated database is recommended."
        >
          <PasswordInput
            id="neon-url"
            value={neonUrl}
            maxLength={NEON_URL_MAX}
            revealLabel="connection string"
            onChange={(e) => {
              setNeonUrl(stripWhitespace(e.target.value, NEON_URL_MAX));
              neon.reset();
            }}
            placeholder={
              saved.neon
                ? "Saved · paste a new string to replace it"
                : "postgresql://user:password@ep-….neon.tech/neondb?sslmode=require"
            }
            autoComplete="off"
            spellCheck={false}
            aria-invalid={neonTried && !!neonErr}
            className={keyInputClass}
          />
        </Field>
        <TestOutcome
          status={neon.status}
          detail={neon.detail}
          error={neon.error}
        />
        <IntegrationCardFooter
          docsHref="https://console.neon.tech"
          docsLabel="Neon Console → Connect → copy string"
          status={neon.status}
          tested={neon.tested}
          onTest={testNeonUrl}
        />
      </IntegrationCard>
    </>
  );

  if (mode === "page") return cards;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-[18px]">
      {cards}
      {formTried && !bothOk && (
        <FormError>Test both connections before continuing.</FormError>
      )}
      <div className="flex flex-col gap-2.5">
        <Button type="submit" size="lg" className="w-full" disabled={isSaving}>
          {isSaving && (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          )}
          Save and connect a bank
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
          Rotate your keys anytime on the Integrations page.
        </p>
      </div>
    </form>
  );
}
