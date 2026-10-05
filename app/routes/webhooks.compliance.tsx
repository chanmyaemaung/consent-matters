import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// Mandatory privacy compliance webhooks. authenticate.webhook verifies the
// HMAC and responds 401 to forged requests.
//
// This app stores no customer data and has no database: per-shop banner
// settings live in app-owned metafields, which Shopify deletes with the
// shop. So every topic is acknowledged with nothing to return or delete.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  return new Response();
};
