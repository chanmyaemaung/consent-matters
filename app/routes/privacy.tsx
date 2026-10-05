import type { MetaFunction } from "react-router";
import { useLoaderData } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Privacy Policy — Consent Matters" },
  {
    name: "description",
    content:
      "What the Consent Matters Shopify app stores, what it never collects, and how data is deleted.",
  },
];

// Public privacy policy — required for the Shopify App Store listing.
// Served outside the embedded admin, so no auth and no Polaris.
export const loader = async () => {
  return { supportEmail: process.env.SUPPORT_EMAIL ?? "" };
};

const styles = {
  page: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "48px 24px 96px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    lineHeight: 1.7,
    color: "#202223",
  },
  h1: { fontSize: "28px", marginBottom: "4px" },
  meta: { color: "#6d7175", marginBottom: "32px" },
  h2: { fontSize: "20px", marginTop: "36px", marginBottom: "8px" },
} as const;

export default function Privacy() {
  const { supportEmail } = useLoaderData<typeof loader>();

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Privacy Policy — Consent Matters</h1>
      <p style={styles.meta}>Effective date: October 5, 2026</p>

      <p>
        Consent Matters is a cookie-consent app for Shopify stores. It was
        built around a simple principle: a privacy tool should collect as
        little data as technically possible. This page describes exactly
        what the app stores and what it never touches.
      </p>

      <h2 style={styles.h2}>What the app stores</h2>
      <ul>
        <li>
          The <strong>banner settings</strong> you configure (colors, texts,
          translations, layout, targeting choices) — saved inside your own
          Shopify store as app data, not on the app&apos;s servers.
        </li>
        <li>
          A short-lived <strong>API session</strong> issued by Shopify, held
          only in the server&apos;s memory while you use the app admin.
        </li>
      </ul>
      <p>
        That is the complete list. The app has no database of its own.
      </p>

      <h2 style={styles.h2}>What the app never stores</h2>
      <ul>
        <li>
          <strong>No shopper or visitor personal data.</strong> Consent
          choices made by your visitors are recorded through Shopify&apos;s
          own Customer Privacy API and stay in the visitor&apos;s browser
          and Shopify&apos;s platform — they never reach this app&apos;s
          servers.
        </li>
        <li>
          <strong>No analytics or tracking of any kind</strong> — the app
          does not track merchants or shoppers, and your storefront never
          sends requests to the app&apos;s servers during normal browsing.
        </li>
        <li>
          <strong>No customer records</strong> — the app requests no access
          to orders, customers, or store content. It only reads your
          store&apos;s languages (to translate the banner) and your
          Shopify cookie banner setting (so it can show whether
          Shopify&apos;s own banner is also on, and switch it off when you
          click the button to do so).
        </li>
      </ul>

      <h2 style={styles.h2}>Data deletion</h2>
      <p>
        Uninstalling the app makes Shopify delete the app&apos;s settings
        from your store automatically. The app also subscribes to
        Shopify&apos;s mandatory GDPR webhooks
        (customers/data_request, customers/redact, shop/redact) and honors
        them: since no customer data is stored there is nothing to return
        for customer requests, and the app keeps no shop records of its own
        to remove.
      </p>

      <h2 style={styles.h2}>Infrastructure</h2>
      <p>
        The app runs on Vercel (hosting) in the United States (US East),
        which processes requests solely to operate the service.
      </p>

      <h2 style={styles.h2}>Contact</h2>
      <p>
        Questions about this policy or your data?{" "}
        {supportEmail ? (
          <a href={`mailto:${supportEmail}`}>Email the developer</a>
        ) : (
          "Reach the developer through the app's support page"
        )}{" "}
        — every message is read and answered personally.
      </p>
    </main>
  );
}
