import type { Measurement } from "./project";
import { canonicalMm, formatLengthMm, type UnitSystem } from "./units.ts";

export type SloperTutorialStep = {
  id: string;
  title: string;
  chapter: string;
  seconds: number;
  taskId: string;
  measurementIds: string[];
  purpose: string;
  actions: string[];
  checks: string[];
  formulaKeys?: string[];
};

export const sloperVideoUrl = "https://www.youtube.com/watch?v=FtM77bhD1uk";

export const sloperSteps: SloperTutorialStep[] = [
  {
    id: "measure",
    title: "Take the body measurements",
    chapter: "Taking measurements · 02:50",
    seconds: 170,
    taskId: "prep-measure",
    measurementIds: ["waist", "full-bust", "neck", "shoulder", "chest-width", "back-width", "bust-span", "waist-to-bust", "waist-to-armhole", "back-waist", "front-waist"],
    purpose: "Create one consistent set of body measurements before any drafting math begins.",
    actions: [
      "Wear the bra and light clothing you expect under the finished top; tie narrow elastic at the natural waist.",
      "Measure waist comfortably and full bust level around the fullest point. Measure the neck where the fitted sloper neckline should sit—not tight at the throat.",
      "Measure shoulder from side-neck point to shoulder tip. Measure across front and back between the arm creases, above the fullest bust.",
      "Record apex-to-apex span, waist-to-apex height and waist-to-underarm-line height.",
      "Measure side-neck point to waist at the back and at the front over the bust. Using the same neck point for both is critical to balance.",
    ],
    checks: ["Tape stays level on circumferences", "Waist elastic does not move", "Front and back lengths share the exact side-neck point"],
  },
  {
    id: "frame",
    title: "Draw the block frame",
    chapter: "Draft begins · 13:17",
    seconds: 797,
    taskId: "sloper-front-frame",
    measurementIds: ["full-bust", "back-waist", "front-waist", "waist-to-armhole"],
    purpose: "Establish center back, center front, waist and armhole levels before shaping either half.",
    actions: [
      "Draw a vertical center-back line and a square waistline at 90 degrees.",
      "From center back, mark half the bust plus [length:2.5:cm:8] total ease; draw center front parallel to center back.",
      "From the waist, mark back and front side-neck heights with [length:0.5:cm:8] vertical ease. Keep the front higher when its measured length is longer.",
      "From the waist, mark the underarm line using waist-to-armhole plus [length:0.25:cm:8]; square it across the complete frame.",
    ],
    checks: ["Center lines are parallel", "Waist and underarm lines are square", "Front/back length difference is visible rather than flattened"],
    formulaKeys: ["halfBlockWidth", "backVertical", "frontVertical", "underarmFromWaist"],
  },
  {
    id: "back-frame",
    title: "Draft the back width and neckline",
    chapter: "Back bodice · 17:30",
    seconds: 1050,
    taskId: "sloper-back-frame",
    measurementIds: ["back-width", "neck"],
    purpose: "Place the back armhole boundary and fitted sloper neck before the shoulder is added.",
    actions: [
      "At the upper back, mark half the back width after adding [length:1:cm:8] ease; square this guide down to the armhole line.",
      "Use a [length:1.5:cm:8] back-neck drop.",
      "Calculate neck width as neck circumference ÷ 5 − [length:0.5:cm:8], then draw a smooth shallow back-neck curve.",
    ],
    checks: ["Back-width guide is parallel to center back", "Neckline meets center back squarely", "Curve has no corner at the shoulder"],
    formulaKeys: ["halfBackWidth", "neckWidth"],
  },
  {
    id: "back-shape",
    title: "Add the back shoulder, dart and armhole",
    chapter: "Back shoulder · 20:20",
    seconds: 1220,
    taskId: "sloper-back-shape",
    measurementIds: ["shoulder", "back-waist", "waist-to-armhole"],
    purpose: "Build the back shoulder around its small contour dart and establish the upper armhole.",
    actions: [
      "Approximate shoulder drop from the upper-back depth: divide that depth by 5 and add [length:0.5:cm:8]; square a light shoulder guide.",
      "Draw shoulder length plus [length:1:cm:8]. The added [length:1:cm:8] becomes the back shoulder-dart intake.",
      "At shoulder midpoint, draw a [length:5.5:cm:8] dart line with [length:0.5:cm:8] on each side; join both legs to the dart point.",
      "Find the midpoint between the shoulder/back-width guide and underarm line; use it to shape a smooth back armhole toward the side-seam area.",
    ],
    checks: ["Closed shoulder measures the body shoulder", "Dart is perpendicular to the shoulder", "Armhole flows smoothly into underarm"],
    formulaKeys: ["backShoulderDrop", "backShoulderWithDart"],
  },
  {
    id: "front-frame",
    title: "Draft the front neck and chest guide",
    chapter: "Front bodice · 23:20",
    seconds: 1400,
    taskId: "sloper-front-neck",
    measurementIds: ["neck", "chest-width", "full-bust"],
    purpose: "Place the front neck and the guide that controls the upper armhole and shoulder-dart width.",
    actions: [
      "Reuse the back neck width. Following Creative Bobbin’s written guide, calculate front-neck drop as neck circumference ÷ 5 + [length:0.5:cm:8]; draw the curve into center front.",
      "Measure the front neck-to-underarm depth, divide it by 3, and mark that amount upward from the underarm line as the chest guide.",
      "On that guide, mark half of across-front measurement plus the bust-based shoulder-dart width.",
    ],
    checks: ["Front neck meets center front squarely", "Chest guide is level", "Dart allowance is included before the armhole boundary is fixed"],
    formulaKeys: ["frontNeckDrop", "frontThirdGuide", "frontWidthWithDart", "dartWidth"],
  },
  {
    id: "front-dart",
    title: "Locate the bust point and shoulder dart",
    chapter: "Bust point & dart · 28:35",
    seconds: 1715,
    taskId: "sloper-front-darts",
    measurementIds: ["waist-to-bust", "bust-span", "shoulder", "full-bust"],
    purpose: "Anchor every front dart to the measured apex and preserve equal shoulder-dart legs.",
    actions: [
      "From waist, mark apex height as waist-to-bust plus [length:0.25:cm:8]. From center front, mark half of bust span plus [length:0.5:cm:8] total ease.",
      "Join side-neck point to the apex for the first shoulder-dart leg.",
      "Mark the standard bust-based dart width across the upper guide. Measure the first leg on the diagonal and make the second leg exactly the same length.",
      "Draw a front shoulder guide [length:1.5:cm:8] below the back guide, then measure the exact shoulder length from the second dart leg to that guide.",
      "Temporarily fold or pivot the dart closed to confirm the dramatic open angle resolves into a normal shoulder slope.",
    ],
    checks: ["Both dart legs are equal", "Apex uses measured height and span", "Closed dart produces the measured shoulder length"],
    formulaKeys: ["apexFromWaist", "apexFromCenter", "dartWidth"],
  },
  {
    id: "armhole-side",
    title: "Complete the armholes and side seam",
    chapter: "Armhole & side seam · 34:55",
    seconds: 2095,
    taskId: "sloper-front-arm",
    measurementIds: ["chest-width", "back-width", "waist-to-armhole"],
    purpose: "Join the front and back shapes at a balanced side seam while preserving movement.",
    actions: [
      "Draw the front armhole more scooped than the back because the arm travels farther forward.",
      "At the underarm line, divide the remaining space between front and back armhole boundaries; place the side seam at its midpoint.",
      "Walk the front and back armhole curves visually. The front may begin lower but should not become shorter merely because it is more scooped.",
    ],
    checks: ["Side seam is centered in the remaining underarm space", "Both curves are tangent at shoulder and underarm", "Front curve allows forward reach"],
  },
  {
    id: "waist-shape",
    title: "Distribute the waist suppression",
    chapter: "Waist shaping · 37:20",
    seconds: 2240,
    taskId: "sloper-back-dart",
    measurementIds: ["full-bust", "waist"],
    purpose: "Convert the bust-to-waist difference into front dart, back dart and side-seam shaping.",
    actions: [
      "Calculate half of the difference between full bust and waist; this is the total amount removed across the half-block.",
      "Share the intake among the back waist dart, both halves of the side-seam shaping, and the front waist dart. More shaping commonly belongs at the front, but distribution must follow your body.",
      "Aim the front waist dart at the bust apex, the side shaping at the underarm side point, and the back dart toward its upper guide.",
      "Keep the waist measurement comfortable; a sloper should fit closely but still allow breathing.",
    ],
    checks: ["All dart and side intakes add up to the calculated suppression", "Curves are smooth", "No dart is so wide that it will sew into a point"],
    formulaKeys: ["halfWaistSuppression"],
  },
  {
    id: "true-block",
    title: "True, walk and label the draft",
    chapter: "Finish the draft · 39:45",
    seconds: 2385,
    taskId: "sloper-true",
    measurementIds: [],
    purpose: "Turn the construction drawing into front and back pieces that can be cut and sewn accurately.",
    actions: [
      "Fold or pivot each dart closed and true the edge it crosses so the sewn dart creates a smooth continuous edge.",
      "Walk front and back shoulder seams and side seams at the stitch line; correct only genuine length mismatches.",
      "Redraw neckline and armhole curves cleanly, then add center lines, waist/bust guides, grainlines, dart points, notches, piece names and cut instructions.",
      "Keep the master sloper itself free of design ease and seam allowances. Add fitting allowances to the muslin copy instead.",
    ],
    checks: ["Joining seams walk together", "Dart-folded edges are smooth", "Every piece is named, grained and notched"],
  },
  {
    id: "sample-cut",
    title: "Cut and mark the muslin sample",
    chapter: "Make the sample · 40:49",
    seconds: 2449,
    taskId: "fit-sloper-cut",
    measurementIds: [],
    purpose: "Create an accurate fitting shell while leaving enough allowance to adjust the shoulders.",
    actions: [
      "Cut the block perimeter but do not cut away the darts. The tutorial cuts the back on fold and adds a center-front fitting opening.",
      "Add [length:1.5:cm:8] at side seams and center-front opening; add [length:2.5:cm:8] at shoulders and across the top of the shoulder dart for fitting room.",
      "Cut neckline and armholes on the actual draft line so their position can be judged directly.",
      "Transfer dart legs, points, bust point, waist, center line and the exact fitting-opening seam line to both sides.",
    ],
    checks: ["Every dart point is visible", "Shoulder has extra fitting allowance", "No seam allowance obscures neckline or armhole fit"],
  },
  {
    id: "sample-darts",
    title: "Sew and press the muslin darts",
    chapter: "Sample assembly · 44:50",
    seconds: 2690,
    taskId: "fit-sloper-darts",
    measurementIds: [],
    purpose: "Make each dart match the draft closely enough that the later fitting evidence is trustworthy.",
    actions: [
      "Pin through the drawn dart legs and verify the pin exits on the matching line. Sew each dart exactly to its marked point.",
      "On the back shoulder dart, stop at the intended shoulder fitting seam rather than stitching into the extra fitting allowance.",
      "Press the darts flat over a curved surface, following the direction marked on the draft.",
      "Draw the bust-level line through one apex so its vertical position is easy to assess on the body.",
    ],
    checks: ["Dart tips finish on their marks", "Paired darts are symmetrical", "Bust-level fitting line is visible"],
  },
  {
    id: "sample-sew",
    title: "Assemble the fitting shell",
    chapter: "Sample assembly · 46:05",
    seconds: 2765,
    taskId: "fit-sloper-shell",
    measurementIds: [],
    purpose: "Assemble the toile while keeping the shoulder and opening easy to alter on your own body.",
    actions: [
      "Sew side seams at [length:1.5:cm:8] and press them flat.",
      "Pin shoulders on the outside along the [length:2.5:cm:8] fitting line rather than sewing them permanently.",
      "Pin the center-front fitting opening exactly on its drawn seam line without overlap or a gap.",
      "Leave neckline, armholes and waist raw; those edges were cut on the draft line so you can judge them directly.",
    ],
    checks: ["Opening follows the marked line", "Shoulders remain adjustable from the outside", "Raw fitting edges are not stretched"],
  },
  {
    id: "sample-fit",
    title: "Run the first full fitting",
    chapter: "Fit the sample · 48:11",
    seconds: 2891,
    taskId: "fit-sloper-first",
    measurementIds: [],
    purpose: "Read the muslin in a fixed order so one adjustment does not hide or create another.",
    actions: [
      "Check bust and waist circumference first, then confirm the waistline sits on the original waist elastic.",
      "Test arm movement and mark whether either armhole must be scooped or filled. Compare the drawn bust line with the true apex and move the apex if needed.",
      "Inspect front and back necklines, shoulder slope and gaping. Repin one shoulder at a time without disturbing an area that already fits.",
      "Photograph front, side and back with the waist and bust guide lines visible; write the amount and direction of each proposed change on the muslin.",
    ],
    checks: ["Waist is level", "Bust line crosses the true apex", "Neck and armholes lie flat", "Shoulder/side seams hang in the intended position"],
  },
  {
    id: "correct-darts",
    title: "Correct the bust point and darts",
    chapter: "Fit the sample · 49:20",
    seconds: 2960,
    taskId: "fit-sloper-dart-fix",
    measurementIds: [],
    purpose: "Make the dart system point to your actual apex without creating a cone or hollow.",
    actions: [
      "Move the apex mark to the true bust point shown by the fitting line.",
      "Redirect every front dart leg to the corrected apex on the sloper. The master block darts reach the apex; later garment darts will be shortened away from it.",
      "If the shoulder area gapes, adjust dart intake only after confirming the neck and shoulder positions.",
      "Baste the revised darts and check both sides before changing the paper master.",
    ],
    checks: ["Darts aim at the true apex", "Both sides agree", "No point, hollow or diagonal bust drag line remains"],
  },
  {
    id: "correct-balance",
    title: "Correct neck, shoulders and armholes",
    chapter: "Adjustments · 53:59",
    seconds: 3239,
    taskId: "fit-sloper-balance",
    measurementIds: [],
    purpose: "Resolve neckline gape and armhole restriction without changing portions of the draft that already fit.",
    actions: [
      "Mark the exact armhole area to scoop or fill and blend the change to zero above and below it.",
      "Repin the shoulder to settle the neckline. Preserve the shoulder tip and armhole if they already fit.",
      "When adding or removing at the neck edge changes shoulder length, put the same amount into or out of the back shoulder dart and lengthen the dart if necessary.",
      "Confirm side seams remain vertical and the shoulder slope is not being used to disguise an incorrect neck width.",
    ],
    checks: ["Neckline sits against the body", "Armhole allows movement", "Shoulder tip stays in place", "Side seams remain vertical"],
  },
  {
    id: "transfer",
    title: "Transfer corrections to the master sloper",
    chapter: "Transfer & re-test · 55:00",
    seconds: 3300,
    taskId: "fit-sloper-transfer",
    measurementIds: [],
    purpose: "Finish a clean, reusable fitted foundation before any boat-neck or top styling is added.",
    actions: [
      "Measure each pinned change from the original stitch line and reproduce it on paper; do not trace wrinkled muslin by eye.",
      "Move the apex, redraw dart legs, and rebalance any altered shoulder dart.",
      "Blend neckline and armhole changes smoothly, then walk and true every affected seam again.",
      "Make another muslin if changes were more than minor. Label the accepted paper BODICE SLOPER V1 and store it without seam allowance.",
      "Trace—not cut—the master when you begin the separate boat-neck top pattern.",
    ],
    checks: ["Paper reflects every accepted fitting mark", "Seams still walk", "Master remains style-neutral", "A re-test confirms substantial changes"],
  },
];

