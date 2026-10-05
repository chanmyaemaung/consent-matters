import { richTextToPlain, sanitizeRichText } from "../services/sanitize.server";
import {
  readSettingsMetafields,
  writeSettingsMetafields,
  type AdminGraphqlClient,
} from "../services/metafield.server";
import {
  POSITIONS,
  TARGETING_MODES,
  TRANSLATABLE_FIELDS,
  type Settings,
  type TranslatedTexts,
  type SettingsErrors,
  type SettingsInput,
} from "../types";

export type { Settings };

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const URL_PATTERN = /^https?:\/\/.+/i;

/**
 * Settings are stored in app-owned shop metafields — no database. On a
 * fresh install the defaults are published once so the banner works before
 * the merchant ever presses Save.
 */
export async function getSettings(
  admin: AdminGraphqlClient,
): Promise<Settings> {
  const { shopId, settings, exists } = await readSettingsMetafields(admin);
  if (!exists) {
    await writeSettingsMetafields(admin, shopId, settings);
  }
  return settings;
}

/**
 * Validates only the fields present in the partial — each admin page
 * submits its own subset.
 */
export function validateSettings(
  input: Partial<SettingsInput>,
): SettingsErrors {
  const errors: SettingsErrors = {};

  if (
    input.targetingMode !== undefined &&
    !TARGETING_MODES.includes(input.targetingMode as never)
  ) {
    errors.targetingMode = "Invalid targeting mode";
  }
  if (input.countries !== undefined) {
    if (input.targetingMode === "custom" && input.countries.length === 0) {
      errors.countries = "Add at least one country, or choose a different mode";
    }
    if (input.countries.some((c) => !COUNTRY_CODE_PATTERN.test(c))) {
      errors.countries = "Country codes must be two-letter ISO codes";
    }
  }
  if (
    input.position !== undefined &&
    !POSITIONS.includes(input.position as never)
  ) {
    errors.position = "Invalid position";
  }
  for (const key of [
    "bgColor",
    "textColor",
    "acceptBgColor",
    "acceptTextColor",
  ] as const) {
    const value = input[key];
    if (value !== undefined && !HEX_COLOR_PATTERN.test(value)) {
      errors[key] = "Enter a hex color, e.g. #111213";
    }
  }
  if (input.bannerText !== undefined && !richTextToPlain(input.bannerText)) {
    errors.bannerText = "Banner text is required";
  }
  if (input.modalTitle !== undefined && !input.modalTitle.trim()) {
    errors.modalTitle = "Preferences title is required";
  }
  if (input.modalIntro !== undefined && !richTextToPlain(input.modalIntro)) {
    errors.modalIntro = "Preferences intro is required";
  }
  for (const key of [
    "acceptLabel",
    "declineLabel",
    "prefsLabel",
    "saveLabel",
    "acceptAllLabel",
  ] as const) {
    const value = input[key];
    if (value !== undefined && !value.trim()) {
      errors[key] = "This label is required";
    }
  }
  if (
    input.policyLink !== undefined &&
    input.policyLink &&
    !URL_PATTERN.test(input.policyLink)
  ) {
    errors.policyLink =
      "Enter a full URL, e.g. https://your-store.com/policies/privacy-policy";
  }
  if (
    input.showReopen === true &&
    input.reopenLabel !== undefined &&
    !input.reopenLabel.trim()
  ) {
    errors.reopenLabel = "Cookie settings label is required";
  }

  return errors;
}

/**
 * Merges only the provided fields into the stored settings and publishes
 * the result; returns the full updated settings.
 */
export async function savePartialSettings(
  admin: AdminGraphqlClient,
  input: Partial<SettingsInput>,
): Promise<Settings> {
  const data: Partial<Settings> = {};

  if (input.bannerEnabled !== undefined)
    data.bannerEnabled = input.bannerEnabled;
  if (input.targetingMode !== undefined)
    data.targetingMode = input.targetingMode;
  if (input.countries !== undefined)
    data.countries = JSON.stringify(input.countries);
  if (input.autoMatchTheme !== undefined)
    data.autoMatchTheme = input.autoMatchTheme;
  if (input.bgColor !== undefined) data.bgColor = input.bgColor;
  if (input.textColor !== undefined) data.textColor = input.textColor;
  if (input.acceptBgColor !== undefined)
    data.acceptBgColor = input.acceptBgColor;
  if (input.acceptTextColor !== undefined)
    data.acceptTextColor = input.acceptTextColor;
  if (input.position !== undefined) data.position = input.position;
  if (input.bannerText !== undefined)
    data.bannerText = sanitizeRichText(input.bannerText);
  if (input.acceptLabel !== undefined)
    data.acceptLabel = input.acceptLabel.trim();
  if (input.declineLabel !== undefined)
    data.declineLabel = input.declineLabel.trim();
  if (input.prefsLabel !== undefined) data.prefsLabel = input.prefsLabel.trim();
  if (input.policyLink !== undefined)
    data.policyLink = input.policyLink.trim() || null;
  if (input.showReopen !== undefined) data.showReopen = input.showReopen;
  if (input.reopenLabel !== undefined)
    data.reopenLabel = input.reopenLabel.trim() || "Cookie settings";
  if (input.modalTitle !== undefined) data.modalTitle = input.modalTitle.trim();
  if (input.modalIntro !== undefined)
    data.modalIntro = sanitizeRichText(input.modalIntro);
  if (input.saveLabel !== undefined) data.saveLabel = input.saveLabel.trim();
  if (input.acceptAllLabel !== undefined)
    data.acceptAllLabel = input.acceptAllLabel.trim();
  if (input.gcmAdsDataRedaction !== undefined)
    data.gcmAdsDataRedaction = input.gcmAdsDataRedaction;
  if (input.gcmUrlPassthrough !== undefined)
    data.gcmUrlPassthrough = input.gcmUrlPassthrough;

  return updateSettings(admin, data);
}

const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/;

/**
 * Replaces one language's translations. Empty fields are dropped so the
 * storefront falls back to the built-in or default text.
 */
export async function saveTranslation(
  admin: AdminGraphqlClient,
  language: string,
  texts: TranslatedTexts,
): Promise<Settings> {
  const code = language.toLowerCase();
  if (!LANGUAGE_CODE_PATTERN.test(code)) {
    throw new Error(`Invalid language code: ${language}`);
  }

  const clean: TranslatedTexts = {};
  for (const field of TRANSLATABLE_FIELDS) {
    const raw = texts[field.key];
    if (!raw) continue;
    const value = field.rich ? sanitizeRichText(raw) : raw.trim();
    const hasText = field.rich
      ? Boolean(richTextToPlain(value))
      : Boolean(value);
    if (hasText) clean[field.key] = value;
  }

  const { shopId, settings } = await readSettingsMetafields(admin);
  const translations = { ...settings.translations };
  if (Object.keys(clean).length > 0) translations[code] = clean;
  else delete translations[code];

  const updated = { ...settings, translations };
  await writeSettingsMetafields(admin, shopId, updated);
  return updated;
}

export async function dismissOnboarding(
  admin: AdminGraphqlClient,
): Promise<void> {
  await updateSettings(admin, { onboardingDismissed: true });
}

async function updateSettings(
  admin: AdminGraphqlClient,
  data: Partial<Settings>,
): Promise<Settings> {
  const { shopId, settings } = await readSettingsMetafields(admin);
  const updated = { ...settings, ...data };
  await writeSettingsMetafields(admin, shopId, updated);
  return updated;
}
