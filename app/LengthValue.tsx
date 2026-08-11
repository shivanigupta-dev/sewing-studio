import type { ReactNode } from "react";
import { formatLengthMm, type LengthRounding, type UnitSystem } from "../lib/units";

export function LengthValue({ mm, unitSystem, denominator = 8, rounding = "nearest", className = "" }: {
  mm: number;
  unitSystem: UnitSystem;
  denominator?: 4 | 8 | 16;
  rounding?: LengthRounding;
  className?: string;
}) {
  const formatted = formatLengthMm(mm, unitSystem, { denominator, rounding });
  return (
    <span className={`semantic-length ${formatted.approximate ? "approximate" : "exact"} ${className}`.trim()} itemScope itemType="https://schema.org/QuantitativeValue">
      <meta itemProp="unitCode" content={formatted.schemaUnitCode} />
      <meta itemProp="unitText" content="millimetre" />
      <data
        itemProp="value"
        value={String(Number(mm.toFixed(4)))}
        data-quantity="length"
        data-canonical-unit="mm"
        data-ucum-unit={formatted.ucumUnit}
        data-display-unit={formatted.displayUnit}
        data-rounding={rounding}
        title={`${Number(mm.toFixed(3))} mm canonical value${formatted.approximate ? "; displayed value is sewing-rounded" : ""}`}
      >{formatted.text}</data>
    </span>
  );
}

export function RichMeasurementText({ children, unitSystem }: { children: string; unitSystem: UnitSystem }) {
  const tokenPattern = /\[length:([0-9.]+):(cm|in)(?::(4|8|16))?(?::(nearest|up|down))?\]/g;
  const output: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(children))) {
    if (match.index > cursor) output.push(children.slice(cursor, match.index));
    const value = Number(match[1]);
    const mm = match[2] === "cm" ? value * 10 : value * 25.4;
    output.push(<LengthValue key={`${match.index}-${match[0]}`} mm={mm} unitSystem={unitSystem} denominator={Number(match[3] ?? 8) as 4 | 8 | 16} rounding={(match[4] ?? "nearest") as LengthRounding} />);
    cursor = match.index + match[0].length;
  }
  if (cursor < children.length) output.push(children.slice(cursor));
  return <>{output}</>;
}
