import type { Settings } from "@prisma/client";

// Minimal structural type for the admin GraphQL client returned by
// authenticate.admin() — keeps this module decoupled from route contexts.
interface AdminGraphqlClient {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
}

export const METAFIELD_NAMESPACE = "$app:settings";
export const METAFIELD_KEY = "config";

/**
 * The storefront banner reads this JSON from the shop metafield via Liquid
 * (app proxy as fallback). Keys are deliberately terse:
 * en=enabled, tm=targeting mode, cc=CSV country codes, auto=match theme,
 * pos=layout, bg/tx=banner colors, bb/bt=accept button colors,
 * msg/ok/no/pf=texts, link=privacy policy, reopen=cookie-settings link.
 */
export function buildStorefrontConfig(settings: Settings) {
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

async function getShopId(admin: AdminGraphqlClient): Promise<string> {
  const response = await admin.graphql(`#graphql
    query ConsentMattersShopId { shop { id } }`);
  const json = await response.json();
  return json.data.shop.id as string;
}

export async function syncSettingsMetafield(
  admin: AdminGraphqlClient,
  settings: Settings,
): Promise<void> {
  await ensureDefinition(admin);
  const shopId = await getShopId(admin);

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
            value: JSON.stringify(buildStorefrontConfig(settings)),
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
