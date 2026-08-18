import { Suspense, useEffect, useMemo } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Await, useFetcher, useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { dismissOnboarding, getSettings } from "../models";
import { handleSettingsAction } from "../lib/settings-action.server";
import { HomeSkeleton, SettingsLoadError } from "../components";
import { COUNTRY_NAME_BY_CODE } from "../data/countries";

const LAYOUT_LABELS: Record<string, string> = {
  "bar-bottom": "Bar · bottom",
  "bar-top": "Bar · top",
  "card-left": "Card · left",
  "card-right": "Card · right",
};

async function loadHomeSettings(shop: string) {
  const settings = await getSettings(shop);
  return {
    ...settings,
    countries: JSON.parse(settings.countries) as string[],
  };
}

type HomeSettings = Awaited<ReturnType<typeof loadHomeSettings>>;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  // Not awaited — streams after the shell so the skeleton can paint first.
  return { settings: loadHomeSettings(session.shop), shop: session.shop };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const cloned = request.clone();
  const formData = await cloned.formData();
  if (formData.get("intent") === "dismissOnboarding") {
    const { session } = await authenticate.admin(request);
    await dismissOnboarding(session.shop);
    return { ok: true as const };
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
        <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base">
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
          Tip: install Google &amp; Meta through their official channel apps
          for the strongest blocking — Shopify holds those until consent.
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
  const privacySettingsUrl = `https://${shop}/admin/settings/customer_privacy`;

  const syncError =
    (fetcher.data && "syncError" in fetcher.data && fetcher.data.syncError) ||
    null;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      shopify.toast.show("Saved");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const optimisticEnabled = fetcher.formData
    ? fetcher.formData.get("bannerEnabled") === "true"
    : settings.bannerEnabled;

  const targetingLabel = useMemo(() => {
    if (settings.targetingMode === "all") return "All visitors";
    if (settings.targetingMode === "custom") {
      const n = settings.countries.length;
      if (n === 0) return "No countries yet";
      if (n === 1) return COUNTRY_NAME_BY_CODE[settings.countries[0]] ?? settings.countries[0];
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

      {!settings.onboardingDismissed && (
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
              <s-link href={privacySettingsUrl} target="_blank">
                Turn off Shopify&apos;s built-in cookie banner
              </s-link>
            </s-list-item>
          </s-ordered-list>
        </s-banner>
      )}

      <s-section>
        <s-stack direction="block" gap="large">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-icon
              type={optimisticEnabled ? "shield-check-mark" : "shield-none"}
              size="base"
            />
            <s-heading>Consent banner</s-heading>
            <s-badge tone={optimisticEnabled ? "success" : "neutral"}>
              {optimisticEnabled ? "Live" : "Off"}
            </s-badge>
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

          <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small-300">
              <s-text color="subdued">Protection</s-text>
              <s-heading>{optimisticEnabled ? "Active" : "Paused"}</s-heading>
              <s-text color="subdued">
                {optimisticEnabled
                  ? "Tracking blocked until consent"
                  : "No blocking, no banner"}
              </s-text>
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
          </s-grid>
        </s-stack>
      </s-section>
    </>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
