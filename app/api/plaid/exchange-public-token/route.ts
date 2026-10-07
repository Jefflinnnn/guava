import { encrypt } from "@/lib/crypto";
import { getCurrentUserId } from "@/lib/current-user";
import { getPlaidClient, plaidCountryCodes } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";

// Step 3 of Plaid Link: after the user finishes Link in the browser,
// swap the one-time public_token for a permanent access_token and store it.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    publicToken?: unknown;
  } | null;
  const publicToken = body?.publicToken;
  if (typeof publicToken !== "string" || !publicToken) {
    return Response.json({ error: "publicToken is required" }, { status: 400 });
  }

  try {
    const userId = await getCurrentUserId();
    const plaid = getPlaidClient();

    const { data: exchange } = await plaid.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = exchange.access_token;

    // Fetch display info for the connection and its accounts.
    const { data: accountsData } = await plaid.accountsGet({
      access_token: accessToken,
    });
    const institutionId = accountsData.item.institution_id ?? null;

    let institutionName: string | null = null;
    if (institutionId) {
      const { data: inst } = await plaid.institutionsGetById({
        institution_id: institutionId,
        country_codes: plaidCountryCodes(),
      });
      institutionName = inst.institution.name;
    }

    const item = await prisma.plaidItem.upsert({
      where: { plaidItemId: exchange.item_id },
      update: { accessToken: encrypt(accessToken), institutionName },
      create: {
        userId,
        plaidItemId: exchange.item_id,
        accessToken: encrypt(accessToken),
        institutionId,
        institutionName,
      },
    });

    for (const acct of accountsData.accounts) {
      const fields = {
        name: acct.name,
        mask: acct.mask,
        type: acct.type,
        subtype: acct.subtype ?? null,
      };
      await prisma.account.upsert({
        where: { plaidAccountId: acct.account_id },
        update: fields,
        create: { ...fields, plaidAccountId: acct.account_id, plaidItemId: item.id },
      });
    }

    // Only non-secret fields go back to the browser.
    return Response.json({
      itemId: item.id,
      institutionName,
      accountCount: accountsData.accounts.length,
    });
  } catch (error) {
    console.error("exchange-public-token failed", error);
    return Response.json(
      { error: "Could not link account" },
      { status: 500 }
    );
  }
}
