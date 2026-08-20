import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <SessionTokenPing />
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/targeting">Targeting</s-link>
        <s-link href="/app/appearance">Appearance</s-link>
        <s-link href="/app/content">Content</s-link>
        <s-link href="/app/support">Support</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

/**
 * Makes one session-token authenticated request per embedded load.
 * Server-rendered loaders authenticate through the document request, so
 * without this nothing carries an `Authorization: Bearer` header until the
 * merchant navigates or saves — which is what Shopify's embedded app checks
 * look for. Renders nothing; failures are non-fatal.
 */
function SessionTokenPing() {
  const shopify = useAppBridge();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const token = await shopify.idToken();
        if (cancelled) return;
        await fetch("/app/session-check", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Non-fatal: the admin UI works regardless of this ping.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shopify]);

  return null;
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
