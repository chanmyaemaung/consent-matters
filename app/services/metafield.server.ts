import { BUILTIN_TRANSLATIONS } from "../data/translations";
import {
  DEFAULT_SETTINGS,
  TRANSLATABLE_FIELDS,
  type Settings,
  type TranslatedTexts,
  type Translations,
} from "../types";
import { richTextToPlain } from "./sanitize.server";

// Minimal structural type for the admin GraphQL client returned by
// authenticate.admin() — keeps this module decoupled from route contexts.
export interface AdminGraphqlClient {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
}

export const METAFIELD_NAMESPACE = "$app:settings";
export const METAFIELD_KEY = "config";
// Admin-only state the storefront never needs (no storefront access).
export const ADMIN_METAFIELD_KEY = "admin";

interface AdminState {
  countries?: string[];
  translations?: Translations;
  onboardingDismissed?: boolean;
}

/** True when the merchant never changed this text from the English default. */
function isDefaultText(
  settings: Settings,
  field: (typeof TRANSLATABLE_FIELDS)[number],
): boolean {
  const value = settings[field.field];
  const fallback = DEFAULT_SETTINGS[field.field];
  return field.rich
    ? richTextToPlain(value) === richTextToPlain(fallback)
    : value === fallback;
}

/**
 * Per-language texts for the storefront: the merchant's own translation
 * wins; otherwise a built-in one, but only for texts still at the English
 * default. `languages` (the shop's published locales) trims the payload;
 * null means "unknown", so every available language is included.
 */
function buildTranslations(
  settings: Settings,
  languages: string[] | null,
): Translations {
  const codes = new Set([
    ...Object.keys(BUILTIN_TRANSLATIONS),
    ...Object.keys(settings.translations),
  ]);
  // A published "de-ch" also needs the plain "de" entry, which the
  // storefront layers underneath the regional one.
  const wanted = languages
    ? new Set([...languages, ...languages.map((l) => l.split("-")[0])])
    : null;
  const result: Translations = {};

  for (const code of codes) {
    if (wanted && !wanted.has(code)) continue;

    const own = settings.translations[code] ?? {};
    const builtin = BUILTIN_TRANSLATIONS[code];
    const entry: TranslatedTexts = {};
    for (const field of TRANSLATABLE_FIELDS) {
      const text = own[field.key];
      if (text) entry[field.key] = text;
      else if (builtin && isDefaultText(settings, field))
        entry[field.key] = builtin[field.key];
    }
    if (Object.keys(entry).length > 0) result[code] = entry;
  }
  return result;
}

/**
 * The storefront banner reads this JSON from the shop metafield via Liquid
 * (app proxy as fallback). Keys are deliberately terse:
 * en=enabled, tm=targeting mode, cc=CSV country codes, auto=match theme,
 * pos=layout, bg/tx=banner colors, bb/bt=accept button colors,
 * msg/ok/no/pf=texts, link=privacy policy, reopen=cookie-settings link,
 * adr/up=Google Consent Mode ads_data_redaction/url_passthrough,
 * tr=per-language texts keyed by lowercase locale ("de", "pt-br").
 */
export function buildStorefrontConfig(
  settings: Settings,
  languages: string[] | null = null,
) {
  const config: Record<string, unknown> = {
    v: 2,
    en: settings.bannerEnabled ? 1 : 0,
    tm: settings.targetingMode,
    auto: settings.autoMatchTheme,
    pos: settings.position,
    bg: settings.bgColor,
    tx: settings.textColor,
    bb: settings.acceptBgColor,
    bt: settings.acceptTextColor,
    msg: settings.bannerText,
    ok: settings.acceptLabel,
    no: settings.declineLabel,
    pf: settings.prefsLabel,
    reopen: settings.showReopen,
    rl: settings.reopenLabel,
    mt: settings.modalTitle,
    mi: settings.modalIntro,
    sv: settings.saveLabel,
    aa: settings.acceptAllLabel,
  };
  if (settings.policyLink) config.link = settings.policyLink;
  if (settings.gcmAdsDataRedaction) config.adr = 1;
  if (settings.gcmUrlPassthrough) config.up = 1;
  const translations = buildTranslations(settings, languages);
  if (Object.keys(translations).length > 0) config.tr = translations;
  if (settings.targetingMode === "custom") {
    config.cc = (JSON.parse(settings.countries) as string[]).join(",");
  }
  return config;
}

async function ensureDefinition(admin: AdminGraphqlClient): Promise<void> {
  const response = await admin.graphql(
    `#graphql
    mutation ConsentMattersEnsureDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id }
        userErrors { code message }
      }
    }`,
    {
      variables: {
        definition: {
          name: "Consent Matters config",
          namespace: METAFIELD_NAMESPACE,
          key: METAFIELD_KEY,
          type: "json",
          ownerType: "SHOP",
          access: { storefront: "PUBLIC_READ" },
        },
      },
    },
  );
  const json = await response.json();
  const errors = json.data?.metafieldDefinitionCreate?.userErrors ?? [];
  const realErrors = errors.filter(
    (e: { code?: string }) => e.code !== "TAKEN",
  );
  if (realErrors.length > 0) {
    throw new Error(
      `metafieldDefinitionCreate failed: ${JSON.stringify(realErrors)}`,
    );
  }
}

/**
 * Inverse of buildStorefrontConfig, merged over the defaults so a missing
 * or older config still yields a complete Settings object.
 */
