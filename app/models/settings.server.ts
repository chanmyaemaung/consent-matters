import type { Settings } from "@prisma/client";
import db from "../db.server";
import { richTextToPlain, sanitizeRichText } from "../services/sanitize.server";
import {
  POSITIONS,
  TARGETING_MODES,
  type SettingsErrors,
  type SettingsInput,
} from "../types";

export type { Settings };

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const URL_PATTERN = /^https?:\/\/.+/i;

export async function getSettings(shop: string): Promise<Settings> {
  const existing = await db.settings.findUnique({ where: { shop } });
  if (existing) return existing;
  return db.settings.create({ data: { shop } });
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

/** Persists only the provided fields; returns the full updated row. */
export async function savePartialSettings(
  shop: string,
  input: Partial<SettingsInput>,
): Promise<Settings> {
  const data: Record<string, unknown> = {};

  if (input.bannerEnabled !== undefined) data.bannerEnabled = input.bannerEnabled;
  if (input.targetingMode !== undefined) data.targetingMode = input.targetingMode;
  if (input.countries !== undefined)
    data.countries = JSON.stringify(input.countries);
  if (input.autoMatchTheme !== undefined)
    data.autoMatchTheme = input.autoMatchTheme;
  if (input.bgColor !== undefined) data.bgColor = input.bgColor;
  if (input.textColor !== undefined) data.textColor = input.textColor;
  if (input.acceptBgColor !== undefined) data.acceptBgColor = input.acceptBgColor;
  if (input.acceptTextColor !== undefined)
    data.acceptTextColor = input.acceptTextColor;
  if (input.position !== undefined) data.position = input.position;
  if (input.bannerText !== undefined)
    data.bannerText = sanitizeRichText(input.bannerText);
  if (input.acceptLabel !== undefined) data.acceptLabel = input.acceptLabel.trim();
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

  await getSettings(shop);
  return db.settings.update({ where: { shop }, data });
}

export async function dismissOnboarding(shop: string): Promise<void> {
  await getSettings(shop);
  await db.settings.update({
    where: { shop },
    data: { onboardingDismissed: true },
  });
}

export async function deleteSettings(shop: string): Promise<void> {
  await db.settings.deleteMany({ where: { shop } });
}
