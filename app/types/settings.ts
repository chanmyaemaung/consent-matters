export const TARGETING_MODES = ["auto", "all", "custom"] as const;
export type TargetingMode = (typeof TARGETING_MODES)[number];

export const POSITIONS = [
  "bar-bottom",
  "bar-top",
  "card-left",
  "card-right",
] as const;
export type Position = (typeof POSITIONS)[number];

/** Full editable settings surface, shared by all admin pages. */
export interface SettingsInput {
  bannerEnabled: boolean;
  targetingMode: string;
  countries: string[];
  autoMatchTheme: boolean;
  bgColor: string;
  textColor: string;
  acceptBgColor: string;
  acceptTextColor: string;
  position: string;
  bannerText: string;
  acceptLabel: string;
  declineLabel: string;
  prefsLabel: string;
  policyLink: string;
  showReopen: boolean;
  reopenLabel: string;
  modalTitle: string;
  modalIntro: string;
  saveLabel: string;
  acceptAllLabel: string;
}

export type SettingsErrors = Partial<Record<keyof SettingsInput, string>>;
