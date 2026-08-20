import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// Pinged once on every embedded page load so the app always makes a
// session-token authenticated request (Authorization: Bearer ...) —
// App Bridge attaches the token to same-origin fetches automatically.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
};
