"use client";

/* eslint-disable @next/next/no-img-element -- User-supplied reference URLs are
 * intentionally provider-agnostic; forcing Next image hosts would make saved
 * projects non-portable across arbitrary tutorial and inspiration sources. */

import { useState } from "react";
import type { FabricDetail, MuslinIteration, NotionDetail, PatternNote, PatternVersion, ProjectReference, SewingProject, WorkspaceState } from "../lib/workspace";

const recordMeta = () => { const timestamp = new Date().toISOString(); return { schemaVersion: 1 as const, createdAt: timestamp, updatedAt: timestamp }; };
const safeWebUrl = (value: string) => { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.href : null; } catch { return null; } };

export function ProjectMaterialsView({ project, workspace, onUpdate }: { project: SewingProject; workspace: WorkspaceState; onUpdate: (update: Partial<SewingProject>) => void }) {
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceTitle, setReferenceTitle] = useState("");
  const [fabricName, setFabricName] = useState("");
  const [fabricNotes, setFabricNotes] = useState("");
  const [notionName, setNotionName] = useState("");
  const sloperNames = project.baseSloperIds.map((id) => workspace.slopers.find((sloper) => sloper.id === id)?.name ?? id);

  const addReference = () => {
    const url = safeWebUrl(referenceUrl.trim());
    if (!url) return;
    const reference: ProjectReference = { ...recordMeta(), id: crypto.randomUUID(), projectId: project.id, title: referenceTitle.trim() || "Project reference", url, kind: /youtube|youtu\.be/.test(url) ? "video" : /\.(png|jpe?g|webp)(\?|$)/i.test(url) ? "image" : "article", notes: "" };
    onUpdate({ references: [...project.references, reference] });
    setReferenceUrl(""); setReferenceTitle("");
  };
  const addFabric = () => {
    if (!fabricName.trim()) return;
    const fabric: FabricDetail = { ...recordMeta(), id: crypto.randomUUID(), projectId: project.id, name: fabricName.trim(), fibre: "", width: "", amount: "", pretreated: false, notes: fabricNotes.trim() };
    onUpdate({ fabrics: [...project.fabrics, fabric] });
    setFabricName(""); setFabricNotes("");
  };
  const addNotion = () => {
    if (!notionName.trim()) return;
    const notion: NotionDetail = { ...recordMeta(), id: crypto.randomUUID(), projectId: project.id, name: notionName.trim(), quantity: "", acquired: false, notes: "" };
    onUpdate({ notions: [...project.notions, notion] }); setNotionName("");
  };

  return <section className="view-page project-records-page"><div className="view-title"><div><p className="eyebrow">{project.title.toUpperCase()}</p><h1>Materials &amp; references</h1><p>Keep source images, fabric facts, pattern provenance and construction constraints attached to this garment.</p></div><span className="count-chip">{project.references.length} references · {project.fabrics.length} fabrics</span></div>
    <div className="foundation-provenance"><span><small>MEASUREMENT SNAPSHOT FROM</small><strong>{workspace.measurementProfiles.find((profile) => profile.id === project.measurementProfileId)?.name ?? "Project-only measurements"}</strong></span><span><small>FOUNDATIONAL SLOPER</small><strong>{sloperNames.join(", ") || "None selected"}</strong></span><span><small>GARMENT TYPE</small><strong>{project.garmentType}</strong></span></div>
    <div className="records-grid"><section className="record-card"><div className="section-heading"><div><p className="eyebrow">MATERIAL LIBRARY</p><h2>Fabric and notions</h2></div></div><div className="fabric-list">{project.fabrics.map((fabric) => <article key={fabric.id}><div><h3>{fabric.name}</h3><span>{fabric.fibre || "Fibre not recorded"}</span></div><label><span>Width</span><input value={fabric.width} onChange={(event) => onUpdate({ fabrics: project.fabrics.map((item) => item.id === fabric.id ? { ...item, width: event.target.value, updatedAt: new Date().toISOString() } : item) })} /></label><label><span>Amount</span><input value={fabric.amount} onChange={(event) => onUpdate({ fabrics: project.fabrics.map((item) => item.id === fabric.id ? { ...item, amount: event.target.value, updatedAt: new Date().toISOString() } : item) })} /></label><label className="fabric-notes"><span>Notes</span><textarea value={fabric.notes} onChange={(event) => onUpdate({ fabrics: project.fabrics.map((item) => item.id === fabric.id ? { ...item, notes: event.target.value, updatedAt: new Date().toISOString() } : item) })} /></label><label className="pretreat-check"><input type="checkbox" checked={fabric.pretreated} onChange={(event) => onUpdate({ fabrics: project.fabrics.map((item) => item.id === fabric.id ? { ...item, pretreated: event.target.checked, updatedAt: new Date().toISOString() } : item) })} /> Pretreated</label></article>)}{!project.fabrics.length && <p className="empty-resource">No fabric recorded yet.</p>}</div><div className="inline-record-form"><input value={fabricName} onChange={(event) => setFabricName(event.target.value)} placeholder="Fabric name" /><input value={fabricNotes} onChange={(event) => setFabricNotes(event.target.value)} placeholder="Color, weave or source" /><button onClick={addFabric} disabled={!fabricName.trim()}>Add fabric</button></div><div className="notion-list"><h3>Notions</h3>{project.notions.map((notion) => <label key={notion.id}><input type="checkbox" checked={notion.acquired} onChange={(event) => onUpdate({ notions: project.notions.map((item) => item.id === notion.id ? { ...item, acquired: event.target.checked, updatedAt: new Date().toISOString() } : item) })} /><span>{notion.name}</span><input aria-label={`${notion.name} quantity`} value={notion.quantity} placeholder="Quantity" onChange={(event) => onUpdate({ notions: project.notions.map((item) => item.id === notion.id ? { ...item, quantity: event.target.value, updatedAt: new Date().toISOString() } : item) })} /></label>)}</div><div className="inline-record-form single"><input value={notionName} onChange={(event) => setNotionName(event.target.value)} placeholder="Zipper, thread, interfacing…" /><button onClick={addNotion} disabled={!notionName.trim()}>Add notion</button></div></section>
      <section className="record-card"><div className="section-heading"><div><p className="eyebrow">REFERENCE BOARD</p><h2>Images, videos and articles</h2></div></div><div className="reference-grid">{project.references.map((reference) => { const href = safeWebUrl(reference.url); return <article key={reference.id}>{reference.kind === "image" && href && <img src={href} alt="" />}<div><small>{reference.kind}</small><h3>{reference.title}</h3>{href ? <a href={href} target="_blank" rel="noreferrer">Open source ↗</a> : <span>Unsafe or unavailable URL</span>}<textarea value={reference.notes} placeholder="What matters in this reference?" onChange={(event) => onUpdate({ references: project.references.map((item) => item.id === reference.id ? { ...item, notes: event.target.value, updatedAt: new Date().toISOString() } : item) })} /></div></article>; })}{!project.references.length && <p className="empty-resource">No references recorded yet.</p>}</div><div className="inline-record-form"><input value={referenceTitle} onChange={(event) => setReferenceTitle(event.target.value)} placeholder="Reference title" /><input value={referenceUrl} onChange={(event) => setReferenceUrl(event.target.value)} placeholder="https://…" /><button onClick={addReference} disabled={!safeWebUrl(referenceUrl.trim())}>Add reference</button></div></section></div>
    <label className="construction-notes-card"><span>PROJECT CONSTRUCTION NOTES</span><textarea value={project.constructionNotes} onChange={(event) => onUpdate({ constructionNotes: event.target.value })} placeholder="Construction order, machines, feet, interfacing, finishing constraints…" /></label>
  </section>;
}

