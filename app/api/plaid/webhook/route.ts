// Plaid calls this URL when something changes on an Item
// (new transactions, login required, etc.). Set PLAID_WEBHOOK_URL to it.
//
// TODO before production: verify the Plaid-Verification JWT header.
// https://plaid.com/docs/api/webhooks/webhook-verification/
export async function POST(request: Request) {
  const event = (await request.json().catch(() => null)) as {
    webhook_type?: string;
    webhook_code?: string;
    item_id?: string;
  } | null;

  if (!event) return Response.json({ error: "Invalid body" }, { status: 400 });

  console.log(
    `Plaid webhook: ${event.webhook_type}/${event.webhook_code} for ${event.item_id}`
  );

  switch (`${event.webhook_type}/${event.webhook_code}`) {
    case "TRANSACTIONS/SYNC_UPDATES_AVAILABLE":
      // TODO: call /transactions/sync with the item's stored cursor.
      break;
    case "ITEM/ERROR":
    case "ITEM/PENDING_DISCONNECT":
      // TODO: flag the item so the user can re-link via Link update mode.
      break;
  }

  // Respond fast; Plaid retries on non-2xx.
  return Response.json({ received: true });
}
