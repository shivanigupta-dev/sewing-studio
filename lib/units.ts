export type UnitSystem = "metric" | "imperial";
export type LengthUnit = "cm" | "in";
export type LengthRounding = "nearest" | "up" | "down";

export type LengthRecord = {
  value: string;
  unit: LengthUnit;
  canonicalMm?: number;
  sourceUnit?: LengthUnit;
};

export const MM_PER_INCH = 25.4;

const unicodeFractions: Record<string, string> = {
  "¼": " 1/4", "½": " 1/2", "¾": " 3/4", "⅛": " 1/8", "⅜": " 3/8", "⅝": " 5/8", "⅞": " 7/8",
};

export function parseSewingNumber(input: string) {
  let text = input.trim();
  for (const [symbol, replacement] of Object.entries(unicodeFractions)) text = text.replace(symbol, replacement);
  text = text.trim().replace(/\s+/g, " ");
  if (!text) return null;
  const mixed = text.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    return denominator ? Number(mixed[1]) + Number(mixed[2]) / denominator : null;
  }
  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator ? Number(fraction[1]) / denominator : null;
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function toCanonicalMm(value: string, unit: LengthUnit) {
  const parsed = parseSewingNumber(value);
  if (parsed === null || parsed <= 0) return null;
  return unit === "cm" ? parsed * 10 : parsed * MM_PER_INCH;
}

export function canonicalMm(record?: LengthRecord) {
  if (!record) return null;
  if (typeof record.canonicalMm === "number" && Number.isFinite(record.canonicalMm) && record.canonicalMm > 0) return record.canonicalMm;
  return toCanonicalMm(record.value, record.unit);
}

const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;

function fractionText(value: number, denominator: number) {
  const whole = Math.floor(value + 1e-9);
  let numerator = Math.round((value - whole) * denominator);
  if (numerator === denominator) return `${whole + 1}`;
  if (!numerator) return `${whole}`;
  const divisor = gcd(numerator, denominator);
  numerator /= divisor;
  const reducedDenominator = denominator / divisor;
  return whole ? `${whole} ${numerator}/${reducedDenominator}` : `${numerator}/${reducedDenominator}`;
}

function rounded(value: number, scale: number, rounding: LengthRounding) {
  const operation = rounding === "up" ? Math.ceil : rounding === "down" ? Math.floor : Math.round;
  return operation((value + (rounding === "down" ? 1e-10 : 0)) * scale) / scale;
}

export type FormattedLength = {
  text: string;
  approximate: boolean;
  displayValue: number;
  displayUnit: LengthUnit;
  canonicalMm: number;
  ucumUnit: "mm";
  schemaUnitCode: "MMT";
};

export function formatLengthMm(
  millimeters: number,
  system: UnitSystem,
  options: { denominator?: 4 | 8 | 16; metricDecimals?: 0 | 1 | 2; rounding?: LengthRounding; showApproximation?: boolean } = {},
): FormattedLength {
  const rounding = options.rounding ?? "nearest";
  if (system === "metric") {
    const decimals = options.metricDecimals ?? 1;
    const scale = 10 ** decimals;
    const centimeters = rounded(millimeters / 10, scale, rounding);
    const textValue = centimeters.toFixed(decimals).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
    const approximate = Math.abs(centimeters * 10 - millimeters) > 0.005;
    return { text: `${options.showApproximation !== false && approximate ? "≈ " : ""}${textValue} cm`, approximate, displayValue: centimeters, displayUnit: "cm", canonicalMm: millimeters, ucumUnit: "mm", schemaUnitCode: "MMT" };
  }
  const denominator = options.denominator ?? 8;
  const exactInches = millimeters / MM_PER_INCH;
  const displayValue = rounded(exactInches, denominator, rounding);
  const approximate = Math.abs(displayValue - exactInches) > 0.0001;
  return { text: `${options.showApproximation !== false && approximate ? "≈ " : ""}${fractionText(displayValue, denominator)} in`, approximate, displayValue, displayUnit: "in", canonicalMm: millimeters, ucumUnit: "mm", schemaUnitCode: "MMT" };
}

export function formatEditableMm(millimeters: number, system: UnitSystem) {
  const formatted = formatLengthMm(millimeters, system, { showApproximation: false });
  return system === "metric"
    ? formatted.displayValue.toFixed(1).replace(/\.0$/, "")
    : fractionText(formatted.displayValue, 8);
}

export function normalizeLengthRecord<T extends LengthRecord>(record: T, system: UnitSystem): T {
  const mm = canonicalMm(record);
  const unit: LengthUnit = system === "metric" ? "cm" : "in";
  if (mm === null) return { ...record, unit };
  return {
    ...record,
    canonicalMm: mm,
    sourceUnit: record.sourceUnit ?? record.unit,
    value: formatEditableMm(mm, system),
    unit,
  };
}

export function updateLengthRecord<T extends LengthRecord>(record: T, value: string, system: UnitSystem): T {
  const unit: LengthUnit = system === "metric" ? "cm" : "in";
  const mm = toCanonicalMm(value, unit);
  return {
    ...record,
    value,
    unit,
    canonicalMm: mm ?? undefined,
    sourceUnit: unit,
  };
}
