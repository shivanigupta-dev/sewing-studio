import assert from "node:assert/strict";
import test from "node:test";
import { createBlankWorkspace, createSampleWorkspace, createSewingProject, upgradeWorkspaceState } from "../lib/workspace.ts";

test("ships fictional public sample data and a separate blank choice", () => {
  const sample = createSampleWorkspace();
  assert.equal(sample.sampleData, true);
  assert.match(sample.measurementProfiles[0].name, /fictional sample/);
  assert.equal(sample.projects[0].references.length, 0);
  assert.ok(sample.projects[0].measurements.every((measurement) => measurement.value));
  const blank = createBlankWorkspace();
  assert.equal(blank.sampleData, false);
  assert.equal(blank.measurementProfiles.length, 0);
  assert.equal(blank.slopers.length, 0);
  assert.equal(blank.projects[0].measurements.length, 0);
});

test("creates independent project records with complete ownership metadata", () => {
  const sample = createSampleWorkspace();
  const project = createSewingProject({ title: "Fictional wool skirt", garmentType: "skirt", profile: sample.measurementProfiles[0], unitSystem: sample.unitSystem });
  assert.ok(project.id);
  assert.ok(project.tasks.every((task) => task.parentId === project.id && task.parentType === "project" && task.schemaVersion === 1));
  assert.ok(project.patternVersions.every((version) => version.projectId === project.id));
  project.measurements[0].value = "changed";
  assert.notEqual(project.measurements[0].value, sample.measurementProfiles[0].measurements[0].value);
});

test("migration accepts an empty multi-project workspace", () => {
  const blank = createBlankWorkspace();
  blank.projects = [];
  blank.activeProjectId = null;
  const upgraded = upgradeWorkspaceState(blank);
  assert.equal(upgraded.projects.length, 0);
  assert.equal(upgraded.activeProjectId, null);
});
