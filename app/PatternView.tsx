"use client";

import { useMemo, useState } from "react";
import type { Measurement, ProjectState } from "../lib/project";
import { buildPatternPlan, missingCoreMeasurements, patternMarks, type PatternPiece } from "../lib/pattern";
import { buildPatternGeometry } from "../lib/pattern-geometry";
import { canonicalMm, type UnitSystem } from "../lib/units";
import CalculatedPatternCanvas from "./CalculatedPatternCanvas";
import { LengthValue, RichMeasurementText } from "./LengthValue";

type Props = {
  measurements: Measurement[];
  onChange: (id: string, update: Partial<Measurement>) => void;
  onAdd: (measurement: Measurement) => void;
  onRemove: (id: string) => void;
  onOpenDressPlan: () => void;
  neckline: ProjectState["neckline"];
  unitSystem: UnitSystem;
};

export default function PatternView({ measurements, onChange, onAdd, onRemove, onOpenDressPlan, neckline, unitSystem }: Props) {
  const [piece, setPiece] = useState<PatternPiece>("front");
  const [selectedId, setSelectedId] = useState("full-bust");
  const [newLabel, setNewLabel] = useState("");
  const [newHint, setNewHint] = useState("");
  const [newValue, setNewValue] = useState("");

  const selectedMark = patternMarks.find((mark) => mark.id === selectedId);
  const selectedMeasurement = measurements.find((item) => item.id === selectedId);
  const plan = useMemo(() => buildPatternPlan(measurements, unitSystem), [measurements, unitSystem]);
  const missing = useMemo(() => missingCoreMeasurements(measurements), [measurements]);
  const geometry = useMemo(() => buildPatternGeometry(measurements, piece, neckline, unitSystem), [measurements, piece, neckline, unitSystem]);
  const geometryRevision = useMemo(() => `${piece}-${neckline}-${unitSystem}-${measurements.map((item) => `${item.id}:${item.canonicalMm ?? item.value}:${item.unit}`).join("|")}`, [measurements, piece, neckline, unitSystem]);

  const addMeasurement = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = `custom-${Date.now().toString(36)}`;
    onAdd({ id, label, value: newValue.trim(), unit: unitSystem === "metric" ? "cm" : "in", hint: newHint.trim() || "Custom drafting measurement" });
    setSelectedId(id);
    setNewLabel("");
    setNewHint("");
    setNewValue("");
  };

  return (
    <section className="view-page pattern-page">
      <div className="view-title">
        <div><p className="eyebrow">LIVE CUSTOM PATTERN</p><h1>Interactive pattern</h1><p>Select any marking to understand it, measure it, and update the same value used throughout your project.</p></div>
        <span className="count-chip">{measurements.filter((item) => item.value.trim()).length}/{measurements.length} recorded</span>
      </div>

      <div className="pattern-layout">
        <div className="pattern-stage-card">
          <div className="pattern-toolbar" aria-label="Choose pattern piece">
            <div><strong>Calculated boat-neck top half pattern</strong><small>Fitted woven top · tap a numbered marking</small></div>
            <div className="pattern-piece-toggle">
              {(["front", "back"] as const).map((choice) => <button key={choice} className={piece === choice ? "selected" : ""} onClick={() => {
                setPiece(choice);
                const currentMark = patternMarks.find((mark) => mark.id === selectedId);
                if (!currentMark?.pieces.includes(choice)) setSelectedId(choice === "front" ? "full-bust" : "back-width");
              }}>{choice}</button>)}
            </div>
          </div>
          <CalculatedPatternCanvas geometry={geometry} selectedId={selectedId} onSelect={setSelectedId} revision={geometryRevision} />
          <p className="pattern-caption"><strong>{geometry.measuredCount}/{geometry.totalCoreCount} geometry inputs are measured.</strong> Blank or invalid inputs use clearly marked provisional values. Use this as a high-fidelity draft and confirm the final seam shape in muslin before cutting fashion fabric.</p>
        </div>

        <aside className="pattern-detail-card" aria-live="polite">
          {selectedMark && selectedMeasurement ? (
            <>
              <p className="eyebrow">SELECTED MARKING</p>
              <h2>{selectedMark.title}</h2>
              <p>{selectedMark.explanation}</p>
              <div className="pattern-why"><strong>How it changes the pattern</strong><p>{selectedMark.draftingUse}</p></div>
              <label className="pattern-value-editor"><span>{selectedMeasurement.label}</span><small>{selectedMark.measuringTip}</small><div><input inputMode="decimal" value={selectedMeasurement.value} placeholder="—" onChange={(event) => onChange(selectedMeasurement.id, { value: event.target.value })} /><span className="unit-suffix">{unitSystem === "metric" ? "cm" : "in"}</span></div></label>
              <div className="geometry-feedback">
                <strong>Live geometry checks</strong>
                <ul>{geometry.invariants.map((item) => <li className={item.ok ? "ok" : "warning"} key={item.id}><span>{item.ok ? "✓" : "!"}</span><p><b>{item.label}</b>{item.detail}</p></li>)}</ul>
                {geometry.warnings.map((warning) => <p className="geometry-warning" key={warning}>{warning}</p>)}
              </div>
              <p className="sync-note"><span>↻</span><strong>Synced everywhere</strong>This value also changes Measurements, Top Plan, and your exports.</p>
            </>
          ) : selectedMeasurement ? (
            <>
              <p className="eyebrow">CUSTOM MEASUREMENT</p><h2>{selectedMeasurement.label}</h2>
              <label className="pattern-text-editor"><span>Name</span><input value={selectedMeasurement.label} onChange={(event) => onChange(selectedMeasurement.id, { label: event.target.value })} /></label>
              <label className="pattern-text-editor"><span>How to measure it</span><textarea value={selectedMeasurement.hint} onChange={(event) => onChange(selectedMeasurement.id, { hint: event.target.value })} /></label>
              <label className="pattern-value-editor"><span>Recorded value</span><div><input inputMode="decimal" value={selectedMeasurement.value} placeholder="—" onChange={(event) => onChange(selectedMeasurement.id, { value: event.target.value })} /><span className="unit-suffix">{unitSystem === "metric" ? "cm" : "in"}</span></div></label>
              <button className="text-button destructive-text" onClick={() => { onRemove(selectedMeasurement.id); setSelectedId("full-bust"); }}>Remove custom measurement</button>
            </>
          ) : <p>Select a pattern marking to begin.</p>}
        </aside>
      </div>

      <div className="pattern-lower-grid">
        <section className="draft-output-card">
          <div className="section-heading"><div><p className="eyebrow">LIVE DRAFT OUTPUTS</p><h2>Numbers carried into the top plan</h2></div><button onClick={onOpenDressPlan}>Open top plan →</button></div>
          <div className="draft-output-list">
            {plan.map((row) => <div key={row.label}><span><strong>{row.label}</strong><small><RichMeasurementText unitSystem={unitSystem}>{row.detail}</RichMeasurementText></small></span><b className={row.canonicalMm === null ? "missing" : ""}>{row.canonicalMm === null ? row.value : <><LengthValue mm={row.canonicalMm} unitSystem={unitSystem} />{row.valueSuffix}</>}</b></div>)}
          </div>
          {missing.length > 0 && <p className="pattern-missing">Add {missing.length} remaining core {missing.length === 1 ? "measurement" : "measurements"} to complete every live output.</p>}
        </section>

        <section className="all-measurements-card">
          <div><p className="eyebrow">EVERY MEASUREMENT</p><h2>Edit or add a drafting value</h2></div>
          <div className="pattern-measure-list">
            {measurements.map((measurement) => { const mm = canonicalMm(measurement); return <button key={measurement.id} className={selectedId === measurement.id ? "selected" : ""} onClick={() => { setSelectedId(measurement.id); const mark = patternMarks.find((item) => item.id === measurement.id); if (mark && !mark.pieces.includes(piece)) setPiece(mark.pieces[0]); }}><span><strong>{measurement.label}</strong><small>{measurement.hint}</small></span><b>{mm === null ? "Add" : <LengthValue mm={mm} unitSystem={unitSystem} />}</b></button>; })}
          </div>
          <div className="add-measurement-form">
            <h3>Add a custom measurement</h3>
            <label><span>Name</span><input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} placeholder="Boat-neck width" /></label>
            <label><span>How to measure it</span><input value={newHint} onChange={(event) => setNewHint(event.target.value)} placeholder="Finished neckline width from shoulder to shoulder" /></label>
            <label><span>Value</span><div><input inputMode="decimal" value={newValue} onChange={(event) => setNewValue(event.target.value)} placeholder="—" /><span className="unit-suffix">{unitSystem === "metric" ? "cm" : "in"}</span></div></label>
            <button className="primary" disabled={!newLabel.trim()} onClick={addMeasurement}>Add measurement <span>＋</span></button>
          </div>
        </section>
      </div>
    </section>
  );
}
