import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("source includes local-first onboarding and browser persistence", async () => {
  const [workbench, store, workspace, backup] = await Promise.all([
    readFile(new URL("../app/SewingWorkbench.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/browser-workspace-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/BackupView.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(workbench, /Explore sample project/);
  assert.match(workbench, /Start with a blank workspace/);
  assert.match(workbench, /saveBrowserWorkspace/);
  assert.doesNotMatch(workbench, /api\/workspace/);
  assert.match(store, /indexedDB\.open/);
  assert.match(workspace, /Mara Ellis — fictional sample/);
  assert.match(backup, /Complete JSON backup/);
  assert.match(backup, /All-project summary\.md/);
  assert.match(backup, /Obsidian vault/);
  assert.match(backup, /Google Drive/);
});

test("boat-neck project includes the adapted, task-linked Creative Bobbin drafting guide", async () => {
  const [workbench, guide, guideModel] = await Promise.all([
    readFile(new URL("../app/SewingWorkbench.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/BoatNeckTutorialView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/boat-neck-tutorial.ts", import.meta.url), "utf8"),
  ]);
  assert.match(workbench, /project-guide/);
  assert.match(guide, /Draft the boat-neck top from your sloper/);
  assert.match(guideModel, /c7RhIVNXd-E/);
  assert.match(guideModel, /skip princess seams/i);
  assert.match(guideModel, /hip-length/);
});

test("workroom skin carries the requested editorial palette and drafting shapes", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /--lavender: #c9b7e6/i);
  assert.match(styles, /--ochre: #c48a1b/i);
  assert.match(styles, /--peacock: #006c74/i);
  assert.match(styles, /--lime: #c6d675/i);
  assert.match(styles, /--burgundy: #741b46/i);
  assert.match(styles, /--black: #111015/i);
  assert.match(styles, /--radius-panel: 32px/i);
  assert.match(styles, /--serif: "Bodoni 72"/i);
  assert.match(styles, /\.workspace-hero::before/);
  assert.match(styles, /\.sidebar::before/);
  assert.match(styles, /\.project-library-card::after/);
});

test("production configuration is a static export without private-derived images", async () => {
  const [config, layout, packageJson] = await Promise.all([
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(config, /output: "export"/);
  assert.match(layout, /local-first sewing planner/);
  assert.doesNotMatch(packageJson, /server database/i);
  await assert.rejects(access(new URL("../public/boat-neck-top-reference.png", import.meta.url)));
});
