import assert from "node:assert/strict";
import test from "node:test";
import { buildPatternPlan, missingCoreMeasurements } from "../lib/pattern.ts";
import { buildPatternGeometry, parseSewingNumber } from "../lib/pattern-geometry.ts";
import { applyPatternQaProfile, patternQaProfiles } from "../lib/pattern-qa.ts";
import { initialMeasurements, initialProjectState, upgradeProjectState } from "../lib/project.ts";
import { buildSloperCalculations, sloperSteps, suggestedDartWidthCm } from "../lib/sloper-tutorial.ts";
import { boatNeckTutorialSteps } from "../lib/boat-neck-tutorial.ts";
import { canonicalMm, formatLengthMm, normalizeLengthRecord, updateLengthRecord } from "../lib/units.ts";
import { createSewingProject, initialWorkspaceFromProject, supportsBodiceGeometry, upgradeWorkspaceState } from "../lib/workspace.ts";

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

test("turns shared body measurements into live boat-neck top guidance", () => {
  const measurements = copy(initialMeasurements);
  const set = (id: string, value: string, unit: "in" | "cm" = "in") => {
    const measurement = measurements.find((item) => item.id === id);
    assert.ok(measurement);
    measurement.value = value;
    measurement.unit = unit;
  };

  set("full-bust", "38");
  set("waist", "30");
  set("hip", "101.6", "cm");
  set("bust-span", "8");
  set("front-waist", "17");
  set("back-waist", "16");
  set("dress-length", "24");

  const rows = buildPatternPlan(measurements);
  assert.equal(rows.find((row) => row.label === "Bust draft width")?.value, "10 in");
  assert.equal(rows.find((row) => row.label === "Waist draft width")?.value, "8 in");
  assert.equal(rows.find((row) => row.label === "Top hem draft width")?.value, "10 1/2 in");
  assert.equal(rows.find((row) => row.label === "Apex from center front")?.value, "4 in");
  assert.equal(rows.find((row) => row.label === "Front/back balance")?.value, "1 in difference");
});

test("applies optional video ease and armhole adjustments without changing the sloper inputs", () => {
  const measurements = copy(initialMeasurements);
  const setMetric = (id: string, value: string) => {
    const measurement = measurements.find((item) => item.id === id);
    assert.ok(measurement);
    Object.assign(measurement, updateLengthRecord({ ...measurement, unit: "cm" as const }, value, "metric"));
  };
  setMetric("full-bust", "96");
  setMetric("armhole-depth", "21");
  measurements.push(updateLengthRecord({ id: "top-ease-total", label: "Total top wearing ease", hint: "Project adjustment", value: "", unit: "cm" }, "3", "metric"));
  measurements.push(updateLengthRecord({ id: "armhole-lowering", label: "Armhole lowering from sloper", hint: "Project adjustment", value: "", unit: "cm" }, "0.75", "metric"));

  const plan = buildPatternPlan(measurements, "metric");
  assert.equal(plan.find((row) => row.label === "Bust draft width")?.value, "≈ 24.8 cm");
  const adjusted = buildPatternGeometry(measurements, "front", "soft-boat", "metric");
  const unadjusted = buildPatternGeometry(measurements.filter((item) => item.id !== "armhole-lowering"), "front", "soft-boat", "metric");
  assert.ok(adjusted.lines.find((line) => line.id === "armhole-depth")!.from.y > unadjusted.lines.find((line) => line.id === "armhole-depth")!.from.y);
  assert.equal(measurements.find((item) => item.id === "armhole-depth")?.canonicalMm, 210);
});

test("links every adapted video session to one persistent boat-neck roadmap story", () => {
  const taskIds = new Set(initialProjectState.tasks.map((task) => task.id));
  assert.ok(boatNeckTutorialSteps.length >= 8);
  assert.ok(boatNeckTutorialSteps.every((step) => taskIds.has(step.taskId)));
  assert.equal(new Set(boatNeckTutorialSteps.map((step) => step.taskId)).size, boatNeckTutorialSteps.length);
  assert.ok(boatNeckTutorialSteps.some((step) => /do not copy|skip|not universal/i.test(`${step.topAdaptation} ${step.actions.join(" ")}`)));
});

