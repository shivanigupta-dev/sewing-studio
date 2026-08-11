import { BACKUP_APP_VERSION } from "./backup.ts";
import { formatLengthMm } from "./units.ts";
import { projectProgress, type SewingProject, type WorkspaceState } from "./workspace.ts";

const yaml = (value: string | number | boolean | null) => value === null ? "null" : typeof value === "string" ? JSON.stringify(value) : String(value);
const text = (value: string) => value.trim() || "_Not recorded._";
const filenamePart = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "project";

function nextAction(project: SewingProject) {
  return project.tasks.find((task) => task.status === "in-progress")?.title
    ?? project.tasks.find((task) => task.status === "ready" && (task.dependsOn ?? []).every((id) => project.tasks.find((candidate) => candidate.id === id)?.status === "done"))?.title
    ?? "Review the project and choose the next step.";
}

function projectFrontmatter(project: SewingProject, exportedAt: string) {
  return [
    ["type", "sewing-project"], ["id", project.id], ["schema_version", project.schemaVersion],
    ["created_at", project.createdAt], ["updated_at", project.updatedAt], ["exported_at", exportedAt],
    ["generator", "sewing-studio"], ["generator_version", BACKUP_APP_VERSION],
  ].map(([key, value]) => `${key}: ${yaml(value)}`).join("\n");
}

export function renderProjectMarkdown(workspace: WorkspaceState, projectId: string, options: { now?: Date } = {}) {
  const project = workspace.projects.find((candidate) => candidate.id === projectId);
  if (!project) throw new Error("The selected project no longer exists.");
  const exportedAt = (options.now ?? new Date()).toISOString();
  const slopers = project.baseSloperIds.map((id) => workspace.slopers.find((sloper) => sloper.id === id)).filter(Boolean);
  const measurements = project.measurements.length
    ? project.measurements.map((measurement) => `- **${measurement.label}:** ${measurement.canonicalMm ? formatLengthMm(measurement.canonicalMm, workspace.unitSystem).text : `${measurement.value || "—"} ${measurement.unit}`}`).join("\n")
    : "_No project measurement snapshot._";
  const versions = project.patternVersions.length
    ? project.patternVersions.map((version) => `- **${version.label}** — ${version.status}${version.notes ? `: ${version.notes}` : ""}`).join("\n")
    : "_No pattern versions._";
  const fittings = project.fittingLog.length
    ? project.fittingLog.map((entry) => `### ${entry.title}\n\n- Date: ${entry.date}\n- Kind: ${entry.kind}\n\n${text(entry.body)}`).join("\n\n")
    : "_No fit sessions._";
  const notes = project.patternNotes.length
    ? project.patternNotes.map((note) => `### ${note.title}\n\n_${note.category} · updated ${note.updatedAt}_\n\n${text(note.body)}`).join("\n\n")
    : "_No pattern notes._";
  const fabrics = project.fabrics.length
    ? project.fabrics.map((fabric) => `- **${fabric.name}** — ${[fabric.fibre, fabric.width, fabric.amount].filter(Boolean).join(" · ") || "details not recorded"}${fabric.notes ? `\n  - ${fabric.notes}` : ""}`).join("\n")
    : "_No fabrics._";
  const notions = project.notions.length
    ? project.notions.map((notion) => `- [${notion.acquired ? "x" : " "}] **${notion.name}**${notion.quantity ? ` — ${notion.quantity}` : ""}${notion.notes ? `: ${notion.notes}` : ""}`).join("\n")
    : "_No notions._";
  const tasks = project.tasks.map((task) => `- [${task.status === "done" ? "x" : " "}] **${task.title}** — ${task.status}${task.note ? `\n  - ${task.note}` : ""}`).join("\n") || "_No construction steps._";
  const references = project.references.map((reference) => /^https?:\/\//i.test(reference.url) ? `- [${reference.title.replaceAll("]", "\\]")}](${reference.url}) — ${reference.kind}` : `- ${reference.title} — ${reference.kind}`).join("\n") || "_No references._";

  return `---\n${projectFrontmatter(project, exportedAt)}\n---\n\n# ${project.title}\n\n${text(project.summary)}\n\n## At a glance\n\n- Garment: ${project.garmentType}\n- Status: ${project.lifecycle}\n- Progress: ${projectProgress(project)}%\n- Next action: ${nextAction(project)}\n- Measurement units: ${workspace.unitSystem}\n\n## Foundation\n\n${slopers.length ? slopers.map((sloper) => `- ${sloper!.name} · ${sloper!.versionLabel} · ${sloper!.status}`).join("\n") : "_No sloper linked._"}\n\n## Project notes\n\n${text(project.projectNote)}\n\n## Pattern versions\n\n${versions}\n\n## Pattern notes\n\n${notes}\n\n## Measurements\n\n${measurements}\n\n## Fit sessions\n\n${fittings}\n\n## Fabric\n\n${fabrics}\n\n## Notions\n\n${notions}\n\n## Construction progress\n\n${tasks}\n\n## Construction notes\n\n${text(project.constructionNotes)}\n\n## References\n\n${references}\n`;
}

export function renderWorkspaceMarkdown(workspace: WorkspaceState, options: { now?: Date } = {}) {
  const exportedAt = (options.now ?? new Date()).toISOString();
  const projects = workspace.projects.length
    ? workspace.projects.map((project) => `| ${project.title.replaceAll("|", "\\|")} | ${project.garmentType} | ${project.lifecycle} | ${projectProgress(project)}% | ${nextAction(project).replaceAll("|", "\\|")} |`).join("\n")
    : "| _No projects_ |  |  |  |  |";
  return `---\ntype: sewing-workspace-summary\nschema_version: 1\nexported_at: ${yaml(exportedAt)}\ngenerator: sewing-studio\ngenerator_version: ${yaml(BACKUP_APP_VERSION)}\n---\n\n# Sewing Studio workspace\n\nA human-readable snapshot. Use the JSON backup—not this file—to restore the application.\n\n## Projects\n\n| Project | Garment | Status | Progress | Next action |\n| --- | --- | --- | ---: | --- |\n${projects}\n\n## Shared foundations\n\n- Measurement profiles: ${workspace.measurementProfiles.length}\n- Slopers: ${workspace.slopers.length}\n- Techniques: ${workspace.techniques.length}\n- Reusable notes: ${workspace.sharedNotes.length}\n\n## Privacy reminder\n\nThis export may contain body measurements and fitting notes in plain text. Store it somewhere private.\n`;
}

export function projectMarkdownFilename(project: SewingProject) { return `${filenamePart(project.title)}--${filenamePart(project.id)}.md`; }
export function workspaceMarkdownFilename(now = new Date()) { return `sewing-studio-summary-${now.toISOString().slice(0, 10)}.md`; }
