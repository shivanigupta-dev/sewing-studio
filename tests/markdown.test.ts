import assert from "node:assert/strict";
import test from "node:test";
import { projectMarkdownFilename, renderProjectMarkdown, renderWorkspaceMarkdown } from "../lib/markdown.ts";
import { createBlankWorkspace, createSampleWorkspace } from "../lib/workspace.ts";

const now = new Date("2026-07-24T18:00:00.000Z");

test("renders a readable project record with stable frontmatter", () => {
  const workspace = createSampleWorkspace();
  const project = workspace.projects[0];
  const markdown = renderProjectMarkdown(workspace, project.id, { now });
  assert.match(markdown, /^---\ntype: "sewing-project"/);
  assert.match(markdown, /id: "boat-neck-top"/);
  assert.match(markdown, /generator_version: "0.1.0"/);
  assert.match(markdown, /## Pattern versions/);
  assert.match(markdown, /## Measurements/);
  assert.match(markdown, /Citrine Boat-Neck Shell/);
  assert.equal(projectMarkdownFilename(project), "citrine-boat-neck-shell--boat-neck-top.md");
});

test("renders an all-project summary and calm blank states", () => {
  const sample = renderWorkspaceMarkdown(createSampleWorkspace(), { now });
  assert.match(sample, /\| Citrine Boat-Neck Shell \| top \| active \|/);
  const blank = createBlankWorkspace();
  blank.projects = [];
  blank.activeProjectId = null;
  const summary = renderWorkspaceMarkdown(blank, { now });
  assert.match(summary, /_No projects_/);
  assert.match(summary, /JSON backup/);
});