export function ProjectMuslinsView({ project, onUpdate }: { project: SewingProject; onUpdate: (update: Partial<SewingProject>) => void }) {
  const [label, setLabel] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [versionNotes, setVersionNotes] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const addMuslin = () => {
    if (!label.trim()) return;
    const muslin: MuslinIteration = { ...recordMeta(), id: crypto.randomUUID(), projectId: project.id, label: label.trim(), status: "planned", date: new Date().toISOString().slice(0, 10), observations: "", patternChanges: "" };
    onUpdate({ muslins: [...project.muslins, muslin] }); setLabel("");
  };
  const addPatternNote = () => {
    if (!noteTitle.trim() || !noteBody.trim()) return;
    const note: PatternNote = { ...recordMeta(), id: crypto.randomUUID(), projectId: project.id, patternVersionId: project.patternVersions.find((version) => version.status === "accepted")?.id ?? project.patternVersions[0]?.id ?? null, title: noteTitle.trim(), category: "fit", body: noteBody.trim() };
    onUpdate({ patternNotes: [note, ...project.patternNotes] }); setNoteTitle(""); setNoteBody("");
  };
  const addPatternVersion = () => {
    const previous = project.patternVersions.at(-1);
    const version: PatternVersion = {
      ...recordMeta(),
      id: crypto.randomUUID(),
      projectId: project.id,
      sloperId: previous?.sloperId ?? project.baseSloperIds[0] ?? null,
      label: versionLabel.trim() || `Draft ${project.patternVersions.length + 1}`,
      status: "draft",
      sourceMeasurementUpdatedAt: previous?.sourceMeasurementUpdatedAt ?? null,
      notes: versionNotes.trim(),
    };
    onUpdate({ patternVersions: [...project.patternVersions, version] });
    setVersionLabel(""); setVersionNotes("");
  };
  const updatePatternVersion = (id: string, update: Partial<PatternVersion>) => {
    const timestamp = new Date().toISOString();
    onUpdate({
      patternVersions: project.patternVersions.map((version) => {
        if (update.status === "accepted" && version.id !== id && version.status === "accepted") {
          return { ...version, status: "retired", updatedAt: timestamp };
        }
        return version.id === id ? { ...version, ...update, updatedAt: timestamp } : version;
      }),
    });
  };

  return <section className="view-page project-records-page"><div className="view-title"><div><p className="eyebrow">{project.title.toUpperCase()}</p><h1>Muslins &amp; pattern history</h1><p>Treat every toile as evidence: capture what you saw, what changed on paper, and which version became authoritative.</p></div><span className="count-chip">{project.muslins.length} iterations</span></div>
    <div className="muslin-timeline">{project.muslins.map((muslin, index) => <article key={muslin.id}><div className="muslin-index"><span>{String(index + 1).padStart(2, "0")}</span><i /></div><div className="muslin-card"><header><div><small>{muslin.date}</small><h2>{muslin.label}</h2></div><select value={muslin.status} onChange={(event) => onUpdate({ muslins: project.muslins.map((item) => item.id === muslin.id ? { ...item, status: event.target.value as MuslinIteration["status"], updatedAt: new Date().toISOString() } : item) })}><option value="planned">Planned</option><option value="cut">Cut</option><option value="fitting">Fitting</option><option value="revised">Revised</option><option value="accepted">Accepted</option></select></header><div><label><span>What the muslin showed</span><textarea value={muslin.observations} onChange={(event) => onUpdate({ muslins: project.muslins.map((item) => item.id === muslin.id ? { ...item, observations: event.target.value, updatedAt: new Date().toISOString() } : item) })} /></label><label><span>Changes transferred to pattern</span><textarea value={muslin.patternChanges} onChange={(event) => onUpdate({ muslins: project.muslins.map((item) => item.id === muslin.id ? { ...item, patternChanges: event.target.value, updatedAt: new Date().toISOString() } : item) })} /></label></div></div></article>)}{!project.muslins.length && <div className="muslin-empty"><span>01</span><h2>Your first muslin will start the pattern history.</h2><p>Add it before cutting so observations and paper changes stay paired.</p></div>}</div>
    <section className="pattern-version-ledger"><div className="section-heading"><div><p className="eyebrow">VERSION LEDGER</p><h2>Pattern copies with a clear authority</h2></div><span className="count-chip">{project.patternVersions.length} versions</span></div><div className="pattern-version-list">{project.patternVersions.map((version) => <article key={version.id}><div><small>{new Date(version.updatedAt).toLocaleDateString()}</small><input aria-label="Pattern version label" value={version.label} onChange={(event) => updatePatternVersion(version.id, { label: event.target.value })} /></div><select aria-label={`${version.label} status`} value={version.status} onChange={(event) => updatePatternVersion(version.id, { status: event.target.value as PatternVersion["status"] })}><option value="draft">Draft</option><option value="tested">Tested</option><option value="accepted">Accepted</option><option value="retired">Retired</option></select><textarea aria-label={`${version.label} notes`} value={version.notes} placeholder="What makes this copy different?" onChange={(event) => updatePatternVersion(version.id, { notes: event.target.value })} /></article>)}</div><div className="version-create-form"><input value={versionLabel} onChange={(event) => setVersionLabel(event.target.value)} placeholder={`Draft ${project.patternVersions.length + 1}`} /><input value={versionNotes} onChange={(event) => setVersionNotes(event.target.value)} placeholder="Changes included in this copy" /><button onClick={addPatternVersion}>Create version</button></div></section>
    <div className="records-grid"><section className="record-card"><p className="eyebrow">ADD ITERATION</p><h2>Start another muslin</h2><div className="inline-record-form single"><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Muslin 1 · initial fit" /><button disabled={!label.trim()} onClick={addMuslin}>Add muslin</button></div></section><section className="record-card"><p className="eyebrow">PATTERN DECISION</p><h2>Record a lasting change</h2><div className="stacked-record-form"><input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Short decision title" /><textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="What changed, where, by how much, and why?" /><button disabled={!noteTitle.trim() || !noteBody.trim()} onClick={addPatternNote}>Save pattern note</button></div></section></div>
    <section className="pattern-note-history"><p className="eyebrow">PATTERN NOTES</p>{project.patternNotes.map((note) => <article key={note.id}><span>{note.category}</span><div><h3>{note.title}</h3><p>{note.body}</p><small>{new Date(note.updatedAt).toLocaleDateString()}</small></div></article>)}</section>
  </section>;
}
