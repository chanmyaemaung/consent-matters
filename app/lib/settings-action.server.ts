import { authenticate } from "../shopify.server";
import { savePartialSettings, validateSettings } from "../models";
import { syncSettingsMetafield } from "../services";
import type { SettingsInput } from "../types";

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; errors: ReturnType<typeof validateSettings> }
  | { ok: false; syncError: string };

/**
 * Shared action for every settings page: parse the page's subset of
 * fields, validate, persist, and republish the storefront config.
 */
export async function handleSettingsAction(
  request: Request,
  parse: (formData: FormData) => Partial<SettingsInput>,
): Promise<SettingsActionResult> {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const input = parse(formData);

  const errors = validateSettings(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const saved = await savePartialSettings(session.shop, input);
  try {
    await syncSettingsMetafield(admin, saved);
  } catch (error) {
    return {
      ok: false,
      syncError: error instanceof Error ? error.message : String(error),
    };
  }
  return { ok: true };
}
