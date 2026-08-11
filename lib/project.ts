import { normalizeLengthRecord, type UnitSystem } from "./units.ts";

export type TaskStatus = "ready" | "in-progress" | "blocked" | "done";

export type ProjectTask = {
  id: string;
  phase: string;
  title: string;
  instruction: string;
  acceptance: string[];
  dependsOn?: string[];
  status: TaskStatus;
  note?: string;
};

export type Measurement = {
  id: string;
  label: string;
  value: string;
  unit: "in" | "cm";
  hint: string;
  canonicalMm?: number;
  sourceUnit?: "in" | "cm";
};

export type FittingEntry = {
  id: string;
  kind: "fit" | "decision" | "blocker" | "win";
  title: string;
  body: string;
  date: string;
};

export type ProjectState = {
  tasks: ProjectTask[];
  measurements: Measurement[];
  fittingLog: FittingEntry[];
  activeTaskId: string | null;
  stripeStart: "lower-waist" | "high-hip" | "hip" | "centered-vertical" | "side-balanced" | "custom";
  neckline: "soft-boat" | "high-round" | "soft-square";
  zipper: "invisible" | "regular";
  projectNote: string;
  unitSystem: UnitSystem;
};

const phases = {
  prep: "Prepare",
  sloper: "Draft the sloper",
  fitSloper: "Fit the sloper",
  dress: "Draft the top",
  fitDress: "Fit the top",
  layout: "Plan the stripes",
  sew: "Sew the top",
};

const task = (
  id: string,
  phase: string,
  title: string,
  instruction: string,
  acceptance: string[],
  dependsOn: string[] = [],
): ProjectTask => ({ id, phase, title, instruction, acceptance, dependsOn, status: "ready" });

