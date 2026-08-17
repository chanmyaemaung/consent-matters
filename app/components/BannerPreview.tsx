interface BannerPreviewProps {
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
  hasPolicyLink: boolean;
}

export function BannerPreview(props: BannerPreviewProps) {
  const isCard =
    props.position === "card-left" || props.position === "card-right";
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
        <s-text color="subdued">Banner preview</s-text>
        <div
          style={{
            display: "flex",
            justifyContent: isCard
              ? props.position === "card-left"
                ? "flex-start"
                : "flex-end"
              : "stretch",
          }}
        >
          <div
            style={{
              background: bg,
              color: tx,
              padding: "12px 16px",
              borderRadius: isCard ? "12px" : "8px",
              border: "1px solid #e1e3e5",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "12px",
              justifyContent: "space-between",
              width: isCard ? "70%" : "100%",
              flexDirection: isCard ? "column" : "row",
            }}
          >
            <span style={{ flex: "1 1 200px", fontSize: "13px" }}>
              <span dangerouslySetInnerHTML={{ __html: props.bannerText }} />{" "}
              {props.hasPolicyLink && <u style={{ opacity: 0.8 }}>Learn more</u>}
            </span>
            <span
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <u style={{ fontSize: "12px", opacity: 0.75 }}>
                {props.prefsLabel}
              </u>
              <span
                style={{
                  border: "1px solid currentColor",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              >
                {props.declineLabel}
              </span>
              <span
                style={{
                  background: ab,
                  color: at,
                  padding: "8px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              >
                {props.acceptLabel}
              </span>
            </span>
          </div>
        </div>
        {props.autoMatchTheme && (
          <s-text color="subdued">
            Colors are placeholders — the storefront banner adopts your
            theme&apos;s colors and font.
          </s-text>
        )}
      </s-stack>
    </s-box>
  );
}
