import type { Measurement, ProjectState } from "./project";
import type { PatternPiece } from "./pattern";
import { canonicalMm, formatLengthMm, type UnitSystem } from "./units.ts";

export { parseSewingNumber } from "./units.ts";

export type Point = { x: number; y: number };
export type PathCommand =
  | { kind: "move" | "line"; point: Point }
  | { kind: "bezier"; cp1: Point; cp2: Point; point: Point };

export type GeometryLine = {
  id: string;
  label: string;
  from: Point;
  to: Point;
  value?: string;
  kind: "guide" | "dimension" | "fold";
};

export type GeometryDart = {
  id: "bust-dart" | "front-waist-dart" | "back-waist-dart";
  label: string;
  legs: [Point, Point, Point] | [Point, Point, Point, Point];
  intake: number;
  value: string;
};

export type GeometryInvariant = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type PatternNotch = {
  id: string;
  point: Point;
  count: 1 | 2;
  direction: "side" | "armhole";
};

export type PatternTechnicalMarks = {
  grainline: { from: Point; to: Point };
  lengthenShorten: { from: Point; to: Point };
  facingLine: { from: Point; cp1: Point; cp2: Point; to: Point };
  zipperStop?: Point;
  pieceName: string;
  cutInstruction: string;
  seamAllowance: string;
  labelPoint: Point;
};

export type PatternGeometry = {
  piece: PatternPiece;
  neckline: ProjectState["neckline"];
  bounds: { width: number; height: number };
  outline: PathCommand[];
  marks: Record<string, Point>;
  lines: GeometryLine[];
  darts: GeometryDart[];
  notches: PatternNotch[];
  technical: PatternTechnicalMarks;
  apex?: Point;
  fallbackIds: string[];
  warnings: string[];
  invariants: GeometryInvariant[];
  measuredCount: number;
  totalCoreCount: number;
  unitSystem: UnitSystem;
};

const defaults: Record<string, number> = {
  "full-bust": 38,
  "high-bust": 35,
  waist: 30,
  hip: 38,
  "back-width": 15,
  shoulder: 4.75,
  "back-waist": 16,
  "front-waist": 17,
  "bust-depth": 10,
  "bust-span": 8,
  "armhole-depth": 8.5,
  "dress-length": 24,
};

