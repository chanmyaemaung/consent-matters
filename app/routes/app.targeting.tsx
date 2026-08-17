import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getSettings } from "../models";
import { handleSettingsAction } from "../lib/settings-action.server";
import { useSettingsForm } from "../hooks/useSettingsForm";
import { SettingsSaveBar } from "../components";
import {
  COUNTRIES,
  COUNTRY_NAME_BY_CODE,
  EU_EEA_UK_CODES,
} from "../data/countries";
import type { SettingsErrors } from "../types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getSettings(session.shop);
  return {
    targetingMode: settings.targetingMode,
    countries: JSON.parse(settings.countries) as string[],
  };
};

export const action = async ({ request }: ActionFunctionArgs) =>
  handleSettingsAction(request, (fd) => ({
    targetingMode: String(fd.get("targetingMode") ?? "auto"),
    countries: JSON.parse(String(fd.get("countries") ?? "[]")) as string[],
  }));

export default function Targeting() {
  const initial = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const { values, setValue, isDirty, discard } = useSettingsForm(initial);
  const [countryToAdd, setCountryToAdd] = useState("");

  const errors: SettingsErrors =
    (fetcher.data && "errors" in fetcher.data && fetcher.data.errors) || {};
  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      shopify.toast.show("Targeting saved");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const save = () =>
    fetcher.submit(
      {
        targetingMode: values.targetingMode,
        countries: JSON.stringify(values.countries),
      },
      { method: "POST" },
    );

  const addCountry = (code: string) => {
    if (!code || values.countries.includes(code)) return;
    setValue("countries", [...values.countries, code].sort());
  };

  return (
    <s-page heading="Targeting">
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

      <s-section heading="Who sees the banner">
        <s-choice-list
          label="Targeting"
          labelAccessibilityVisibility="exclusive"
          name="targetingMode"
          values={[values.targetingMode]}
          onChange={(e) =>
            setValue("targetingMode", e.currentTarget.values[0] ?? "auto")
          }
          error={errors.targetingMode ?? ""}
        >
          <s-choice value="auto">Automatic (recommended)</s-choice>
          <s-choice value="all">All visitors</s-choice>
          <s-choice value="custom">Specific countries only</s-choice>
        </s-choice-list>

        {values.targetingMode === "auto" && (
          <s-text color="subdued">
            Shopify detects each visitor&apos;s region and shows the banner
            only where consent is required.
          </s-text>
        )}

        {values.targetingMode === "custom" && (
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="base">
              <s-select
                label="Add a country"
                labelAccessibilityVisibility="exclusive"
                placeholder="Choose a country"
                value={countryToAdd}
                onChange={(e) => {
                  const code = e.currentTarget.value;
                  setCountryToAdd(code);
                  addCountry(code);
                }}
              >
                {COUNTRIES.map((c) => (
                  <s-option key={c.code} value={c.code}>
                    {c.name}
                  </s-option>
                ))}
              </s-select>
              <s-button
                variant="secondary"
                onClick={() =>
                  setValue(
                    "countries",
                    Array.from(
                      new Set([...values.countries, ...EU_EEA_UK_CODES]),
                    ).sort(),
                  )
                }
              >
                Add EU/EEA + UK + CH
              </s-button>
            </s-stack>
            {errors.countries ? (
              <s-banner tone="critical">{errors.countries}</s-banner>
            ) : null}
            <s-stack direction="inline" gap="small-200">
              {values.countries.map((code) => (
                <s-clickable-chip
                  key={code}
                  removable
                  onRemove={() =>
                    setValue(
                      "countries",
                      values.countries.filter((c) => c !== code),
                    )
                  }
                  accessibilityLabel={`Remove ${COUNTRY_NAME_BY_CODE[code] ?? code}`}
                >
                  {COUNTRY_NAME_BY_CODE[code] ?? code}
                </s-clickable-chip>
              ))}
            </s-stack>
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
