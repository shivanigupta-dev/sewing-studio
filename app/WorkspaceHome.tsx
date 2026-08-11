"use client";

import { useState } from "react";
import { createSewingProject, projectProgress, type GarmentType, type SewingProject, type WorkspaceState } from "../lib/workspace";

const garmentTypes: Array<{ id: GarmentType; label: string }> = [
  { id: "top", label: "Top" },
  { id: "dress", label: "Dress" },
  { id: "pants", label: "Pants" },
  { id: "skirt", label: "Skirt" },
  { id: "jacket", label: "Jacket" },
  { id: "other", label: "Other" },
];

export default function WorkspaceHome({ workspace, onOpenProject, onCreateProject, onDeleteProject, onOpenStudio }: {
  workspace: WorkspaceState;
  onOpenProject: (id: string) => void;
  onCreateProject: (project: SewingProject) => void;
  onDeleteProject: (id: string) => void;
  onOpenStudio: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [garmentType, setGarmentType] = useState<GarmentType>("dress");
  const [profileId, setProfileId] = useState(workspace.measurementProfiles[0]?.id ?? "");
  const [sloperId, setSloperId] = useState("");
  const active = workspace.projects.find((project) => project.id === workspace.activeProjectId) ?? workspace.projects[0];
  // Compatibility is a drafting constraint, not a cosmetic filter. Preventing
  // an invalid foundation here avoids misleading provenance in every later
  // muslin and pattern note for the project.
  const compatibleSlopers = workspace.slopers.filter((sloper) => {
    if (garmentType === "pants") return sloper.kind === "pants";
    if (garmentType === "skirt") return sloper.kind === "skirt";
    if (["top", "dress", "jacket"].includes(garmentType)) return sloper.kind === "bodice";
    return true;
  });

  const create = () => {
    if (!title.trim()) return;
    const project = createSewingProject({
      title,
      garmentType,
      profile: workspace.measurementProfiles.find((profile) => profile.id === profileId),
      sloperIds: sloperId ? [sloperId] : [],
      unitSystem: workspace.unitSystem,
    });
    onCreateProject(project);
    setTitle("");
    setCreating(false);
  };

  return (
    <section className="workspace-home view-page">
      <div className="workspace-hero">
        <div><p className="eyebrow">SEWING WORKSPACE {workspace.sampleData ? "· FICTIONAL SAMPLE" : ""}</p><h1>Build garments from foundations you trust.</h1><p>Keep slopers and body profiles stable in the Studio, then give every garment its own pattern decisions, fittings, materials and construction record.</p></div>
        <button className="primary" onClick={() => setCreating(true)}>New sewing project <span>＋</span></button>
      </div>

      {creating && (
        <section className="new-project-panel" aria-label="Create sewing project">
          <div className="section-heading"><div><p className="eyebrow">NEW PROJECT</p><h2>Start with the right foundation</h2></div><button onClick={() => setCreating(false)}>Cancel</button></div>
          <div className="new-project-grid">
            <label><span>Project name</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Linen summer trousers" /></label>
            <label><span>Garment type</span><select value={garmentType} onChange={(event) => {
              const nextType = event.target.value as GarmentType;
              setGarmentType(nextType);
              const currentSloper = workspace.slopers.find((sloper) => sloper.id === sloperId);
              const compatible = !currentSloper
                || (nextType === "pants" && currentSloper.kind === "pants")
                || (nextType === "skirt" && currentSloper.kind === "skirt")
                || (["top", "dress", "jacket"].includes(nextType) && currentSloper.kind === "bodice")
                || nextType === "other";
              if (!compatible) setSloperId("");
            }}>{garmentTypes.map((type) => <option value={type.id} key={type.id}>{type.label}</option>)}</select></label>
            <label><span>Measurement profile</span><select value={profileId} onChange={(event) => setProfileId(event.target.value)}><option value="">Start blank</option>{workspace.measurementProfiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name}</option>)}</select></label>
            <label><span>Starting sloper</span><select value={sloperId} onChange={(event) => setSloperId(event.target.value)}><option value="">{compatibleSlopers.length ? "No sloper yet" : "No compatible sloper yet"}</option>{compatibleSlopers.map((sloper) => <option value={sloper.id} key={sloper.id}>{sloper.name} · {sloper.versionLabel}</option>)}</select></label>
          </div>
          <p className="snapshot-note"><span>◇</span><span><strong>Safe starting snapshot</strong>The new project copies the selected measurements. It remembers which profile and sloper it came from, but future shared edits do not silently move the project&apos;s pattern.</span></p>
          <button className="primary" disabled={!title.trim()} onClick={create}>Create project <span>→</span></button>
        </section>
      )}

      <div className="workspace-summary-grid">
        <article><small>PROJECTS</small><strong>{workspace.projects.length}</strong><span>{workspace.projects.filter((project) => project.lifecycle === "active").length} currently active</span></article>
        <article><small>FOUNDATIONS</small><strong>{workspace.slopers.length}</strong><span>{workspace.slopers.filter((sloper) => sloper.status === "validated").length} validated slopers</span></article>
        <article><small>MEASUREMENT PROFILES</small><strong>{workspace.measurementProfiles.length}</strong><span>Exact values preserved across units</span></article>
        <article><small>STUDIO KNOWLEDGE</small><strong>{workspace.techniques.length + workspace.sharedNotes.length}</strong><span>Reusable techniques and notes</span></article>
      </div>

      {active && (
        <section className="active-project-banner">
          <div><p className="eyebrow">CURRENT PROJECT</p><h2>{active.title}</h2><p>{active.summary}</p><div className="foundation-links"><span>{active.garmentType}</span>{active.baseSloperIds.map((id) => <span key={id}>{workspace.slopers.find((sloper) => sloper.id === id)?.name ?? id}</span>)}</div></div>
          <div className="active-project-progress"><strong>{projectProgress(active)}%</strong><span>complete</span><button onClick={() => onOpenProject(active.id)}>Continue project →</button></div>
        </section>
      )}

      <section className="library-section">
        <div className="section-heading"><div><p className="eyebrow">PROJECT LIBRARY</p><h2>Every garment, one clear record</h2></div><button onClick={() => setCreating(true)}>Add project ＋</button></div>
        <div className="project-card-grid">
          {workspace.projects.map((project) => {
            const progress = projectProgress(project);
            return <article className="project-library-card-wrap" key={project.id}><button className="project-library-card" onClick={() => onOpenProject(project.id)}><span className={`garment-glyph ${project.garmentType}`}>{project.garmentType.slice(0, 1).toUpperCase()}</span><span className="project-card-copy"><small>{project.garmentType} · {project.lifecycle}</small><strong>{project.title}</strong><span>{project.summary}</span><i><b style={{ width: `${progress}%` }} /></i><em>{progress}% · {project.tasks.filter((task) => task.status === "done").length}/{project.tasks.length} tasks</em></span></button><button className="project-delete" onClick={() => onDeleteProject(project.id)} aria-label={`Delete ${project.title}`}>Delete</button></article>;
          })}
          <button className="project-library-card add-card" onClick={() => setCreating(true)}><span>＋</span><strong>Start another garment</strong><small>Dress, pants, skirt, jacket, top or something else</small></button>
        </div>
      </section>

      <section className="studio-callout">
        <div><p className="eyebrow">SHARED STUDIO</p><h2>Your foundations belong to the workspace—not one garment.</h2><p>Open the fitted bodice sloper, measurement profiles, techniques and reusable notes without entering a project.</p></div><button className="secondary-button" onClick={onOpenStudio}>Open Shared Studio →</button>
      </section>
    </section>
  );
}
