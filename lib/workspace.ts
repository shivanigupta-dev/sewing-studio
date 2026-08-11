import {
  initialMeasurements,
  initialProjectState,
  initialTasks,
  upgradeProjectState,
  type FittingEntry,
  type Measurement,
  type ProjectState,
  type ProjectTask,
  type TaskStatus,
} from "./project.ts";
import { normalizeLengthRecord, updateLengthRecord, type UnitSystem } from "./units.ts";

export const WORKSPACE_VERSION = 3 as const;
export const RECORD_SCHEMA_VERSION = 1 as const;
export const SAMPLE_CREATED_AT = "2026-01-15T10:00:00.000Z";

export type GarmentType = "top" | "dress" | "pants" | "skirt" | "jacket" | "other";
export type ProjectLifecycle = "planning" | "active" | "paused" | "complete" | "archived";

export type RecordMetadata = {
  schemaVersion: typeof RECORD_SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
};

export type MeasurementProfile = RecordMetadata & {
  id: string;
  name: string;
  description: string;
  measurements: Measurement[];
};

export type ConstructionStep = ProjectTask & RecordMetadata & {
  parentType: "project" | "sloper";
  parentId: string;
};

export type SloperResource = RecordMetadata & {
  id: string;
  name: string;
  kind: "bodice" | "pants" | "skirt" | "sleeve" | "other";
  status: "drafting" | "fitting" | "validated";
  measurementProfileId: string;
  description: string;
  versionLabel: string;
  notes: string;
  tasks: ConstructionStep[];
  activeTaskId: string | null;
};

export type TechniqueResource = RecordMetadata & {
  id: string;
  title: string;
  category: string;
  notes: string;
  sourceUrl?: string;
};

export type SharedNote = RecordMetadata & {
  id: string;
  title: string;
  body: string;
  tags: string[];
};

export type AttachmentReference = RecordMetadata & {
  id: string;
  projectId: string;
  title: string;
  url: string;
  kind: "image" | "article" | "video" | "other";
  notes: string;
};

export type ProjectReference = AttachmentReference;

export type FabricDetail = RecordMetadata & {
  id: string;
  projectId: string;
  name: string;
  fibre: string;
  width: string;
  amount: string;
  pretreated: boolean;
  notes: string;
};

export type NotionDetail = RecordMetadata & {
  id: string;
  projectId: string;
  name: string;
  quantity: string;
  acquired: boolean;
  notes: string;
};

export type MuslinIteration = RecordMetadata & {
  id: string;
  projectId: string;
  label: string;
  status: "planned" | "cut" | "fitting" | "revised" | "accepted";
  date: string;
  observations: string;
  patternChanges: string;
};

export type PatternNote = RecordMetadata & {
  id: string;
  projectId: string;
  patternVersionId: string | null;
  title: string;
  category: "drafting" | "fit" | "construction" | "layout";
  body: string;
};

export type PatternVersion = RecordMetadata & {
  id: string;
  projectId: string;
  sloperId: string | null;
  label: string;
  status: "draft" | "tested" | "accepted" | "retired";
  sourceMeasurementUpdatedAt: string | null;
  notes: string;
};

export type FitSession = FittingEntry & RecordMetadata & {
  projectId: string;
  patternVersionId: string | null;
};

/**
 * Projects own garment decisions and a measurement snapshot. Shared profile
 * edits never rewrite a cut pattern unless the sewist explicitly refreshes it.
 * Generated geometry is intentionally absent: it is reproducible from these
 * source measurements, the project style fields, and the geometry engine.
 */
export type SewingProject = Omit<ProjectState, "tasks" | "fittingLog"> & RecordMetadata & {
  id: string;
  title: string;
  garmentType: GarmentType;
  lifecycle: ProjectLifecycle;
  summary: string;
  measurementProfileId: string | null;
  baseSloperIds: string[];
  tasks: ConstructionStep[];
  fittingLog: FitSession[];
  patternVersions: PatternVersion[];
  patternNotes: PatternNote[];
  muslins: MuslinIteration[];
  references: AttachmentReference[];
  fabrics: FabricDetail[];
  notions: NotionDetail[];
  constructionNotes: string;
};