export const initialTasks: ProjectTask[] = [
  task("prep-tools", phases.prep, "Set up the sewing station", "Gather the rulers, pencil, eraser, tape, measuring tape, muslin, pins, iron, seam ripper, invisible-zipper foot and boat-neck reference image in one clear work area.", ["All tools are together", "A flat drafting surface is clear"]),
  task("prep-video-sloper", phases.prep, "Watch the sloper video once", "Watch the full fitted-bodice video without drafting. Write down every measurement it requests and flag unfamiliar terms.", ["Measurement list is captured", "Confusing terms are noted"]),
  task("prep-video-dress", phases.prep, "Review the boat-neck top build", "Review the pattern-to-sample flow with special attention to the boat neckline, sleeveless armholes, bust and waist darts, hip-length hem, center-back zipper and facings.", ["You can describe the top construction sequence", "Neckline, zipper and facing steps are noted"]),
  task("prep-measure", phases.prep, "Take body measurements", "Wear the undergarments planned for the top. Keep the tape level and comfortably snug; ask for help on back measurements if possible.", ["Every required measurement is recorded", "Questionable values are measured twice"]),
  task("prep-reference", phases.prep, "Study the reference top and stripe repeat", "Record the desired boat-neck width, shoulder coverage, finished top length and where the vertical gold motifs should sit at center front, bust and side seams.", ["Reference proportions are noted", "Preferred stripe repeat is identified"], ["prep-measure"]),

  task("sloper-front-frame", phases.sloper, "Draft the front framework", "On Swedish tracing paper, draw center front, waist, bust and armhole guide lines using the video method. Work lightly in pencil.", ["Guide lines are square and labeled", "Draft is dated v1"], ["prep-measure"]),
  task("sloper-front-neck", phases.sloper, "Draft front neck and shoulder", "Add neck width/depth and shoulder slope from your measurements. Keep the sloper neckline conservative; the shallow boat neckline is drafted on the separate top pattern later.", ["Neck and shoulder are drawn", "Shoulder length matches the calculation"], ["sloper-front-frame"]),
  task("sloper-front-arm", phases.sloper, "Shape the front armhole", "Plot the armhole guides from the video, then draw a smooth front armhole curve with no sharp corners.", ["Curve is smooth", "Front armhole is clearly labeled"], ["sloper-front-neck"]),
  task("sloper-front-darts", phases.sloper, "Draft the front darts", "Mark bust apex first. Draft the side bust dart and waist dart exactly as the block method instructs; these create the fitted base.", ["Apex and both dart legs are marked", "Dart points and intake are labeled"], ["sloper-front-frame"]),
  task("sloper-back-frame", phases.sloper, "Draft the back framework", "Draw center back, waist, bust and armhole guide lines on a separate sheet. Reuse matching horizontal levels from the front.", ["Back guides are labeled", "Front and back levels agree"], ["prep-measure"]),
  task("sloper-back-shape", phases.sloper, "Draft back neck, shoulder and armhole", "Follow the video for the back neckline, shoulder slope and back armhole curve.", ["Back upper edge is complete", "Curve has no sharp corners"], ["sloper-back-frame"]),
  task("sloper-back-dart", phases.sloper, "Draft the back waist dart", "Plot its center, length and intake from the block instructions. Keep the center back straight for now.", ["Dart is centered and labeled", "Waist seam remains true"], ["sloper-back-frame"]),
  task("sloper-true", phases.sloper, "True and label the sloper", "Walk the front and back shoulder and side seams together. Smooth lines, add notches, grainlines and piece names before cutting muslin.", ["Shoulders and sides match", "Every piece has grainline, name and cut instruction"], ["sloper-front-arm", "sloper-front-darts", "sloper-back-shape", "sloper-back-dart"]),

  task("fit-sloper-cut", phases.fitSloper, "Cut sloper muslin", "Add the chosen test seam allowance, cut front and back muslin pieces, and transfer every dart, apex and waist mark.", ["All marks are visible", "Center front/back and waist are labeled"], ["sloper-true"]),
  task("fit-sloper-darts", phases.fitSloper, "Sew and press sloper darts", "Sew from widest edge toward each point, shorten the stitch near the tip and press bust darts down and waist darts toward center.", ["Dart tips are smooth", "Darts are pressed"], ["fit-sloper-cut"]),
  task("fit-sloper-shell", phases.fitSloper, "Assemble the sloper shell", "Baste shoulders and sides with a long stitch. Leave the center back open for fitting and leave all raw edges unfinished.", ["Shell can be tried on", "Seams can be easily changed"], ["fit-sloper-darts"]),
  task("fit-sloper-first", phases.fitSloper, "Run the first sloper fitting", "Pin the back at the seam line. Photograph front, side and back; check shoulder, bust, waist, darts and armhole.", ["Three views are reviewed", "Changes are marked on muslin"], ["fit-sloper-shell"]),
  task("fit-sloper-dart-fix", phases.fitSloper, "Correct dart placement", "Make each garment bust dart point toward the apex but stop [length:1.25:in:8] before it. Repin depth or angle if the front pulls or points.", ["Darts aim correctly", "No cone or hollow appears"], ["fit-sloper-first"]),
  task("fit-sloper-balance", phases.fitSloper, "Correct shoulders, sides and armholes", "Work top-down. Keep side seams vertical and remove gaping without making the bust or underarm tight.", ["Shoulders sit cleanly", "Side seams hang vertically", "Armholes neither gape nor cut in"], ["fit-sloper-first"]),
  task("fit-sloper-transfer", phases.fitSloper, "Transfer corrections to the master sloper", "Move the fitted muslin changes back to paper, true all changed seams, and preserve this corrected master without seam allowance.", ["Paper matches the fitted muslin", "Master is labeled BODICE SLOPER V1"], ["fit-sloper-dart-fix", "fit-sloper-balance"]),

  task("dress-trace", phases.dress, "Trace a fresh top draft", "Trace the corrected front and back sloper onto new Swedish paper. Never alter the master sloper.", ["Master remains intact", "Top pieces say DRAFT 1"], ["fit-sloper-transfer"]),
  task("dress-extend", phases.dress, "Set the hip-length hem", "Draw the natural waist and finished hem levels, then extend the center lines to the chosen top length. Add only a slight flare below the waist.", ["Finished top length is drawn", "Waist and hem are labeled"], ["dress-trace"]),
  task("dress-ease", phases.dress, "Add top ease and side shaping", "Add woven-top ease at bust, waist and hem. Shape inward at the waist and release gently toward the hip-length hem so the top skims without squeezing.", ["Bust and waist ease are intentional", "Side curve and hem flare are smooth"], ["dress-extend"]),
  task("dress-darts", phases.dress, "Plan the top darts", "Keep side bust darts, front waist darts and back waist darts. Position them between motifs where possible so the vertical stripes remain visually continuous.", ["All dart legs and points are marked", "Stripe disruption is minimized"], ["dress-ease"]),
  task("dress-zip", phases.dress, "Draft the invisible center-back zipper", "Keep two mirrored back pieces, add center-back seam allowance, and mark an invisible zipper from the neckline through the fitted waist.", ["Back says CUT 2 MIRRORED", "Invisible zipper stop is notched"], ["dress-extend"]),
  task("dress-style", phases.dress, "Draft the boat neckline and armholes", "Widen and shallow the neckline from the fitted sloper, preserving at least [length:1.5:in:8] of shoulder seam and enough coverage for the intended bra straps. Refine both sleeveless armholes.", ["Boat neckline is level and symmetrical", "Shoulder and bra coverage are checked"], ["dress-trace"]),
  task("dress-finalize", phases.dress, "True and label the top pattern", "Walk all joining seams, add notches, grainlines, cut instructions, seam and hem allowances, facing lines and a vertical-stripe placement reference.", ["Joining seams match", "Seam allowance rule is explicit", "Pattern is BOAT NECK TOP V1"], ["dress-darts", "dress-zip", "dress-style"]),

  task("fit-dress-cut", phases.fitDress, "Cut the top muslin", "Cut one front on fold and two mirrored backs. Transfer every dart, waist, hem, zipper stop and facing line.", ["Pieces and marks are complete", "Back pieces are mirrored"], ["dress-finalize"]),
  task("fit-dress-sew", phases.fitDress, "Assemble the top muslin", "Sew darts, shoulders, sides and center back below the zipper stop. Leave neckline, armholes and hem unfinished for fitting.", ["Muslin can be tried on", "Back opening pins at the seam line"], ["fit-dress-cut"]),
  task("fit-dress-stand", phases.fitDress, "Check the standing fit", "Pin the center back and inspect boat neckline, shoulder coverage, bust, waist, hem, dart direction and armholes from front, side and back.", ["Pulls and gapes are marked", "Three-view notes are logged"], ["fit-dress-sew"]),
  task("fit-dress-move", phases.fitDress, "Run the movement test", "Reach forward, raise both arms, sit and turn. Watch neckline lift, armhole pressure, bust drag lines, hem flare and zipper strain.", ["Upper-body movement is comfortable", "Movement issues are logged"], ["fit-dress-stand"]),
  task("fit-dress-correct", phases.fitDress, "Correct and re-test the top muslin", "Pin only changes supported by the fitting: neckline width, dart position, side ease, armholes, back balance and hem flare. Baste and test again.", ["No major drag lines remain", "Top skims without squeezing"], ["fit-dress-move"]),
  task("fit-dress-transfer", phases.fitDress, "Finish the reusable top pattern", "Transfer all accepted muslin changes to paper and true every affected seam, dart and facing edge.", ["Paper matches final muslin", "Pattern is labeled BOAT NECK TOP V1 FINAL"], ["fit-dress-correct"]),

  task("layout-choose", phases.layout, "Choose the vertical motif placement", "Drape the fabric and decide whether a black or gold motif centers the front. Check that matching repeats can frame the bust and continue on both backs.", ["Center-front motif is selected", "A placement photo or note is saved"], ["fit-dress-transfer"]),
  task("layout-mark", phases.layout, "Mark vertical stripe references", "Draw a center-motif line and parallel repeat guides on front and back. Mark where motifs cross the bust darts, waist darts and side seams.", ["Front and back repeat guides agree", "Dart and seam crossings are marked"], ["layout-choose"]),
  task("layout-dry", phases.layout, "Dry-run the complete fabric layout", "Lay every pattern and facing piece without cutting. Check grain, vertical motif flow, mirrored backs, zipper symmetry and enough fabric for finishing.", ["Every piece fits", "Vertical motifs balance across front and back", "Layout photo is reviewed"], ["layout-mark"]),
  task("layout-review", phases.layout, "Complete the pre-cut review", "Confirm fold/cut-two instructions, seam allowances, dart placement, hem allowance, motif centering and zipper symmetry before picking up scissors.", ["All six checks pass", "No unresolved layout question remains"], ["layout-dry"]),

  task("sew-cut", phases.sew, "Cut and mark the final fabric", "Press the fabric, secure the pattern, cut slowly and transfer darts, notches, zipper stop, waist, hem and vertical-motif guides.", ["All top and facing pieces are cut once", "Marks are visible on wrong side"], ["layout-review"]),
  task("sew-stay", phases.sew, "Staystitch neck and armholes", "Stitch just inside the seam allowance in the direction that avoids stretching each curve.", ["Curves are stabilized", "No edge has stretched"], ["sew-cut"]),
  task("sew-darts", phases.sew, "Sew and press the final darts", "Sew accurate dart legs, taper gently to the points, press over a curved surface and compare symmetry without twisting the vertical motifs.", ["Darts are smooth and symmetrical", "Motifs remain balanced around each dart"], ["sew-cut"]),
  task("sew-shoulders", phases.sew, "Sew shoulder seams", "Match notches, sew, finish the seam allowances if the fabric frays, and press cleanly.", ["Shoulders match", "Seams are pressed"], ["sew-stay", "sew-darts"]),
  task("sew-sides", phases.sew, "Match vertical stripes and sew side seams", "Hand-baste or pin through every motif repeat first, then sew without shifting. Check that both sides balance before finishing the seams.", ["Vertical motifs meet acceptably", "Side seams are pressed"], ["sew-shoulders"]),
  task("sew-check", phases.sew, "Run the final-fabric fit check", "Pin the center back at the seam line, try on standing and moving, then make only small evidence-based changes.", ["Bust, waist and hem are comfortable", "Boat neckline remains level"], ["sew-sides"]),
  task("sew-back", phases.sew, "Sew center back below the zipper", "Match the vertical motifs, sew from zipper stop to hem and press the seam open.", ["Back motifs are symmetrical", "Zipper opening is clean"], ["sew-check"]),
  task("sew-zip", phases.sew, "Install the invisible back zipper", "Stabilize the opening, align both sides at the boat neckline and motif repeats, then insert the invisible zipper with the correct foot.", ["Zipper opens smoothly and disappears in the seam", "Top edges and motifs match"], ["sew-back"]),
  task("sew-finish", phases.sew, "Apply neckline and armhole facings", "Sew the planned facings, grade and clip curves, understitch, tack at seams and press so every facing stays inside.", ["Boat neckline and armholes lie flat", "Facings do not roll outward"], ["sew-zip"]),
  task("sew-hem", phases.sew, "Level and sew the top hem", "Try on with intended trousers or skirt, level the hip-length hem, preserve the vertical stripe rhythm, press and stitch.", ["Hem is even", "Slight flare hangs cleanly"], ["sew-finish"]),
  task("sew-finale", phases.sew, "Final press and project review", "Press the entire top, clip threads, take front/back/side photos and record what you would change next time.", ["Top is ready to wear", "Final photos and lessons are logged"], ["sew-hem"]),
];

