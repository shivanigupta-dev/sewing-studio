import type { Measurement } from "./project";
import { measurementInches } from "./pattern-geometry.ts";
import { formatLengthMm, type UnitSystem } from "./units.ts";

export type PatternPiece = "front" | "back";

export type PatternMark = {
  id: string;
  shortLabel: string;
  title: string;
  pieces: PatternPiece[];
  x: number;
  y: number;
  backX?: number;
  backY?: number;
  explanation: string;
  draftingUse: string;
  measuringTip: string;
};

export const patternMarks: PatternMark[] = [
  { id: "shoulder", shortLabel: "Shoulder", title: "Shoulder seam", pieces: ["front", "back"], x: 76, y: 10, backX: 73, backY: 10, explanation: "Sets the neck-to-armhole width and the end of the shoulder seam.", draftingUse: "Used directly for shoulder length. The shoulder slope is refined during the sloper fitting.", measuringTip: "Measure from the neck point to the shoulder tip; do not follow the arm." },
  { id: "high-bust", shortLabel: "High bust", title: "High-bust line", pieces: ["front"], x: 50, y: 25, explanation: "Checks the upper frame before the pattern expands over the full bust.", draftingUse: "Helps distinguish upper-body frame size from bust fullness and keeps the armhole from becoming oversized.", measuringTip: "Run the tape above the fullest bust point and under the arms, keeping it level." },
  { id: "full-bust", shortLabel: "Bust", title: "Full-bust line", pieces: ["front"], x: 83, y: 34, explanation: "Controls the main bodice width and the amount of fitted woven-top ease.", draftingUse: "Quarter bust plus planned ease establishes the front and back width at bust level.", measuringTip: "Keep the tape level around the fullest point and breathe normally." },
  { id: "bust-depth", shortLabel: "Bust depth", title: "Bust apex depth", pieces: ["front"], x: 47, y: 36, explanation: "Places the bust apex vertically from the shoulder neck point.", draftingUse: "Positions the side bust dart so it points toward the apex without ending on it.", measuringTip: "Measure from the shoulder neck point down to the fullest bust point." },
  { id: "bust-span", shortLabel: "Bust span", title: "Bust apex spacing", pieces: ["front"], x: 32, y: 36, explanation: "Places each bust apex horizontally from center front.", draftingUse: "Half the bust span locates one apex from center front and anchors the waist dart.", measuringTip: "Measure straight from apex to apex without following the body curve." },
  { id: "front-waist", shortLabel: "Front waist", title: "Front waist length", pieces: ["front"], x: 18, y: 47, explanation: "Sets the front waistline while allowing the pattern to travel over the bust.", draftingUse: "Compared with back waist length to balance the bodice and keep the waist level.", measuringTip: "Measure from the shoulder neck point, over the bust apex, to the waist elastic." },
  { id: "back-width", shortLabel: "Back width", title: "Back width", pieces: ["back"], x: 50, y: 27, backX: 50, backY: 27, explanation: "Controls the back frame and back armhole placement.", draftingUse: "Places the back armhole relative to center back without borrowing width from the sleeve opening.", measuringTip: "Measure horizontally from one back arm crease to the other." },
  { id: "back-waist", shortLabel: "Back waist", title: "Back side-neck to waist", pieces: ["back"], x: 18, y: 47, backX: 18, backY: 47, explanation: "Sets the vertical distance from the side-neck point to the natural waist at the back.", draftingUse: "Establishes the back waistline and is compared with the front for bodice balance.", measuringTip: "Measure from the same side-neck point used for the shoulder, straight down to the waist elastic at the back." },
  { id: "armhole-depth", shortLabel: "Armhole", title: "Armhole depth", pieces: ["front", "back"], x: 80, y: 23, backX: 80, backY: 23, explanation: "Sets the horizontal depth line beneath the arm.", draftingUse: "Controls where the armhole ends and where the side seam begins; fitting confirms comfort and gape.", measuringTip: "Use the method from your sloper video and keep the guide horizontal." },
  { id: "waist", shortLabel: "Waist", title: "Natural waist line", pieces: ["front", "back"], x: 82, y: 49, backX: 82, backY: 49, explanation: "Controls waist width and the intake shared by darts and side shaping.", draftingUse: "Quarter waist plus ease is compared with the bust-width draft; the difference becomes shaping.", measuringTip: "Tie elastic at the natural waist and measure comfortably without sucking in." },
  { id: "hip", shortLabel: "Top hem", title: "Top hem / high-hip line", pieces: ["front", "back"], x: 82, y: 67, backX: 82, backY: 67, explanation: "Controls the width where the hip-length top finishes.", draftingUse: "Quarter high-hip or top-hem circumference plus ease sets the lower edge before the slight flare is trued.", measuringTip: "Choose the finished top position first, then measure level around the body at that exact height." },
  { id: "dress-length", shortLabel: "Top length", title: "Finished top length", pieces: ["front", "back"], x: 50, y: 91, backX: 50, backY: 91, explanation: "Places the hip-length hem from the shoulder neck point.", draftingUse: "Sets the finished top hemline; hem allowance is added outside this measurement.", measuringTip: "Measure from the shoulder neck point to the desired hem while standing naturally." },
];

