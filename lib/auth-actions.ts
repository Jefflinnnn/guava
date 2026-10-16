"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import {
  EMAIL_MAX,
  emailError,
  NAME_MAX,
  normalizeEmail,
  passwordOk,
} from "@/lib/auth-validation";
import { prisma } from "@/lib/prisma";

export type AuthFormResult = {
  /** Shown in the red box above the submit button. */
  formError?: string;
  /** Signup only: the email belongs to an existing account. */
  emailTaken?: boolean;
};

const GENERIC_ERROR = "Something went wrong. Try again in a moment.";

/** Better Auth's error code, e.g. "INVALID_EMAIL_OR_PASSWORD". */
function errorCode(error: unknown): string | undefined {
  return isAPIError(error) ? error.body?.code : undefined;
}

/**
 * Whether an account exists for `email`. Powers the live "already exists"
 * check on signup and the "No account found" vs "Incorrect password" split on
 * login. This does reveal which emails are registered (account enumeration);
 * the design asks for it, and the signup form would reveal it anyway.
 */
export async function isEmailRegistered(email: string): Promise<boolean> {
  if (typeof email !== "string" || emailError(email)) return false;
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true },
  });
  return user !== null;
}

export async function logIn(input: {
  email: string;
  password: string;
}): Promise<AuthFormResult> {
  const { email, password } = input;
  if (typeof email !== "string" || typeof password !== "string") {
    return { formError: GENERIC_ERROR };
  }
  if (emailError(email) || !password) return { formError: GENERIC_ERROR };

  try {
    await getAuth().api.signInEmail({
      body: { email: normalizeEmail(email), password },
      headers: await headers(),
    });
  } catch (error) {
    if (errorCode(error) === "INVALID_EMAIL_OR_PASSWORD") {
      // Better Auth answers the same for both cases; tell them apart here.
      return {
        formError: (await isEmailRegistered(email))
          ? "Incorrect password. Try again or reset it."
          : "No account found for that email. Check it or create an account.",
      };
    }
    console.error("logIn failed", error);
    return { formError: GENERIC_ERROR };
  }
  redirect("/");
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthFormResult> {
  const { name, email, password } = input;
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    name.trim().length > NAME_MAX ||
    email.trim().length > EMAIL_MAX ||
    emailError(email) ||
    !passwordOk(password)
  ) {
    return { formError: GENERIC_ERROR };
  }

  try {
    await getAuth().api.signUpEmail({
      body: { name: name.trim(), email: normalizeEmail(email), password },
      headers: await headers(),
    });
  } catch (error) {
    if (errorCode(error) === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      return { emailTaken: true };
    }
    console.error("signUp failed", error);
    return { formError: GENERIC_ERROR };
  }
  redirect("/connect");
}

export async function logOut() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/login");
}
