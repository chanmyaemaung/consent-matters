import { Suspense, useEffect, useMemo, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Await, useFetcher, useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  disableShopifyBanner,
  getShopifyBannerEnabled,
  type AdminGraphqlClient,
} from "../services";
import { dismissOnboarding, getSettings } from "../models";
import { handleSettingsAction } from "../lib/settings-action.server";
import { HomeSkeleton, SettingsLoadError } from "../components";
import { COUNTRY_NAME_BY_CODE } from "../data/countries";

// The embed block's file name in extensions/consent-banner/blocks.
const EMBED_HANDLE = "consent-banner";

/**
 * Reports whether the merchant has switched the theme app embed on, using
 * App Bridge's extension activation data. `null` while the answer is still
 * being fetched, so the UI can hold its layout instead of shifting.
 */
function useAppEmbedEnabled(shopify: ReturnType<typeof useAppBridge>) {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const extensions = await shopify.app.extensions();
        if (cancelled) return;
        setEnabled(
          extensions.some(
            (extension) =>
              extension.type === "theme_app_extension" &&
              extension.activations.some(
                (activation) =>
                  "handle" in activation && activation.handle === EMBED_HANDLE,
              ),
          ),
        );
      } catch {
        // Treat an unavailable answer as "don't nag" rather than "not enabled".
        if (!cancelled) setEnabled(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shopify]);

  return enabled;
}

const LAYOUT_LABELS: Record<string, string> = {
  "bar-bottom": "Bar · bottom",
  "bar-top": "Bar · top",
  "card-left": "Card · left",
  "card-right": "Card · right",
};

async function loadHomeSettings(admin: AdminGraphqlClient) {
  const [settings, shopifyBannerEnabled] = await Promise.all([
    getSettings(admin),
    getShopifyBannerEnabled(admin),
  ]);
  return {
    ...settings,
    countries: JSON.parse(settings.countries) as string[],
    shopifyBannerEnabled,
  };
}