test("reports incomplete core pattern inputs without counting custom measurements", () => {
  const measurements = copy(initialMeasurements);
  measurements.push({ id: "custom-neck-band", label: "Neck to band", value: "20", unit: "in", hint: "Custom" });
  assert.ok(missingCoreMeasurements(measurements).includes("full-bust"));
  measurements.find((item) => item.id === "full-bust")!.value = "38";
  assert.ok(!missingCoreMeasurements(measurements).includes("full-bust"));
});

test("accepts common sewing fractions", () => {
  assert.equal(parseSewingNumber("38 1/2"), 38.5);
  assert.equal(parseSewingNumber("4¾"), 4.75);
  assert.equal(parseSewingNumber("5/8"), 0.625);
  assert.equal(parseSewingNumber(""), null);
});

test("keeps one canonical length while switching between metric and sewing fractions", () => {
  const base = { value: "96", unit: "cm" as const };
  const captured = updateLengthRecord(base, "96", "metric");
  const imperial = normalizeLengthRecord(captured, "imperial");
  const metricAgain = normalizeLengthRecord(imperial, "metric");
  assert.equal(canonicalMm(captured), 960);
  assert.equal(imperial.value, "37 3/4");
  assert.equal(metricAgain.value, "96");
  assert.equal(canonicalMm(metricAgain), 960);
  assert.equal(formatLengthMm(25.4, "imperial").text, "1 in");
  assert.equal(formatLengthMm(82, "imperial").text, "≈ 3 1/4 in");
  assert.equal(formatLengthMm(82, "metric").text, "8.2 cm");
});

test("turns the Creative Bobbin tutorial formulas into live personal drafting numbers", () => {
  const measurements = copy(initialMeasurements);
  const values: Record<string, string> = {
    "full-bust": "96", waist: "76", neck: "38", "back-width": "36", "chest-width": "34",
    shoulder: "12.5", "back-waist": "44", "front-waist": "46", "waist-to-armhole": "22",
    "waist-to-bust": "19", "bust-span": "19.5",
  };
  for (const measurement of measurements) {
    if (values[measurement.id]) {
      measurement.value = values[measurement.id];
      measurement.unit = "cm";
    }
  }
  const calculations = buildSloperCalculations(measurements);
  const value = (key: string) => calculations.find((item) => item.key === key)?.value;
  assert.equal(value("halfBlockWidth"), 49.25);
  assert.equal(value("neckWidth"), 7.1);
  assert.equal(value("frontNeckDrop"), 8.1);
  assert.equal(value("dartWidth"), 8.2);
  assert.equal(value("frontWidthWithDart"), 21.1);
  assert.equal(value("apexFromWaist"), 19.25);
  assert.equal(value("apexFromCenter"), 10);
  assert.equal(value("halfWaistSuppression"), 10);
  assert.equal(suggestedDartWidthCm(86), 6.7);
  assert.ok(sloperSteps.length >= 15);
});

test("renders live dress guidance in the global metric system", () => {
  const measurements = copy(initialMeasurements);
  const bust = measurements.find((item) => item.id === "full-bust")!;
  bust.value = "96.52";
  bust.unit = "cm";
  const rows = buildPatternPlan(measurements, "metric");
  assert.equal(rows.find((row) => row.label === "Bust draft width")?.value, "25.4 cm");
  const geometry = buildPatternGeometry(measurements, "front", "soft-boat", "metric");
  assert.ok(geometry.lines.some((line) => line.value?.includes("cm")));
  assert.ok(geometry.darts.every((dart) => dart.value.includes("cm")));
});