export const bustDartTable = [
  [80, 5.8], [84, 6.4], [88, 7], [92, 7.6], [96, 8.2], [100, 8.8], [104, 9.4], [110, 10],
  [116, 10.6], [122, 11.2], [128, 11.8], [134, 12.4], [140, 13], [146, 13.6], [152, 14.2],
] as const;

export const standardProportionExamples = [
  { bustCm: 96, shoulderCm: 12.75, dartCm: 8.2, balanceCm: 0.5 },
  { bustCm: 110, shoulderCm: 13.5, dartCm: 10, balanceCm: 2 },
  { bustCm: 122, shoulderCm: 14.25, dartCm: 11.2, balanceCm: 3 },
] as const;

const cm = (measurements: Measurement[], id: string) => {
  const millimeters = canonicalMm(measurements.find((item) => item.id === id));
  return millimeters === null ? null : millimeters / 10;
};

const sum = (...values: Array<number | null>) => values.some((value) => value === null) ? null : values.reduce<number>((total, value) => total + (value ?? 0), 0);
const difference = (a: number | null, b: number | null) => a === null || b === null ? null : a - b;

export function suggestedDartWidthCm(bustCm: number | null) {
  if (bustCm === null) return null;
  if (bustCm <= bustDartTable[0][0]) return bustDartTable[0][1];
  if (bustCm >= bustDartTable[bustDartTable.length - 1][0]) return bustDartTable[bustDartTable.length - 1][1];
  const upperIndex = bustDartTable.findIndex(([bust]) => bust >= bustCm);
  const [lowerBust, lowerDart] = bustDartTable[upperIndex - 1];
  const [upperBust, upperDart] = bustDartTable[upperIndex];
  const ratio = (bustCm - lowerBust) / (upperBust - lowerBust);
  return lowerDart + ratio * (upperDart - lowerDart);
}

