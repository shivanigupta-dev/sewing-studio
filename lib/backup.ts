import type { FittingEntry, Measurement, ProjectTask } from "./project.ts";
import { upgradeWorkspaceState, WORKSPACE_VERSION, type SewingProject, type WorkspaceState } from "./workspace.ts";

export const BACKUP_FORMAT = "sewing-planner-backup" as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;
export const BACKUP_APP_VERSION = "0.1.0";
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export type BackupEnvelope = {
  format: typeof BACKUP_FORMAT;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  appVersion: string;
  exportedAt: string;
  data: WorkspaceState;
};

export type ValidationResult =
  | { ok: true; backup: BackupEnvelope; summary: ImportSummary }
  | { ok: false; errors: string[] };

export type ImportSummary = {
  projects: number;
  measurementProfiles: number;
  slopers: number;
  constructionSteps: number;
  fitSessions: number;
  strategy: "replace";
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const validDate = (value: unknown) => typeof value === "string" && !Number.isNaN(Date.parse(value));
const isText = (value: unknown) => typeof value === "string";

function validateId(value: unknown, path: string, errors: string[]) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) errors.push(`${path} must be a stable non-empty identifier.`);
}

function validateMetadata(value: Record<string, unknown>, path: string, errors: string[]) {
  if (value.schemaVersion !== 1) errors.push(`${path}.schemaVersion must be 1.`);
  if (!validDate(value.createdAt)) errors.push(`${path}.createdAt must be an ISO date-time.`);
  if (!validDate(value.updatedAt)) errors.push(`${path}.updatedAt must be an ISO date-time.`);
}

function validateTasks(tasks: unknown, path: string, parentType: "project" | "sloper", parentId: string, errors: string[]) {
  if (!Array.isArray(tasks)) { errors.push(`${path} must be an array.`); return; }
  const ids = new Set<string>();
  for (const [index, task] of tasks.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(task)) { errors.push(`${itemPath} must be an object.`); continue; }
    validateId(task.id, `${itemPath}.id`, errors);
    if (typeof task.id === "string") {
      if (ids.has(task.id)) errors.push(`${path} contains duplicate id “${task.id}”.`);
      ids.add(task.id);
    }
    validateMetadata(task, itemPath, errors);
    if (task.parentType !== parentType) errors.push(`${itemPath}.parentType must be “${parentType}”.`);
    if (task.parentId !== parentId) errors.push(`${itemPath}.parentId must match its owning record.`);
    if (!isText(task.title) || !task.title.trim()) errors.push(`${itemPath}.title is required.`);
    if (!Array.isArray(task.acceptance)) errors.push(`${itemPath}.acceptance must be an array.`);
  }
  for (const task of tasks) {
    if (!isRecord(task) || !Array.isArray(task.dependsOn)) continue;
    for (const dependency of task.dependsOn) if (typeof dependency !== "string" || !ids.has(dependency)) errors.push(`${path} task “${String(task.id)}” depends on missing task “${String(dependency)}”.`);
  }
}

function validateMeasurements(measurements: unknown, path: string, errors: string[]) {
  if (!Array.isArray(measurements)) { errors.push(`${path} must be an array.`); return; }
  const ids = new Set<string>();
  for (const [index, measurement] of measurements.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(measurement)) { errors.push(`${itemPath} must be an object.`); continue; }
    validateId(measurement.id, `${itemPath}.id`, errors);
    if (typeof measurement.id === "string") {
      if (ids.has(measurement.id)) errors.push(`${path} contains duplicate id “${measurement.id}”.`);
      ids.add(measurement.id);
    }
    if (measurement.unit !== "in" && measurement.unit !== "cm") errors.push(`${itemPath}.unit is invalid.`);
    if (measurement.canonicalMm !== undefined && (typeof measurement.canonicalMm !== "number" || !Number.isFinite(measurement.canonicalMm) || measurement.canonicalMm <= 0)) errors.push(`${itemPath}.canonicalMm must be positive.`);
  }
}

