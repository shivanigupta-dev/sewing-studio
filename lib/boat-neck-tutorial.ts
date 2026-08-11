/**
 * Project-specific drafting guidance derived from the linked Creative Bobbin
 * video. The source makes a princess-seamed dress; this model records which
 * operations transfer to the darted, hip-length shell and which must not.
 * Keeping the adaptation in data makes the guide testable and keeps the UI
 * component focused on navigation and persistent project state.
 */
export type BoatNeckDraftingPreset = {
  id: "top-ease-total" | "armhole-lowering";
  label: string;
  hint: string;
  canonicalMm: number;
  sourceLabel: string;
};

export type BoatNeckTutorialStep = {
  id: string;
  taskId: string;
  title: string;
  chapter: string;
  seconds: number;
  purpose: string;
  sourceLesson: string;
  topAdaptation: string;
  measurementIds: string[];
  presets?: BoatNeckDraftingPreset[];
  actions: string[];
  checks: string[];
};

export const boatNeckDressVideoUrl = "https://www.youtube.com/watch?v=c7RhIVNXd-E";

export const boatNeckPresetDefinitions: Record<BoatNeckDraftingPreset["id"], BoatNeckDraftingPreset> = {
  "top-ease-total": {
    id: "top-ease-total",
    label: "Total top wearing ease",
    hint: "Added around the full bust, waist and top-hem circumference before dividing across the pattern pieces",
    canonicalMm: 30,
    sourceLabel: "Video value · 3 cm total",
  },
  "armhole-lowering": {
    id: "armhole-lowering",
    label: "Armhole lowering from sloper",
    hint: "Project adjustment measured straight down from the fitted sloper underarm before redrawing the armhole",
    canonicalMm: 7.5,
    sourceLabel: "Video value · 7.5 mm",
  },
};

const easePreset = boatNeckPresetDefinitions["top-ease-total"];
const armholePreset = boatNeckPresetDefinitions["armhole-lowering"];

