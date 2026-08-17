import type { LoaderFunctionArgs } from "react-router";
import { serveProxyConfig } from "../services/proxy-config.server";

// App proxy endpoint when the proxy base URL includes the /proxy prefix.
export const loader = async ({ request }: LoaderFunctionArgs) =>
  serveProxyConfig(request);
