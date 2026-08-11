"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type FittingEntry,
  type ProjectState,
  type ProjectTask,
  type TaskStatus,
} from "../lib/project";
import { buildPatternPlan, missingCoreMeasurements } from "../lib/pattern";
import { applyPatternQaProfile, patternQaProfiles, type PatternQaProfile } from "../lib/pattern-qa";
import BackupView, { useLocalBackup } from "./BackupView";
import PatternView from "./PatternView";
import SloperTutorialView from "./SloperTutorialView";
import BoatNeckTutorialView from "./BoatNeckTutorialView";
import { normalizeLengthRecord, updateLengthRecord, type UnitSystem } from "../lib/units";
import { LengthValue, RichMeasurementText } from "./LengthValue";
import WorkspaceHome from "./WorkspaceHome";
import StudioView from "./StudioView";
import { ProjectMaterialsView, ProjectMuslinsView } from "./ProjectRecordsView";
import { loadBrowserWorkspace, saveBrowserWorkspace } from "../lib/browser-workspace-store";
import {
  createBlankWorkspace,
  createSampleWorkspace,
  initialWorkspaceFromProject,
  setTaskStatusInList,
  supportsBodiceGeometry,
  upgradeWorkspaceState,
  type MeasurementProfile,
  type SewingProject,
  type SharedNote,
  type SloperResource,
  type TechniqueResource,
  type WorkspaceState,
} from "../lib/workspace";

type View = "home" | "studio" | "studio-tutorial" | "studio-pattern" | "project-overview" | "project-tasks" | "project-measurements" | "project-pattern" | "project-guide" | "project-fit" | "project-muslins" | "project-materials" | "project-plan" | "backup";
type SaveState = "loading" | "saved" | "saving" | "error";

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

function isUnlocked(task: ProjectTask, tasks: ProjectTask[]) {
  return (task.dependsOn ?? []).every((id) => tasks.find((item) => item.id === id)?.status === "done");
}

function statusLabel(status: TaskStatus) {
  return status === "in-progress" ? "In progress" : status.charAt(0).toUpperCase() + status.slice(1);
}

