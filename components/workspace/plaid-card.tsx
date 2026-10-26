"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { PasswordInput } from "@/components/auth/password-input";
import { Field } from "@/components/guava/field";
import { Segmented } from "@/components/guava/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  removePlaidKeys,
  savePlaidKeys,
  testPlaidKeys,
} from "@/lib/plaid-actions";
import {
  PLAID_KEY_MAX,
  plaidClientIdError,
  plaidDetail,
  plaidSecretError,
  type PlaidEnv,
  type PlaidKeyDetails,
} from "@/lib/plaid-validation";
import type { TestResult } from "@/lib/workspace-validation";

import {
  IntegrationCard,
  IntegrationCardFooter,
  TestOutcome,
  type TestStatus,
} from "./integration-card";

type Test = { status: TestStatus; detail: string; error: string };

const UNTESTED: Test = { status: "idle", detail: "", error: "" };
const FAILED: TestResult = {
  ok: false,
  error: "Something went wrong. Try again.",
};

function fromResult(result: TestResult): Test {
  return result.ok
    ? { status: "ok", detail: result.detail, error: "" }
    : { status: "fail", detail: "", error: result.error };
}

const clean = (v: string) => v.replace(/\s/g, "").slice(0, PLAID_KEY_MAX);

/**
 * The optional Plaid card on Integrations: the user's own Plaid client ID and
 * secret (bring your own key), for syncing bank transactions. Testing checks
 * the keys with Plaid; "Save keys" stores them in the user's own database.
 */
export function PlaidCard({ saved }: { saved: PlaidKeyDetails | null }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [env, setEnv] = useState<PlaidEnv>(saved?.env ?? "sandbox");
  const [tried, setTried] = useState(false);
  const [tested, setTested] = useState(false);
  const [test, setTest] = useState<Test>(
    saved ? { status: "ok", detail: plaidDetail(saved), error: "" } : UNTESTED,
  );
  const [isSaving, startSaving] = useTransition();
  // Drops a test result that arrives after the fields changed.
  const run = useRef(0);

  const idErr = plaidClientIdError(clientId);
  const secretErr = plaidSecretError(secret);
  // Saved keys show as Connected until new ones are typed in.
  const editing = clientId !== "" || secret !== "";

  function edited() {
    run.current++;
    setTest(UNTESTED);
  }

  async function onTest() {
    setTried(true);
    if (idErr || secretErr) return;
    const id = ++run.current;
    setTested(true);
    setTest({ ...UNTESTED, status: "testing" });
    const result = await testPlaidKeys({ clientId, secret, env }).catch(
      () => FAILED,
    );
    if (id === run.current) setTest(fromResult(result));
  }

  function save() {
    startSaving(async () => {
      run.current++;
      const result = await savePlaidKeys({ clientId, secret, env }).catch(
        () => FAILED,
      );
      setTest(fromResult(result));
      if (!result.ok) return;
      setClientId("");
      setSecret("");
      setTried(false);
      setTested(false);
      router.refresh();
    });
  }

  function remove() {
    startSaving(async () => {
      run.current++;
      await removePlaidKeys().catch(() => {});
      setTest(UNTESTED);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <IntegrationCard
        mark="P"
        name="Plaid"
        purpose="Optional · sync transactions from your bank with your own keys"
        status={isSaving ? "testing" : test.status}
      >
        <Field
          label="Client ID"
          htmlFor="plaid-client-id"
          error={tried ? idErr || undefined : undefined}
        >
          <Input
            id="plaid-client-id"
            value={clientId}
            maxLength={PLAID_KEY_MAX}
            onChange={(e) => {
              setClientId(clean(e.target.value));
              edited();
            }}
            placeholder={saved ? `Saved · ••••${saved.clientIdEnd}` : ""}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={tried && !!idErr}
            className="h-10 px-3 font-mono text-[13px] shadow-card"
          />
        </Field>
        <Field
          label="Secret"
          htmlFor="plaid-secret"
          aside={
            <Segmented
              aria-label="Plaid environment"
              value={env}
              onChange={(v) => {
                setEnv(v);
                edited();
              }}
              options={[
                { value: "sandbox", label: "Sandbox" },
                { value: "production", label: "Production" },
              ]}
            />
          }
          error={tried ? secretErr || undefined : undefined}
          hint="Each environment has its own secret. Sandbox uses test banks and fake transactions."
        >
          <PasswordInput
            id="plaid-secret"
            value={secret}
            maxLength={PLAID_KEY_MAX}
            revealLabel="secret"
            onChange={(e) => {
              setSecret(clean(e.target.value));
              edited();
            }}
            placeholder={saved ? "Saved · paste new keys to replace them" : ""}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={tried && !!secretErr}
            className="h-10 pl-3 font-mono text-[13px] shadow-card"
          />
        </Field>
        <TestOutcome
          status={test.status}
          detail={test.detail}
          error={test.error}
        />
        <IntegrationCardFooter
          docsHref="https://dashboard.plaid.com/developers/keys"
          docsLabel="Plaid Dashboard → Developers → Keys"
          status={test.status}
          tested={tested}
          onTest={onTest}
        />
      </IntegrationCard>
      <div className="flex justify-end gap-2">
        {saved && !editing && (
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={remove}
          >
            Remove keys
          </Button>
        )}
        {editing && test.status === "ok" && (
          <Button type="button" disabled={isSaving} onClick={save}>
            {isSaving && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            Save keys
          </Button>
        )}
      </div>
    </div>
  );
}
