import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Mandatory privacy compliance webhooks. authenticate.webhook verifies the
// HMAC and responds 401 to forged requests.
//
// This app stores no customer data at all — only per-shop banner settings —
// so customers/data_request and customers/redact have nothing to return
// or delete.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
      // No customer data stored.
      break;
    case "SHOP_REDACT":
      await db.settings.deleteMany({ where: { shop } });
      await db.session.deleteMany({ where: { shop } });
      break;
  }

  return new Response();
};