function parseStorefrontConfig(
  shop: string,
  config: Record<string, unknown>,
  admin: AdminState,
): Settings {
  const d = DEFAULT_SETTINGS;
  const str = (value: unknown, fallback: string) =>
    typeof value === "string" ? value : fallback;
  const bool = (value: unknown, fallback: boolean) =>
    typeof value === "boolean" ? value : fallback;

  // Countries live in the admin metafield so they survive switching away
  // from "custom"; fall back to the storefront CSV for older shops.
  const countries =
    admin.countries ??
    (typeof config.cc === "string" && config.cc ? config.cc.split(",") : []);

  return {
    shop,
    bannerEnabled: config.en === undefined ? d.bannerEnabled : config.en === 1,
    targetingMode: str(config.tm, d.targetingMode),
    countries: JSON.stringify(countries),
    autoMatchTheme: bool(config.auto, d.autoMatchTheme),
    bgColor: str(config.bg, d.bgColor),
    textColor: str(config.tx, d.textColor),
    acceptBgColor: str(config.bb, d.acceptBgColor),
    acceptTextColor: str(config.bt, d.acceptTextColor),
    position: str(config.pos, d.position),
    bannerText: str(config.msg, d.bannerText),
    acceptLabel: str(config.ok, d.acceptLabel),
    declineLabel: str(config.no, d.declineLabel),
    prefsLabel: str(config.pf, d.prefsLabel),
    policyLink: typeof config.link === "string" ? config.link : null,
    showReopen: bool(config.reopen, d.showReopen),
    reopenLabel: str(config.rl, d.reopenLabel),
    modalTitle: str(config.mt, d.modalTitle),
    modalIntro: str(config.mi, d.modalIntro),
    saveLabel: str(config.sv, d.saveLabel),
    acceptAllLabel: str(config.aa, d.acceptAllLabel),
    gcmAdsDataRedaction: config.adr === 1,
    gcmUrlPassthrough: config.up === 1,
    translations: admin.translations ?? {},
    onboardingDismissed: admin.onboardingDismissed ?? false,
  };
}

function parseJson(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export interface StoredSettings {
  shopId: string;
  settings: Settings;
  /** False on a fresh install, before anything was ever written. */
  exists: boolean;
}

/** Reads both app-owned metafields in one query. */
export async function readSettingsMetafields(
  admin: AdminGraphqlClient,
): Promise<StoredSettings> {
  const response = await admin.graphql(`#graphql
    query ConsentMattersReadSettings {
      shop {
        id
        myshopifyDomain
        config: metafield(namespace: "$app:settings", key: "config") { value }
        admin: metafield(namespace: "$app:settings", key: "admin") { value }
      }
    }`);
  const json = await response.json();
  const shop = json.data.shop;
  return {
    shopId: shop.id as string,
    exists: Boolean(shop.config?.value),
    settings: parseStorefrontConfig(
      shop.myshopifyDomain as string,
      parseJson(shop.config?.value),
      parseJson(shop.admin?.value) as AdminState,
    ),
  };
}

/** Publishes the storefront config and the admin-only state together. */
export async function writeSettingsMetafields(
  admin: AdminGraphqlClient,
  shopId: string,
  settings: Settings,
): Promise<void> {
  await ensureDefinition(admin);

  const adminState: AdminState = {
    countries: JSON.parse(settings.countries) as string[],
    translations: settings.translations,
    onboardingDismissed: settings.onboardingDismissed,
  };
  const languages = await getPublishedLanguages(admin);

  const response = await admin.graphql(
    `#graphql
    mutation ConsentMattersSetConfig($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message code }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: "json",
            value: JSON.stringify(buildStorefrontConfig(settings, languages)),
          },
          {
            ownerId: shopId,
            namespace: METAFIELD_NAMESPACE,
            key: ADMIN_METAFIELD_KEY,
            type: "json",
            value: JSON.stringify(adminState),
          },
        ],
      },
    },
  );
  const json = await response.json();
  const errors = json.data?.metafieldsSet?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(`metafieldsSet failed: ${JSON.stringify(errors)}`);
  }
}

export interface ShopLanguage {
  /** Lowercase locale, e.g. "de" or "pt-br". */
  code: string;
  name: string;
  primary: boolean;
}

/**
 * The shop's published languages, or null when they can't be read (e.g. the
 * merchant hasn't approved the read_locales scope yet).
 */
export async function getShopLanguages(
  admin: AdminGraphqlClient,
): Promise<ShopLanguage[] | null> {
  try {
    const response = await admin.graphql(`#graphql
      query ConsentMattersShopLocales {
        shopLocales(published: true) { locale name primary }
      }`);
    const json = await response.json();
    const locales = json.data?.shopLocales as
      | { locale: string; name: string; primary: boolean }[]
      | undefined;
    return locales
      ? locales.map((l) => ({
          code: l.locale.toLowerCase(),
          name: l.name,
          primary: l.primary,
        }))
      : null;
  } catch {
    return null;
  }
}

async function getPublishedLanguages(
  admin: AdminGraphqlClient,
): Promise<string[] | null> {
  const languages = await getShopLanguages(admin);
  return languages ? languages.map((l) => l.code) : null;
}

/**
 * What visitors in `code` see when the merchant hasn't written their own
 * translation: the built-in text for fields still at the English default,
 * otherwise the merchant's main text.
 */
export function automaticTexts(
  settings: Settings,
  code: string,
): Required<TranslatedTexts> {
  const builtin =
    BUILTIN_TRANSLATIONS[code] ?? BUILTIN_TRANSLATIONS[code.split("-")[0]];
  const result = {} as Required<TranslatedTexts>;
  for (const field of TRANSLATABLE_FIELDS) {
    result[field.key] =
      builtin && isDefaultText(settings, field)
        ? builtin[field.key]
        : settings[field.field];
  }
  return result;
}

export function hasBuiltinTranslation(code: string): boolean {
  return Boolean(
    BUILTIN_TRANSLATIONS[code] ?? BUILTIN_TRANSLATIONS[code.split("-")[0]],
  );
}
