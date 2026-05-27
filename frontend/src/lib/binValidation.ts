/**
 * Локальная валидация БИН/ИИН РК: 12 цифр + контрольная сумма по двум системам весов.
 * Эталонный алгоритм продублирован в backend/app/utils/bin_validator.py.
 */

const W1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const W2 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2];

export function isValidBinChecksum(value: string | null | undefined): boolean {
  if (!value) return false;
  const s = String(value).replace(/\D/g, "");
  if (s.length !== 12) return false;
  const d = s.split("").map(Number);
  const check = d[11];
  const sum1 = d.slice(0, 11).reduce((acc, x, i) => acc + x * W1[i], 0) % 11;
  if (sum1 !== 10) return sum1 === check;
  const sum2 = d.slice(0, 11).reduce((acc, x, i) => acc + x * W2[i], 0) % 11;
  if (sum2 === 10) return false;
  return sum2 === check;
}

export function validateBinFormat(value: string | null | undefined): { ok: boolean; error: string | null } {
  if (!value) return { ok: false, error: "Введите БИН/ИИН" };
  const s = String(value).replace(/\D/g, "");
  if (s.length !== 12) return { ok: false, error: "БИН/ИИН должен содержать 12 цифр" };
  if (!isValidBinChecksum(s)) return { ok: false, error: "Неверная контрольная сумма" };
  return { ok: true, error: null };
}

export interface BinCheckResult {
  format_valid: boolean;
  format_error: string | null;
  online_status: "found" | "not_found" | "unknown";
  company_name: string | null;
  source_url: string | null;
}

export async function checkBinOnline(value: string): Promise<BinCheckResult | null> {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 12) return null;
  try {
    const res = await fetch(`/api/v1/bin/check?value=${digits}`, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as BinCheckResult;
  } catch {
    return null;
  }
}
