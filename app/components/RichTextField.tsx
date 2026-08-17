import { useEffect, useRef } from "react";

interface RichTextFieldProps {
  label: string;
  value: string;
  onChange: (html: string) => void;
  error?: string;
  details?: string;
}

// Minimal rich-text input: bold / italic / link over a contentEditable box.
// Output HTML is sanitized server-side on save (see sanitize.server.ts),
// and again on the storefront — this editor is a convenience, not a
// security boundary.
export function RichTextField({
  label,
  value,
  onChange,
  error,
  details,
}: RichTextFieldProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  // Sync external value in (initial render, Discard) without fighting the
  // caret: only overwrite when the box isn't focused.
  useEffect(() => {
    const box = boxRef.current;
    if (box && document.activeElement !== box && box.innerHTML !== value) {
      box.innerHTML = value;
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    boxRef.current?.focus();
    document.execCommand(command, false, arg);
    if (boxRef.current) onChange(boxRef.current.innerHTML);
  };

  const addLink = () => {
    const url = window.prompt("Link URL (https://…)");
    if (url && /^https?:\/\//i.test(url)) {
      exec("createLink", url);
    }
  };

  return (
    <s-stack direction="block" gap="small-200">
      <s-text>{label}</s-text>
      <div
        style={{
          border: error ? "1px solid #d72c0d" : "1px solid #8a8a8a55",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "2px",
            padding: "4px 6px",
            borderBottom: "1px solid #8a8a8a33",
          }}
        >
          <button
            type="button"
            onClick={() => exec("bold")}
            style={{ ...toolbarButton, fontWeight: 700 }}
            aria-label="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => exec("italic")}
            style={{ ...toolbarButton, fontStyle: "italic" }}
            aria-label="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={addLink}
            style={{ ...toolbarButton, textDecoration: "underline" }}
            aria-label="Insert link"
          >
            Link
          </button>
        </div>
        <div
          ref={boxRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => {
            if (boxRef.current) onChange(boxRef.current.innerHTML);
          }}
          style={{
            minHeight: "72px",
            padding: "10px 12px",
            fontSize: "13px",
            lineHeight: 1.5,
            outline: "none",
          }}
        />
      </div>
      {details && !error && <s-text color="subdued">{details}</s-text>}
      {error && (
        <s-text tone="critical" color="subdued">
          {error}
        </s-text>
      )}
    </s-stack>
  );
}

const toolbarButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: "13px",
  padding: "4px 10px",
  borderRadius: "6px",
};
