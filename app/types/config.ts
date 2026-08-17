/**
 * The JSON the storefront banner consumes — stored in the shop metafield
 * ($app:settings/config) and served by the app proxy as a fallback.
 * Keys are deliberately terse to keep the inline payload small.
 */
export interface StorefrontConfig {
  /** config schema version */
  v: number;
  /** banner enabled (1/0) */
  en: number;
  /** targeting mode: auto | all | custom */
  tm: string;
  /** CSV of ISO country codes (custom mode only) */
  cc?: string;
  /** auto-match theme colors */
  auto: boolean;
  /** layout: bar-bottom | bar-top | card-left | card-right */
  pos: string;
  bg: string;
  tx: string;
  /** accept button background / text */
  bb: string;
  bt: string;
  /** banner rich text */
  msg: string;
  /** accept / decline / preferences button labels */
  ok: string;
  no: string;
  pf: string;
  /** privacy policy link */
  link?: string;
  /** reopen pill enabled + label */
  reopen: boolean;
  rl: string;
  /** preferences dialog: title, intro rich text, save + accept-all labels */
  mt: string;
  mi: string;
  sv: string;
  aa: string;
}