type HomeSettings = Awaited<ReturnType<typeof loadHomeSettings>>;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  // Not awaited — streams after the shell so the skeleton can paint first.
  return { settings: loadHomeSettings(admin), shop: session.shop };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const cloned = request.clone();
  const formData = await cloned.formData();
  if (formData.get("intent") === "dismissOnboarding") {
    const { admin } = await authenticate.admin(request);
    await dismissOnboarding(admin);
    return { ok: true as const };
  }
  if (formData.get("intent") === "disableShopifyBanner") {
    const { admin } = await authenticate.admin(request);
    try {
      await disableShopifyBanner(admin);
      return { ok: true as const, toast: "Shopify's cookie banner turned off" };
    } catch (error) {
      return {
        ok: false as const,
        syncError: `Couldn't turn off Shopify's cookie banner: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
  return handleSettingsAction(request, (fd) => ({
    bannerEnabled: fd.get("bannerEnabled") === "true",
  }));
};

export default function Home() {
  const { settings, shop } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const storefrontUrl = `https://${shop}/?cm_preview=1`;

  return (
    <s-page heading="Consent Matters">
      <s-button slot="primary-action" href={storefrontUrl} target="_blank">
        View storefront
      </s-button>

      <Suspense fallback={<HomeSkeleton />}>
        <Await resolve={settings} errorElement={<SettingsLoadError />}>
          {(data) => <HomeStatus settings={data} shop={shop} />}
        </Await>
      </Suspense>

      <s-section heading="Manage">
        <s-grid
          gridTemplateColumns="@container (inline-size > 700px) 1fr 1fr 1fr, 1fr"
          gap="base"
        >
          <s-clickable
            padding="base"
            borderWidth="base"
            borderRadius="base"
            onClick={() => navigate("/app/targeting")}
          >
            <s-stack direction="block" gap="small-200">
              <s-icon type="globe" size="base" />
              <s-heading>Targeting</s-heading>
              <s-text color="subdued">Who sees the banner</s-text>
            </s-stack>
          </s-clickable>
          <s-clickable
            padding="base"
            borderWidth="base"
            borderRadius="base"
            onClick={() => navigate("/app/appearance")}
          >
            <s-stack direction="block" gap="small-200">
              <s-icon type="paint-brush-round" size="base" />
              <s-heading>Appearance</s-heading>
              <s-text color="subdued">Colors, layout, preview</s-text>
            </s-stack>
          </s-clickable>
          <s-clickable
            padding="base"
            borderWidth="base"
            borderRadius="base"
            onClick={() => navigate("/app/content")}
          >
            <s-stack direction="block" gap="small-200">
              <s-icon type="note" size="base" />
              <s-heading>Content</s-heading>
              <s-text color="subdued">Banner &amp; dialog texts</s-text>
            </s-stack>
          </s-clickable>
        </s-grid>
      </s-section>

      <s-section slot="aside" heading="How it works">
        <s-unordered-list>
          <s-list-item>Add your tracking the normal way</s-list-item>
          <s-list-item>We block it until visitors consent</s-list-item>
          <s-list-item>Zero impact on store speed</s-list-item>
        </s-unordered-list>
        <s-paragraph color="subdued">
          Tip: install Google &amp; Meta through their official channel apps for
          the strongest blocking — Shopify holds those until consent.
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="100% free — forever">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-icon type="heart" size="base" />
            <s-badge tone="success">All features included</s-badge>
          </s-stack>
          <s-paragraph>
            No plans, no trials, no upsells — built as a gift to the Shopify
            community. If it saves you money, that&apos;s the point.
          </s-paragraph>
          <s-paragraph>
            <s-link href="/app/support">About &amp; support →</s-link>
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}

function HomeStatus({
  settings,
  shop,
}: {
  settings: HomeSettings;
  shop: string;
}) {
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const themeEditorUrl = `https://${shop}/admin/themes/current/editor?context=apps`;
  // Shopify moved Customer privacy to /settings/privacy; the old
  // /settings/customer_privacy path now 404s. shopify:// navigates inside
  // the admin, so the link doesn't depend on the store's domain format.
  const privacySettingsUrl = "shopify://admin/settings/privacy";

  const syncError =
    (fetcher.data && "syncError" in fetcher.data && fetcher.data.syncError) ||
    null;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      shopify.toast.show(
        "toast" in fetcher.data ? fetcher.data.toast : "Saved",
      );
    }
  }, [fetcher.state, fetcher.data, shopify]);

  // Shopify's own banner on top of ours means visitors see two banners.
  const disablingShopifyBanner =
    fetcher.formData?.get("intent") === "disableShopifyBanner";
  const shopifyBannerOn =
    settings.shopifyBannerEnabled === true && !disablingShopifyBanner;
  const turnOffShopifyBanner = () =>
    fetcher.submit({ intent: "disableShopifyBanner" }, { method: "POST" });

  const optimisticEnabled = fetcher.formData
    ? fetcher.formData.get("bannerEnabled") === "true"
    : settings.bannerEnabled;

  // Shopify expects the home page to report whether the theme app embed is
  // actually switched on, rather than only telling merchants to go do it.
  const embedEnabled = useAppEmbedEnabled(shopify);
  const needsEmbed = optimisticEnabled && embedEnabled === false;
  const needsAction = needsEmbed || (optimisticEnabled && shopifyBannerOn);

  const statusLabel = !optimisticEnabled
    ? "Off"
    : needsAction
      ? "Action needed"
      : "Live";
  const statusTone = !optimisticEnabled
    ? "neutral"
    : needsAction
      ? "warning"
      : "success";

  const targetingLabel = useMemo(() => {
    if (settings.targetingMode === "all") return "All visitors";
    if (settings.targetingMode === "custom") {
      const n = settings.countries.length;
      if (n === 0) return "No countries yet";
      if (n === 1)
        return (
          COUNTRY_NAME_BY_CODE[settings.countries[0]] ?? settings.countries[0]
        );
      return `${n} countries`;
    }
    return "Automatic";
  }, [settings]);

  return (
    <>
      {syncError && (
        <s-banner
          heading="Saved, but publishing to your storefront failed"
          tone="critical"
        >
          <s-paragraph>{syncError}</s-paragraph>
        </s-banner>
      )}

      {/* Only ever one banner at a time — a sync failure is the more urgent
          message, so it replaces the setup guidance while it is showing. */}
      {!syncError && !settings.onboardingDismissed && (
        <s-banner
          heading="Get set up in 2 steps"
          tone="info"
          dismissible
          onDismiss={() =>
            fetcher.submit({ intent: "dismissOnboarding" }, { method: "POST" })
          }
        >
          <s-ordered-list>
            <s-list-item>
              <s-link href={themeEditorUrl} target="_blank">
                Enable the app embed
              </s-link>{" "}
              in your theme editor
            </s-list-item>
            <s-list-item>
              {settings.shopifyBannerEnabled === false ? (
                "Shopify's built-in cookie banner is off — done"
              ) : settings.shopifyBannerEnabled === true ? (
                <s-link onClick={turnOffShopifyBanner}>
                  Turn off Shopify&apos;s built-in cookie banner
                </s-link>
              ) : (
                <s-link href={privacySettingsUrl}>
                  Turn off Shopify&apos;s built-in cookie banner
                </s-link>
              )}
            </s-list-item>
          </s-ordered-list>
        </s-banner>
      )}

      <s-section>
        <s-stack direction="block" gap="large">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-icon
              type={
                optimisticEnabled && !needsAction
                  ? "shield-check-mark"
                  : "shield-none"
              }
              size="base"
            />
            <s-heading>Consent banner</s-heading>
            <s-badge tone={statusTone}>{statusLabel}</s-badge>
            <s-switch
              label="Consent banner"
              labelAccessibilityVisibility="exclusive"
              checked={optimisticEnabled}
              onChange={(e) =>
                fetcher.submit(
                  { bannerEnabled: String(e.currentTarget.checked) },
                  { method: "POST" },
                )
              }
            />
          </s-stack>

          <s-grid
            gridTemplateColumns="@container (inline-size > 600px) 1fr 1fr, 1fr"
            gap="base"
          >
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small-300">
                <s-text color="subdued">Theme app embed</s-text>
                <s-heading>
                  {embedEnabled === null
                    ? "Checking…"
                    : embedEnabled
                      ? "Enabled"
                      : "Not enabled"}
                </s-heading>
                {embedEnabled === false ? (
                  <s-link href={themeEditorUrl} target="_blank">
                    Enable it
                  </s-link>
                ) : (
                  <s-text color="subdued">
                    {optimisticEnabled
                      ? "Tracking blocked until consent"
                      : "No blocking, no banner"}
                  </s-text>
                )}
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small-300">
                <s-text color="subdued">Targeting</s-text>
                <s-heading>{targetingLabel}</s-heading>
                <s-link href="/app/targeting">Change</s-link>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small-300">
                <s-text color="subdued">Layout</s-text>
                <s-heading>
                  {LAYOUT_LABELS[settings.position] ?? settings.position}
                </s-heading>
                <s-link href="/app/appearance">Change</s-link>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="small-300">
                <s-text color="subdued">Shopify&apos;s cookie banner</s-text>
                <s-heading>
                  {settings.shopifyBannerEnabled === null
                    ? "Check manually"
                    : shopifyBannerOn
                      ? "On — visitors see two banners"
                      : "Off"}
                </s-heading>
                {shopifyBannerOn ? (
                  <s-link onClick={turnOffShopifyBanner}>Turn it off</s-link>
                ) : settings.shopifyBannerEnabled === null ? (
                  <s-link href={privacySettingsUrl}>
                    Open privacy settings
                  </s-link>
                ) : (
                  <s-text color="subdued">Only our banner shows</s-text>
                )}
              </s-stack>
            </s-box>
          </s-grid>
        </s-stack>
      </s-section>
    </>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
