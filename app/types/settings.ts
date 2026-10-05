export const TARGETING_MODES = ["auto", "all", "custom"] as const;
export type TargetingMode = (typeof TARGETING_MODES)[number];

export const POSITIONS = [
  "bar-bottom",
  "bar-top",
  "card-left",
  "card-right",
] as const;
export type Position = (typeof POSITIONS)[number];

/** Full editable settings surface, shared by all admin pages. */
export interface SettingsInput {
  bannerEnabled: boolean;
  targetingMode: string;
  countries: string[];
  autoMatchTheme: boolean;
  bgColor: string;
  textColor: string;
  acceptBgColor: string;
  acceptTextColor: string;
  position: string;
  bannerText: string;
  acceptLabel: string;
  declineLabel: string;
  prefsLabel: string;
  policyLink: string;
  showReopen: boolean;
  reopenLabel: string;
  modalTitle: string;
  modalIntro: string;
  saveLabel: string;
  acceptAllLabel: string;
  gcmAdsDataRedaction: boolean;
  gcmUrlPassthrough: boolean;
}

export type SettingsErrors = Partial<Record<keyof SettingsInput, string>>;

/**
 * Stored settings for one shop. Same shape the old Prisma row had, so the
 * admin pages didn't need to change: `countries` is a JSON array string and
 * `policyLink` is null when unset.
 */
export interface Settings {
  shop: string;
  bannerEnabled: boolean;
  // "auto" = follow Shopify Customer Privacy regions, "all" = every visitor,
  // "custom" = only the ISO country codes stored in `countries`
  targetingMode: string;
  countries: string;
  autoMatchTheme: boolean;
  bgColor: string;
  textColor: string;
  acceptBgColor: string;
  acceptTextColor: string;
  position: string;
  bannerText: string;
  acceptLabel: string;
  declineLabel: string;
  prefsLabel: string;
  policyLink: string | null;
  showReopen: boolean;
  reopenLabel: string;
  modalTitle: string;
  modalIntro: string;
  saveLabel: string;
  acceptAllLabel: string;
  gcmAdsDataRedaction: boolean;
  gcmUrlPassthrough: boolean;
  /** Merchant-written per-language overrides (built-ins fill the gaps). */
  translations: Translations;
  onboardingDismissed: boolean;
}

/** Visitor-facing texts that can be translated, in storefront-config keys. */
export const TRANSLATABLE_FIELDS = [
  { key: "msg", field: "bannerText", label: "Banner text", rich: true },
  { key: "ok", field: "acceptLabel", label: "Accept button", rich: false },
  { key: "no", field: "declineLabel", label: "Decline button", rich: false },
  { key: "pf", field: "prefsLabel", label: "Preferences link", rich: false },
  { key: "mt", field: "modalTitle", label: "Preferences title", rich: false },
  { key: "mi", field: "modalIntro", label: "Preferences intro", rich: true },
  { key: "sv", field: "saveLabel", label: "Save button", rich: false },
  {
    key: "aa",
    field: "acceptAllLabel",
    label: "Accept all button",
    rich: false,
  },
  {
    key: "rl",
    field: "reopenLabel",
    label: "Cookie settings link",
    rich: false,
  },
] as const;

export type TranslationKey = (typeof TRANSLATABLE_FIELDS)[number]["key"];
export type TranslatedTexts = Partial<Record<TranslationKey, string>>;
/** Keyed by lowercase language code, e.g. "de" or "pt-br". */
export type Translations = Record<string, TranslatedTexts>;

export const DEFAULT_SETTINGS: Omit<Settings, "shop"> = {
  bannerEnabled: true,
  targetingMode: "auto",
  countries: "[]",
  autoMatchTheme: true,
  bgColor: "#ffffff",
  textColor: "#202223",
  acceptBgColor: "#111213",
  acceptTextColor: "#ffffff",
  position: "bar-bottom",
  bannerText:
    "We use cookies to improve your experience, analyze traffic, and personalize marketing. You can accept, decline, or manage your preferences.",
  acceptLabel: "Accept",
  declineLabel: "Decline",
  prefsLabel: "Manage preferences",
  policyLink: null,
  showReopen: true,
  reopenLabel: "Cookie settings",
  modalTitle: "Privacy preferences",
  modalIntro:
    "Choose which cookies you allow. Essential cookies are always on — the store cannot work without them.",
  saveLabel: "Save choices",
  acceptAllLabel: "Accept all",
  gcmAdsDataRedaction: false,
  gcmUrlPassthrough: false,
  translations: {},
  onboardingDismissed: false,
};
