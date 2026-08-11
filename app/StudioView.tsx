"use client";

import { useMemo, useState } from "react";
import { initialMeasurements, type Measurement } from "../lib/project";
import type { MeasurementProfile, SharedNote, SloperResource, TechniqueResource, WorkspaceState } from "../lib/workspace";

type StudioSection = "library" | "profile" | "sloper" | "knowledge";

export default function StudioView({ workspace, onProfileMeasurement, onAddProfile, onAddSloper, onUpdateSloper, onAddTechnique, onAddNote, onOpenTutorial, onOpenPattern }: {
  workspace: WorkspaceState;
  onProfileMeasurement: (profileId: string, measurementId: string, update: Partial<Measurement>) => void;
  onAddProfile: (profile: MeasurementProfile) => void;
  onAddSloper: (sloper: SloperResource) => void;
  onUpdateSloper: (id: string, update: Partial<SloperResource>) => void;
  onAddTechnique: (technique: TechniqueResource) => void;
  onAddNote: (note: SharedNote) => void;
  onOpenTutorial: (sloperId: string) => void;
  onOpenPattern: (sloperId: string) => void;
}) {
  const [section, setSection] = useState<StudioSection>("library");
  const [profileId, setProfileId] = useState(workspace.measurementProfiles[0]?.id ?? "");
  const [sloperId, setSloperId] = useState(workspace.slopers[0]?.id ?? "");
  const [newProfileName, setNewProfileName] = useState("");
  const [newSloperName, setNewSloperName] = useState("");
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeBody, setKnowledgeBody] = useState("");
  const profile = workspace.measurementProfiles.find((item) => item.id === profileId) ?? workspace.measurementProfiles[0];
  const sloper = workspace.slopers.find((item) => item.id === sloperId) ?? workspace.slopers[0];
  const sloperProgress = useMemo(() => sloper?.tasks.length ? Math.round(sloper.tasks.filter((task) => task.status === "done").length / sloper.tasks.length * 100) : 0, [sloper]);

  const addProfile = () => {
    if (!newProfileName.trim()) return;
    const timestamp = new Date().toISOString();
    const template = profile?.measurements.length ? profile.measurements : initialMeasurements;
    const created: MeasurementProfile = {
      id: `profile-${Date.now().toString(36)}`,
      schemaVersion: 1,
      createdAt: timestamp,
      name: newProfileName.trim(),
      description: "Add when and how this profile should be used.",
      measurements: template.map((measurement) => ({
        ...measurement,
        value: "",
        unit: workspace.unitSystem === "metric" ? "cm" : "in",
        canonicalMm: undefined,
        sourceUnit: undefined,
      })),
      updatedAt: timestamp,
    };
    onAddProfile(created);
    setProfileId(created.id);
    setNewProfileName("");
    setSection("profile");
  };

  const addSloper = () => {
    if (!newSloperName.trim() || !profile) return;
    const created: SloperResource = {
      id: `sloper-${Date.now().toString(36)}`,
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      name: newSloperName.trim(),
      kind: "other",
      status: "drafting",
      measurementProfileId: profile.id,
      description: "Describe the body area, drafting method and intended use.",
      versionLabel: "V1",
      notes: "Keep the master style-neutral and document the fitting evidence behind every change.",
      tasks: [],
      activeTaskId: null,
      updatedAt: new Date().toISOString(),
    };
    onAddSloper(created);
    setSloperId(created.id);
    setNewSloperName("");
    setSection("sloper");
  };

  const addKnowledge = (kind: "technique" | "note") => {
    if (!knowledgeTitle.trim() || !knowledgeBody.trim()) return;
    const timestamp = new Date().toISOString();
    if (kind === "technique") onAddTechnique({ id: `technique-${Date.now().toString(36)}`, schemaVersion: 1, createdAt: timestamp, updatedAt: timestamp, title: knowledgeTitle.trim(), category: "General", notes: knowledgeBody.trim(), sourceUrl: "" });
    else onAddNote({ id: `note-${Date.now().toString(36)}`, schemaVersion: 1, createdAt: timestamp, updatedAt: timestamp, title: knowledgeTitle.trim(), body: knowledgeBody.trim(), tags: [] });
    setKnowledgeTitle("");
    setKnowledgeBody("");
  };

  return (
    <section className="view-page studio-page">
      <div className="view-title"><div><p className="eyebrow">SHARED STUDIO</p><h1>Foundations and sewing knowledge</h1><p>Resources here can support many garments. Project-specific decisions stay inside their projects.</p></div><span className="count-chip">{workspace.slopers.length} slopers · {workspace.measurementProfiles.length} profiles</span></div>
      <nav className="studio-section-nav" aria-label="Studio sections">{([ ["library", "Library"], ["profile", "Measurement profiles"], ["sloper", "Slopers"], ["knowledge", "Knowledge" ] ] as const).map(([id, label]) => <button className={section === id ? "selected" : ""} key={id} onClick={() => setSection(id)}>{label}</button>)}</nav>

      {section === "library" && <>
        <div className="studio-library-grid">
          <section className="studio-resource-card primary-resource"><p className="eyebrow">FOUNDATIONAL PATTERN</p><h2>{sloper?.name ?? "Add a sloper"}</h2><p>{sloper?.description}</p>{sloper && <><div className="resource-meta"><span>{sloper.kind}</span><span>{sloper.versionLabel}</span><span>{sloper.status}</span></div><div className="resource-progress"><i><b style={{ width: `${sloperProgress}%` }} /></i><span>{sloperProgress}% of drafting workflow</span></div><div className="resource-actions"><button className="primary" onClick={() => { setSloperId(sloper.id); setSection("sloper"); }}>Open sloper</button>{sloper.kind === "bodice" && <button className="text-button" onClick={() => onOpenTutorial(sloper.id)}>Open guided draft →</button>}</div></>}</section>
          <section className="studio-resource-card"><p className="eyebrow">BODY DATA</p><h2>{profile?.name ?? "Add a profile"}</h2><p>{profile?.description}</p><strong className="resource-count">{profile?.measurements.filter((measurement) => measurement.value).length ?? 0}<small> values recorded</small></strong><button className="text-button" onClick={() => setSection("profile")}>Review measurements →</button></section>
          <section className="studio-resource-card"><p className="eyebrow">KNOWLEDGE LIBRARY</p><h2>Techniques &amp; notes</h2><p>Construction methods and decisions worth carrying into the next garment.</p><strong className="resource-count">{workspace.techniques.length + workspace.sharedNotes.length}<small> reusable entries</small></strong><button className="text-button" onClick={() => setSection("knowledge")}>Open knowledge →</button></section>
        </div>
      </>}

      {section === "profile" && <div className="studio-two-column">
        <aside className="resource-list-panel"><div><p className="eyebrow">PROFILES</p><h2>Body measurements</h2></div>{workspace.measurementProfiles.map((item) => <button className={profile?.id === item.id ? "selected" : ""} key={item.id} onClick={() => setProfileId(item.id)}><strong>{item.name}</strong><small>{item.measurements.filter((measurement) => measurement.value).length} recorded</small></button>)}<div className="inline-create"><input value={newProfileName} onChange={(event) => setNewProfileName(event.target.value)} placeholder="New profile name" /><button disabled={!newProfileName.trim()} onClick={addProfile}>＋</button></div></aside>
        <section className="resource-editor-card">{profile ? <><p className="eyebrow">{profile.name.toUpperCase()}</p><h2>Shared measurement profile</h2><p>{profile.description}</p>{profile.measurements.length ? <div className="measure-card">{profile.measurements.map((measurement) => <label className="measure-row" key={measurement.id}><span><strong>{measurement.label}</strong><small>{measurement.hint}</small></span><div><input inputMode="decimal" value={measurement.value} placeholder="—" onChange={(event) => onProfileMeasurement(profile.id, measurement.id, { value: event.target.value })} /><span className="unit-suffix">{workspace.unitSystem === "metric" ? "cm" : "in"}</span></div></label>)}</div> : <p className="empty-resource">This profile is blank. Add measurements from a sloper or project workflow when you are ready.</p>}</> : <p>Create a profile to begin.</p>}</section>
      </div>}

      {section === "sloper" && <div className="studio-two-column">
        <aside className="resource-list-panel"><div><p className="eyebrow">SLOPERS</p><h2>Pattern foundations</h2></div>{workspace.slopers.map((item) => <button className={sloper?.id === item.id ? "selected" : ""} key={item.id} onClick={() => setSloperId(item.id)}><strong>{item.name}</strong><small>{item.versionLabel} · {item.status}</small></button>)}<div className="inline-create"><input value={newSloperName} onChange={(event) => setNewSloperName(event.target.value)} placeholder="New sloper name" /><button disabled={!newSloperName.trim()} onClick={addSloper}>＋</button></div></aside>
        <section className="resource-editor-card">{sloper ? <><div className="resource-editor-head"><div><p className="eyebrow">{sloper.kind.toUpperCase()} SLOPER</p><h2>{sloper.name}</h2></div><select aria-label="Sloper status" value={sloper.status} onChange={(event) => onUpdateSloper(sloper.id, { status: event.target.value as SloperResource["status"] })}><option value="drafting">Drafting</option><option value="fitting">Fitting</option><option value="validated">Validated</option></select></div><div className="sloper-field-grid"><label><span>Name</span><input value={sloper.name} onChange={(event) => onUpdateSloper(sloper.id, { name: event.target.value })} /></label><label><span>Kind</span><select value={sloper.kind} onChange={(event) => onUpdateSloper(sloper.id, { kind: event.target.value as SloperResource["kind"] })}><option value="bodice">Bodice</option><option value="pants">Pants</option><option value="skirt">Skirt</option><option value="sleeve">Sleeve</option><option value="other">Other</option></select></label><label><span>Version</span><input value={sloper.versionLabel} onChange={(event) => onUpdateSloper(sloper.id, { versionLabel: event.target.value })} /></label><label><span>Measurement profile</span><select value={sloper.measurementProfileId} onChange={(event) => onUpdateSloper(sloper.id, { measurementProfileId: event.target.value })}>{workspace.measurementProfiles.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div><label className="brief-field"><span>Description</span><textarea value={sloper.description} onChange={(event) => onUpdateSloper(sloper.id, { description: event.target.value })} /></label><label className="brief-field"><span>Master notes</span><textarea value={sloper.notes} onChange={(event) => onUpdateSloper(sloper.id, { notes: event.target.value })} /></label><div className="sloper-actions"><button className="primary" disabled={sloper.kind !== "bodice"} onClick={() => onOpenTutorial(sloper.id)}>Guided drafting tutorial <span>→</span></button><button className="secondary-button" disabled={sloper.kind !== "bodice"} onClick={() => onOpenPattern(sloper.id)}>Interactive sloper pattern</button></div>{sloper.kind !== "bodice" && <p className="engine-inline-note">Live drafting is currently available for bodice slopers. This {sloper.kind} foundation remains editable and reusable without a false bodice preview.</p>}<p className="snapshot-note"><span>◇</span><span><strong>Stable foundation</strong>Projects reference this sloper by id and version. Their measurements and pattern decisions remain project-owned snapshots.</span></p></> : <p>Create a sloper to begin.</p>}</section>
      </div>}

      {section === "knowledge" && <div className="knowledge-layout"><div className="knowledge-list"><section><p className="eyebrow">TECHNIQUES</p>{workspace.techniques.map((item) => <article key={item.id}><small>{item.category}</small><h3>{item.title}</h3><p>{item.notes}</p>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a>}</article>)}</section><section><p className="eyebrow">REUSABLE NOTES</p>{workspace.sharedNotes.map((item) => <article key={item.id}><small>{item.tags.join(" · ") || "Studio note"}</small><h3>{item.title}</h3><p>{item.body}</p></article>)}</section></div><aside className="knowledge-create"><p className="eyebrow">ADD TO THE STUDIO</p><h2>Save it once</h2><label><span>Title</span><input value={knowledgeTitle} onChange={(event) => setKnowledgeTitle(event.target.value)} /></label><label><span>What should future-you know?</span><textarea value={knowledgeBody} onChange={(event) => setKnowledgeBody(event.target.value)} /></label><div><button className="primary" disabled={!knowledgeTitle.trim() || !knowledgeBody.trim()} onClick={() => addKnowledge("technique")}>Save technique</button><button className="secondary-button" disabled={!knowledgeTitle.trim() || !knowledgeBody.trim()} onClick={() => addKnowledge("note")}>Save note</button></div></aside></div>}
    </section>
  );
}
