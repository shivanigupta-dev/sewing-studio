"use client";

import { useMemo, useState } from "react";
import type { Measurement, ProjectTask, TaskStatus } from "../lib/project";
import {
  boatNeckDressVideoUrl,
  boatNeckPresetDefinitions,
  boatNeckTutorialSteps,
  type BoatNeckDraftingPreset,
} from "../lib/boat-neck-tutorial";
import { canonicalMm, formatEditableMm, type UnitSystem } from "../lib/units";
import { RichMeasurementText } from "./LengthValue";

type Props = {
  measurements: Measurement[];
  tasks: ProjectTask[];
  unitSystem: UnitSystem;
  onMeasurementChange: (id: string, update: Partial<Measurement>) => void;
  onUpsertMeasurement: (measurement: Measurement) => void;
  onTaskStatus: (task: ProjectTask, status: TaskStatus) => void;
  onOpenPattern: () => void;
  onOpenMuslins: () => void;
};

function displayStatus(task?: ProjectTask) {
  if (!task) return "Guide only";
  if (task.status === "in-progress") return "In progress";
  return task.status.charAt(0).toUpperCase() + task.status.slice(1);
}

/**
 * This view deliberately links to existing roadmap tasks instead of creating a
 * second checklist. A completed guide session is therefore the same durable
 * project event shown on Overview, Tasks and exported backups.
 */
