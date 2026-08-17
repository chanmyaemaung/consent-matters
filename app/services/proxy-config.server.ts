import { authenticate } from "../shopify.server";
import { getSettings } from "../models/settings.server";
import { buildStorefrontConfig } from "./metafield.server";

// Shared handler for the app proxy config endpoint. Registered under two
// route paths because the proxy base URL may be recorded with or without
// the /proxy prefix depending on how the CLI/dashboard registered it.
export async function serveProxyConfig(request: Request): Promise<Response> {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return new Response("Not found", { status: 404 });
  }

  const settings = await getSettings(session.shop);
  return new Response(JSON.stringify(buildStorefrontConfig(settings)), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
