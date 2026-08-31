import { Suspense, useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Await, useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getSettings } from "../models";
import { handleSettingsAction } from "../lib/settings-action.server";
import { useSettingsForm } from "../hooks/useSettingsForm";
import {
  AppearanceSkeleton,
  BannerPreview,
  SettingsLoadError,
  SettingsSaveBar,
} from "../components";
import type { SettingsErrors } from "../types";

async function loadAppearanceData(shop: string) {
  const s = await getSettings(shop);
  return {
    form: {
      autoMatchTheme: s.autoMatchTheme,
      bgColor: s.bgColor,
      textColor: s.textColor,
      acceptBgColor: s.acceptBgColor,
      acceptTextColor: s.acceptTextColor,
      position: s.position,
    },
    texts: {
      bannerText: s.bannerText,
      acceptLabel: s.acceptLabel,
      declineLabel: s.declineLabel,
      prefsLabel: s.prefsLabel,
      hasPolicyLink: Boolean(s.policyLink),
    },
  };
}

type AppearanceData = Awaited<ReturnType<typeof loadAppearanceData>>;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  // Not awaited — streams after the shell so the skeleton can paint first.
  return { settings: loadAppearanceData(session.shop) };
};

export const action = async ({ request }: ActionFunctionArgs) =>
  handleSettingsAction(request, (fd) => ({
    autoMatchTheme: fd.get("autoMatchTheme") === "true",
    bgColor: String(fd.get("bgColor") ?? "#ffffff"),
    textColor: String(fd.get("textColor") ?? "#202223"),
    acceptBgColor: String(fd.get("acceptBgColor") ?? "#111213"),
    acceptTextColor: String(fd.get("acceptTextColor") ?? "#ffffff"),
    position: String(fd.get("position") ?? "bar-bottom"),
  }));

export default function Appearance() {
  const { settings } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Appearance">
      <Suspense fallback={<AppearanceSkeleton />}>
        <Await resolve={settings} errorElement={<SettingsLoadError />}>
          {(data) => <AppearanceForm data={data} />}
        </Await>
      </Suspense>
    </s-page>
  );
}

function AppearanceForm({ data: { form, texts } }: { data: AppearanceData }) {
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const { values, setValue, isDirty, discard } = useSettingsForm(form);

  const errors: SettingsErrors =
    (fetcher.data && "errors" in fetcher.data && fetcher.data.errors) || {};
  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      shopify.toast.show("Appearance saved");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const save = () =>
    fetcher.submit(
      {
        autoMatchTheme: String(values.autoMatchTheme),
        bgColor: values.bgColor,
        textColor: values.textColor,
        acceptBgColor: values.acceptBgColor,
        acceptTextColor: values.acceptTextColor,
        position: values.position,
      },
      { method: "POST" },
    );

  return (
    <>
      <SettingsSaveBar
        isDirty={isDirty}
        saving={isSaving}
        onSave={save}
        onDiscard={discard}
      />
      <s-button
        slot="primary-action"
        onClick={save}
        {...(isSaving ? { loading: true } : {})}
      >
        Save
      </s-button>

      {fetcher.data && "syncError" in fetcher.data && (
        <s-banner
          heading="Saved, but publishing to your storefront failed"
          tone="critical"
        >
          <s-paragraph>{fetcher.data.syncError}</s-paragraph>
        </s-banner>
      )}

      <s-section heading="Theme">
        <s-stack direction="block" gap="base">
          <s-switch
            label="Match my theme automatically"
            checked={values.autoMatchTheme}
            onChange={(e) =>
              setValue("autoMatchTheme", e.currentTarget.checked)
            }
            details="Uses your theme's colors and font. Turn off to pick your own colors."
          />

          {!values.autoMatchTheme && (
            <s-grid
              gridTemplateColumns="@container (inline-size > 500px) 1fr 1fr, 1fr"
              gap="base"
            >
              <s-color-field
                label="Banner background"
                value={values.bgColor}
                onChange={(e) => setValue("bgColor", e.currentTarget.value)}
                error={errors.bgColor ?? ""}
              />
              <s-color-field
                label="Banner text"
                value={values.textColor}
                onChange={(e) => setValue("textColor", e.currentTarget.value)}
                error={errors.textColor ?? ""}
              />
              <s-color-field
                label="Accept button"
                value={values.acceptBgColor}
                onChange={(e) =>
                  setValue("acceptBgColor", e.currentTarget.value)
                }
                error={errors.acceptBgColor ?? ""}
              />
              <s-color-field
                label="Accept button text"
                value={values.acceptTextColor}
                onChange={(e) =>
                  setValue("acceptTextColor", e.currentTarget.value)
                }
                error={errors.acceptTextColor ?? ""}
              />
            </s-grid>
          )}

          <s-select
            label="Layout"
            value={values.position}
            onChange={(e) => setValue("position", e.currentTarget.value)}
            error={errors.position ?? ""}
          >
            <s-option value="bar-bottom">Bar — bottom</s-option>
            <s-option value="bar-top">Bar — top</s-option>
            <s-option value="card-left">Card — bottom left</s-option>
            <s-option value="card-right">Card — bottom right</s-option>
          </s-select>
        </s-stack>
      </s-section>

      {/* Aside so the preview stays beside the controls on desktop; Polaris
          stacks it below them on narrow screens. */}
      <s-section slot="aside" heading="Preview">
        <BannerPreview
          autoMatchTheme={values.autoMatchTheme}
          bgColor={values.bgColor}
          textColor={values.textColor}
          acceptBgColor={values.acceptBgColor}
          acceptTextColor={values.acceptTextColor}
          position={values.position}
          bannerText={texts.bannerText}
          acceptLabel={texts.acceptLabel}
          declineLabel={texts.declineLabel}
          prefsLabel={texts.prefsLabel}
          hasPolicyLink={texts.hasPolicyLink}
        />
      </s-section>
    </>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
