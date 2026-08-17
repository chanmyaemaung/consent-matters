import type { LoaderFunctionArgs } from "react-router";
import { serveProxyConfig } from "../services/proxy-config.server";

// App proxy endpoint when the proxy base URL is the app root (the CLI
// registers the tunnel root during dev).
export const loader = async ({ request }: LoaderFunctionArgs) =>
  serveProxyConfig(request);