export type WorkspaceState = {
  workspaceVersion: typeof WORKSPACE_VERSION;
  unitSystem: UnitSystem;
  activeProjectId: string | null;
  projects: SewingProject[];
  measurementProfiles: MeasurementProfile[];
  slopers: SloperResource[];
  techniques: TechniqueResource[];
  sharedNotes: SharedNote[];
  sampleData: boolean;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const metadata = (timestamp = now()): RecordMetadata => ({ schemaVersion: RECORD_SCHEMA_VERSION, createdAt: timestamp, updatedAt: timestamp });

const sloperTaskIds = new Set([
  "prep-tools",
  "prep-video-sloper",
  "prep-measure",
  ...initialTasks.filter((task) => task.id.startsWith("sloper-") || task.id.startsWith("fit-sloper-")).map((task) => task.id),
]);

export function isSloperTask(task: ProjectTask) {
  return sloperTaskIds.has(task.id);
}

function trackedTasks(tasks: ProjectTask[], parentType: "project" | "sloper", parentId: string, timestamp: string): ConstructionStep[] {
  return tasks.map((task) => ({ ...task, ...metadata(timestamp), parentType, parentId }));
}

function normalizedMeasurements(measurements: Measurement[], unitSystem: UnitSystem) {
  return measurements.map((measurement) => normalizeLengthRecord(measurement, unitSystem));
}

function fictionalMeasurements(): Measurement[] {
  const values: Record<string, string> = {
    "full-bust": "92", "high-bust": "87", waist: "74", neck: "37", hip: "98",
    "chest-width": "34", "back-width": "36", shoulder: "12.5", "back-waist": "41",
    "front-waist": "43", "bust-depth": "26", "waist-to-bust": "19", "bust-span": "19",
    "armhole-depth": "21", "waist-to-armhole": "20.5", "dress-length": "58",
  };
  return initialMeasurements.map((measurement) => updateLengthRecord({ ...measurement, unit: "cm" }, values[measurement.id] ?? "", "metric"));
}

function projectFromLegacy(legacy: ProjectState, timestamp: string, title = "Boat-Neck Top"): SewingProject {
  const id = "boat-neck-top";
  const projectTasks = legacy.tasks.filter((task) => !isSloperTask(task));
  const taskIds = new Set(projectTasks.map((task) => task.id));
  const patternVersionId = "boat-neck-pattern-v1";
  return {
    ...legacy,
    ...metadata(timestamp),
    id,
    title,
    garmentType: "top",
    lifecycle: "active",
    summary: "A fitted, hip-length boat-neck shell with a center-back zipper and carefully balanced vertical motifs.",
    measurementProfileId: "sample-mara-profile",
    baseSloperIds: ["sample-fitted-bodice-v1"],
    tasks: trackedTasks(projectTasks.map((task) => ({ ...task, dependsOn: (task.dependsOn ?? []).filter((dependency) => taskIds.has(dependency)) })), "project", id, timestamp),
    activeTaskId: legacy.activeTaskId && !sloperTaskIds.has(legacy.activeTaskId) ? legacy.activeTaskId : null,
    fittingLog: [],
    patternVersions: [{ ...metadata(timestamp), id: patternVersionId, projectId: id, sloperId: "sample-fitted-bodice-v1", label: "Draft 1", status: "draft", sourceMeasurementUpdatedAt: timestamp, notes: "First project copy traced from the fitted bodice foundation." }],
    patternNotes: [{ ...metadata(timestamp), id: "boat-neck-design", projectId: id, patternVersionId, title: "Pattern direction", category: "drafting", body: "Keep the boat neckline shallow, preserve practical shoulder coverage, and place darts between motif columns where possible." }],
    muslins: [{ ...metadata(timestamp), id: "boat-neck-muslin-1", projectId: id, label: "Muslin 1", status: "planned", date: "", observations: "", patternChanges: "" }],
    references: [],
    fabrics: [{ ...metadata(timestamp), id: "sample-jacquard", projectId: id, name: "Fictional black-and-citrine jacquard", fibre: "Synthetic sample fixture", width: "140 cm", amount: "1.4 m", pretreated: true, notes: "Public demonstration data only. Balance the vertical motif repeat across front and back." }],
    notions: [{ ...metadata(timestamp), id: "sample-zipper", projectId: id, name: "Invisible zipper", quantity: "1 × 55 cm", acquired: false, notes: "Choose black zipper tape." }],
    constructionNotes: "Staystitch the neckline and armholes, test the zipper on scraps, and press darts over a curved surface.",
  };
}

function sloperFromLegacy(legacy: ProjectState, timestamp: string): SloperResource {
  const id = "sample-fitted-bodice-v1";
  return {
    ...metadata(timestamp),
    id,
    name: "Fitted Bodice Sloper",
    kind: "bodice",
    status: legacy.tasks.filter(isSloperTask).every((task) => task.status === "done") ? "validated" : "drafting",
    measurementProfileId: "sample-mara-profile",
    description: "Reusable fitted front-and-back bodice foundation drafted from body measurements and refined through muslin fittings.",
    versionLabel: "V1",
    notes: "Keep the master style-neutral and without seam allowance. Trace it before adding garment-specific style lines.",
    tasks: trackedTasks(legacy.tasks.filter(isSloperTask), "sloper", id, timestamp),
    activeTaskId: legacy.activeTaskId && sloperTaskIds.has(legacy.activeTaskId) ? legacy.activeTaskId : null,
  };
}

export function createSampleWorkspace(): WorkspaceState {
  const timestamp = SAMPLE_CREATED_AT;
  const projectState = { ...clone(initialProjectState), unitSystem: "metric" as const, measurements: fictionalMeasurements() };
  return {
    workspaceVersion: WORKSPACE_VERSION,
    unitSystem: "metric",
    activeProjectId: "boat-neck-top",
    projects: [projectFromLegacy(projectState, timestamp, "Citrine Boat-Neck Shell")],
    measurementProfiles: [{ ...metadata(timestamp), id: "sample-mara-profile", name: "Mara Ellis — fictional sample", description: "Synthetic demonstration measurements. They do not represent a real person.", measurements: clone(projectState.measurements) }],
    slopers: [sloperFromLegacy(projectState, timestamp)],
    techniques: [
      { ...metadata(timestamp), id: "invisible-zipper", title: "Invisible center-back zipper", category: "Closures", notes: "Stabilize the opening, baste motif alignment, then insert with an invisible-zipper foot.", sourceUrl: "" },
      { ...metadata(timestamp), id: "smooth-darts", title: "Smooth dart points", category: "Shaping", notes: "Shorten the stitch near the point, sew off the fold, knot the tails, and press over a curve.", sourceUrl: "" },
    ],
    sharedNotes: [{ ...metadata(timestamp), id: "protect-master-patterns", title: "Protect master patterns", body: "Keep accepted slopers style-neutral. Trace a dated working copy before adding design ease, seam allowance, or style lines.", tags: ["patterns", "workflow"] }],
    sampleData: true,
  };
}

export function createBlankWorkspace(unitSystem: UnitSystem = "imperial"): WorkspaceState {
  const project = createSewingProject({ title: "My first sewing project", garmentType: "other", unitSystem });
  return { workspaceVersion: WORKSPACE_VERSION, unitSystem, activeProjectId: project.id, projects: [project], measurementProfiles: [], slopers: [], techniques: [], sharedNotes: [], sampleData: false };
}

/** Legacy entry point retained for version-one and version-two backup imports. */
export function initialWorkspaceFromProject(project: ProjectState = initialProjectState): WorkspaceState {
  if (project === initialProjectState) return createSampleWorkspace();
  const timestamp = now();
  const upgraded = upgradeProjectState(project);
  const profileId = "imported-measurements";
  const sloperId = "imported-fitted-bodice-v1";
  const migrated = projectFromLegacy(upgraded, timestamp, "Imported Boat-Neck Top");
  migrated.measurementProfileId = profileId;
  migrated.baseSloperIds = [sloperId];
  migrated.patternVersions = migrated.patternVersions.map((version) => ({ ...version, sloperId }));
  const sloper = sloperFromLegacy(upgraded, timestamp);
  sloper.id = sloperId;
  sloper.measurementProfileId = profileId;
  sloper.tasks = sloper.tasks.map((task) => ({ ...task, parentId: sloperId }));
  return {
    workspaceVersion: WORKSPACE_VERSION,
    unitSystem: upgraded.unitSystem,
    activeProjectId: migrated.id,
    projects: [migrated],
    measurementProfiles: [{ ...metadata(timestamp), id: profileId, name: "Imported measurements", description: "Migrated from an earlier Sewing Studio backup.", measurements: clone(upgraded.measurements) }],
    slopers: [sloper], techniques: [], sharedNotes: [], sampleData: false,
  };
}

const genericProjectTasks = (garmentType: GarmentType): ProjectTask[] => {
  const label = garmentType === "other" ? "garment" : garmentType;
  const make = (id: string, phase: string, title: string, instruction: string, dependsOn: string[] = []): ProjectTask => ({ id, phase, title, instruction, acceptance: ["Decision or result is recorded", "The next dependent step is unblocked"], dependsOn, status: "ready" });
  return [
    make("project-brief", "Plan", `Define the ${label} brief`, "Record silhouette, intended use, fit preference, construction details, and finish standard."),
    make("project-reference", "Plan", "Collect references and materials", "Add inspiration, pattern sources, fabric, and notions.", ["project-brief"]),
    make("project-pattern", "Pattern", "Prepare the first pattern version", "Trace or draft from the selected foundation. Label grain, notches, and seam-allowance policy.", ["project-brief"]),
    make("project-muslin", "Fit", "Make and assess the first muslin", "Record standing and movement observations before changing the paper pattern.", ["project-pattern"]),
    make("project-transfer", "Pattern", "Transfer accepted fit changes", "Move evidence-backed changes to the paper pattern, then walk and true affected seams.", ["project-muslin"]),
    make("project-cut", "Construct", "Cut and mark final fabric", "Confirm layout, grain, directional design, and allowances before cutting.", ["project-transfer", "project-reference"]),
    make("project-construct", "Construct", `Construct the ${label}`, "Follow the recorded order, pressing and checking fit at reversible stages.", ["project-cut"]),
    make("project-finish", "Finish", "Finish and review", "Complete finishing and record lessons for the next version.", ["project-construct"]),
  ];
};

export function createSewingProject(input: { title: string; garmentType: GarmentType; profile?: MeasurementProfile; sloperIds?: string[]; unitSystem: UnitSystem }): SewingProject {
  const timestamp = now();
  const idBase = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sewing-project";
  const id = `${idBase}-${crypto.randomUUID().slice(0, 8)}`;
  const patternVersionId = `${id}-pattern-v1`;
  return {
    ...clone(initialProjectState), ...metadata(timestamp), id, title: input.title.trim(), garmentType: input.garmentType, lifecycle: "planning",
    summary: "Add the design intent, fit goal, and occasion for this project.", measurementProfileId: input.profile?.id ?? null,
    baseSloperIds: input.sloperIds ?? [], tasks: trackedTasks(genericProjectTasks(input.garmentType), "project", id, timestamp),
    measurements: normalizedMeasurements(clone(input.profile?.measurements ?? []), input.unitSystem), fittingLog: [], activeTaskId: null,
    projectNote: "Describe the silhouette, fabric behavior, fit goal, and construction priorities.", unitSystem: input.unitSystem,
    patternVersions: [{ ...metadata(timestamp), id: patternVersionId, projectId: id, sloperId: input.sloperIds?.[0] ?? null, label: "Draft 1", status: "draft", sourceMeasurementUpdatedAt: input.profile?.updatedAt ?? null, notes: "" }],
    patternNotes: [], muslins: [], references: [], fabrics: [], notions: [], constructionNotes: "",
  };
}

function validDate(value: unknown, fallback: string) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function normalizeMeta(value: Partial<RecordMetadata>, fallback: string): RecordMetadata {
  const createdAt = validDate(value.createdAt, fallback);
  return { schemaVersion: RECORD_SCHEMA_VERSION, createdAt, updatedAt: validDate(value.updatedAt, createdAt) };
}

function normalizeProject(project: SewingProject, unitSystem: UnitSystem, fallback: string): SewingProject {
  const projectMeta = normalizeMeta(project, fallback);
  const projectId = project.id;
  const tasks = (project.tasks ?? []).map((task) => ({ ...task, ...normalizeMeta(task as Partial<RecordMetadata>, projectMeta.createdAt), parentType: "project" as const, parentId: projectId }));
  const patternVersions = (project.patternVersions ?? []).map((version) => ({
    ...version,
    ...normalizeMeta(version, projectMeta.createdAt),
    projectId,
    status: (version.status as string) === "fitting" ? "tested" as const : version.status,
  }));
  return {
    ...project, ...projectMeta, unitSystem, measurements: normalizedMeasurements(project.measurements ?? [], unitSystem), tasks,
    fittingLog: (project.fittingLog ?? []).map((entry) => ({ ...entry, ...normalizeMeta(entry as Partial<RecordMetadata>, projectMeta.createdAt), projectId, patternVersionId: (entry as Partial<FitSession>).patternVersionId ?? null })),
    baseSloperIds: Array.isArray(project.baseSloperIds) ? project.baseSloperIds : [], patternVersions,
    patternNotes: (project.patternNotes ?? []).map((note) => ({ ...note, ...normalizeMeta(note, projectMeta.createdAt), projectId, patternVersionId: note.patternVersionId ?? null })),
    muslins: (project.muslins ?? []).map((muslin) => ({ ...muslin, ...normalizeMeta(muslin, projectMeta.createdAt), projectId })),
    references: (project.references ?? []).map((reference) => ({ ...reference, ...normalizeMeta(reference, projectMeta.createdAt), projectId })),
    fabrics: (project.fabrics ?? []).map((fabric) => ({ ...fabric, ...normalizeMeta(fabric, projectMeta.createdAt), projectId })),
    notions: (project.notions ?? []).map((notion) => ({ ...notion, ...normalizeMeta(notion, projectMeta.createdAt), projectId })),
    constructionNotes: project.constructionNotes ?? "",
  };
}

function isWorkspace(value: unknown): value is WorkspaceState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WorkspaceState>;
  return Array.isArray(candidate.projects) && Array.isArray(candidate.measurementProfiles) && Array.isArray(candidate.slopers);
}

