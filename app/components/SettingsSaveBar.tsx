import { SaveBar } from "@shopify/app-bridge-react";

interface SettingsSaveBarProps {
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function SettingsSaveBar({
  isDirty,
  saving,
  onSave,
  onDiscard,
}: SettingsSaveBarProps) {
  return (
    <SaveBar id="cm-save-bar" open={isDirty}>
      <button
        {...({ variant: "primary" } as object)}
        onClick={onSave}
        {...(saving ? { loading: "" } : {})}
      >
        Save
      </button>
      <button onClick={onDiscard}>Discard</button>
    </SaveBar>
  );
}
