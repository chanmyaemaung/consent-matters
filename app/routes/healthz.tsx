// Public uptime check: confirms the server responds. The release checklist
// curls it after each deploy. No database behind it.
export const loader = async () =>
  Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