export function upgradeWorkspaceState(saved?: unknown): WorkspaceState {
  if (!isWorkspace(saved)) return initialWorkspaceFromProject((saved ?? initialProjectState) as ProjectState);
  const fallback = now();
  const unitSystem: UnitSystem = saved.unitSystem === "metric" ? "metric" : "imperial";
  const projects = saved.projects.map((project) => normalizeProject(project, unitSystem, fallback));
  const profiles = saved.measurementProfiles.map((profile) => ({ ...profile, ...normalizeMeta(profile, fallback), measurements: normalizedMeasurements(profile.measurements ?? [], unitSystem) }));
  const slopers = saved.slopers.map((sloper) => ({ ...sloper, ...normalizeMeta(sloper, fallback), tasks: (sloper.tasks ?? []).map((task) => ({ ...task, ...normalizeMeta(task, fallback), parentType: "sloper" as const, parentId: sloper.id })), activeTaskId: sloper.activeTaskId ?? null }));
  return {
    workspaceVersion: WORKSPACE_VERSION, unitSystem,
    activeProjectId: projects.some((project) => project.id === saved.activeProjectId) ? saved.activeProjectId : projects[0]?.id ?? null,
    projects, measurementProfiles: profiles, slopers,
    techniques: (saved.techniques ?? []).map((item) => ({ ...item, ...normalizeMeta(item, fallback) })),
    sharedNotes: (saved.sharedNotes ?? []).map((item) => ({ ...item, ...normalizeMeta(item, fallback) })),
    sampleData: saved.sampleData === true,
  };
}

export function projectProgress(project: SewingProject) {
  return project.tasks.length ? Math.round(project.tasks.filter((task) => task.status === "done").length / project.tasks.length * 100) : 0;
}

export function supportsBodiceGeometry(project: SewingProject, slopers: SloperResource[]) {
  const compatibleGarment = project.garmentType === "top" || project.garmentType === "dress";
  return compatibleGarment && project.baseSloperIds.some((id) => slopers.find((sloper) => sloper.id === id)?.kind === "bodice");
}

export function setTaskStatusInList<T extends ProjectTask>(tasks: T[], taskId: string, status: TaskStatus): T[] {
  const timestamp = now();
  return tasks.map((task) => {
    if (task.id === taskId) return { ...task, status, ...(Object.hasOwn(task, "updatedAt") ? { updatedAt: timestamp } : {}) };
    if (status === "in-progress" && task.status === "in-progress") return { ...task, status: "ready" as const };
    return task;
  });
}

export function touchProject(project: SewingProject, update: Partial<SewingProject>): SewingProject {
  return { ...project, ...update, updatedAt: now() };
}