export default function SewingWorkbench() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => initialWorkspaceFromProject());
  const [needsSetup, setNeedsSetup] = useState(false);
  const [view, setView] = useState<View>("home");
  const [studioSloperId, setStudioSloperId] = useState("sample-fitted-bodice-v1");
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<string>("All phases");
  const [logKind, setLogKind] = useState<FittingEntry["kind"]>("fit");
  const [logTitle, setLogTitle] = useState("");
  const [logBody, setLogBody] = useState("");
  const [newMeasurementLabel, setNewMeasurementLabel] = useState("");
  const [newMeasurementValue, setNewMeasurementValue] = useState("");
  const hydrated = useRef(false);
  const skipNextAutoSave = useRef(false);
  const localBackup = useLocalBackup();
  const backupAfterBrowserSave = localBackup.backupAfterBrowserSave;

  const project = (workspace.projects.find((item) => item.id === workspace.activeProjectId) ?? workspace.projects[0])!;
  const projectHasPatternEngine = supportsBodiceGeometry(project, workspace.slopers);

  // All existing project views use this narrow updater.  Keeping the mutation
  // boundary here makes it impossible for a project form to overwrite shared
  // profiles, slopers or another project's state.
  const setProject = (updater: SewingProject | ((current: SewingProject) => SewingProject)) => {
    if (!project) return;
    setWorkspace((current) => ({
      ...current,
      projects: current.projects.map((item) => {
        if (item.id !== project.id) return item;
        const next = typeof updater === "function" ? updater(item) : updater;
        return { ...next, updatedAt: new Date().toISOString() };
      }),
    }));
  };

  useEffect(() => {
    loadBrowserWorkspace()
      .then((saved) => {
        if (!saved) {
          setNeedsSetup(true);
          setSaveState("saved");
          return;
        }
        const loadedWorkspace = upgradeWorkspaceState(saved);
        const qaProfile = ["localhost", "127.0.0.1"].includes(window.location.hostname) ? new URLSearchParams(window.location.search).get("patternQa") : null;
        if (qaProfile && qaProfile in patternQaProfiles) {
          skipNextAutoSave.current = true;
          const activeId = loadedWorkspace.activeProjectId ?? loadedWorkspace.projects[0]?.id;
          setWorkspace({ ...loadedWorkspace, projects: loadedWorkspace.projects.map((item) => {
            if (item.id !== activeId) return item;
            const qa = applyPatternQaProfile(item, qaProfile as PatternQaProfile);
            return { ...item, measurements: qa.measurements, stripeStart: qa.stripeStart, neckline: qa.neckline, zipper: qa.zipper, projectNote: qa.projectNote, unitSystem: qa.unitSystem };
          }) });
          setView("project-pattern");
        } else {
          setWorkspace(loadedWorkspace);
        }
        setUpdatedAt(new Date().toISOString());
        setSaveState("saved");
        hydrated.current = true;
      })
      .catch(() => {
        setSaveState("error");
        hydrated.current = true;
      });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);

  useEffect(() => {
    if (!hydrated.current) return;
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    // Persist one coherent aggregate after hydration. JSON remains the
    // portable backup; IndexedDB is the convenient browser-owned working copy.
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      try {
        await saveBrowserWorkspace(workspace);
        const savedAt = new Date().toISOString();
        setUpdatedAt(savedAt);
        setSaveState("saved");
        void backupAfterBrowserSave(workspace);
      } catch {
        setSaveState("error");
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [workspace, backupAfterBrowserSave]);

  const restoreWorkspace = async (restoredData: WorkspaceState) => {
    const restoredWorkspace = upgradeWorkspaceState(restoredData);
    setSaveState("saving");
    await saveBrowserWorkspace(restoredWorkspace);
    skipNextAutoSave.current = true;
    setWorkspace(copy(restoredWorkspace));
    setUpdatedAt(new Date().toISOString());
    setSaveState("saved");
    await localBackup.backupAfterBrowserSave(restoredWorkspace);
  };

  const beginWorkspace = async (kind: "sample" | "blank") => {
    const created = kind === "sample" ? createSampleWorkspace() : createBlankWorkspace();
    await saveBrowserWorkspace(created);
    skipNextAutoSave.current = true;
    hydrated.current = true;
    setWorkspace(created);
    setUpdatedAt(new Date().toISOString());
    setNeedsSetup(false);
    setSaveState("saved");
  };

  const doneCount = project.tasks.filter((task) => task.status === "done").length;
  const blockedCount = project.tasks.filter((task) => task.status === "blocked").length;
  const progress = Math.round((doneCount / project.tasks.length) * 100);
  const activeTask = project.tasks.find((task) => task.id === project.activeTaskId && task.status !== "done");
  const suggestedTask = project.tasks.find((task) => task.status === "ready" && isUnlocked(task, project.tasks));
  const focusTask = activeTask ?? suggestedTask;
  const projectPhases = useMemo(() => Array.from(new Set(project.tasks.map((task) => task.phase))), [project.tasks]);
  const completedPhases = projectPhases.filter((phase) => {
    const tasks = project.tasks.filter((task) => task.phase === phase);
    return tasks.length > 0 && tasks.every((task) => task.status === "done");
  }).length;
  const hoursDone = doneCount * 0.5;
  const patternPlan = useMemo(() => buildPatternPlan(project.measurements, workspace.unitSystem), [project.measurements, workspace.unitSystem]);
  const patternMissing = useMemo(() => missingCoreMeasurements(project.measurements), [project.measurements]);

  const updateMeasurement = (id: string, update: Partial<ProjectState["measurements"][number]>) => {
    setProject((current) => ({
      ...current,
      measurements: current.measurements.map((item) => {
        if (item.id !== id) return item;
        const value = update.value;
        const withMetadata = {
          ...item,
          ...(update.label === undefined ? {} : { label: update.label }),
          ...(update.hint === undefined ? {} : { hint: update.hint }),
        };
        return value === undefined ? withMetadata : updateLengthRecord(withMetadata, value, current.unitSystem);
      }),
    }));
  };

  // Tutorial presets are optional project adjustments, not body dimensions.
  // Upserting keeps the guide useful for pre-existing workspaces without a
  // silent migration that would alter a sewist's accepted pattern geometry.
  const upsertProjectMeasurement = (measurement: ProjectState["measurements"][number]) => {
    setProject((current) => {
      const normalized = normalizeLengthRecord(measurement, current.unitSystem);
      const exists = current.measurements.some((item) => item.id === measurement.id);
      return {
        ...current,
        measurements: exists
          ? current.measurements.map((item) => item.id === measurement.id ? { ...item, ...normalized } : item)
          : [...current.measurements, normalized],
      };
    });
  };

  const addProjectMeasurement = () => {
    const label = newMeasurementLabel.trim();
    if (!label) return;
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "measurement";
    const measurement = normalizeLengthRecord({
      id: `custom-${slug}-${Date.now().toString(36)}`,
      label,
      value: newMeasurementValue.trim(),
      unit: workspace.unitSystem === "metric" ? "cm" : "in",
      hint: "Project-specific measurement",
    }, workspace.unitSystem);
    setProject((current) => ({ ...current, measurements: [...current.measurements, measurement] }));
    setNewMeasurementLabel("");
    setNewMeasurementValue("");
  };

  const setUnitSystem = (unitSystem: UnitSystem) => {
    setWorkspace((current) => current.unitSystem === unitSystem ? current : ({
      ...current,
      unitSystem,
      projects: current.projects.map((item) => ({ ...item, unitSystem, measurements: item.measurements.map((measurement) => normalizeLengthRecord(measurement, unitSystem)) })),
      measurementProfiles: current.measurementProfiles.map((profile) => ({ ...profile, measurements: profile.measurements.map((measurement) => normalizeLengthRecord(measurement, unitSystem)) })),
    }));
  };

  const updateTask = (id: string, update: Partial<ProjectTask>) => {
    setProject((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === id ? { ...task, ...update, updatedAt: new Date().toISOString() } : task)),
    }));
  };

  const setTaskStatus = (task: ProjectTask, status: TaskStatus) => {
    setProject((current) => ({
      ...current,
      activeTaskId: status === "in-progress" ? task.id : current.activeTaskId === task.id ? null : current.activeTaskId,
      tasks: current.tasks.map((item) => {
        if (item.id === task.id) return { ...item, status, updatedAt: new Date().toISOString() };
        if (status === "in-progress" && item.status === "in-progress") return { ...item, status: "ready", updatedAt: new Date().toISOString() };
        return item;
      }),
      fittingLog:
        status === "done"
          ? [
              {
                id: crypto.randomUUID(),
                schemaVersion: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                projectId: current.id,
                patternVersionId: current.patternVersions.find((version) => version.status === "accepted")?.id ?? current.patternVersions[0]?.id ?? null,
                kind: "win",
                title: `Finished: ${task.title}`,
                body: task.note?.trim() || "Story completed and the next dependency is ready.",
                date: new Date().toISOString(),
              },
              ...current.fittingLog,
            ]
          : current.fittingLog,
    }));
  };

  const addLog = () => {
    if (!logTitle.trim() || !logBody.trim()) return;
    setProject((current) => ({
      ...current,
      fittingLog: [
        { id: crypto.randomUUID(), schemaVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), projectId: current.id, patternVersionId: current.patternVersions.find((version) => version.status === "accepted")?.id ?? current.patternVersions[0]?.id ?? null, kind: logKind, title: logTitle.trim(), body: logBody.trim(), date: new Date().toISOString() },
        ...current.fittingLog,
      ],
    }));
    setLogTitle("");
    setLogBody("");
  };

  const openProject = (id: string) => {
    setWorkspace((current) => ({ ...current, activeProjectId: id }));
    setView("project-overview");
    setPhaseFilter("All phases");
  };

  const createProject = (created: SewingProject) => {
    setWorkspace((current) => ({ ...current, sampleData: false, activeProjectId: created.id, projects: [...current.projects, created] }));
    setView("project-overview");
  };

  const deleteProject = (id: string) => {
    const target = workspace.projects.find((item) => item.id === id);
    if (!target || !window.confirm(`Delete “${target.title}” and all of its project measurements, notes, fittings, and progress? Export a JSON backup first if you may need it later.`)) return;
    setWorkspace((current) => {
      const remaining = current.projects.filter((item) => item.id !== id);
      if (remaining.length) return { ...current, sampleData: false, projects: remaining, activeProjectId: remaining[0].id };
      return createBlankWorkspace(current.unitSystem);
    });
    setView("home");
  };

  const updateProfileMeasurement = (profileId: string, id: string, update: Partial<ProjectState["measurements"][number]>) => {
    setWorkspace((current) => ({
      ...current,
      measurementProfiles: current.measurementProfiles.map((profile) => profile.id !== profileId ? profile : {
        ...profile,
        updatedAt: new Date().toISOString(),
        measurements: profile.measurements.map((measurement) => {
          if (measurement.id !== id) return measurement;
          const value = update.value;
          const withMetadata = { ...measurement, ...(update.label === undefined ? {} : { label: update.label }), ...(update.hint === undefined ? {} : { hint: update.hint }) };
          return value === undefined ? withMetadata : updateLengthRecord(withMetadata, value, current.unitSystem);
        }),
      }),
    }));
  };

  const updateSloper = (id: string, update: Partial<SloperResource>) => setWorkspace((current) => ({
    ...current,
    slopers: current.slopers.map((sloper) => sloper.id === id ? { ...sloper, ...update, updatedAt: new Date().toISOString() } : sloper),
  }));

  const activeSloper = workspace.slopers.find((sloper) => sloper.id === studioSloperId) ?? workspace.slopers[0];
  const activeSloperProfile = workspace.measurementProfiles.find((profile) => profile.id === activeSloper?.measurementProfileId) ?? workspace.measurementProfiles[0];
  const setSloperTaskStatus = (task: ProjectTask, status: TaskStatus) => {
    if (!activeSloper) return;
    updateSloper(activeSloper.id, {
      tasks: setTaskStatusInList(activeSloper.tasks, task.id, status),
      activeTaskId: status === "in-progress" ? task.id : activeSloper.activeTaskId === task.id ? null : activeSloper.activeTaskId,
    });
  };

  const syncProjectFromProfile = () => {
    const profile = workspace.measurementProfiles.find((item) => item.id === project.measurementProfileId);
    if (!profile || !window.confirm(`Replace ${project.title}'s measurement snapshot with the current ${profile.name} values? Project-only measurement edits will be overwritten.`)) return;
    setProject((current) => ({ ...current, measurements: copy(profile.measurements) }));
  };

  const phaseStats = useMemo(
    () =>
      projectPhases.map((phase) => {
        const tasks = project.tasks.filter((task) => task.phase === phase);
        return { phase, tasks, done: tasks.filter((task) => task.status === "done").length };
      }),
    [project.tasks, projectPhases],
  );

  const globalNav: { id: View; label: string; icon: string }[] = [
    { id: "home", label: "Workspace", icon: "⌂" },
    { id: "studio", label: "Shared Studio", icon: "◎" },
    { id: "backup", label: "Export & backup", icon: "⇩" },
  ];
  const projectNav: { id: View; label: string; icon: string }[] = [
    { id: "project-overview", label: "Overview", icon: "✦" },
    { id: "project-tasks", label: "Tasks", icon: "↗" },
    { id: "project-measurements", label: "Measurements", icon: "⌁" },
    { id: "project-pattern", label: "Pattern", icon: "⌗" },
    ...(project.id === "boat-neck-top" ? [{ id: "project-guide" as const, label: "Draft guide", icon: "◫" }] : []),
    { id: "project-muslins", label: "Muslins", icon: "◌" },
    { id: "project-fit", label: "Fit log", icon: "✎" },
    { id: "project-materials", label: "Materials", icon: "▧" },
    { id: "project-plan", label: "Project plan", icon: "◇" },
  ];

  if (saveState === "loading") {
    return <div className="loading-screen"><div className="thread-spool" /><p>Threading your project…</p></div>;
  }

  if (needsSetup) {
    return <main className="welcome-shell">
      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="welcome-mark" aria-hidden>S/S</div>
        <p className="eyebrow">LOCAL-FIRST SEWING WORKSPACE</p>
        <h1 id="welcome-title">Make the pattern.<br />Keep the story.</h1>
        <p className="welcome-lede">Measurements, slopers, muslins, fit decisions, and construction progress stay together—and stay in this browser until you export them.</p>
        <div className="welcome-choices">
          <button className="welcome-choice sample" onClick={() => void beginWorkspace("sample")}><span>✦</span><strong>Explore sample project</strong><small>Open a clearly fictional boat-neck top, fitted bodice sloper, and measurement profile.</small></button>
          <button className="welcome-choice blank" onClick={() => void beginWorkspace("blank")}><span>＋</span><strong>Start with a blank workspace</strong><small>Begin with an empty project shell and add only what your garment needs.</small></button>
        </div>
        <aside><strong>Your work stays local.</strong> Browser autosave is convenient, not a backup. Export JSON regularly for a portable restore copy; export Markdown for a readable record.</aside>
      </section>
    </main>;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark"><span>S/S</span></div>
        <div className="brand-copy"><strong>Sewing Studio</strong><small>Patterns · projects · practice</small></div>
        <nav aria-label="Workspace views" className="global-nav">
          {globalNav.map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
              <span aria-hidden>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-project-switcher">
          <small>ACTIVE PROJECT</small>
          <select aria-label="Active sewing project" value={project.id} onChange={(event) => openProject(event.target.value)}>{workspace.projects.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select>
        </div>
        <nav aria-label="Active project views" className="project-nav">
          {projectNav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span aria-hidden>{item.icon}</span>{item.label}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-progress"><span style={{ width: `${progress}%` }} /></div>
          <strong>{project.title}</strong>
          <small>{progress}% · {doneCount} of {project.tasks.length} tasks</small>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => setView("home")}>S/S · Sewing Studio</button>
          <div className="topbar-tools">
            <div className="unit-system-toggle" role="group" aria-label="Measurement unit system">
              <button className={workspace.unitSystem === "metric" ? "selected" : ""} onClick={() => setUnitSystem("metric")} aria-pressed={workspace.unitSystem === "metric"}>Metric <small>cm</small></button>
              <button className={workspace.unitSystem === "imperial" ? "selected" : ""} onClick={() => setUnitSystem("imperial")} aria-pressed={workspace.unitSystem === "imperial"}>Imperial <small>⅛ in</small></button>
            </div>
            <div className={`save-pill ${saveState}`}>
              <span />
              {saveState === "saving" ? "Saving locally…" : saveState === "error" ? "Local save needs retry" : `Saved in this browser${updatedAt ? ` · ${dateLabel(updatedAt)}` : ""}`}
            </div>
          </div>
        </header>

        <nav className="mobile-project-nav" aria-label="Project tools">
          {projectNav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span aria-hidden>{item.icon}</span>{item.label}</button>)}
        </nav>

        <div className="page-content">
          {view === "home" && <WorkspaceHome workspace={workspace} onOpenProject={openProject} onCreateProject={createProject} onDeleteProject={deleteProject} onOpenStudio={() => setView("studio")} />}

          {view === "studio" && <StudioView
            workspace={workspace}
            onProfileMeasurement={updateProfileMeasurement}
            onAddProfile={(profile: MeasurementProfile) => setWorkspace((current) => ({ ...current, measurementProfiles: [...current.measurementProfiles, profile] }))}
            onAddSloper={(sloper: SloperResource) => setWorkspace((current) => ({ ...current, slopers: [...current.slopers, sloper] }))}
            onUpdateSloper={updateSloper}
            onAddTechnique={(technique: TechniqueResource) => setWorkspace((current) => ({ ...current, techniques: [...current.techniques, technique] }))}
            onAddNote={(note: SharedNote) => setWorkspace((current) => ({ ...current, sharedNotes: [...current.sharedNotes, note] }))}
            onOpenTutorial={(id) => { setStudioSloperId(id); setView("studio-tutorial"); }}
            onOpenPattern={(id) => { setStudioSloperId(id); setView("studio-pattern"); }}
          />}

          {view === "studio-tutorial" && activeSloper?.kind === "bodice" && activeSloperProfile && <SloperTutorialView
            measurements={activeSloperProfile.measurements}
            tasks={activeSloper.tasks}
            onMeasurementChange={(id, update) => updateProfileMeasurement(activeSloperProfile.id, id, update)}
            onTaskStatus={setSloperTaskStatus}
            onOpenPattern={() => setView("studio-pattern")}
            unitSystem={workspace.unitSystem}
          />}

          {view === "studio-tutorial" && activeSloper && activeSloper.kind !== "bodice" && <PatternEngineUnavailable
            subject={`${activeSloper.kind} sloper`}
            onOpenStudio={() => setView("studio")}
          />}

          {view === "studio-pattern" && activeSloper?.kind === "bodice" && activeSloperProfile && <PatternView
            measurements={activeSloperProfile.measurements}
            onChange={(id, update) => updateProfileMeasurement(activeSloperProfile.id, id, update)}
            onAdd={(measurement) => setWorkspace((current) => ({ ...current, measurementProfiles: current.measurementProfiles.map((profile) => profile.id === activeSloperProfile.id ? { ...profile, measurements: [...profile.measurements, normalizeLengthRecord(measurement, current.unitSystem)] } : profile) }))}
            onRemove={(id) => setWorkspace((current) => ({ ...current, measurementProfiles: current.measurementProfiles.map((profile) => profile.id === activeSloperProfile.id ? { ...profile, measurements: profile.measurements.filter((item) => item.id !== id) } : profile) }))}
            onOpenDressPlan={() => setView("studio")}
            neckline="high-round"
            unitSystem={workspace.unitSystem}
          />}

          {view === "studio-pattern" && activeSloper && activeSloper.kind !== "bodice" && <PatternEngineUnavailable
            subject={`${activeSloper.kind} sloper`}
            onOpenStudio={() => setView("studio")}
          />}

          {view === "project-overview" && (
            <>
              <div className="hero-row">
                <div>
                  <p className="eyebrow">{project.garmentType.toUpperCase()} PROJECT · {project.lifecycle.toUpperCase()}</p>
                  <h1>{project.title}</h1>
                  <p className="lede">{project.summary}</p>
                </div>
                <div className="progress-orbit" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}>
                  <div><strong>{progress}%</strong><small>overall</small></div>
                </div>
              </div>

              <section className="focus-card">
                <div className="focus-topline">
                  <span className="pin-dot" />
                  <span>{activeTask ? "ON YOUR TABLE" : "NEXT ON YOUR TABLE"}</span>
                  <b>1 story point · ~30 min</b>
                </div>
                {focusTask ? (
                  <div className="focus-grid">
                    <div className="focus-main">
                      <p className="phase-tag">{focusTask.phase}</p>
                      <h2>{focusTask.title}</h2>
                      <p><RichMeasurementText unitSystem={workspace.unitSystem}>{focusTask.instruction}</RichMeasurementText></p>
                      <label className="session-note">
                        <span>Session note</span>
                        <textarea
                          value={focusTask.note ?? ""}
                          onChange={(event) => updateTask(focusTask.id, { note: event.target.value })}
                          placeholder="What did you notice, change, or want to remember?"
                        />
                      </label>
                    </div>
                    <div className="definition-done">
                      <span>DONE LOOKS LIKE</span>
                      <ul>{focusTask.acceptance.map((item) => <li key={item}>{item}</li>)}</ul>
                      <div className="focus-actions">
                        {!activeTask && <button className="primary" onClick={() => setTaskStatus(focusTask, "in-progress")}>Start this session <span>→</span></button>}
                        {activeTask && <button className="primary" onClick={() => setTaskStatus(focusTask, "done")}>Mark story complete <span>✓</span></button>}
                        <button className="text-button" onClick={() => setTaskStatus(focusTask, focusTask.status === "blocked" ? "ready" : "blocked")}>
                          {focusTask.status === "blocked" ? "Clear blocker" : "I’m blocked"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-celebration"><h2>{project.title} is finished.</h2><p>Record final photographs and the lessons worth carrying forward.</p></div>
                )}
              </section>

              <div className="metric-grid">
                <article><span>PHASES COMPLETE</span><strong>{completedPhases}<i>/ {projectPhases.length}</i></strong><p>{phaseStats.find((phase) => phase.done < phase.tasks.length)?.phase ?? "All finished"}</p></article>
                <article><span>FOCUSED TIME</span><strong>{hoursDone}<i> hrs</i></strong><p>{doneCount} half-hour sessions invested</p></article>
                <article className={blockedCount ? "warning" : ""}><span>BLOCKERS</span><strong>{blockedCount}</strong><p>{blockedCount ? "Open the roadmap to resolve" : "Your path is clear"}</p></article>
              </div>

              <section className="journey-card">
                <div className="section-heading"><div><p className="eyebrow">PROJECT JOURNEY</p><h2>{project.title} taking shape</h2></div><button onClick={() => setView("project-tasks")}>Open full task list →</button></div>
                <div className="phase-track">
                  {phaseStats.map((item, index) => {
                    const ratio = item.tasks.length ? item.done / item.tasks.length : 0;
                    const state = ratio === 1 ? "complete" : ratio > 0 || item.tasks.some((task) => task.status === "in-progress") ? "current" : "future";
                    return <div className={`phase-node ${state}`} key={item.phase}><span>{ratio === 1 ? "✓" : index + 1}</span><strong>{item.phase}</strong><small>{item.done}/{item.tasks.length} stories</small></div>;
                  })}
                </div>
              </section>

              <div className="bottom-grid">
                <section className="project-note-card">
                  <p className="eyebrow">THE DESIGN BRIEF</p>
                  <textarea aria-label="Project design brief" value={project.projectNote} onChange={(event) => setProject({ ...project, projectNote: event.target.value })} />
                  <button onClick={() => setView("project-plan")}>Refine project plan →</button>
                </section>
                <section className="recent-card">
                  <p className="eyebrow">RECENT WORK</p>
                  {project.fittingLog.length ? project.fittingLog.slice(0, 3).map((entry) => (
                    <div className="recent-item" key={entry.id}><span className={`log-icon ${entry.kind}`}>{entry.kind === "win" ? "✓" : entry.kind === "blocker" ? "!" : "·"}</span><div><strong>{entry.title}</strong><small>{dateLabel(entry.date)}</small></div></div>
                  )) : <div className="empty-small">Your completed stories and fitting decisions will collect here.</div>}
                </section>
              </div>
            </>
          )}

          {view === "project-tasks" && (
            <Roadmap
              project={project}
              phaseFilter={phaseFilter}
              setPhaseFilter={setPhaseFilter}
              expandedTask={expandedTask}
              setExpandedTask={setExpandedTask}
              setTaskStatus={setTaskStatus}
              updateTask={updateTask}
              onAddTask={(task) => setProject((current) => { const timestamp = new Date().toISOString(); return { ...current, tasks: [...current.tasks, { ...task, schemaVersion: 1, createdAt: timestamp, updatedAt: timestamp, parentType: "project", parentId: current.id }] }; })}
              unitSystem={workspace.unitSystem}
            />
          )}

          {view === "project-measurements" && (
            <section className="view-page">
              <div className="view-title"><div><p className="eyebrow">{project.title.toUpperCase()} · SNAPSHOT</p><h1>Project measurements</h1><p>These values belong to this garment. Edit them for project-specific ease or fitting evidence without changing the shared body profile.</p></div><div className="title-actions"><span className="count-chip">{project.measurements.filter((m) => m.value).length}/{project.measurements.length} recorded</span>{project.measurementProfileId && <button className="secondary-button" onClick={syncProjectFromProfile}>Refresh from shared profile</button>}</div></div>
              <div className="measure-layout">
                <div className="measure-card">
                  {project.measurements.length ? project.measurements.map((measurement) => (
                    <label className="measure-row" key={measurement.id}>
                      <span><strong>{measurement.label}</strong><small>{measurement.hint}</small></span>
                      <div><input inputMode="decimal" value={measurement.value} placeholder="—" onChange={(event) => updateMeasurement(measurement.id, { value: event.target.value })} /><span className="unit-suffix">{workspace.unitSystem === "metric" ? "cm" : "in"}</span></div>
                    </label>
                  )) : <div className="measurement-empty"><strong>No project measurements yet</strong><p>Add only the values this garment needs, or return to the project library and create a project from a shared measurement profile.</p></div>}
                  <div className="measurement-create-row">
                    <label><span>Measurement name</span><input value={newMeasurementLabel} onChange={(event) => setNewMeasurementLabel(event.target.value)} placeholder="e.g. Finished outseam" /></label>
                    <label><span>Value ({workspace.unitSystem === "metric" ? "cm" : "in"})</span><input inputMode="decimal" value={newMeasurementValue} onChange={(event) => setNewMeasurementValue(event.target.value)} placeholder="Optional" /></label>
                    <button className="primary" disabled={!newMeasurementLabel.trim()} onClick={addProjectMeasurement}>Add measurement ＋</button>
                  </div>
                </div>
                <aside className="measure-help"><div className="tape-loop" /><h3>Project-owned values</h3><p>{project.measurementProfileId ? "These began as a snapshot of the linked shared profile. Add garment-specific circumferences, finished lengths or ease checks here." : "This project began blank. Add the garment-specific circumferences, lengths and ease checks you need; nothing here changes a shared profile."}</p><ul><li>The global switch keeps every workspace surface in the same system.</li><li>Imperial accepts decimals or sewing fractions such as 37 3/4.</li><li>Imperial display rounds to the nearest 1/8 in; ≈ identifies a rounded display.</li><li>The exact millimeter value stays underneath, so switching never compounds rounding.</li></ul></aside>
              </div>
            </section>
          )}

          {view === "project-pattern" && projectHasPatternEngine && (
            <PatternView
              measurements={project.measurements}
              onChange={updateMeasurement}
              onAdd={(measurement) => setProject((current) => ({ ...current, measurements: [...current.measurements, normalizeLengthRecord(measurement, current.unitSystem)] }))}
              onRemove={(id) => setProject((current) => ({ ...current, measurements: current.measurements.filter((item) => item.id !== id) }))}
              onOpenDressPlan={() => setView("project-plan")}
              neckline={project.neckline}
              unitSystem={workspace.unitSystem}
            />
          )}

          {view === "project-pattern" && !projectHasPatternEngine && <PatternEngineUnavailable
            subject={`${project.garmentType} project`}
            onOpenStudio={() => setView("studio")}
            onOpenMeasurements={() => setView("project-measurements")}
          />}

          {view === "project-guide" && project.id === "boat-neck-top" && <BoatNeckTutorialView
            measurements={project.measurements}
            tasks={project.tasks}
            unitSystem={workspace.unitSystem}
            onMeasurementChange={updateMeasurement}
            onUpsertMeasurement={upsertProjectMeasurement}
            onTaskStatus={setTaskStatus}
            onOpenPattern={() => setView("project-pattern")}
            onOpenMuslins={() => setView("project-muslins")}
          />}

          {view === "project-muslins" && <ProjectMuslinsView project={project} onUpdate={(update) => setProject((current) => ({ ...current, ...update }))} />}

          {view === "project-materials" && <ProjectMaterialsView project={project} workspace={workspace} onUpdate={(update) => setProject((current) => ({ ...current, ...update }))} />}

          {view === "project-fit" && (
            <section className="view-page">
              <div className="view-title"><div><p className="eyebrow">EVIDENCE, NOT GUESSWORK</p><h1>Fitting & decision log</h1><p>Capture what the muslin shows so every pattern change has a reason.</p></div></div>
              <div className="log-layout">
                <div className="log-form-card">
                  <h2>Add a project note</h2>
                  <div className="segmented">{(["fit", "decision", "blocker", "win"] as const).map((kind) => <button className={logKind === kind ? "selected" : ""} key={kind} onClick={() => setLogKind(kind)}>{kind}</button>)}</div>
                  <label><span>Short title</span><input value={logTitle} onChange={(event) => setLogTitle(event.target.value)} placeholder="Right armhole gapes" /></label>
                  <label><span>What you observed or decided</span><textarea value={logBody} onChange={(event) => setLogBody(event.target.value)} placeholder="Describe the amount and location of the gap, pull, or change…" /></label>
                  <button className="primary" disabled={!logTitle.trim() || !logBody.trim()} onClick={addLog}>Save to the log <span>＋</span></button>
                </div>
                <div className="timeline">
                  {project.fittingLog.length ? project.fittingLog.map((entry) => (
                    <article key={entry.id}><span className={`log-icon ${entry.kind}`}>{entry.kind === "win" ? "✓" : entry.kind === "blocker" ? "!" : entry.kind === "decision" ? "◇" : "·"}</span><div><div className="timeline-meta"><b>{entry.kind}</b><small>{dateLabel(entry.date)}</small></div><h3>{entry.title}</h3><p>{entry.body}</p><button onClick={() => setProject((current) => ({ ...current, fittingLog: current.fittingLog.filter((item) => item.id !== entry.id) }))}>Remove</button></div></article>
                  )) : <div className="timeline-empty"><span>✎</span><h3>No fitting notes yet</h3><p>Your first muslin fitting will have plenty to say.</p></div>}
                </div>
              </div>
            </section>
          )}

          {view === "project-plan" && project.id === "boat-neck-top" && (
            <section className="view-page">
              <div className="view-title"><div><p className="eyebrow">THE NORTH STAR</p><h1>Boat-neck top plan</h1><p>Lock the vertical-motif placement and construction details before laying out the black-and-gold fabric.</p></div><button className="secondary-button" onClick={() => setView("project-guide")}>Open adapted video guide →</button></div>
              <div className="design-layout">
                <div className="top-plan-visuals">
                  <div className="dress-preview top-preview" aria-label="Stylized fitted black boat-neck top with vertical gold motifs and a center-back zipper">
                    <div className={`dress-shape top-shape stripe-${project.stripeStart}`}><span className="neck-shape" /><i /><i /><i /><i /><div className="zip-line" /></div>
                    <div className="view-labels"><span>FRONT</span><span>BACK</span></div>
                  </div>
                  <div className="reference-board-card synthetic-board" role="img" aria-label="Abstract synthetic motif study for the sample boat-neck top">
                    <div className="motif-study"><i /><i /><i /><i /><i /></div>
                    <span><b>Motif rhythm study</b><small>Synthetic sample · no personal photo</small></span>
                  </div>
                </div>
                <div className="design-controls">
                  <fieldset><legend>Vertical motif placement</legend><div className="choice-grid">{(["centered-vertical", "side-balanced", "custom"] as const).map((choice) => <button className={project.stripeStart === choice ? "selected" : ""} key={choice} onClick={() => setProject({ ...project, stripeStart: choice })}><span className={`swatch swatch-${choice}`} />{choice.replaceAll("-", " ")}</button>)}</div></fieldset>
                  <fieldset><legend>Locked silhouette</legend><div className="locked-design-grid"><span><b>Boat neckline</b><small>Wide, shallow and level</small></span><span><b>Invisible zipper</b><small>Centered at the back</small></span><span><b>Hip-length flare</b><small>Fitted waist, slight release</small></span></div></fieldset>
                  <label className="brief-field"><span>Working design brief</span><textarea value={project.projectNote} onChange={(event) => setProject({ ...project, projectNote: event.target.value })} /></label>
                  <div className="design-rule"><span>✦</span><p><strong>Vertical motif rule</strong>Center and balance the gold repeats before cutting. Baste through matching points at darts, side seams and both sides of the invisible zipper so the motifs read as continuous vertical lines.</p></div>
                  <div className="pattern-plan-sync">
                    <div className="pattern-plan-heading"><span>⌗</span><div><p className="eyebrow">FROM YOUR PATTERN</p><h3>Live measurement plan</h3></div><button onClick={() => setView("project-pattern")}>Edit pattern →</button></div>
                    <div className="pattern-plan-rows">{patternPlan.map((row) => <div key={row.label}><span><strong>{row.label}</strong><small><RichMeasurementText unitSystem={workspace.unitSystem}>{row.detail}</RichMeasurementText></small></span><b className={row.canonicalMm === null ? "missing" : ""}>{row.canonicalMm === null ? row.value : <><LengthValue mm={row.canonicalMm} unitSystem={workspace.unitSystem} />{row.valueSuffix}</>}</b></div>)}</div>
                    <p>{patternMissing.length ? `${patternMissing.length} core ${patternMissing.length === 1 ? "measurement is" : "measurements are"} still missing. Add them on the Pattern tab before finalizing the paper draft.` : "Every core pattern measurement is recorded. Re-check the numbers before cutting muslin."}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {view === "project-plan" && project.id !== "boat-neck-top" && (
            <section className="view-page generic-plan-page">
              <div className="view-title"><div><p className="eyebrow">PROJECT NORTH STAR</p><h1>{project.title}</h1><p>Define the garment before the task list and pattern details become expensive to change.</p></div><select value={project.lifecycle} onChange={(event) => setProject({ ...project, lifecycle: event.target.value as SewingProject["lifecycle"] })}><option value="planning">Planning</option><option value="active">Active</option><option value="paused">Paused</option><option value="complete">Complete</option><option value="archived">Archived</option></select></div>
              <div className="generic-plan-grid"><section><p className="eyebrow">DESIGN INTENT</p><label className="brief-field"><span>Project summary</span><textarea value={project.summary} onChange={(event) => setProject({ ...project, summary: event.target.value })} /></label><label className="brief-field"><span>Working design brief</span><textarea value={project.projectNote} onChange={(event) => setProject({ ...project, projectNote: event.target.value })} /></label></section><aside><p className="eyebrow">FOUNDATIONS</p><div className="plan-foundation-list"><span><small>Garment type</small><strong>{project.garmentType}</strong></span><span><small>Measurement profile</small><strong>{workspace.measurementProfiles.find((profile) => profile.id === project.measurementProfileId)?.name ?? "Project-only"}</strong></span><span><small>Slopers</small><strong>{project.baseSloperIds.map((id) => workspace.slopers.find((sloper) => sloper.id === id)?.name ?? id).join(", ") || "None selected"}</strong></span></div><button className="secondary-button" onClick={() => setView("project-materials")}>Add materials &amp; references →</button></aside></div>
            </section>
          )}

          {view === "backup" && (
            <BackupView
              workspace={workspace}
              storageStatus={saveState}
              savedAt={updatedAt}
              localBackup={localBackup}
              onRestore={restoreWorkspace}
            />
          )}
        </div>

        <nav className="mobile-nav" aria-label="Workspace views">
          {[globalNav[0], globalNav[1], projectNav.find((item) => item.id === "project-overview")!, projectNav.find((item) => item.id === "project-tasks")!, projectNav.find((item) => item.id === "project-muslins")!, globalNav[2]].map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}
        </nav>
      </section>
    </main>
  );
}

function PatternEngineUnavailable({ subject, onOpenStudio, onOpenMeasurements }: {
  subject: string;
  onOpenStudio: () => void;
  onOpenMeasurements?: () => void;
}) {
  return (
    <section className="view-page engine-unavailable">
      <div className="engine-unavailable-mark" aria-hidden>⌗</div>
      <p className="eyebrow">GEOMETRY ENGINE BOUNDARY</p>
      <h1>No misleading pattern preview</h1>
      <p>The live renderer currently understands fitted bodice geometry only. This {subject} stays fully usable for tasks, measurements, materials, muslins and fit decisions, but it will not be shown with a technically incorrect bodice outline.</p>
      <div className="engine-unavailable-actions">
        {onOpenMeasurements && <button className="primary" onClick={onOpenMeasurements}>Record project measurements</button>}
        <button className="secondary-button" onClick={onOpenStudio}>Review shared slopers</button>
      </div>
      <aside><strong>Planned extension</strong><span>Dedicated skirt, trouser, sleeve and outerwear engines can be added behind the same capability boundary without changing existing project data.</span></aside>
    </section>
  );
}

function Roadmap({ project, phaseFilter, setPhaseFilter, expandedTask, setExpandedTask, setTaskStatus, updateTask, onAddTask, unitSystem }: {
  project: ProjectState;
  phaseFilter: string;
  setPhaseFilter: (value: string) => void;
  expandedTask: string | null;
  setExpandedTask: (value: string | null) => void;
  setTaskStatus: (task: ProjectTask, status: TaskStatus) => void;
  updateTask: (id: string, update: Partial<ProjectTask>) => void;
  onAddTask: (task: ProjectTask) => void;
  unitSystem: UnitSystem;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newPhase, setNewPhase] = useState("Plan");
  const [newInstruction, setNewInstruction] = useState("");
  const phases = Array.from(new Set(project.tasks.map((task) => task.phase)));
  const visible = phaseFilter === "All phases" ? project.tasks : project.tasks.filter((task) => task.phase === phaseFilter);
  const addTask = () => {
    if (!newTitle.trim()) return;
    onAddTask({ id: `task-${Date.now().toString(36)}`, phase: newPhase.trim() || "Plan", title: newTitle.trim(), instruction: newInstruction.trim() || "Record the work completed and the decision it enables.", acceptance: ["Result is recorded"], dependsOn: [], status: "ready" });
    setNewTitle(""); setNewInstruction("");
  };
  return (
    <section className="view-page">
      <div className="view-title"><div><p className="eyebrow">THE WHOLE BUILD</p><h1>Project roadmap</h1><p>Dependencies keep risky steps locked until the fitting evidence is ready.</p></div><span className="count-chip">1 story = 30 min</span></div>
      <div className="filter-row"><button className={phaseFilter === "All phases" ? "selected" : ""} onClick={() => setPhaseFilter("All phases")}>All phases</button>{phases.map((phase) => <button className={phaseFilter === phase ? "selected" : ""} key={phase} onClick={() => setPhaseFilter(phase)}>{phase}</button>)}</div>
      <div className="roadmap-list">
        {visible.map((task, index) => {
          const unlocked = isUnlocked(task, project.tasks);
          const expanded = expandedTask === task.id;
          return (
            <article className={`story-row ${task.status} ${!unlocked ? "locked" : ""}`} key={task.id}>
              <button className="story-summary" onClick={() => setExpandedTask(expanded ? null : task.id)}>
                <span className="story-index">{task.status === "done" ? "✓" : !unlocked ? "⌑" : String(index + 1).padStart(2, "0")}</span>
                <span className="story-copy"><small>{task.phase}</small><strong>{task.title}</strong></span>
                <span className={`status-chip ${task.status}`}>{!unlocked ? "Locked" : statusLabel(task.status)}</span>
                <span className="chevron">{expanded ? "−" : "+"}</span>
              </button>
              {expanded && <div className="story-detail"><div><h4>What to do</h4><p><RichMeasurementText unitSystem={unitSystem}>{task.instruction}</RichMeasurementText></p><label><span>Story note</span><textarea value={task.note ?? ""} onChange={(event) => updateTask(task.id, { note: event.target.value })} placeholder="Materials, observations, or changes…" /></label></div><div><h4>Definition of done</h4><ul>{task.acceptance.map((item) => <li key={item}>{item}</li>)}</ul><div className="story-actions">{unlocked && task.status !== "done" && <button className="primary" onClick={() => setTaskStatus(task, task.status === "in-progress" ? "done" : "in-progress")}>{task.status === "in-progress" ? "Complete story" : "Start story"}</button>}{task.status === "done" && <button className="text-button" onClick={() => setTaskStatus(task, "ready")}>Reopen story</button>}{unlocked && task.status !== "done" && <button className="text-button" onClick={() => setTaskStatus(task, task.status === "blocked" ? "ready" : "blocked")}>{task.status === "blocked" ? "Clear blocker" : "Mark blocked"}</button>}</div></div></div>}
            </article>
          );
        })}
      </div>
      <section className="add-task-panel"><div><p className="eyebrow">CUSTOM TASK</p><h2>Add work unique to this garment</h2></div><label><span>Phase</span><input value={newPhase} onChange={(event) => setNewPhase(event.target.value)} /></label><label><span>Task</span><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Test welt pocket placement" /></label><label><span>Instructions</span><input value={newInstruction} onChange={(event) => setNewInstruction(event.target.value)} placeholder="What should happen in this work session?" /></label><button className="primary" disabled={!newTitle.trim()} onClick={addTask}>Add task ＋</button></section>
    </section>
  );
}
