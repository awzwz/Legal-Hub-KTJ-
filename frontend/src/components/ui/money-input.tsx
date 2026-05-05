import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatIntRu(n: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

function parseDigitsToInt(raw: string): number {
  const d = raw.replace(/\D/g, "");
  if (!d) return 0;
  const n = parseInt(d, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(n, Number.MAX_SAFE_INTEGER);
}

export type MoneyAmountInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "defaultValue"
> & {
  value: number;
  onChange: (value: number) => void;
};

/**
 * Сумма в тенге: ввод с клавиатуры без стрелок `input[type=number]`;
 * в поле без фокуса — разделители тысяч (1 234 567).
 */
export const MoneyAmountInput = React.forwardRef<HTMLInputElement, MoneyAmountInputProps>(
  ({ value, onChange, className, disabled, placeholder = "0", onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [text, setText] = React.useState("");

    React.useEffect(() => {
      if (!focused) {
        setText(value === 0 ? "" : formatIntRu(value));
      }
    }, [value, focused]);

    const displayValue = focused ? text : value === 0 ? "" : formatIntRu(value);

    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        className={cn("tabular-nums", className)}
        value={displayValue}
        onFocus={(e) => {
          onFocus?.(e);
          setFocused(true);
          setText(value === 0 ? "" : String(value));
        }}
        onBlur={(e) => {
          onBlur?.(e);
          setFocused(false);
          const n = parseDigitsToInt(text);
          onChange(n);
          setText(n === 0 ? "" : formatIntRu(n));
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "");
          setText(raw);
          onChange(raw === "" ? 0 : parseDigitsToInt(raw));
        }}
      />
    );
  },
);
MoneyAmountInput.displayName = "MoneyAmountInput";
