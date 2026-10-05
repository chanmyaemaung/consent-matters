import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useNavigate, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function App() {
  // App Bridge and Polaris load from the document head in root.tsx.
  return (
    <>
      <AdminNavigation />
      <SessionTokenPing />
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/targeting">Targeting</s-link>
        <s-link href="/app/appearance">Appearance</s-link>
        <s-link href="/app/content">Content</s-link>
        <s-link href="/app/languages">Languages</s-link>
        <s-link href="/app/support">Support</s-link>
      </s-app-nav>
      <Outlet />
    </>
  );
}

/**
 * Turns App Bridge navigation events into client-side React Router
 * navigations — the job the library's AppProvider would do, which this app
 * doesn't render (see root.tsx).
 */
function AdminNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const href = (event.target as Element | null)?.getAttribute("href");
      if (!href) return;
      // App Bridge may send a path or a full URL (the app URL itself when the
      // merchant clicks the app in the admin nav).
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      // "/" is the marketing splash, which asks for a shop domain and must
      // never render inside the admin. Dev previews point the app URL at the
      // tunnel root, so this happens on every click there.
      const path = url.pathname === "/" ? "/app" : url.pathname;
      navigate(`${path}${url.search}${url.hash}`);
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