function validateChildRecords(value: unknown, path: string, projectId: string, errors: string[]) {
  if (!Array.isArray(value)) { errors.push(`${path} must be an array.`); return; }
  const ids = new Set<string>();
  value.forEach((record, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(record)) { errors.push(`${itemPath} must be an object.`); return; }
    validateId(record.id, `${itemPath}.id`, errors);
    if (typeof record.id === "string") {
      if (ids.has(record.id)) errors.push(`${path} contains duplicate id “${record.id}”.`);
      ids.add(record.id);
    }
    validateMetadata(record, itemPath, errors);
    if (record.projectId !== projectId) errors.push(`${itemPath}.projectId must match its owning project.`);
  });
}

function validateWorkspace(data: unknown, errors: string[]) {
  if (!isRecord(data)) { errors.push("data must be an object."); return; }
  if (data.workspaceVersion !== WORKSPACE_VERSION) errors.push(`data.workspaceVersion must be ${WORKSPACE_VERSION}.`);
  if (data.unitSystem !== "metric" && data.unitSystem !== "imperial") errors.push("data.unitSystem is invalid.");
  const measurementProfileIds = new Set(Array.isArray(data.measurementProfiles) ? data.measurementProfiles.flatMap((profile) => isRecord(profile) && typeof profile.id === "string" ? [profile.id] : []) : []);
  const sloperIds = new Set(Array.isArray(data.slopers) ? data.slopers.flatMap((sloper) => isRecord(sloper) && typeof sloper.id === "string" ? [sloper.id] : []) : []);
  if (typeof data.sampleData !== "boolean") errors.push("data.sampleData must be a boolean.");
  if (!Array.isArray(data.projects)) errors.push("data.projects must be an array.");
  else {
    const projectIds = new Set<string>();
    data.projects.forEach((project, index) => {
      const path = `data.projects[${index}]`;
      if (!isRecord(project)) { errors.push(`${path} must be an object.`); return; }
      validateId(project.id, `${path}.id`, errors);
      const projectId = typeof project.id === "string" ? project.id : "";
      if (projectIds.has(projectId)) errors.push(`data.projects contains duplicate id “${projectId}”.`);
      projectIds.add(projectId);
      validateMetadata(project, path, errors);
      validateTasks(project.tasks, `${path}.tasks`, "project", projectId, errors);
      validateMeasurements(project.measurements, `${path}.measurements`, errors);
      for (const key of ["fittingLog", "patternVersions", "patternNotes", "muslins", "references", "fabrics", "notions"]) validateChildRecords(project[key], `${path}.${key}`, projectId, errors);
      if (project.measurementProfileId !== null && (typeof project.measurementProfileId !== "string" || !measurementProfileIds.has(project.measurementProfileId))) errors.push(`${path}.measurementProfileId must refer to a known profile or be null.`);
      if (!Array.isArray(project.baseSloperIds)) errors.push(`${path}.baseSloperIds must be an array.`);
      else for (const sloperId of project.baseSloperIds) if (typeof sloperId !== "string" || !sloperIds.has(sloperId)) errors.push(`${path}.baseSloperIds contains an unknown sloper.`);
      const patternVersionIds = new Set(Array.isArray(project.patternVersions) ? project.patternVersions.flatMap((version) => isRecord(version) && typeof version.id === "string" ? [version.id] : []) : []);
      if (Array.isArray(project.patternVersions)) project.patternVersions.forEach((version, versionIndex) => {
        if (!isRecord(version)) return;
        if (!(["draft", "tested", "accepted", "retired"] as unknown[]).includes(version.status)) errors.push(`${path}.patternVersions[${versionIndex}].status is invalid.`);
        if (version.sloperId !== null && (typeof version.sloperId !== "string" || !sloperIds.has(version.sloperId))) errors.push(`${path}.patternVersions[${versionIndex}].sloperId must refer to a known sloper or be null.`);
      });
      for (const key of ["fittingLog", "patternNotes"] as const) if (Array.isArray(project[key])) project[key].forEach((record, childIndex) => {
        if (!isRecord(record)) return;
        if (record.patternVersionId !== null && (typeof record.patternVersionId !== "string" || !patternVersionIds.has(record.patternVersionId))) errors.push(`${path}.${key}[${childIndex}].patternVersionId must refer to a project pattern version or be null.`);
      });
      if (Array.isArray(project.references)) project.references.forEach((reference, referenceIndex) => {
        if (!isRecord(reference) || typeof reference.url !== "string") return;
        try { const url = new URL(reference.url); if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(); }
        catch { errors.push(`${path}.references[${referenceIndex}].url must use HTTP or HTTPS.`); }
      });
    });
    if (data.activeProjectId !== null && (typeof data.activeProjectId !== "string" || !projectIds.has(data.activeProjectId))) errors.push("data.activeProjectId must refer to an existing project.");
  }
  if (!Array.isArray(data.measurementProfiles)) errors.push("data.measurementProfiles must be an array.");
  else { const seenProfileIds = new Set<string>(); data.measurementProfiles.forEach((profile, index) => {
    const path = `data.measurementProfiles[${index}]`;
    if (!isRecord(profile)) { errors.push(`${path} must be an object.`); return; }
    validateId(profile.id, `${path}.id`, errors); if (typeof profile.id === "string") { if (seenProfileIds.has(profile.id)) errors.push(`data.measurementProfiles contains duplicate id “${profile.id}”.`); seenProfileIds.add(profile.id); }
    validateMetadata(profile, path, errors); validateMeasurements(profile.measurements, `${path}.measurements`, errors);
  }); }
  if (!Array.isArray(data.slopers)) errors.push("data.slopers must be an array.");
  else { const seenSloperIds = new Set<string>(); data.slopers.forEach((sloper, index) => {
    const path = `data.slopers[${index}]`;
    if (!isRecord(sloper)) { errors.push(`${path} must be an object.`); return; }
    validateId(sloper.id, `${path}.id`, errors); if (typeof sloper.id === "string") { if (seenSloperIds.has(sloper.id)) errors.push(`data.slopers contains duplicate id “${sloper.id}”.`); seenSloperIds.add(sloper.id); }
    validateMetadata(sloper, path, errors); validateTasks(sloper.tasks, `${path}.tasks`, "sloper", typeof sloper.id === "string" ? sloper.id : "", errors);
    if (typeof sloper.measurementProfileId !== "string" || !measurementProfileIds.has(sloper.measurementProfileId)) errors.push(`${path}.measurementProfileId must refer to a known profile.`);
  }); }
  for (const key of ["techniques", "sharedNotes"] as const) {
    if (!Array.isArray(data[key])) { errors.push(`data.${key} must be an array.`); continue; }
    const ids = new Set<string>();
    data[key].forEach((resource, index) => {
      const path = `data.${key}[${index}]`;
      if (!isRecord(resource)) { errors.push(`${path} must be an object.`); return; }
      validateId(resource.id, `${path}.id`, errors); validateMetadata(resource, path, errors);
      if (typeof resource.id === "string") { if (ids.has(resource.id)) errors.push(`data.${key} contains duplicate id “${resource.id}”.`); ids.add(resource.id); }
    });
  }
}

