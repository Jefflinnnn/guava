import { getCurrentUserId } from "@/lib/current-user";
import { getPlaidClient, plaidCountryCodes, plaidProducts } from "@/lib/plaid";

// Step 1 of Plaid Link: the server creates a short-lived link_token
// that the browser uses to open the Link modal.
export async function POST() {
  try {
    const userId = await getCurrentUserId();

    const { data } = await getPlaidClient().linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "Guava",
      products: plaidProducts(),
      country_codes: plaidCountryCodes(),
      language: "en",
      ...(process.env.PLAID_WEBHOOK_URL
        ? { webhook: process.env.PLAID_WEBHOOK_URL }
        : {}),
    });

    return Response.json({ linkToken: data.link_token });
  } catch (error) {
    console.error("create-link-token failed", error);
    return Response.json(
      { error: "Could not create link token" },
      { status: 500 }
    );
  }
}
