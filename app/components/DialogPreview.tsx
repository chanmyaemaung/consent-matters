interface DialogPreviewProps {
  autoMatchTheme: boolean;
  bgColor: string;
  textColor: string;
  acceptBgColor: string;
  acceptTextColor: string;
  modalTitle: string;
  modalIntro: string;
  saveLabel: string;
  acceptAllLabel: string;
}

const CATEGORY_ROWS = [
  "Essential",
  "Analytics",
  "Marketing",
  "Personalization",
];

export function DialogPreview(props: DialogPreviewProps) {
  const bg = props.autoMatchTheme ? "#ffffff" : props.bgColor;
  const tx = props.autoMatchTheme ? "#202223" : props.textColor;
  const ab = props.autoMatchTheme ? "#202223" : props.acceptBgColor;
  const at = props.autoMatchTheme ? "#ffffff" : props.acceptTextColor;

  return (
    <s-box
      padding="base"
      borderWidth="base"
      borderRadius="base"
      background="subdued"
    >
      <s-stack direction="block" gap="small-200">
        <s-text color="subdued">Dialog preview</s-text>
        <div
          style={{
            background: bg,
            color: tx,
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #e1e3e5",
            maxWidth: "420px",
            fontSize: "13px",
          }}
        >
          <div
            style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}
          >
            {props.modalTitle}
          </div>
          <div
            style={{ opacity: 0.85, marginBottom: "10px" }}
            dangerouslySetInnerHTML={{ __html: props.modalIntro }}
          />
          {CATEGORY_ROWS.map((row) => (
            <div
              key={row}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderTop: "1px solid #8a8a8a33",
              }}
            >
              <span style={{ fontWeight: 600 }}>{row}</span>
              <span>{row === "Essential" ? "🔒" : "☑"}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              gap: "8px",
              justifyContent: "flex-end",
              marginTop: "12px",
            }}
          >
            <span
              style={{
                border: "1px solid currentColor",
                padding: "7px 14px",
                borderRadius: "8px",
              }}
            >
              {props.saveLabel}
            </span>
            <span
              style={{
                background: ab,
                color: at,
                padding: "7px 14px",
                borderRadius: "8px",
              }}
            >
              {props.acceptAllLabel}
            </span>
          </div>
        </div>
      </s-stack>
    </s-box>
  );
}