test("builds proportional front and back geometry with sewing invariants", () => {
  const measurements = copy(initialMeasurements);
  const values: Record<string, string> = {
    "full-bust": "38", "high-bust": "35", waist: "30", hip: "40", "back-width": "15",
    shoulder: "4 3/4", "back-waist": "16", "front-waist": "17", "bust-depth": "10",
    "bust-span": "8", "armhole-depth": "8 1/2", "dress-length": "24",
  };
  for (const measurement of measurements) measurement.value = values[measurement.id] ?? measurement.value;

  const front = buildPatternGeometry(measurements, "front", "soft-boat");
  const back = buildPatternGeometry(measurements, "back", "soft-boat");
  assert.equal(front.fallbackIds.length, 0);
  assert.equal(back.fallbackIds.length, 0);
  assert.ok(front.invariants.every((item) => item.ok));
  assert.ok(back.invariants.every((item) => item.ok));
  assert.ok(front.darts.some((dart) => dart.id === "bust-dart"));
  assert.ok(front.darts.some((dart) => dart.id === "front-waist-dart"));
  assert.ok(back.darts.some((dart) => dart.id === "back-waist-dart"));
  assert.ok(front.technical.facingLine.to.x > front.technical.facingLine.from.x);
  assert.equal(front.lines.find((line) => line.id === "center")?.from.x, front.lines.find((line) => line.id === "center")?.to.x);
  assert.ok(front.bounds.height > front.marks.hip.y);
});

test("upgrades the saved shift-dress project without losing progress", () => {
  const saved = copy(initialProjectState);
  saved.tasks[0].status = "done";
  saved.tasks[0].note = "Kept my rulers together";
  saved.stripeStart = "high-hip";
  saved.neckline = "soft-square";
  saved.zipper = "regular";
  saved.projectNote = "Fitted sleeveless mini shift dress · black bodice · gold bands across the lower dress · center-back zipper · no waist tie.";
  Object.assign(saved.measurements.find((measurement) => measurement.id === "hip")!, { label: "Full hip", value: "42" });
  Object.assign(saved.measurements.find((measurement) => measurement.id === "dress-length")!, { label: "Dress length", value: "36" });
  const upgraded = upgradeProjectState(saved);
  assert.equal(upgraded.tasks[0].status, "done");
  assert.equal(upgraded.tasks[0].note, "Kept my rulers together");
  assert.equal(upgraded.stripeStart, "centered-vertical");
  assert.equal(upgraded.neckline, "soft-boat");
  assert.equal(upgraded.zipper, "invisible");
  assert.match(upgraded.projectNote, /boat-neck top/i);
  assert.equal(upgraded.measurements.find((measurement) => measurement.id === "hip")?.value, "");
  assert.equal(upgraded.measurements.find((measurement) => measurement.id === "dress-length")?.value, "");
  assert.equal(upgraded.measurements.find((measurement) => measurement.id === "archived-full-hip")?.value, "42");
  assert.equal(upgraded.measurements.find((measurement) => measurement.id === "archived-dress-length")?.value, "36");
});

test("migrates the singleton project into shared foundations and one garment project", () => {
  const legacy = copy(initialProjectState);
  legacy.tasks.find((task) => task.id === "sloper-front-frame")!.status = "done";
  legacy.tasks.find((task) => task.id === "dress-trace")!.status = "in-progress";
  legacy.measurements.find((measurement) => measurement.id === "full-bust")!.value = "38";
  const workspace = upgradeWorkspaceState(legacy);
  assert.equal(workspace.projects.length, 1);
  assert.equal(workspace.projects[0].id, "boat-neck-top");
  assert.equal(workspace.projects[0].tasks.some((task) => task.id === "sloper-front-frame"), false);
  assert.equal(workspace.projects[0].tasks.find((task) => task.id === "dress-trace")?.status, "in-progress");
  assert.equal(workspace.slopers[0].tasks.find((task) => task.id === "sloper-front-frame")?.status, "done");
  assert.equal(workspace.measurementProfiles[0].measurements.find((measurement) => measurement.id === "full-bust")?.value, "38");
});

