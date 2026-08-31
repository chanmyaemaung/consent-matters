import type { LoaderFunctionArgs } from "react-router";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

// Shopify gathers admin Web Vitals through App Bridge, and only counts it when
// the script is loaded from the head of the document — which is also a Built
// for Shopify prerequisite. Public routes must not load it, so the key is only
// exposed for the embedded and auth routes.
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

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {apiKey ? (
          <>
            <meta name="shopify-api-key" content={apiKey} />
            <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
          </>
        ) : null}
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