const formatInches = (value: number | null, unitSystem: UnitSystem) => value === null ? "Add measurement" : formatLengthMm(value * 25.4, unitSystem).text;

export type PatternPlanRow = { label: string; value: string; canonicalMm: number | null; valueSuffix?: string; detail: string; sourceIds: string[] };

export function buildPatternPlan(measurements: Measurement[], unitSystem: UnitSystem = "imperial"): PatternPlanRow[] {
  const get = (id: string) => measurementInches(measurements.find((item) => item.id === id));
  const bust = get("full-bust");
  const waist = get("waist");
  const hip = get("hip");
  const span = get("bust-span");
  const length = get("dress-length");
  const frontWaist = get("front-waist");
  const backWaist = get("back-waist");
  const recordedEase = get("top-ease-total");
  const totalEase = recordedEase ?? 2;
  const easeDetail = `[length:${totalEase}:in:16] total ${recordedEase === null ? "project-default" : "recorded"} top ease`;
  const bustWidth = bust === null ? null : (bust + totalEase) / 4;
  const waistWidth = waist === null ? null : (waist + totalEase) / 4;
  const hipWidth = hip === null ? null : (hip + totalEase) / 4;
  const apexOffset = span === null ? null : span / 2;
  const balance = frontWaist === null || backWaist === null ? null : Math.abs(frontWaist - backWaist);

  return [
    { label: "Bust draft width", value: formatInches(bustWidth, unitSystem), canonicalMm: bustWidth === null ? null : bustWidth * 25.4, detail: `Quarter body plus ${easeDetail}`, sourceIds: ["full-bust", "top-ease-total"] },
    { label: "Waist draft width", value: formatInches(waistWidth, unitSystem), canonicalMm: waistWidth === null ? null : waistWidth * 25.4, detail: `Quarter body plus ${easeDetail} before dart shaping`, sourceIds: ["waist", "top-ease-total"] },
    { label: "Top hem draft width", value: formatInches(hipWidth, unitSystem), canonicalMm: hipWidth === null ? null : hipWidth * 25.4, detail: `Quarter high-hip plus ${easeDetail} before the slight flare`, sourceIds: ["hip", "top-ease-total"] },
    { label: "Apex from center front", value: formatInches(apexOffset, unitSystem), canonicalMm: apexOffset === null ? null : apexOffset * 25.4, detail: "Half bust span; verify on the muslin", sourceIds: ["bust-span"] },
    { label: "Front/back balance", value: balance === null ? "Add both lengths" : `${formatLengthMm(balance * 25.4, unitSystem).text} difference`, canonicalMm: balance === null ? null : balance * 25.4, valueSuffix: " difference", detail: "Preserve the measured difference before truing the waist", sourceIds: ["front-waist", "back-waist"] },
    { label: "Finished top length", value: formatInches(length, unitSystem), canonicalMm: length === null ? null : length * 25.4, detail: "Shoulder neck point to hip-length hem; add hem allowance beyond this line", sourceIds: ["dress-length"] },
  ];
}

export function missingCoreMeasurements(measurements: Measurement[]) {
  return patternMarks
    .map((mark) => mark.id)
    .filter((id, index, ids) => ids.indexOf(id) === index)
    .filter((id) => !measurements.find((item) => item.id === id)?.value.trim());
}
