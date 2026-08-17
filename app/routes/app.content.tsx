import { useEffect } from "react";
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
import {
  DialogPreview,
  RichTextField,
  SettingsSaveBar,
} from "../components";
import type { SettingsErrors } from "../types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const s = await getSettings(session.shop);
  return {
    form: {
      bannerText: s.bannerText,
      acceptLabel: s.acceptLabel,
      declineLabel: s.declineLabel,
      prefsLabel: s.prefsLabel,
      policyLink: s.policyLink ?? "",
      showReopen: s.showReopen,
      reopenLabel: s.reopenLabel,
      modalTitle: s.modalTitle,
      modalIntro: s.modalIntro,
      saveLabel: s.saveLabel,
      acceptAllLabel: s.acceptAllLabel,
    },
    colors: {
      autoMatchTheme: s.autoMatchTheme,
      bgColor: s.bgColor,
      textColor: s.textColor,
      acceptBgColor: s.acceptBgColor,
      acceptTextColor: s.acceptTextColor,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) =>
  handleSettingsAction(request, (fd) => ({
    bannerText: String(fd.get("bannerText") ?? ""),
    acceptLabel: String(fd.get("acceptLabel") ?? ""),
    declineLabel: String(fd.get("declineLabel") ?? ""),
    prefsLabel: String(fd.get("prefsLabel") ?? ""),
    policyLink: String(fd.get("policyLink") ?? ""),
    showReopen: fd.get("showReopen") === "true",
    reopenLabel: String(fd.get("reopenLabel") ?? ""),
    modalTitle: String(fd.get("modalTitle") ?? ""),
    modalIntro: String(fd.get("modalIntro") ?? ""),
    saveLabel: String(fd.get("saveLabel") ?? ""),
    acceptAllLabel: String(fd.get("acceptAllLabel") ?? ""),
  }));

export default function Content() {
  const { form, colors } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const { values, setValue, isDirty, discard } = useSettingsForm(form);

  const errors: SettingsErrors =
    (fetcher.data && "errors" in fetcher.data && fetcher.data.errors) || {};
  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      shopify.toast.show("Content saved");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const save = () =>
    fetcher.submit({ ...values, showReopen: String(values.showReopen) }, {
      method: "POST",
    });

  return (
    <s-page heading="Content">
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

      <s-section heading="Banner">
        <s-stack direction="block" gap="base">
          <RichTextField
            label="Banner text"
            value={values.bannerText}
            onChange={(html) => setValue("bannerText", html)}
            error={errors.bannerText ?? ""}
            details="Bold, italic, and links are supported."
          />
          <s-grid gridTemplateColumns="1fr 1fr" gap="base">
            <s-text-field
              label="Accept button"
              value={values.acceptLabel}
              onChange={(e) => setValue("acceptLabel", e.currentTarget.value)}
              error={errors.acceptLabel ?? ""}
            />
            <s-text-field
              label="Decline button"
              value={values.declineLabel}
              onChange={(e) => setValue("declineLabel", e.currentTarget.value)}
              error={errors.declineLabel ?? ""}
            />
          </s-grid>
          <s-text-field
            label="Preferences button"
            value={values.prefsLabel}
            onChange={(e) => setValue("prefsLabel", e.currentTarget.value)}
            error={errors.prefsLabel ?? ""}
            details="Opens the preferences dialog."
          />
          <s-text-field
            label="Privacy policy link"
            placeholder="https://your-store.com/policies/privacy-policy"
            value={values.policyLink}
            onChange={(e) => setValue("policyLink", e.currentTarget.value)}
            error={errors.policyLink ?? ""}
            details='Optional — shows a "Learn more" link in the banner.'
          />
          <s-switch
            label="Show a reopen link after visitors choose"
            checked={values.showReopen}
            onChange={(e) => setValue("showReopen", e.currentTarget.checked)}
            details="Lets visitors change their mind anytime — required for GDPR consent withdrawal."
          />
          {values.showReopen && (
            <s-text-field
              label="Reopen link label"
              value={values.reopenLabel}
              onChange={(e) => setValue("reopenLabel", e.currentTarget.value)}
              error={errors.reopenLabel ?? ""}
            />
          )}
        </s-stack>
      </s-section>

      <s-section heading="Preferences dialog">
        <s-stack direction="block" gap="base">
          <s-text-field
            label="Title"
            value={values.modalTitle}
            onChange={(e) => setValue("modalTitle", e.currentTarget.value)}
            error={errors.modalTitle ?? ""}
          />
          <RichTextField
            label="Intro text"
            value={values.modalIntro}
            onChange={(html) => setValue("modalIntro", html)}
            error={errors.modalIntro ?? ""}
            details="Bold, italic, and links are supported."
          />
          <s-grid gridTemplateColumns="1fr 1fr" gap="base">
            <s-text-field
              label="Save button"
              value={values.saveLabel}
              onChange={(e) => setValue("saveLabel", e.currentTarget.value)}
              error={errors.saveLabel ?? ""}
            />
            <s-text-field
              label="Accept all button"
              value={values.acceptAllLabel}
              onChange={(e) =>
                setValue("acceptAllLabel", e.currentTarget.value)
              }
              error={errors.acceptAllLabel ?? ""}
            />
          </s-grid>

          <DialogPreview
            autoMatchTheme={colors.autoMatchTheme}
            bgColor={colors.bgColor}
            textColor={colors.textColor}
            acceptBgColor={colors.acceptBgColor}
            acceptTextColor={colors.acceptTextColor}
            modalTitle={values.modalTitle}
            modalIntro={values.modalIntro}
            saveLabel={values.saveLabel}
            acceptAllLabel={values.acceptAllLabel}
          />
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
