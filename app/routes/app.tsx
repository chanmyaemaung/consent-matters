import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useNavigate, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function App() {
  // App Bridge itself is loaded from the document head in root.tsx, so this
  // provider only contributes the Polaris web components script.
  return (
    <AppProvider embedded={false}>
      <AdminNavigation />
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
 * Turns App Bridge navigation events into client-side React Router
 * navigations. AppProvider does this itself when it renders the App Bridge
 * script, which it no longer does here.
 */
function AdminNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const href = (event.target as Element | null)?.getAttribute("href");
      if (!href) return;
      // "/" is the marketing splash, which asks for a shop domain and must
      // never render inside the admin. A client-side navigation there carries
      // no shop parameter for the loader to redirect on, so map it here.
      navigate(href === "/" ? "/app" : href);
    };

    document.addEventListener("shopify:navigate", handleNavigate);
    return () => {
      document.removeEventListener("shopify:navigate", handleNavigate);
    };
  }, [navigate]);

  return null;
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
