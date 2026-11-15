// Parsing and pretty-printing ingredient amounts. Shared by the server and the
// browser, so it must stay free of server-only imports.

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 1 / 4,
  "½": 1 / 2,
  "¾": 3 / 4,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 1 / 5,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
};

/** Parse "1 1/2", "1½", "0.75", "3/4" into a number. */
function parseOne(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let total = 0;
  for (const [ch, value] of Object.entries(UNICODE_FRACTIONS)) {
    if (s.includes(ch)) {
      total += value;
      s = s.replace(ch, " ");
    }
  }
  s = s.trim();
  if (!s) return total;
  const parts = s.split(/\s+/);
  for (const part of parts) {
    const frac = part.match(/^(\d+)\/(\d+)$/);
    if (frac) {
      const den = Number(frac[2]);
      if (!den) return null;
      total += Number(frac[1]) / den;
    } else if (/^\d*\.?\d+$/.test(part)) {
      total += Number(part);
    } else {
      return null;
    }
  }
  return total;
}

/** Parse a quantity field that may be a range ("2-3", "2 to 3"). */
export function parseQuantity(raw: string): {
  quantity: number | null;
  quantityMax: number | null;
} {
  const [lo, hi] = raw.split(/\s*(?:-|–|—|\bto\b)\s*/);
  const quantity = parseOne(lo ?? "");
  const quantityMax = hi !== undefined ? parseOne(hi) : null;
  return { quantity, quantityMax };
}

const NICE_FRACTIONS: [number, string][] = [
  [0, ""],
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
  [1, ""],
];

// Units where cooks expect decimals rather than kitchen fractions.
const METRIC = /^(g|gram|grams|kg|ml|millilit(er|re)s?|l|lit(er|re)s?|oz|ounces?|lb|lbs|pounds?|%)$/i;

function formatNumber(value: number, unit: string): string {
  if (value <= 0) return "0";
  if (METRIC.test(unit.trim()) || value >= 20) {
    const rounded =
      value >= 100 ? Math.round(value / 5) * 5 : value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
    return String(rounded);
  }
  let whole = Math.floor(value);
  const rest = value - whole;
  let best = NICE_FRACTIONS[0];
  for (const f of NICE_FRACTIONS) {
    if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f;
  }
  if (best[0] === 1) {
    whole += 1;
    best = NICE_FRACTIONS[0];
  }
  // Very small amounts (a pinch scaled down) shouldn't round to zero.
  if (whole === 0 && best[1] === "") return value < 0.0625 ? "pinch" : "⅛";
  return `${whole || ""}${best[1]}` || "0";
}

export function formatQuantity(
  quantity: number | null,
  quantityMax: number | null,
  unit = "",
  factor = 1,
): string {
  if (quantity === null) return "";
  const lo = formatNumber(quantity * factor, unit);
  if (quantityMax === null) return lo;
  return `${lo}–${formatNumber(quantityMax * factor, unit)}`;
}

/** Plain-text version for the edit form ("1 1/2"). */
export function quantityToInput(
  quantity: number | null,
  quantityMax: number | null,
): string {
  const one = (v: number) => {
    const whole = Math.floor(v);
    const rest = v - whole;
    const match = [
      [1 / 8, "1/8"],
      [1 / 4, "1/4"],
      [1 / 3, "1/3"],
      [3 / 8, "3/8"],
      [1 / 2, "1/2"],
      [5 / 8, "5/8"],
      [2 / 3, "2/3"],
      [3 / 4, "3/4"],
      [7 / 8, "7/8"],
    ].find(([n]) => Math.abs((n as number) - rest) < 0.01);
    if (rest < 0.001) return String(whole);
    if (match) return `${whole ? whole + " " : ""}${match[1]}`;
    return String(Math.round(v * 100) / 100);
  };
  if (quantity === null) return "";
  return quantityMax === null ? one(quantity) : `${one(quantity)}-${one(quantityMax)}`;
}