export const initialMeasurements: Measurement[] = [
  ["full-bust", "Full bust", "Around fullest point; tape level"],
  ["high-bust", "High bust", "Above bust, under arms"],
  ["waist", "Natural waist", "Narrowest comfortable point"],
  ["neck", "Neck circumference", "Around the intended sloper neck edge—not tight against the throat"],
  ["hip", "Top hem / high hip", "Around the body exactly where the top will finish"],
  ["chest-width", "Across front / chest", "Arm crease to arm crease above the fullest bust"],
  ["back-width", "Back width", "Arm crease to arm crease"],
  ["shoulder", "Shoulder length", "Neck point to shoulder tip"],
  ["back-waist", "Back side-neck to waist", "Side neck point straight down to waist at back"],
  ["front-waist", "Front side-neck to waist", "Side neck point over bust to waist at front"],
  ["bust-depth", "Bust depth", "Shoulder neck point to apex"],
  ["waist-to-bust", "Waist to bust point", "Natural waist straight up to bust apex"],
  ["bust-span", "Bust span", "Apex to apex"],
  ["armhole-depth", "Armhole depth", "Follow the video method"],
  ["waist-to-armhole", "Waist to armhole line", "Natural waist straight up to the desired underarm level"],
  ["dress-length", "Top length", "Shoulder neck point to hip-length hem"],
].map(([id, label, hint]) => ({ id, label, hint, value: "", unit: "in" as const }));

