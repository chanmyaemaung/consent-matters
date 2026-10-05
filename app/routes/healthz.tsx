// Public health check. No database to keep awake any more, so this only
// confirms the server responds; safe to remove once external pings stop.
export const loader = async () =>
  Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