export default function BoatNeckTutorialView({
  measurements,
  tasks,
  unitSystem,
  onMeasurementChange,
  onUpsertMeasurement,
  onTaskStatus,
  onOpenPattern,
  onOpenMuslins,
}: Props) {
  const firstOpen = boatNeckTutorialSteps.find((step) => tasks.find((task) => task.id === step.taskId)?.status !== "done")?.id ?? boatNeckTutorialSteps[0].id;
  const [selectedId, setSelectedId] = useState(firstOpen);
  const selected = boatNeckTutorialSteps.find((step) => step.id === selectedId) ?? boatNeckTutorialSteps[0];
  const linkedTask = tasks.find((task) => task.id === selected.taskId);
  const doneCount = boatNeckTutorialSteps.filter((step) => tasks.find((task) => task.id === step.taskId)?.status === "done").length;
  const measurementsById = useMemo(() => new Map(measurements.map((measurement) => [measurement.id, measurement])), [measurements]);

  const measurementFor = (id: string) => measurementsById.get(id) ?? boatNeckPresetDefinitions[id as BoatNeckDraftingPreset["id"]];

  const changeMeasurement = (id: string, value: string) => {
    const existing = measurementsById.get(id);
    if (existing) {
      onMeasurementChange(id, { value });
      return;
    }
    const preset = boatNeckPresetDefinitions[id as BoatNeckDraftingPreset["id"]];
    if (!preset) return;
    onUpsertMeasurement({ id, label: preset.label, hint: preset.hint, value, unit: unitSystem === "metric" ? "cm" : "in" });
  };

  const applyPreset = (preset: BoatNeckDraftingPreset) => {
    onUpsertMeasurement({
      id: preset.id,
      label: preset.label,
      hint: preset.hint,
      value: formatEditableMm(preset.canonicalMm, unitSystem),
      unit: unitSystem === "metric" ? "cm" : "in",
      canonicalMm: preset.canonicalMm,
      sourceUnit: "cm",
    });
  };

  return (
    <section className="view-page tutorial-page boat-guide-page">
      <div className="view-title tutorial-title">
        <div>
          <p className="eyebrow">PROJECT GUIDE · CREATIVE BOBBIN ADAPTATION</p>
          <h1>Draft the boat-neck top from your sloper</h1>
          <p>The video makes a fitted dress. This guide keeps its useful neckline, ease and fitting operations, then translates them into your shorter darted shell with a slight high-hip flare.</p>
        </div>
        <span className="count-chip">{doneCount}/{boatNeckTutorialSteps.length} linked sessions</span>
      </div>

      <div className="tutorial-source-bar">
        <span className="source-mark">▶</span>
        <div><strong>How to make a perfect fitting little black dress</strong><small>Creative Bobbin · source dress tutorial · instructions below are paraphrased and adapted to this top</small></div>
        <span className="tutorial-source-links"><a href={boatNeckDressVideoUrl} target="_blank" rel="noreferrer">Full video ↗</a><a href={`${boatNeckDressVideoUrl}&t=${selected.seconds}s`} target="_blank" rel="noreferrer">Selected timestamp ↗</a></span>
      </div>

      <section className="adaptation-ledger" aria-label="What transfers from the dress tutorial">
        <article className="use"><span>USE DIRECTLY</span><strong>Precise drafting operations</strong><p><RichMeasurementText unitSystem={unitSystem}>[length:3:cm:8] total ease · [length:0.75:cm:16] armhole drop · [length:1.5:cm:8] initial front-neck drop · small neckline-gape suppression</RichMeasurementText></p></article>
        <article className="translate"><span>TRANSLATE</span><strong>Dress → hip-length shell</strong><p>End at your measured high hip, keep a fitted waist, and blend only a slight release into the hem.</p></article>
        <article className="skip"><span>DO NOT COPY</span><strong>Dress-only structure</strong><p>Skip the skirt block, deep-V back, dart-to-princess conversion and any dart move made solely to align dress panels.</p></article>
      </section>

      <div className="tutorial-shell">
        <aside className="tutorial-rail" aria-label="Boat-neck drafting sessions">
          <div className="tutorial-progress"><span style={{ width: `${(doneCount / boatNeckTutorialSteps.length) * 100}%` }} /></div>
          {boatNeckTutorialSteps.map((step, index) => {
            const task = tasks.find((item) => item.id === step.taskId);
            return (
              <button key={step.id} className={`${selected.id === step.id ? "selected" : ""} ${task?.status ?? "ready"}`} onClick={() => setSelectedId(step.id)}>
                <span>{task?.status === "done" ? "✓" : String(index + 1).padStart(2, "0")}</span>
                <span><strong>{step.title}</strong><small>{step.chapter} · {displayStatus(task)}</small></span>
              </button>
            );
          })}
        </aside>

        <article className="tutorial-workspace">
          <div className="tutorial-session-head">
            <div><p className="eyebrow">FOCUSED DRAFTING SESSION</p><h2>{selected.title}</h2><p>{selected.purpose}</p></div>
            <span className={`status-chip ${linkedTask?.status ?? "ready"}`}>{displayStatus(linkedTask)}</span>
          </div>

          <div className="tutorial-video">
            <iframe
              key={selected.id}
              src={`https://www.youtube-nocookie.com/embed/c7RhIVNXd-E?start=${selected.seconds}`}
              title={`${selected.title} — Creative Bobbin at ${selected.chapter}`}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
            <div><b>Watch this section</b><span>{selected.chapter} · opens at the relevant operation</span><a href={`${boatNeckDressVideoUrl}&t=${selected.seconds}s`} target="_blank" rel="noreferrer">Open on YouTube ↗</a></div>
          </div>

          <section className="source-adaptation-grid">
            <article><span>IN THE VIDEO</span><p><RichMeasurementText unitSystem={unitSystem}>{selected.sourceLesson}</RichMeasurementText></p></article>
            <article><span>FOR YOUR TOP</span><p><RichMeasurementText unitSystem={unitSystem}>{selected.topAdaptation}</RichMeasurementText></p></article>
          </section>

          {selected.measurementIds.length > 0 && (
            <section className="tutorial-measures">
              <div className="tutorial-section-title"><span>01</span><div><h3>Live project values</h3><p>Edits save to this project and update the Pattern and Project plan immediately.</p></div></div>
              <div className="tutorial-measure-grid">
                {selected.measurementIds.map((id) => {
                  const measurement = measurementFor(id);
                  if (!measurement) return null;
                  const persisted = measurementsById.get(id);
                  const preset = boatNeckPresetDefinitions[id as BoatNeckDraftingPreset["id"]];
                  const valueMm = persisted ? canonicalMm(persisted) : null;
                  return (
                    <label key={id} className={preset && !persisted ? "preset-missing" : ""}>
                      <span><strong>{measurement.label}</strong><small>{measurement.hint}</small>{preset && <em>{preset.sourceLabel}</em>}</span>
                      <div className="guide-value-control">
                        <div><input aria-label={measurement.label} inputMode="decimal" value={persisted?.value ?? ""} placeholder="—" onChange={(event) => changeMeasurement(id, event.target.value)} /><span className="unit-suffix">{unitSystem === "metric" ? "cm" : "in"}</span></div>
                        {preset && valueMm !== preset.canonicalMm && <button type="button" onClick={(event) => { event.preventDefault(); applyPreset(preset); }}>Use video value</button>}
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          <section className="tutorial-instructions">
            <div className="tutorial-section-title"><span>{selected.measurementIds.length ? "02" : "01"}</span><div><h3>Do this on the paper</h3><p>Work from the fitted sloper seam line. Let the muslin—not the source garment—approve the final amount.</p></div></div>
            <ol>{selected.actions.map((action) => <li key={action}><span><RichMeasurementText unitSystem={unitSystem}>{action}</RichMeasurementText></span></li>)}</ol>
          </section>

          <section className="tutorial-checks">
            <h3>Pause and verify</h3>
            <div>{selected.checks.map((check) => <span key={check}>✓ {check}</span>)}</div>
          </section>

          <div className="tutorial-actions">
            {linkedTask && linkedTask.status !== "done" && <button className="primary" onClick={() => onTaskStatus(linkedTask, linkedTask.status === "in-progress" ? "done" : "in-progress")}>{linkedTask.status === "in-progress" ? "Complete linked story ✓" : "Start linked story →"}</button>}
            {linkedTask?.status === "done" && <button className="text-button" onClick={() => onTaskStatus(linkedTask, "ready")}>Reopen linked story</button>}
            <button className="text-button" onClick={onOpenPattern}>See live pattern →</button>
            <button className="text-button" onClick={onOpenMuslins}>Open muslin record →</button>
          </div>
        </article>
      </div>

      <p className="tutorial-attribution">Source values are attributed to the linked Creative Bobbin tutorial and shown in your selected unit system. The creator&apos;s dress uses princess seams, a skirt block and a deep-V back; this project guide deliberately excludes those operations. All final neckline, armhole, dart and ease decisions require a muslin.</p>
    </section>
  );
}
