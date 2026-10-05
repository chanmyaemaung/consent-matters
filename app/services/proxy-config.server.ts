import { authenticate } from "../shopify.server";
import { readSettingsMetafields, buildStorefrontConfig } from "./metafield.server";

// Shared handler for the app proxy config endpoint. Registered under two
// route paths because the proxy base URL may be recorded with or without
// the /proxy prefix depending on how the CLI/dashboard registered it.
//
// Backup path only: the banner normally reads the config straight from the
// shop metafield in Liquid. Sessions live in memory, so this can answer only
// when this server instance has seen the shop recently; otherwise 404, which
// the banner treats as "unconfigured — step aside".
export async function serveProxyConfig(request: Request): Promise<Response> {
  const { admin } = await authenticate.public.appProxy(request);
  if (!admin) {
    return new Response("Not found", { status: 404 });
  }

  const { settings, exists } = await readSettingsMetafields(admin);
  if (!exists) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(JSON.stringify(buildStorefrontConfig(settings)), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