export const initialProjectState: ProjectState = {
  tasks: initialTasks,
  measurements: initialMeasurements,
  fittingLog: [],
  activeTaskId: null,
  stripeStart: "centered-vertical",
  neckline: "soft-boat",
  zipper: "invisible",
  projectNote: "Fitted sleeveless boat-neck top · vertical black-and-gold motifs · side bust darts · front and back waist darts · slight hip-length flare · invisible center-back zipper · neckline and armhole facings.",
  unitSystem: "imperial",
};

export const phaseOrder = Object.values(phases);

const retiredNotes = new Set([
  "Fitted sleeveless mini shift dress · black bodice · gold bands across the lower dress · center-back zipper · no waist tie.",
]);

export function upgradeProjectState(saved?: Partial<ProjectState> | null): ProjectState {
  if (!saved) return JSON.parse(JSON.stringify(initialProjectState)) as ProjectState;
  const savedTasks = Array.isArray(saved.tasks) ? saved.tasks : [];
  const savedMeasurements = Array.isArray(saved.measurements) ? saved.measurements : [];
  const populatedUnits = savedMeasurements.filter((measurement) => measurement.value.trim()).map((measurement) => measurement.unit);
  const unitSystem: UnitSystem = saved.unitSystem === "metric" || saved.unitSystem === "imperial"
    ? saved.unitSystem
    : populatedUnits.filter((unit) => unit === "cm").length > populatedUnits.length / 2 ? "metric" : "imperial";
  const coreIds = new Set(initialMeasurements.map((measurement) => measurement.id));
  const archivedMeasurements: Measurement[] = [];
  const oldHip = savedMeasurements.find((measurement) => measurement.id === "hip" && measurement.label === "Full hip" && measurement.value.trim());
  const oldLength = savedMeasurements.find((measurement) => measurement.id === "dress-length" && measurement.label === "Dress length" && measurement.value.trim());
  if (oldHip) archivedMeasurements.push({ ...oldHip, id: "archived-full-hip", label: "Archived full hip", hint: "Preserved from the original shift-dress plan; not used by the top geometry" });
  if (oldLength) archivedMeasurements.push({ ...oldLength, id: "archived-dress-length", label: "Archived dress length", hint: "Preserved from the original shift-dress plan; not used by the top geometry" });
  const tasks = initialTasks.map((blueprint) => {
    const previous = savedTasks.find((task) => task.id === blueprint.id);
    return { ...blueprint, status: previous?.status ?? blueprint.status, note: previous?.note };
  });
  const mergedMeasurements = [
    ...initialMeasurements.map((blueprint) => {
      const previous = savedMeasurements.find((measurement) => measurement.id === blueprint.id);
      const retiredValue = (blueprint.id === "hip" && previous?.label === "Full hip") || (blueprint.id === "dress-length" && previous?.label === "Dress length");
      return { ...blueprint, value: retiredValue ? "" : previous?.value ?? blueprint.value, unit: previous?.unit ?? blueprint.unit, canonicalMm: retiredValue ? undefined : previous?.canonicalMm, sourceUnit: retiredValue ? undefined : previous?.sourceUnit };
    }),
    ...savedMeasurements.filter((measurement) => !coreIds.has(measurement.id)),
    ...archivedMeasurements.filter((measurement) => !savedMeasurements.some((savedMeasurement) => savedMeasurement.id === measurement.id)),
  ];
  const measurements = mergedMeasurements.map((measurement) => normalizeLengthRecord(measurement, unitSystem));
  const stripeStart = saved.stripeStart === "centered-vertical" || saved.stripeStart === "side-balanced" || saved.stripeStart === "custom"
    ? saved.stripeStart
    : "centered-vertical";
  return {
    ...initialProjectState,
    ...saved,
    tasks,
    measurements,
    fittingLog: Array.isArray(saved.fittingLog) ? saved.fittingLog : [],
    activeTaskId: saved.activeTaskId && tasks.some((task) => task.id === saved.activeTaskId) ? saved.activeTaskId : null,
    stripeStart,
    neckline: "soft-boat",
    zipper: "invisible",
    projectNote: saved.projectNote && !retiredNotes.has(saved.projectNote) ? saved.projectNote : initialProjectState.projectNote,
    unitSystem,
  };
}