test("creates a new project with independent measurement and task ownership", () => {
  const workspace = initialWorkspaceFromProject();
  const profile = workspace.measurementProfiles[0];
  profile.measurements.find((measurement) => measurement.id === "waist")!.value = "30";
  const project = createSewingProject({ title: "Wool trousers", garmentType: "pants", profile, sloperIds: [], unitSystem: workspace.unitSystem });
  assert.equal(project.garmentType, "pants");
  assert.ok(project.tasks.length >= 8);
  assert.notEqual(project.measurements, profile.measurements);
  project.measurements.find((measurement) => measurement.id === "waist")!.value = "31";
  assert.equal(profile.measurements.find((measurement) => measurement.id === "waist")?.value, "30");
});

test("keeps blank projects blank and gates geometry by garment and sloper capability", () => {
  const workspace = initialWorkspaceFromProject();
  const bodiceId = workspace.slopers[0].id;
  const blankSkirt = createSewingProject({ title: "Bias skirt", garmentType: "skirt", sloperIds: [], unitSystem: workspace.unitSystem });
  const pantsWithWrongFoundation = createSewingProject({ title: "Trousers", garmentType: "pants", sloperIds: [bodiceId], unitSystem: workspace.unitSystem });
  const dressWithBodice = createSewingProject({ title: "Day dress", garmentType: "dress", sloperIds: [bodiceId], unitSystem: workspace.unitSystem });
  const topWithoutFoundation = createSewingProject({ title: "Shell", garmentType: "top", sloperIds: [], unitSystem: workspace.unitSystem });
  const jacketWithBodice = createSewingProject({ title: "Blazer", garmentType: "jacket", sloperIds: [bodiceId], unitSystem: workspace.unitSystem });

  assert.equal(blankSkirt.measurements.length, 0);
  assert.equal(supportsBodiceGeometry(blankSkirt, workspace.slopers), false);
  assert.equal(supportsBodiceGeometry(pantsWithWrongFoundation, workspace.slopers), false);
  assert.equal(supportsBodiceGeometry(topWithoutFoundation, workspace.slopers), false);
  assert.equal(supportsBodiceGeometry(jacketWithBodice, workspace.slopers), false);
  assert.equal(supportsBodiceGeometry(dressWithBodice, workspace.slopers), true);
  assert.equal(supportsBodiceGeometry(workspace.projects[0], workspace.slopers), true);
});

test("recalculates rendered geometry when a shared measurement changes", () => {
  const measurements = copy(initialMeasurements);
  const bust = measurements.find((item) => item.id === "full-bust")!;
  bust.value = "36";
  const before = buildPatternGeometry(measurements, "front", "high-round");
  bust.value = "42";
  const after = buildPatternGeometry(measurements, "front", "high-round");
  assert.ok(after.marks["full-bust"].x > before.marks["full-bust"].x);
  assert.ok(after.bounds.width > before.bounds.width);
});

test("keeps technical markings and core invariants valid across diverse proportions", () => {
  for (const profileName of Object.keys(patternQaProfiles) as Array<keyof typeof patternQaProfiles>) {
    const project = applyPatternQaProfile(copy(initialProjectState), profileName);
    for (const piece of ["front", "back"] as const) {
      const geometry = buildPatternGeometry(project.measurements, piece, "soft-boat");
      assert.ok(geometry.invariants.every((item) => item.ok), `${profileName} ${piece} has a failed invariant`);
      assert.equal(geometry.notches.length, 3);
      assert.ok(geometry.technical.grainline.to.y > geometry.technical.grainline.from.y);
      assert.ok(geometry.technical.lengthenShorten.to.x > geometry.technical.lengthenShorten.from.x);
      assert.ok(geometry.technical.facingLine.to.x > geometry.technical.facingLine.from.x);
      assert.ok(Object.values(geometry.marks).every((mark) => mark.x >= 0 && mark.x <= geometry.bounds.width && mark.y >= 0 && mark.y <= geometry.bounds.height));
      if (piece === "front") assert.match(geometry.technical.cutInstruction, /FOLD/);
      if (piece === "back") assert.ok(geometry.technical.zipperStop);
    }
  }
});
