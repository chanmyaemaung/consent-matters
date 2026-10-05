import { Suspense, useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Await, useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getSettings, saveTranslation } from "../models";
import {
  automaticTexts,
  getShopLanguages,
  hasBuiltinTranslation,
  type AdminGraphqlClient,
} from "../services";
import { useSettingsForm } from "../hooks/useSettingsForm";
import {
  ContentSkeleton,
  RichTextField,
  SettingsLoadError,
  SettingsSaveBar,
} from "../components";
import { BUILTIN_TRANSLATIONS, LANGUAGE_NAMES } from "../data/translations";
import {
  TRANSLATABLE_FIELDS,
  type TranslatedTexts,
  type TranslationKey,
} from "../types";

type LanguageStatus = "custom" | "builtin" | "none";

async function loadLanguagesData(admin: AdminGraphqlClient) {
  const [settings, shopLanguages] = await Promise.all([
    getSettings(admin),
    getShopLanguages(admin),
  ]);

  // The shop's own languages when we can read them; otherwise every
  // language we have a translation for, so the page is still useful.
  const known = shopLanguages
    ? shopLanguages.filter((l) => !l.primary)
    : Object.keys(BUILTIN_TRANSLATIONS).map((code) => ({
        code,
        name: LANGUAGE_NAMES[code] ?? code,
        primary: false,
      }));
  // Keep languages the merchant already translated, even if unpublished.
  for (const code of Object.keys(settings.translations)) {
    if (!known.some((l) => l.code === code)) {
      known.push({ code, name: LANGUAGE_NAMES[code] ?? code, primary: false });
    }
  }

  const languages = known.map((l) => {
    const own = settings.translations[l.code] ?? {};
    const status: LanguageStatus =
      Object.keys(own).length > 0
        ? "custom"
        : hasBuiltinTranslation(l.code)
          ? "builtin"
          : "none";
    return {
      code: l.code,
      name: l.name,
      status,
      own,
      automatic: automaticTexts(settings, l.code),
    };
  });

  return {
    languages,
    primaryName: shopLanguages?.find((l) => l.primary)?.name ?? null,
    localesReadable: shopLanguages !== null,
  };
}

type LanguagesData = Awaited<ReturnType<typeof loadLanguagesData>>;
type LanguageEntry = LanguagesData["languages"][number];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  // Not awaited — streams after the shell so the skeleton can paint first.
  return { data: loadLanguagesData(admin) };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const language = String(formData.get("language") ?? "");
  const texts = JSON.parse(
    String(formData.get("texts") ?? "{}"),
  ) as TranslatedTexts;

  try {
    await saveTranslation(admin, language, texts);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      syncError: error instanceof Error ? error.message : String(error),
    };
  }
};

export default function Languages() {
  const { data } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Languages">
      <Suspense fallback={<ContentSkeleton />}>
        <Await resolve={data} errorElement={<SettingsLoadError />}>
          {(resolved) => <LanguagesView data={resolved} />}
        </Await>
      </Suspense>
    </s-page>
  );
}

const STATUS_BADGE: Record<
  LanguageStatus,
  { label: string; tone: "success" | "info" | "warning" }
> = {
  custom: { label: "Your translation", tone: "success" },
  builtin: { label: "Translated automatically", tone: "info" },
  none: { label: "Shows your main texts", tone: "warning" },
};

function LanguagesView({ data }: { data: LanguagesData }) {
  const [selected, setSelected] = useState(data.languages[0]?.code ?? "");
  const current = data.languages.find((l) => l.code === selected);

  if (data.languages.length === 0) {
    return (
      <s-section>
        <s-paragraph>
          Your store has only one language
          {data.primaryName ? ` (${data.primaryName})` : ""}, so the banner
          uses the texts from the Content page. Add languages in Settings →
          Languages and they&apos;ll show up here.
        </s-paragraph>
      </s-section>
    );
  }

  return (
    <>
      <s-section heading="Your store's languages">
        <s-stack direction="block" gap="base">
          <s-paragraph color="subdued">
            The banner follows the language each visitor is browsing in. Texts
            you never changed are translated automatically; anything you write
            here wins.
          </s-paragraph>
          {!data.localesReadable && (
            <s-paragraph color="subdued">
              Showing every built-in language — open the app again after
              approving its updated permissions to see only your store&apos;s
              languages.
            </s-paragraph>
          )}
          <s-stack direction="block" gap="small-200">
            {data.languages.map((language) => (
              <s-clickable
                key={language.code}
                padding="small-200"
                borderRadius="base"
                {...(language.code === selected
                  ? { background: "subdued" }
                  : {})}
                onClick={() => setSelected(language.code)}
              >
                <s-stack direction="inline" gap="base" alignItems="center">
                  <s-text>{language.name}</s-text>
                  <s-badge tone={STATUS_BADGE[language.status].tone}>
                    {STATUS_BADGE[language.status].label}
                  </s-badge>
                </s-stack>
              </s-clickable>
            ))}
          </s-stack>
        </s-stack>
      </s-section>

      {current && <TranslationForm key={current.code} language={current} />}
    </>
  );
}

function TranslationForm({ language }: { language: LanguageEntry }) {
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const initial = Object.fromEntries(
    TRANSLATABLE_FIELDS.map((f) => [f.key, language.own[f.key] ?? ""]),
  ) as Record<TranslationKey, string>;
  const { values, setValue, isDirty, discard } = useSettingsForm(initial);
  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      shopify.toast.show(`${language.name} saved`);
    }
  }, [fetcher.state, fetcher.data, shopify, language.name]);

  const save = () =>
    fetcher.submit(
      { language: language.code, texts: JSON.stringify(values) },
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
        <s-banner heading="Couldn't save this translation" tone="critical">
          <s-paragraph>{fetcher.data.syncError}</s-paragraph>
        </s-banner>
      )}

      <s-section heading={language.name}>
        <s-stack direction="block" gap="base">
          <s-paragraph color="subdued">
            Leave a field empty to keep what visitors see now (shown in grey).
          </s-paragraph>
          {TRANSLATABLE_FIELDS.map((field) =>
            field.rich ? (
              <RichTextField
                key={field.key}
                label={field.label}
                value={values[field.key]}
                onChange={(html) => setValue(field.key, html)}
                details={`Empty = ${plain(language.automatic[field.key])}`}
              />
            ) : (
              <s-text-field
                key={field.key}
                label={field.label}
                value={values[field.key]}
                placeholder={language.automatic[field.key]}
                onChange={(e) => setValue(field.key, e.currentTarget.value)}
              />
            ),
          )}
        </s-stack>
      </s-section>
    </>
  );
}

/** Strips tags for a one-line hint under rich text fields. */
function plain(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