export function summarizeWorkspace(workspace: WorkspaceState): ImportSummary {
  return {
    projects: workspace.projects.length,
    measurementProfiles: workspace.measurementProfiles.length,
    slopers: workspace.slopers.length,
    constructionSteps: workspace.projects.reduce((sum, project) => sum + project.tasks.length, 0) + workspace.slopers.reduce((sum, sloper) => sum + sloper.tasks.length, 0),
    fitSessions: workspace.projects.reduce((sum, project) => sum + project.fittingLog.length, 0),
    strategy: "replace",
  };
}

export function buildBackupEnvelope(workspace: WorkspaceState, options: { now?: Date; appVersion?: string } = {}): BackupEnvelope {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: options.appVersion ?? BACKUP_APP_VERSION,
    exportedAt: (options.now ?? new Date()).toISOString(),
    data: JSON.parse(JSON.stringify(workspace)) as WorkspaceState,
  };
}

function migrateLegacyEnvelope(value: Record<string, unknown>): BackupEnvelope | null {
  // Earlier private builds used a wrapper around the same workspace aggregate.
  // Detect the structural version instead of retaining vendor-specific names.
  if (value.schemaVersion !== 1 && value.schemaVersion !== 2) return null;
  let raw: unknown;
  if (isRecord(value.workspace) && "data" in value.workspace) raw = value.workspace.data;
  else if (isRecord(value.project) && "data" in value.project) raw = value.project.data;
  else return null;
  return buildBackupEnvelope(upgradeWorkspaceState(raw), { now: validDate(value.exportedAt) ? new Date(value.exportedAt as string) : new Date(), appVersion: "legacy-import" });
}

