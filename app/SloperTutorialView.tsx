"use client";

import { useMemo, useState } from "react";
import type { Measurement, ProjectTask, TaskStatus } from "../lib/project";
import { buildSloperCalculations, bustDartTable, sloperSteps, sloperVideoUrl, standardProportionExamples } from "../lib/sloper-tutorial";
import { canonicalMm, type UnitSystem } from "../lib/units";
import { LengthValue, RichMeasurementText } from "./LengthValue";

type Props = {
  measurements: Measurement[];
  tasks: ProjectTask[];
  onMeasurementChange: (id: string, update: Partial<Measurement>) => void;
  onTaskStatus: (task: ProjectTask, status: TaskStatus) => void;
  onOpenPattern: () => void;
  unitSystem: UnitSystem;
};

const unlocked = (task: ProjectTask, tasks: ProjectTask[]) =>
  (task.dependsOn ?? []).every((id) => tasks.find((item) => item.id === id)?.status === "done");

export default function SloperTutorialView({ measurements, tasks, onMeasurementChange, onTaskStatus, onOpenPattern, unitSystem }: Props) {
  const firstOpen = sloperSteps.find((step) => tasks.find((task) => task.id === step.taskId)?.status !== "done")?.id ?? sloperSteps[0].id;
  const [selectedId, setSelectedId] = useState(firstOpen);
  const selected = sloperSteps.find((step) => step.id === selectedId) ?? sloperSteps[0];
  const task = tasks.find((item) => item.id === selected.taskId);
  const calculations = useMemo(() => buildSloperCalculations(measurements), [measurements]);
  const selectedCalculations = calculations.filter((calculation) => selected.formulaKeys?.includes(calculation.key));
  const doneSteps = sloperSteps.filter((step) => tasks.find((item) => item.id === step.taskId)?.status === "done").length;
  const bustMm = canonicalMm(measurements.find((measurement) => measurement.id === "full-bust"));
  const bustCm = bustMm === null ? null : bustMm / 10;
  const closestDartBust = bustCm === null ? null : bustDartTable.reduce((closest, row) => Math.abs(row[0] - bustCm) < Math.abs(closest[0] - bustCm) ? row : closest, bustDartTable[0]);

  return (
    <section className="view-page tutorial-page">
      <div className="view-title tutorial-title">
        <div>
          <p className="eyebrow">CREATIVE BOBBIN METHOD · INTERACTIVE FIELD GUIDE</p>
          <h1>Draft your fitted bodice block</h1>
          <p>A detailed, paraphrased companion to Ally&apos;s video. Enter measurements, follow one focused session at a time, and send completed work straight into your project roadmap.</p>
        </div>
        <span className="count-chip">{doneSteps}/{sloperSteps.length} tutorial sessions</span>
      </div>

      <div className="tutorial-source-bar">
        <span className="source-mark">▶</span>
        <div><strong>How to draft a bodice block (or sloper) from your own measurements</strong><small>Creative Bobbin · native metric method · this page follows your global unit preference</small></div>
        <span className="tutorial-source-links"><a href={sloperVideoUrl} target="_blank" rel="noreferrer">Video ↗</a><a href="https://www.creativebobbin.com/bodice-instructions" target="_blank" rel="noreferrer">37 written steps ↗</a></span>
      </div>

      <div className="tutorial-shell">
        <aside className="tutorial-rail" aria-label="Tutorial sessions">
          <div className="tutorial-progress"><span style={{ width: `${(doneSteps / sloperSteps.length) * 100}%` }} /></div>
          {sloperSteps.map((step, index) => {
            const linked = tasks.find((item) => item.id === step.taskId);
            const isLocked = linked ? !unlocked(linked, tasks) : false;
            return (
              <button key={step.id} className={`${selected.id === step.id ? "selected" : ""} ${linked?.status ?? "ready"}`} onClick={() => setSelectedId(step.id)}>
                <span>{linked?.status === "done" ? "✓" : String(index + 1).padStart(2, "0")}</span>
                <span><strong>{step.title}</strong><small>{step.chapter}{isLocked ? " · roadmap locked" : ""}</small></span>
              </button>
            );
          })}
        </aside>

        <article className="tutorial-workspace">
          <div className="tutorial-session-head">
            <div><p className="eyebrow">30-MINUTE WORK SESSION</p><h2>{selected.title}</h2><p>{selected.purpose}</p></div>
            <span className={`status-chip ${task?.status ?? "ready"}`}>{task?.status === "in-progress" ? "In progress" : task?.status === "done" ? "Done" : task && !unlocked(task, tasks) ? "Roadmap locked" : "Ready"}</span>
          </div>

          <div className="tutorial-video">
            <iframe
              key={selected.id}
              src={`https://www.youtube-nocookie.com/embed/FtM77bhD1uk?start=${selected.seconds}`}
              title={`${selected.title} — Creative Bobbin video at ${selected.chapter}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
            <div><b>Watch from this point</b><span>{selected.chapter}</span><a href={`${sloperVideoUrl}&t=${selected.seconds}s`} target="_blank" rel="noreferrer">Open at timestamp ↗</a></div>
          </div>

          {selected.measurementIds.length > 0 && (
            <section className="tutorial-measures">
              <div className="tutorial-section-title"><span>01</span><div><h3>Measurements used here</h3><p>Edits save everywhere: Measurements, Pattern, Top plan, export and this tutorial.</p></div></div>
              <div className="tutorial-measure-grid">
                {selected.measurementIds.map((id) => {
                  const measurement = measurements.find((item) => item.id === id);
                  if (!measurement) return null;
                  return (
                    <label key={id}>
                      <span><strong>{measurement.label}</strong><small>{measurement.hint}</small></span>
                      <div><input aria-label={measurement.label} inputMode="decimal" value={measurement.value} placeholder="—" onChange={(event) => onMeasurementChange(id, { value: event.target.value })} /><span className="unit-suffix">{unitSystem === "metric" ? "cm" : "in"}</span></div>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {selectedCalculations.length > 0 && (
            <section className="tutorial-calculations" aria-live="polite">
              <div className="tutorial-section-title"><span>02</span><div><h3>Your live drafting numbers</h3><p>Calculated from the measurements above and shown in your selected unit system.</p></div></div>
              <div className="formula-grid">
                {selectedCalculations.map((calculation) => <div className={calculation.value === null ? "missing" : ""} key={calculation.key}><small>{calculation.label}</small><strong>{calculation.value === null ? "Add measurements" : <LengthValue mm={calculation.value * 10} unitSystem={unitSystem} />}</strong><p><RichMeasurementText unitSystem={unitSystem}>{calculation.note}</RichMeasurementText></p></div>)}
              </div>
            </section>
          )}

          {(selected.id === "front-frame" || selected.id === "front-dart") && (
            <section className="bust-reference">
              <div className="tutorial-section-title"><span>↔</span><div><h3>Bust-to-dart conversion</h3><p>Verified against Creative Bobbin&apos;s published table. Values between rows are interpolated; the muslin decides the final intake.</p></div></div>
              <div className="bust-reference-callout">
                <span>Your current full bust</span>
                <strong>{bustMm === null ? "Add full bust" : <LengthValue mm={bustMm} unitSystem={unitSystem} />}</strong>
                <span>Suggested shoulder-dart width</span>
                <strong>{calculations.find((item) => item.key === "dartWidth")?.value == null ? "Waiting for bust" : <LengthValue mm={(calculations.find((item) => item.key === "dartWidth")?.value ?? 0) * 10} unitSystem={unitSystem} />}</strong>
              </div>
              <div className="dart-table-wrap">
                <table><thead><tr><th>Bust</th><th>Shoulder-dart width</th></tr></thead><tbody>{bustDartTable.map(([tableBust, dart]) => <tr className={closestDartBust?.[0] === tableBust ? "closest" : ""} key={tableBust}><td><LengthValue mm={tableBust * 10} unitSystem={unitSystem} /></td><td><LengthValue mm={dart * 10} unitSystem={unitSystem} /></td></tr>)}</tbody></table>
              </div>
              <details className="proportion-examples"><summary>See the three published standard-proportion examples</summary><div>{standardProportionExamples.map((example) => <article key={example.bustCm}><span><small>Bust</small><LengthValue mm={example.bustCm * 10} unitSystem={unitSystem} /></span><span><small>Shoulder</small><LengthValue mm={example.shoulderCm * 10} unitSystem={unitSystem} /></span><span><small>Dart</small><LengthValue mm={example.dartCm * 10} unitSystem={unitSystem} /></span><span><small>Front/back difference</small><LengthValue mm={example.balanceCm * 10} unitSystem={unitSystem} /></span></article>)}</div></details>
              <p className="full-bust-note"><strong>Full-bust note:</strong> A full bust on a smaller frame may need a wider fitted dart than the table suggests. A steep-looking front shoulder is expected while the dart is open; it levels when the dart closes. Confirm shoulder length and adjust on the muslin.</p>
            </section>
          )}

          <section className="tutorial-instructions">
            <div className="tutorial-section-title"><span>{selected.measurementIds.length || selectedCalculations.length ? "03" : "01"}</span><div><h3>Do this on the table</h3><p>Keep construction lines light until the muslin confirms them.</p></div></div>
            <ol>{selected.actions.map((action) => <li key={action}><span><RichMeasurementText unitSystem={unitSystem}>{action}</RichMeasurementText></span></li>)}</ol>
          </section>

          <section className="tutorial-checks">
            <h3>Pause and verify</h3>
            <div>{selected.checks.map((check) => <span key={check}>✓ {check}</span>)}</div>
          </section>

          <div className="tutorial-actions">
            {task && task.status !== "done" && unlocked(task, tasks) && <button className="primary" onClick={() => onTaskStatus(task, task.status === "in-progress" ? "done" : "in-progress")}>{task.status === "in-progress" ? "Complete this session ✓" : "Start this session →"}</button>}
            {task?.status === "done" && <button className="text-button" onClick={() => onTaskStatus(task, "ready")}>Reopen this session</button>}
            {task && !unlocked(task, tasks) && <p>Complete its earlier roadmap dependencies before recording this session as started.</p>}
            <button className="text-button" onClick={onOpenPattern}>See measurements on the pattern →</button>
          </div>
        </article>
      </div>

      <p className="tutorial-attribution">This field guide paraphrases the linked Creative Bobbin video and cross-checks its formulas against the creator&apos;s written 37-step guide. The written guide specifies neck ÷ 5 + <LengthValue mm={5} unitSystem={unitSystem} /> for the front neck drop, which is the value used here. The muslin fitting—not arithmetic alone—determines the final block.</p>
    </section>
  );
}
