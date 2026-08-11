import assert from "node:assert/strict";
import test from "node:test";
import { BACKUP_FORMAT, buildBackupEnvelope, csvEscape, fittingLogCsv, jsonBackupFilename, measurementsCsv, parseBackupText, projectsCsv, tasksCsv, validateBackupEnvelope } from "../lib/backup.ts";
import { createSampleWorkspace } from "../lib/workspace.ts";

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const now = new Date("2026-07-24T18:00:00.000Z");

test("builds the public v1 backup envelope", () => {
  const workspace = createSampleWorkspace();
  const backup = buildBackupEnvelope(workspace, { now });
  assert.equal(backup.format, BACKUP_FORMAT);
  assert.equal(backup.schemaVersion, 1);
  assert.equal(backup.appVersion, "0.1.0");
  assert.equal(backup.exportedAt, now.toISOString());
  assert.deepEqual(backup.data, copy(workspace));
  assert.equal(validateBackupEnvelope(backup).ok, true);
  assert.equal(jsonBackupFilename(now), "sewing-studio-backup-2026-07-24T18-00-00Z.json");
});

test("export import export preserves meaningful workspace data", () => {
  const workspace = createSampleWorkspace();
  workspace.projects[0].tasks[0].status = "done";
  workspace.projects[0].patternNotes[0].body = "Synthetic round-trip note.";
  const first = buildBackupEnvelope(workspace, { now });
  const imported = parseBackupText(JSON.stringify(first));
  assert.equal(imported.ok, true);
  if (!imported.ok) return;
  const second = buildBackupEnvelope(imported.backup.data, { now });
  assert.deepEqual(second.data, first.data);
  assert.deepEqual(imported.summary, { projects: 1, measurementProfiles: 1, slopers: 1, constructionSteps: first.data.projects[0].tasks.length + first.data.slopers[0].tasks.length, fitSessions: 0, strategy: "replace" });
});

test("migrates a valid legacy aggregate without discarding stable project data", () => {
  const workspace = createSampleWorkspace();
  const legacy = { format: "legacy-private-build", schemaVersion: 2, exportedAt: now.toISOString(), workspace: { id: "sewing-workspace", data: copy(workspace) } };
  const result = validateBackupEnvelope(legacy);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.backup.format, BACKUP_FORMAT);
    assert.equal(result.backup.data.projects[0].id, "boat-neck-top");
  }
});

test("rejects malformed, future, oversized, and internally inconsistent backups", () => {
  assert.deepEqual(parseBackupText("not json"), { ok: false, errors: ["The selected file is not valid JSON."] });
  const wrong = buildBackupEnvelope(createSampleWorkspace(), { now }) as unknown as Record<string, unknown>;
  wrong.format = "unrelated";
  assert.equal(validateBackupEnvelope(wrong).ok, false);
  const future = copy(buildBackupEnvelope(createSampleWorkspace(), { now })) as unknown as Record<string, unknown>;
  future.schemaVersion = 99;
  assert.equal(validateBackupEnvelope(future).ok, false);
  const broken = copy(buildBackupEnvelope(createSampleWorkspace(), { now }));
  broken.data.projects[0].tasks[0].dependsOn = ["missing-task"];
  const result = validateBackupEnvelope(broken);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(" "), /missing task/);
  assert.equal(parseBackupText(" ".repeat(5 * 1024 * 1024 + 1)).ok, false);
});

test("escapes CSV fields and exports project data", () => {
  assert.equal(csvEscape("plain"), "plain");
  assert.equal(csvEscape("gold, black"), '"gold, black"');
  assert.equal(csvEscape('a "quoted" note'), '"a ""quoted"" note"');
  const workspace = createSampleWorkspace();
  const project = workspace.projects[0];
  project.tasks[0].note = "two\nlines";
  const timestamp = now.toISOString();
  project.fittingLog = [{ id: "fit-1", schemaVersion: 1, createdAt: timestamp, updatedAt: timestamp, projectId: project.id, patternVersionId: project.patternVersions[0].id, kind: "fit", title: "Side seam", body: "Line one\nLine two", date: timestamp }];
  assert.match(projectsCsv(workspace.projects), /boat-neck-top/);
  assert.match(tasksCsv(project.tasks), /"two\nlines"/);
  assert.match(measurementsCsv(project.measurements), /canonical_mm/);
  assert.match(fittingLogCsv(project.fittingLog), /"Line one\nLine two"/);
});
