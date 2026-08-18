import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  // Vercel requires this preset to build and route React Router 7 apps.
  presets: [vercelPreset()],
} satisfies Config;