export function validateBackupEnvelope(value: unknown): ValidationResult {
  if (!isRecord(value)) return { ok: false, errors: ["Backup must be a JSON object."] };
  const migrated = migrateLegacyEnvelope(value);
  const candidate = migrated ?? value;
  const errors: string[] = [];
  if (!isRecord(candidate) || candidate.format !== BACKUP_FORMAT) errors.push("This is not a Sewing Studio backup.");
  if (!isRecord(candidate) || candidate.schemaVersion !== BACKUP_SCHEMA_VERSION) errors.push(`Backup schema v${String(isRecord(candidate) ? candidate.schemaVersion : "unknown")} is not supported.`);
  if (!isRecord(candidate) || !isText(candidate.appVersion) || !candidate.appVersion.trim()) errors.push("appVersion is required.");
  if (!isRecord(candidate) || !validDate(candidate.exportedAt)) errors.push("exportedAt must be an ISO date-time.");
  if (isRecord(candidate)) validateWorkspace(candidate.data, errors);
  if (errors.length) return { ok: false, errors };
  const backup = candidate as BackupEnvelope;
  return { ok: true, backup, summary: summarizeWorkspace(backup.data) };
}

export function parseBackupText(text: string): ValidationResult {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) return { ok: false, errors: ["Backup is larger than the 5 MB safety limit."] };
  try { return validateBackupEnvelope(JSON.parse(text)); }
  catch { return { ok: false, errors: ["The selected file is not valid JSON."] }; }
}

export function backupTimestamp(date: Date) { return date.toISOString().replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z"); }
export function jsonBackupFilename(date: Date) { return `sewing-studio-backup-${backupTimestamp(date)}.json`; }
export function csvEscape(value: unknown) { const text = value === null || value === undefined ? "" : String(value); return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
const csv = (rows: unknown[][]) => rows.map((row) => row.map(csvEscape).join(",")).join("\r\n") + "\r\n";
export function projectsCsv(projects: SewingProject[]) { return csv([["id", "title", "garment_type", "lifecycle", "measurement_profile_id", "base_sloper_ids", "created_at", "updated_at"], ...projects.map((project) => [project.id, project.title, project.garmentType, project.lifecycle, project.measurementProfileId ?? "", project.baseSloperIds.join("\n"), project.createdAt, project.updatedAt])]); }
export function tasksCsv(tasks: ProjectTask[]) { return csv([["id", "phase", "title", "instruction", "acceptance", "dependencies", "status", "note"], ...tasks.map((task) => [task.id, task.phase, task.title, task.instruction, task.acceptance.join("\n"), (task.dependsOn ?? []).join("\n"), task.status, task.note ?? ""])]); }
export function measurementsCsv(measurements: Measurement[]) { return csv([["id", "label", "display_value", "display_unit", "canonical_mm", "source_unit", "hint"], ...measurements.map((measurement) => [measurement.id, measurement.label, measurement.value, measurement.unit, measurement.canonicalMm ?? "", measurement.sourceUnit ?? measurement.unit, measurement.hint])]); }
export function fittingLogCsv(entries: FittingEntry[]) { return csv([["id", "kind", "title", "body", "date"], ...entries.map((entry) => [entry.id, entry.kind, entry.title, entry.body, entry.date])]); }
