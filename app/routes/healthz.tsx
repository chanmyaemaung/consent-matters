import db from "../db.server";

// Public health check that touches the database. An external cron pings
// this every few minutes to keep the Neon compute from auto-suspending.
export const loader = async () => {
  await db.$queryRaw`SELECT 1`;
  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
};
