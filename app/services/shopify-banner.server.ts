import type { AdminGraphqlClient } from "./metafield.server";

/**
 * Whether Shopify's own cookie banner is switched on. Running it alongside
 * Consent Matters shows visitors two banners. Returns null when the answer
 * isn't available (e.g. the merchant hasn't approved the privacy scope
 * yet), so the UI can fall back to a plain link.
 */
export async function getShopifyBannerEnabled(
  admin: AdminGraphqlClient,
): Promise<boolean | null> {
  try {
    const response = await admin.graphql(`#graphql
      query ConsentMattersShopifyBanner {
        privacySettings { banner { enabled } }
      }`);
    const json = await response.json();
    const enabled = json.data?.privacySettings?.banner?.enabled;
    return typeof enabled === "boolean" ? enabled : null;
  } catch {
    return null;
  }
}

/** Switches Shopify's own cookie banner off. Throws on failure. */
export async function disableShopifyBanner(
  admin: AdminGraphqlClient,
): Promise<void> {
  const response = await admin.graphql(`#graphql
    mutation ConsentMattersDisableShopifyBanner {
      privacyFeaturesDisable(featuresToDisable: [COOKIE_BANNER]) {
        featuresDisabled
        userErrors { field message }
      }
    }`);
  const json = await response.json();
  const errors = json.data?.privacyFeaturesDisable?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map((e: { message: string }) => e.message).join("; "));
  }
}
