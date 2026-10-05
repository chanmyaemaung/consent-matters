import { authenticate } from "../shopify.server";
import { savePartialSettings, validateSettings } from "../models";
import type { SettingsInput } from "../types";

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; errors: ReturnType<typeof validateSettings> }
  | { ok: false; syncError: string };

/**
 * Shared action for every settings page: parse the page's subset of
 * fields, validate, then persist to the shop metafields the storefront reads.
 */
export async function handleSettingsAction(
  request: Request,
  parse: (formData: FormData) => Partial<SettingsInput>,
): Promise<SettingsActionResult> {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const input = parse(formData);

  const errors = validateSettings(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    await savePartialSettings(admin, input);
  } catch (error) {
    return {
      ok: false,
      syncError: error instanceof Error ? error.message : String(error),
    };
  }
  return { ok: true };
}