export function measurementInches(measurement?: Measurement) {
  const mm = canonicalMm(measurement);
  return mm === null ? null : mm / 25.4;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const displayLength = (inches: number, unitSystem: UnitSystem) => formatLengthMm(inches * 25.4, unitSystem).text;
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const cubicPoint = (start: Point, cp1: Point, cp2: Point, end: Point, t: number): Point => {
  const u = 1 - t;
  return {
    x: u ** 3 * start.x + 3 * u ** 2 * t * cp1.x + 3 * u * t ** 2 * cp2.x + t ** 3 * end.x,
    y: u ** 3 * start.y + 3 * u ** 2 * t * cp1.y + 3 * u * t ** 2 * cp2.y + t ** 3 * end.y,
  };
};

type NeckShape = { width: number; depth: number; cp1: Point; cp2: Point };

function neckShape(piece: PatternPiece, neckline: ProjectState["neckline"], frameWidth: number): NeckShape {
  const maxWidth = Math.max(2.6, frameWidth * 0.46);
  const specs = neckline === "soft-boat"
    ? { width: 3.75, frontDepth: 1.2, backDepth: 0.65 }
    : neckline === "soft-square"
      ? { width: 3.3, frontDepth: 2.5, backDepth: 1.1 }
      : { width: 2.85, frontDepth: 3.05, backDepth: 0.8 };
  const width = Math.min(specs.width, maxWidth);
  const depth = piece === "front" ? specs.frontDepth : specs.backDepth;
  if (neckline === "soft-square") {
    return { width, depth, cp1: { x: width * 0.78, y: depth }, cp2: { x: width, y: depth * 0.72 } };
  }
  if (neckline === "soft-boat") {
    return { width, depth, cp1: { x: width * 0.56, y: depth }, cp2: { x: width * 0.92, y: depth * 0.18 } };
  }
  return { width, depth, cp1: { x: width * 0.56, y: depth }, cp2: { x: width, y: depth * 0.46 } };
}

export function buildPatternGeometry(
  measurements: Measurement[],
  piece: PatternPiece,
  neckline: ProjectState["neckline"],
  unitSystem: UnitSystem = "imperial",
): PatternGeometry {
  const fallbackIds: string[] = [];
  const input = (id: string) => {
    const measurement = measurements.find((item) => item.id === id);
    const value = measurementInches(measurement);
    if (value === null) fallbackIds.push(id);
    return value ?? defaults[id];
  };

  const fullBust = input("full-bust");
  const highBust = input("high-bust");
  const waist = input("waist");
  const hip = input("hip");
  const backWidth = input("back-width");
  const shoulder = input("shoulder");
  const backWaist = input("back-waist");
  const frontWaist = input("front-waist");
  const bustDepth = input("bust-depth");
  const bustSpan = input("bust-span");
  // Garment adaptations are optional project records. They never alter the
  // underlying body profile or sloper measurement, and removing them returns
  // the geometry to its established two-inch-ease preview.
  const optional = (id: string) => measurementInches(measurements.find((item) => item.id === id));
  const totalEase = optional("top-ease-total") ?? 2;
  const armholeLowering = optional("armhole-lowering") ?? 0;
  const armholeDepth = input("armhole-depth") + armholeLowering;
  const topLength = input("dress-length");

  const warnings: string[] = [];
  const totalBustHalf = (fullBust + totalEase) / 2;
  const bustDistribution = clamp((fullBust - highBust) / 10, 0, 0.55);
  const bustWidth = piece === "front" ? totalBustHalf / 2 + bustDistribution : totalBustHalf / 2 - bustDistribution;
  const totalWaistHalf = (waist + totalEase) / 2;
  const waistDifference = Math.max(0, totalBustHalf - totalWaistHalf);
  const frontWaistDart = clamp(waistDifference * 0.35, 0, 1.5);
  const backWaistDart = clamp(waistDifference * 0.25, 0, 1.25);
  const waistDart = piece === "front" ? frontWaistDart : backWaistDart;
  const effectiveWaist = totalWaistHalf / 2 + (piece === "front" ? 0.12 : -0.12);
  const waistWidth = effectiveWaist + waistDart;
  const totalHipHalf = (hip + totalEase) / 2;
  const hipWidth = totalHipHalf / 2 + (piece === "front" ? 0.1 : -0.1);
  const hemWidth = Math.max(hipWidth + 0.25, waistWidth + 0.6);

  const waistY = piece === "front" ? frontWaist : backWaist;
  const bustY = piece === "front" ? bustDepth : Math.min(waistY - 4.5, armholeDepth + 1.25);
  const hemY = Math.max(topLength, waistY + 4.5);
  const hipY = Math.min(waistY + 6, hemY - 0.8);
  if (topLength < waistY + 4.5) warnings.push("Top length ends too close to the waist; the preview extends it provisionally to preserve the hem flare.");

  const neck = neckShape(piece, neckline, bustWidth);
  const centerNeck: Point = { x: 0, y: neck.depth };
  const neckPoint: Point = { x: neck.width, y: 0 };
  const shoulderDrop = clamp(shoulder * 0.16, 0.55, 0.9);
  const shoulderRun = Math.sqrt(Math.max(0.25, shoulder ** 2 - shoulderDrop ** 2));
  const rawShoulderEnd: Point = { x: neckPoint.x + shoulderRun, y: shoulderDrop };
  const maxShoulderX = bustWidth - 0.65;
  const shoulderEnd: Point = { x: Math.min(rawShoulderEnd.x, maxShoulderX), y: rawShoulderEnd.y };
  if (rawShoulderEnd.x > maxShoulderX) warnings.push("Shoulder length exceeds the current bust frame; the armhole needs a muslin check.");

  const underarm: Point = { x: bustWidth, y: armholeDepth };
  const waistSide: Point = { x: waistWidth, y: waistY };
  const hipSide: Point = { x: hipWidth, y: hipY };
  const hemSide: Point = { x: hemWidth, y: hemY };
  const centerHem: Point = { x: 0, y: hemY };
  const apex: Point | undefined = piece === "front" ? { x: clamp(bustSpan / 2, 2.5, bustWidth - 1.8), y: bustDepth } : undefined;

  const bustDartIntake = piece === "front" ? clamp((fullBust - highBust) / 8, 0.25, 1.5) : 0;
  const bustDartCenterY = apex ? clamp(apex.y + 0.65, armholeDepth + 0.8, waistY - 2) : 0;
  const bustDartTop: Point = { x: bustWidth - 0.02, y: bustDartCenterY - bustDartIntake / 2 };
  const bustDartBottom: Point = { x: bustWidth - 0.02, y: bustDartCenterY + bustDartIntake / 2 };
  const dartDirection = apex ? { x: bustDartTop.x - apex.x, y: bustDartCenterY - apex.y } : { x: 1, y: 0 };
  const dartDirectionLength = Math.hypot(dartDirection.x, dartDirection.y) || 1;
  const bustDartTip: Point = apex ? {
    x: apex.x + dartDirection.x / dartDirectionLength * 1.25,
    y: apex.y + dartDirection.y / dartDirectionLength * 1.25,
  } : { x: 0, y: 0 };

  const armholeCp1 = piece === "front" ? { x: shoulderEnd.x + 0.35, y: shoulderEnd.y + 1.45 } : { x: shoulderEnd.x + 0.5, y: shoulderEnd.y + 1.05 };
  const armholeCp2 = piece === "front" ? { x: underarm.x - 1.5, y: underarm.y - 0.2 } : { x: underarm.x - 1.25, y: underarm.y - 0.45 };
  const outline: PathCommand[] = [
    { kind: "move", point: centerNeck },
    { kind: "bezier", cp1: neck.cp1, cp2: neck.cp2, point: neckPoint },
    { kind: "line", point: shoulderEnd },
    {
      kind: "bezier",
      cp1: armholeCp1,
      cp2: armholeCp2,
      point: underarm,
    },
  ];

  if (piece === "front" && apex) {
    outline.push(
      { kind: "line", point: bustDartTop },
      { kind: "line", point: bustDartTip },
      { kind: "line", point: bustDartBottom },
    );
  }
  outline.push(
    { kind: "bezier", cp1: { x: bustWidth, y: waistY - 2.4 }, cp2: { x: waistWidth, y: waistY - 1.1 }, point: waistSide },
    { kind: "bezier", cp1: { x: waistWidth, y: waistY + 2.2 }, cp2: { x: hipWidth, y: hipY - 2.2 }, point: hipSide },
    { kind: "bezier", cp1: { x: hipWidth, y: hipY + 2 }, cp2: { x: hemWidth, y: hemY - 3 }, point: hemSide },
    { kind: "line", point: centerHem },
    { kind: "line", point: centerNeck },
  );

  const waistDartCenter = piece === "front"
    ? clamp(apex?.x ?? bustSpan / 2, 2.5, waistWidth - 1.3)
    : clamp(backWidth / 4, 2.4, waistWidth - 1.3);
  const waistDartTop: Point = { x: waistDartCenter, y: piece === "front" && apex ? apex.y + 1.35 : waistY - 5.5 };
  const waistDartLeft: Point = { x: waistDartCenter - waistDart / 2, y: waistY };
  const waistDartRight: Point = { x: waistDartCenter + waistDart / 2, y: waistY };
  const waistDartBottom: Point = { x: waistDartCenter, y: waistY + 4.5 };

  const darts: GeometryDart[] = [];
  if (piece === "front" && apex) darts.push({ id: "bust-dart", label: "SIDE BUST DART", legs: [bustDartTop, bustDartTip, bustDartBottom], intake: bustDartIntake, value: displayLength(bustDartIntake, unitSystem) });
  if (waistDart > 0.05) darts.push({ id: piece === "front" ? "front-waist-dart" : "back-waist-dart", label: "WAIST DART", legs: [waistDartTop, waistDartLeft, waistDartBottom, waistDartRight], intake: waistDart, value: displayLength(waistDart, unitSystem) });

  const centerLineTop: Point = { x: 0, y: centerNeck.y };
  const lines: GeometryLine[] = [
    { id: "center", label: piece === "front" ? "CENTER FRONT · CUT ON FOLD" : "CENTER BACK · ZIPPER SEAM", from: centerLineTop, to: centerHem, kind: "fold" },
    { id: "armhole-depth", label: "ARMHOLE DEPTH", from: { x: 0, y: armholeDepth }, to: underarm, value: displayLength(armholeDepth, unitSystem), kind: "guide" },
    { id: "full-bust", label: "BUST", from: { x: 0, y: bustY }, to: { x: bustWidth, y: bustY }, value: displayLength(bustWidth, unitSystem), kind: "dimension" },
    { id: "waist", label: "WAIST", from: { x: 0, y: waistY }, to: waistSide, value: displayLength(waistWidth, unitSystem), kind: "dimension" },
    { id: "hip", label: "HIP", from: { x: 0, y: hipY }, to: hipSide, value: displayLength(hipWidth, unitSystem), kind: "dimension" },
    { id: "dress-length", label: "TOP LENGTH", from: { x: 0, y: 0 }, to: centerHem, value: displayLength(topLength, unitSystem), kind: "dimension" },
  ];

  const marks: Record<string, Point> = {
    shoulder: midpoint(neckPoint, shoulderEnd),
    "armhole-depth": underarm,
    waist: waistSide,
    hip: hipSide,
    "dress-length": { x: hemWidth * 0.52, y: hemY },
  };
  if (piece === "front" && apex) {
    marks["high-bust"] = { x: bustWidth * 0.52, y: Math.max(armholeDepth - 0.7, shoulderEnd.y + 2.2) };
    marks["full-bust"] = { x: bustWidth, y: bustY };
    marks["bust-depth"] = apex;
    marks["bust-span"] = { x: apex.x, y: bustY + 0.45 };
    marks["front-waist"] = { x: 0.5, y: waistY };
  } else {
    marks["back-width"] = { x: clamp(backWidth / 2, 2.5, bustWidth - 1), y: Math.max(armholeDepth - 1, shoulderEnd.y + 2) };
    marks["back-waist"] = { x: 0.5, y: waistY };
  }

  const armholeSpan = distance(shoulderEnd, underarm);
  const armholeNotch = cubicPoint(shoulderEnd, armholeCp1, armholeCp2, underarm, piece === "front" ? 0.68 : 0.58);
  const notches: PatternNotch[] = [
    { id: "armhole-notch", point: armholeNotch, count: piece === "front" ? 1 : 2, direction: "armhole" },
    { id: "waist-notch", point: waistSide, count: 1, direction: "side" },
    { id: "hip-notch", point: hipSide, count: 1, direction: "side" },
  ];
  const grainX = clamp(Math.min(2.25, waistWidth * 0.28), 1.2, waistWidth - 1.4);
  const lengthenY = waistY + (hemY - waistY) * 0.58;
  const technical: PatternTechnicalMarks = {
    grainline: { from: { x: grainX, y: waistY + 1.4 }, to: { x: grainX, y: Math.max(waistY + 3.2, hemY - 1.1) } },
    lengthenShorten: { from: { x: 0.65, y: lengthenY }, to: { x: Math.max(1.2, hemWidth - 0.65), y: lengthenY } },
    facingLine: {
      from: { x: 0, y: neck.depth + 2.25 },
      cp1: { x: neck.width * 0.5, y: neck.depth + 2.35 },
      cp2: { x: neck.width + 0.35, y: shoulderDrop + 2.05 },
      to: { x: Math.min(shoulderEnd.x - 0.25, neck.width + 1.15), y: shoulderDrop + 2.1 },
    },
    zipperStop: piece === "back" ? { x: 0, y: Math.min(hemY - 1.1, waistY + 6.5) } : undefined,
    pieceName: `BOAT NECK TOP ${piece.toUpperCase()}`,
    cutInstruction: piece === "front" ? "CUT 1 ON FOLD" : "CUT 2 MIRRORED",
    seamAllowance: "SEAM LINE · NO SEAM ALLOWANCE",
    // Keep the identification block in the lower-right negative space. The
    // central lower bodice is reserved for grainline and waist-dart marks.
    labelPoint: {
      x: clamp(hemWidth * 0.7, 4.8, Math.max(4.8, hemWidth - 2)),
      y: waistY + Math.min(1.5, Math.max(1.1, (hemY - waistY) * 0.24)),
    },
  };
  const invariants: GeometryInvariant[] = [
    { id: "center", label: "Center line", ok: centerLineTop.x === centerHem.x, detail: piece === "front" ? "Straight fold line preserved" : "Straight zipper seam preserved" },
    { id: "neckline", label: "Neckline", ok: neck.width < shoulderEnd.x && neck.depth > 0, detail: `${neckline.replace("-", " ")} curve meets center and shoulder cleanly` },
    { id: "armhole", label: "Armhole", ok: armholeSpan > 3 && armholeDepth > shoulderEnd.y + 3, detail: `${piece} curve has shoulder and underarm tangency` },
    { id: "dart", label: "Darts", ok: piece === "back" ? waistDart <= 1.25 : Boolean(apex && apex.x < bustWidth - 1 && bustDartIntake <= 1.5), detail: piece === "front" ? "Apex offset and intake limits preserved" : "Back waist intake remains balanced" },
    { id: "balance", label: "Balance", ok: waistY > bustY + 3 && hemY > hipY, detail: "Bust, waist, high hip, and top hem remain in sewing order" },
  ];
  if (!invariants.find((item) => item.id === "armhole")?.ok) warnings.push("Armhole depth and shoulder width conflict; recheck those measurements.");
  if (!invariants.find((item) => item.id === "balance")?.ok) warnings.push("Vertical measurements conflict; recheck bust depth and waist length.");

  return {
    piece,
    neckline,
    bounds: { width: Math.max(hemWidth, bustWidth) + 0.8, height: hemY + 0.8 },
    outline,
    marks,
    lines,
    darts,
    notches,
    technical,
    apex,
    fallbackIds: [...new Set(fallbackIds)],
    warnings,
    invariants,
    measuredCount: Object.keys(defaults).length - new Set(fallbackIds).size,
    totalCoreCount: Object.keys(defaults).length,
    unitSystem,
  };
}
