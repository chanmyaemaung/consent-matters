import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { useLoaderData } from "react-router";
import { SUPPORT_GITHUB, SUPPORT_PAGE } from "../components";

const LINKEDIN_URL = "https://www.linkedin.com/in/chanlay/";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { supportEmail: process.env.SUPPORT_EMAIL ?? "" };
};

export default function Support() {
  const { supportEmail } = useLoaderData<typeof loader>();
  return (
    <s-page heading="Support & About">
      <s-section heading="This app is 100% free — forever">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            No plans, no locked features, no trials. Missing a feature or
            found a bug? Email me — I read and answer everything myself.
          </s-paragraph>
          {supportEmail && (
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-button
                variant="primary"
                href={`mailto:${supportEmail}?subject=Consent%20Matters`}
              >
                Email me
              </s-button>
            </s-stack>
          )}
          <s-paragraph color="subdued">
            Enjoying the app and want to{" "}
            <s-link href={SUPPORT_PAGE} target="_blank">
              support its development
            </s-link>
            ? Entirely optional — everything stays free either way.
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="About the developer">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-icon type="person" size="base" />
            <s-heading>Chan Lay</s-heading>
          </s-stack>
          <s-paragraph>
            Full-stack developer from Myanmar 🇲🇲 building lightweight,
            merchant-friendly apps for Shopify. I believe privacy tools
            should be simple, fast, and free — Consent Matters is my
            contribution to a more privacy-respecting web: one job, done
            well, with zero impact on store speed.
          </s-paragraph>
          <s-unordered-list>
            <s-list-item>
              <s-link href={SUPPORT_GITHUB} target="_blank">
                GitHub — chanmyaemaung
              </s-link>
            </s-list-item>
            <s-list-item>
              <s-link href={LINKEDIN_URL} target="_blank">
                LinkedIn — chanlay
              </s-link>
            </s-list-item>
            <s-list-item>
              <s-link
                href="https://consent-matters.myanmarnode.com/privacy"
                target="_blank"
              >
                Privacy policy
              </s-link>
            </s-list-item>
          </s-unordered-list>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