export const boatNeckTutorialSteps: BoatNeckTutorialStep[] = [
  {
    id: "protect-foundation",
    taskId: "dress-trace",
    title: "Trace the fitted sloper",
    chapter: "02:42",
    seconds: 162,
    purpose: "Start a dated working copy without changing the reusable bodice foundation.",
    sourceLesson: "The creator traces the fitted bodice and skirt blocks before making any style changes, then transfers the original dart positions.",
    topAdaptation: "Trace only the fitted front and back bodice sloper. Extend those copies later; the skirt block is not needed for this hip-length top.",
    measurementIds: [],
    actions: [
      "Place fresh paper over the accepted bodice sloper and trace center front, center back, neck, shoulder, armhole, side seam, waist and every dart.",
      "Keep the front on fold. Keep the back as two mirrored pieces because the finished top has a center-back zipper.",
      "Copy grainlines, bust apex, waistline and balance marks. Label both pieces BOAT-NECK TOP · DRAFT 1 and add the date.",
      "Return the master sloper to storage before changing a line.",
    ],
    checks: ["Master sloper is unchanged", "Every dart and balance mark transferred", "Working pieces are dated"],
  },
  {
    id: "set-top-length",
    taskId: "dress-extend",
    title: "Set the hip-length hem",
    chapter: "10:12",
    seconds: 612,
    purpose: "Replace the video’s skirt block and dress length with the shorter top length you actually want.",
    sourceLesson: "The video chooses a dress length on a separate skirt block and squares the finished length across front and back.",
    topAdaptation: "Extend the bodice center lines only to your chosen high-hip/hip hem. Use the circumference at that exact level to create the slight flare.",
    measurementIds: ["dress-length", "hip", "waist"],
    actions: [
      "Mark the finished top length from the shoulder-neck point using your Top length value; square the hem across center front and center back.",
      "Mark the natural waist and measure the body around the exact place where this new hem lands. Record that as Top hem / high hip.",
      "Extend the front and back side seams from the waist toward the hem. Do not copy the video’s [length:45:cm:8] skirt length; it belongs only to that dress.",
      "Leave extra paper below the first hem line so the muslin can confirm the final proportion.",
    ],
    checks: ["Front and back finish at the same level", "Hem circumference was measured at that level", "Extra fitting length remains"],
  },
  {
    id: "add-ease-armhole",
    taskId: "dress-ease",
    title: "Add ease and lower the armhole",
    chapter: "03:03",
    seconds: 183,
    purpose: "Convert the close fitted sloper into a wearable woven shell before drawing the final side curve.",
    sourceLesson: "The video adds [length:3:cm:8] around the full garment—[length:0.75:cm:16] at each front and back side edge—and lowers the underarm [length:0.75:cm:16].",
    topAdaptation: "Those values transfer directly. The top can use the same fitted ease, then release slightly more toward the high-hip hem if the muslin needs sitting or movement room.",
    measurementIds: ["top-ease-total", "armhole-lowering", "full-bust", "waist", "hip"],
    presets: [easePreset, armholePreset],
    actions: [
      "Add one quarter of the chosen total wearing ease to each front and back quarter at bust, waist and hem. The source value is [length:3:cm:8] total, or [length:0.75:cm:16] at each side edge.",
      "Measure down from the sloper underarm by the Armhole lowering value; the source uses [length:0.75:cm:16]. Blend smoothly back into the existing armhole rather than dropping the whole curve.",
      "Draw a clean side seam from bust through the fitted waist and out toward the top-hem/high-hip width. Keep the lower section gently flared, not bell-shaped.",
      "Walk the front and back side seams and keep corresponding bust, waist and hem levels aligned.",
    ],
    checks: ["Ease is distributed across all four quarters", "Armhole change blends into the original curve", "Side seams walk together"],
  },
  {
    id: "draft-boat-neck",
    taskId: "dress-style",
    title: "Draw the wider boat neckline",
    chapter: "08:21",
    seconds: 501,
    purpose: "Open the sloper neckline while preserving shoulder and bra coverage, then suppress predictable gape.",
    sourceLesson: "The creator chooses the inner shoulder point visually, lowers the front neck [length:1.5:cm:8], and overlaps a small neckline slash to stop the opened edge from gaping.",
    topAdaptation: "Use the wide, shallow front neckline from your reference and carry the same shoulder-neck point to a shallow back boat neck. Do not copy the video’s later deep-V back.",
    measurementIds: ["shoulder", "neck"],
    actions: [
      "Mark the new inner shoulder point on the front. Keep enough finished shoulder seam for the intended bra strap and seam allowance; do not chase the widest possible opening.",
      "Lower the sloper center-front neckline by [length:1.5:cm:8], then draw a shallow curve that meets center front square and flows into the new shoulder point.",
      "For a shallow opening, draw a short slash from the neckline toward the bust area, cut to—but not through—the pivot, overlap about [length:0.3:cm:16], and tape. Redraw the neckline smoothly. The video suggests roughly [length:0.5:cm:16] for an intermediate opening and [length:0.7:cm:16] for a deep V; those larger amounts are not automatic targets for this top.",
      "Transfer the final shoulder-neck point to the back. Draw a shallow back curve compatible with the center-back zipper and verify that the front and back shoulder seams remain equal.",
      "True the closed neckline curve and mark center front, center back and shoulder matching points.",
    ],
    checks: ["Shoulder seams remain equal", "Center-front curve meets the fold square", "Back is shallow—not the video’s deep V", "Muslin will test gape"],
  },
  {
    id: "keep-darted-shaping",
    taskId: "dress-darts",
    title: "Keep the darts; skip princess seams",
    chapter: "04:32",
    seconds: 272,
    purpose: "Preserve the shaping that suits the current striped top instead of copying the dress’s panel conversion.",
    sourceLesson: "The video moves darts to align with a skirt block and then converts the bodice to princess seams for its fitted dress.",
    topAdaptation: "Your current top plan remains a darted shell: side bust darts plus front and back waist darts. The video’s one-centimeter dart move and princess-panel split are dress-specific, not universal rules.",
    measurementIds: ["bust-depth", "bust-span", "waist-to-bust"],
    actions: [
      "Retain the fitted sloper’s bust and waist dart intake unless the muslin gives evidence to change it.",
      "Aim each bust dart at the apex, then shorten its sewn point to finish [length:1.25:in:8] before the apex.",
      "Keep the front and back waist darts vertical through the fitted waist and taper them before the flared hem section.",
      "Place dart legs between strong vertical motifs where possible. Do not shift a dart merely to imitate the video’s skirt-to-bodice seam alignment.",
    ],
    checks: ["Bust darts aim toward the apex", "Waist darts end before the hem flare", "No princess panels were introduced", "Motif disruption is minimized"],
  },
  {
    id: "prepare-back-zip",
    taskId: "dress-zip",
    title: "Preserve the center-back zipper",
    chapter: "18:23",
    seconds: 1103,
    purpose: "Keep the higher boat-neck back stable and make the fitted woven top easy to put on.",
    sourceLesson: "The dress develops a much more open back neckline and later fits the back before construction.",
    topAdaptation: "Keep a straight center-back seam and shallow back neckline. The invisible zipper begins at the neck and extends below the fitted waist; the top does not need the video’s deep V or skirt shaping.",
    measurementIds: ["back-waist", "dress-length"],
    actions: [
      "Keep center back perfectly straight and mark two mirrored back pieces, not a fold line.",
      "Mark the invisible zipper from the neckline through the fitted waist so the opening is long enough to dress comfortably.",
      "Add a zipper stop notch and record the center-back seam allowance separately from the seam line.",
      "Walk both back neckline halves and confirm the shoulder points still match the front after neckline changes.",
    ],
    checks: ["Center back remains straight", "Back pieces are mirrored", "Zipper crosses the fitted waist", "Neck and shoulder lines match"],
  },
  {
    id: "true-and-sample",
    taskId: "dress-finalize",
    title: "True, label and prepare the sample",
    chapter: "24:56",
    seconds: 1496,
    purpose: "Finish a sewable paper draft while keeping the first fitting lines easy to see.",
    sourceLesson: "After neckline corrections the creator redraws smooth curves, walks the pieces, and insists on a sample because several changes were made at once.",
    topAdaptation: "True the darted front and back as whole pieces. Add facing lines and top-specific labels; omit the video’s princess-panel and skirt-piece labels.",
    measurementIds: [],
    actions: [
      "Close darts temporarily while truing the affected edges. Walk shoulders, sides, neckline halves, facing seams and center back.",
      "Add grainlines, waist and hem notches, dart legs and points, zipper stop, facing lines, piece names and cut quantities.",
      "For the fitting sample, the video leaves neckline and armholes without seam allowance so the true edge stays visible, and uses [length:1.5:cm:8] on the other seams. Mark your chosen policy directly on every piece.",
      "Do not add hem allowance to the sample until the hip-length proportion is approved.",
    ],
    checks: ["Joining seams walk", "Allowances are explicit", "Facings follow the final neckline", "Sample—not fashion fabric—is next"],
  },
  {
    id: "fit-the-sample",
    taskId: "fit-dress-stand",
    title: "Fit the muslin in the right order",
    chapter: "31:06",
    seconds: 1866,
    purpose: "Use the sample to distinguish neckline, balance, dart and hem-flare problems before changing paper.",
    sourceLesson: "The creator checks bodice length and neckline comfort on the sample, then returns every accepted correction to the paper pattern.",
    topAdaptation: "Assess the boat neckline and armholes first, then the darted bust and waist, then the high-hip flare and hem length. Ignore princess-seam fitting fixes that do not exist on this pattern.",
    measurementIds: ["dress-length", "hip", "armhole-lowering", "top-ease-total"],
    actions: [
      "Pin the center back on its seam line and check the neckline level from front, side and back before adjusting waist or hem.",
      "If the waist rides up, the video adds [length:0.5:cm:16] straight down at the bottom of each bodice section rather than extending the shaped seam angle. Apply that only if your waist mark proves the same problem.",
      "Check that the boat neck lies flat, the shoulder covers the intended bra strap, and the lowered armhole neither cuts in nor exposes too much.",
      "Check darts, waist ease and the high-hip flare standing, sitting and reaching. Mark every change on both the muslin and fitting log.",
      "The creator later lowers her neckline another [length:2:cm:8] because the sample feels too high. Treat that as her fitting result, not a number to add automatically to yours.",
    ],
    checks: ["Neckline lies flat without choking", "Armholes are comfortable and covered", "Waist mark stays level", "Hem flare clears the high hip in motion"],
  },
  {
    id: "transfer-evidence",
    taskId: "fit-dress-transfer",
    title: "Transfer only proven corrections",
    chapter: "37:59",
    seconds: 2279,
    purpose: "Turn the fitted muslin into a clean reusable top pattern and leave a traceable project record.",
    sourceLesson: "The video transfers the sample corrections, redraws changed curves and rechecks adjoining seams before cutting the real fabric.",
    topAdaptation: "Update the whole darted front and back, their facings and the center-back zipper marks. Record the accepted top length and flare before planning the vertical motifs.",
    measurementIds: ["dress-length", "hip", "top-ease-total", "armhole-lowering"],
    actions: [
      "Transfer each approved seam, dart, neckline, armhole and length change from muslin to paper; reject untested guesses.",
      "Redraw fair curves, close darts to true their crossings, and walk every joining seam again.",
      "Update front and back facings from the corrected neckline and armholes, then restore notches, grainlines and zipper stop.",
      "Label the result BOAT-NECK TOP V1 · MUSLIN APPROVED and record the evidence in the project Fit log and Muslins pages.",
    ],
    checks: ["Paper matches the accepted muslin", "Facings match corrected edges", "All seams walk", "Fit evidence is saved with the project"],
  },
];
