import { getCurrentUserId, unauthorizedResponse } from "@/lib/current-user";
import {
  logPlaidError,
  NoPlaidKeysError,
  PLAID_COUNTRY_CODES,
  PLAID_PRODUCTS,
  userPlaidClient,
} from "@/lib/plaid";
import { getUserDb } from "@/lib/workspace";

// Step 1 of Plaid Link: the server creates a short-lived link_token, with the
// user's own Plaid keys, that the browser uses to open the Link modal.
export async function POST() {
  try {
    const userId = await getCurrentUserId();
    const plaid = await userPlaidClient(await getUserDb());

    const { data } = await plaid.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "Guava",
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
    });

    return Response.json({ linkToken: data.link_token });
  } catch (error) {
    const unauthorized = unauthorizedResponse(error);
    if (unauthorized) return unauthorized;
    if (error instanceof NoPlaidKeysError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    logPlaidError("create-link-token failed", error);
    return Response.json(
      { error: "Could not create link token" },
      { status: 500 },
    );
  }
}