export type SloperCalculation = { key: string; label: string; value: number | null; note: string };

export function buildSloperCalculations(measurements: Measurement[]): SloperCalculation[] {
  const bust = cm(measurements, "full-bust");
  const waist = cm(measurements, "waist");
  const neck = cm(measurements, "neck");
  const backWidth = cm(measurements, "back-width");
  const chest = cm(measurements, "chest-width");
  const shoulder = cm(measurements, "shoulder");
  const backVertical = sum(cm(measurements, "back-waist"), 0.5);
  const frontVertical = sum(cm(measurements, "front-waist"), 0.5);
  const underarmFromWaist = sum(cm(measurements, "waist-to-armhole"), 0.25);
  const backUpperDepth = difference(backVertical, underarmFromWaist);
  const frontUpperDepth = difference(frontVertical, underarmFromWaist);
  const dartWidth = suggestedDartWidthCm(bust);
  return [
    { key: "halfBlockWidth", label: "CB → CF block width", value: bust === null ? null : (bust + 2.5) / 2, note: "(full bust + [length:2.5:cm:8] ease) ÷ 2" },
    { key: "backVertical", label: "Back vertical draft", value: backVertical, note: "back side-neck-to-waist + [length:0.5:cm:8]" },
    { key: "frontVertical", label: "Front vertical draft", value: frontVertical, note: "front side-neck-to-waist + [length:0.5:cm:8]" },
    { key: "underarmFromWaist", label: "Underarm line from waist", value: underarmFromWaist, note: "waist-to-armhole + [length:0.25:cm:8]" },
    { key: "halfBackWidth", label: "Half back-width guide", value: backWidth === null ? null : (backWidth + 1) / 2, note: "(back width + [length:1:cm:8] ease) ÷ 2" },
    { key: "neckWidth", label: "Sloper neck width", value: neck === null ? null : neck / 5 - 0.5, note: "neck circumference ÷ 5 − [length:0.5:cm:8]" },
    { key: "backShoulderDrop", label: "Back shoulder-drop guide", value: backUpperDepth === null ? null : backUpperDepth / 5 + 0.5, note: "upper-back depth ÷ 5 + [length:0.5:cm:8]" },
    { key: "backShoulderWithDart", label: "Back shoulder before dart closes", value: shoulder === null ? null : shoulder + 1, note: "shoulder length + [length:1:cm:8] dart intake" },
    { key: "frontNeckDrop", label: "Front neck drop", value: neck === null ? null : neck / 5 + 0.5, note: "neck circumference ÷ 5 + [length:0.5:cm:8] (written-guide value)" },
    { key: "frontThirdGuide", label: "Front chest-guide rise", value: frontUpperDepth === null ? null : frontUpperDepth / 3, note: "front neck-to-underarm depth ÷ 3" },
    { key: "dartWidth", label: "Suggested shoulder-dart width", value: dartWidth, note: "interpolated from Creative Bobbin's bust table; confirm in muslin" },
    { key: "frontWidthWithDart", label: "Front width at chest guide", value: chest === null || dartWidth === null ? null : (chest + dartWidth) / 2, note: "(across front + dart width) ÷ 2" },
    { key: "apexFromWaist", label: "Apex above waist", value: sum(cm(measurements, "waist-to-bust"), 0.25), note: "waist-to-bust + [length:0.25:cm:8]" },
    { key: "apexFromCenter", label: "Apex from center front", value: sum(cm(measurements, "bust-span"), 0.5) === null ? null : (sum(cm(measurements, "bust-span"), 0.5) as number) / 2, note: "(bust span + [length:0.5:cm:8]) ÷ 2" },
    { key: "halfWaistSuppression", label: "Total half-block waist suppression", value: bust === null || waist === null ? null : Math.max(0, (bust - waist) / 2), note: "(full bust − waist) ÷ 2; distribute across darts and side" },
  ];
}

export function formatTutorialValue(value: number | null, unitSystem: UnitSystem) {
  if (value === null || !Number.isFinite(value)) return "Add measurements";
  return formatLengthMm(value * 10, unitSystem).text;
}
