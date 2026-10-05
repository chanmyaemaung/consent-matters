import type { ReactNode } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  useRouteLoaderData,
} from "react-router";

// Bump when the icon files change, so browsers drop a cached favicon
// (the template's React Router icon stayed cached for weeks).
const ICON_VERSION = "2";

// Shopify gathers admin Web Vitals through App Bridge, and only counts it when
// the script is loaded from the head of the document — which is also a Built
// for Shopify prerequisite. Public routes must not load it, so the key is only
// exposed for the embedded and auth routes. The library's AppProvider would
// render both scripts in <body>, so the app doesn't use it; Polaris web
// components load from the head alongside App Bridge instead.
function isEmbeddedRoute(pathname: string) {
  return (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname.startsWith("/auth")
  );
}

export const loader = ({ request }: LoaderFunctionArgs) => {
  const { pathname } = new URL(request.url);
  return {
    // eslint-disable-next-line no-undef
    apiKey: isEmbeddedRoute(pathname)
      ? (process.env.SHOPIFY_API_KEY ?? "")
      : null,
  };
};

// Default title for every page; routes override it with their own meta.
export const meta: MetaFunction = ({ error }) => {
  if (!error) return [{ title: "Consent Matters" }];
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return [
    {
      title: notFound
        ? "Page not found — Consent Matters"
        : "Error — Consent Matters",
    },
  ];
};

/**
 * Shared document shell for every page, including error pages — so the app
 * icon and title never fall back to the template's.
 */
export function Layout({ children }: { children: ReactNode }) {
  const apiKey = useRouteLoaderData<typeof loader>("root")?.apiKey ?? null;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {apiKey ? (
          <>
            <meta name="shopify-api-key" content={apiKey} />
            <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
            <script src="https://cdn.shopify.com/shopifycloud/polaris.js" />
          </>
        ) : null}
        <link
          rel="icon"
          href={`/favicon.ico?v=${ICON_VERSION}`}
          sizes="48x48"
        />
        <link
          rel="icon"
          href={`/icon.svg?v=${ICON_VERSION}`}
          type="image/svg+xml"
        />
        <link
          rel="apple-touch-icon"
          href={`/apple-touch-icon.png?v=${ICON_VERSION}`}
        />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main
      style={{
        maxWidth: "560px",
        margin: "0 auto",
        padding: "96px 24px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#202223",
        textAlign: "center",
      }}
    >
      <h1>{notFound ? "Page not found" : "Something went wrong"}</h1>
      <p>
        <a href="/">Consent Matters</a> · <a href="/privacy">Privacy policy</a>
      </p>
    </main>
  );
}
