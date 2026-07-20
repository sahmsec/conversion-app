import { useEffect, useState } from "react";
import { TextField } from "@shopify/polaris";

const centsToText = (cents: number) => (cents / 100).toString();
const textToCents = (text: string) => Math.max(0, Math.round((parseFloat(text) || 0) * 100));

/**
 * Currency amount input backed by integer cents. Keeps a local string buffer so
 * partial decimals (e.g. "49." on the way to "49.99") survive keystrokes — deriving
 * the value straight from integer cents on every render strips the decimal.
 */
export function MoneyField({
  label,
  cents,
  onChangeCents,
  helpText,
}: {
  label: string;
  cents: number;
  onChangeCents: (cents: number) => void;
  helpText?: string;
}) {
  const [text, setText] = useState(() => centsToText(cents));

  // Re-sync only when the external value diverges from what the buffer represents
  // (e.g. a form reset) — never while the user is mid-edit of the same amount.
  useEffect(() => {
    if (textToCents(text) !== cents) setText(centsToText(cents));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents]);

  return (
    <TextField
      label={label}
      type="text"
      inputMode="decimal"
      value={text}
      helpText={helpText}
      autoComplete="off"
      onChange={(v) => {
        // Allow only a valid partial decimal with up to 2 fraction digits.
        if (v !== "" && !/^\d*\.?\d{0,2}$/.test(v)) return;
        setText(v);
        onChangeCents(textToCents(v));
      }}
    />
  );
}
