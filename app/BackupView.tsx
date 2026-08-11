"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildBackupEnvelope, jsonBackupFilename, parseBackupText, projectsCsv, tasksCsv, measurementsCsv, fittingLogCsv, type BackupEnvelope } from "../lib/backup";
import { projectMarkdownFilename, renderProjectMarkdown, renderWorkspaceMarkdown, workspaceMarkdownFilename } from "../lib/markdown";
import {
  chooseBackupDirectory, forgetBackupDirectory, latestBackupModifiedAt, loadBackupDirectory,
  queryBackupPermission, requestBackupPermission, supportsLocalFolderBackup, writeProjectBackup,
  type BackupDirectoryHandle,
} from "../lib/local-backup";
import type { WorkspaceState } from "../lib/workspace";

type LocalPhase = "loading" | "unsupported" | "disconnected" | "ready" | "needs-permission" | "backing-up" | "error";

export type LocalBackupController = {
  phase: LocalPhase;
  folderName: string | null;
  lastBackupAt: string | null;
  message: string | null;
  connect: (workspace: WorkspaceState) => Promise<void>;
  reconnect: (workspace: WorkspaceState) => Promise<void>;
  backupNow: (workspace: WorkspaceState) => Promise<void>;
  backupAfterBrowserSave: (workspace: WorkspaceState) => Promise<void>;
  disconnect: () => Promise<void>;
};

/** Optional folder copies complement IndexedDB; they never replace JSON export. */
export function useLocalBackup(): LocalBackupController {
  const [phase, setPhase] = useState<LocalPhase>("loading");
  const [folderName, setFolderName] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const handleRef = useRef<BackupDirectoryHandle | null>(null);

  useEffect(() => {
    if (!supportsLocalFolderBackup()) { Promise.resolve().then(() => setPhase("unsupported")); return; }
    loadBackupDirectory().then(async (handle) => {
      if (!handle) { setPhase("disconnected"); return; }
      handleRef.current = handle; setFolderName(handle.name); setLastBackupAt(await latestBackupModifiedAt(handle));
      setPhase((await queryBackupPermission(handle)) === "granted" ? "ready" : "needs-permission");
    }).catch(() => { setPhase("error"); setMessage("The saved folder connection could not be read. Choose it again."); });
  }, []);

  const write = useCallback(async (handle: BackupDirectoryHandle, workspace: WorkspaceState) => {
    setPhase("backing-up");
    const result = await writeProjectBackup(handle, workspace);
    setLastBackupAt(result.backedUpAt); setPhase("ready"); setMessage(`Updated ${result.dailyFilename}.`);
  }, []);

  const connect = useCallback(async (workspace: WorkspaceState) => {
    try { const handle = await chooseBackupDirectory(); handleRef.current = handle; setFolderName(handle.name); await write(handle, workspace); }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; setPhase("error"); setMessage("The folder could not be connected. JSON download is still available."); }
  }, [write]);

  const reconnect = useCallback(async (workspace: WorkspaceState) => {
    const handle = handleRef.current;
    if (!handle) return connect(workspace);
    try { if ((await requestBackupPermission(handle)) !== "granted") { setPhase("needs-permission"); return; } await write(handle, workspace); }
    catch { setPhase("error"); setMessage("Folder access could not be restored."); }
  }, [connect, write]);

  const backupNow = useCallback(async (workspace: WorkspaceState) => {
    const handle = handleRef.current; if (!handle) return;
    try { if ((await queryBackupPermission(handle)) !== "granted") { setPhase("needs-permission"); return; } await write(handle, workspace); }
    catch { setPhase("error"); setMessage("The local folder copy could not be written."); }
  }, [write]);

  const disconnect = useCallback(async () => { await forgetBackupDirectory(); handleRef.current = null; setFolderName(null); setLastBackupAt(null); setMessage(null); setPhase("disconnected"); }, []);
  return { phase, folderName, lastBackupAt, message, connect, reconnect, backupNow, backupAfterBrowserSave: backupNow, disconnect };
}

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function localPhaseLabel(phase: LocalPhase) {
  if (phase === "unsupported") return "Downloads available";
  if (phase === "disconnected") return "Not connected";
  if (phase === "needs-permission") return "Reconnect needed";
  if (phase === "backing-up") return "Writing copy…";
  if (phase === "error") return "Needs attention";
  return phase === "ready" ? "Connected" : "Checking…";
}

export default function BackupView({ workspace, storageStatus, savedAt, localBackup, onRestore }: {
  workspace: WorkspaceState;
  storageStatus: "saved" | "saving" | "error";
  savedAt: string | null;
  localBackup: LocalBackupController;
  onRestore: (workspace: WorkspaceState) => Promise<void>;
}) {
  const [candidate, setCandidate] = useState<BackupEnvelope | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ projects: number; measurementProfiles: number; slopers: number; constructionSteps: number; fitSessions: number } | null>(null);
  const activeProject = workspace.projects.find((project) => project.id === workspace.activeProjectId) ?? workspace.projects[0];

  const exportJson = () => { const date = new Date(); download(JSON.stringify(buildBackupEnvelope(workspace, { now: date }), null, 2) + "\n", jsonBackupFilename(date), "application/json"); };
  const handleImport = async (file?: File) => {
    setCandidate(null); setErrors([]); setConfirmed(false); setMessage(null); setSummary(null);
    if (!file) return;
    const result = parseBackupText(await file.text());
    if (!result.ok) { setErrors(result.errors); return; }
    setCandidate(result.backup); setSummary(result.summary);
  };
  const applyRestore = async () => {
    if (!candidate || !confirmed || !window.confirm("Replace the current browser workspace with this backup? Download the current JSON first if you may need it later.")) return;
    setRestoring(true); setMessage(null);
    try { await onRestore(candidate.data); setCandidate(null); setConfirmed(false); setMessage("Backup restored and saved in this browser."); }
    catch { setMessage("The backup was valid, but the browser could not save it. Your current workspace was not partially replaced."); }
    finally { setRestoring(false); }
  };

  return <section className="view-page backup-page">
    <div className="view-title"><div><p className="eyebrow">OWN YOUR PROJECT DATA</p><h1>Backups you can actually keep.</h1><p>Browser autosave handles everyday work. JSON is the reliable portable restore copy; Markdown is the readable record.</p></div></div>

    <div className="backup-status-grid">
      <article className={`backup-status-card ${storageStatus}`}><div className="backup-status-heading"><span className="status-light" /><div><small>BROWSER AUTOSAVE</small><h2>{storageStatus === "saving" ? "Saving…" : storageStatus === "error" ? "Save needs attention" : "Saved locally"}</h2></div></div><p>Your workspace is stored in IndexedDB for this exact browser origin.</p><small>{savedAt ? `Last saved ${new Date(savedAt).toLocaleString()}` : "No save timestamp yet"}</small></article>
      <article className={`backup-status-card local-${localBackup.phase}`}><div className="backup-status-heading"><span className="status-light" /><div><small>OPTIONAL FOLDER COPY</small><h2>{localPhaseLabel(localBackup.phase)}</h2></div></div><p>{localBackup.folderName ? `Folder: ${localBackup.folderName}` : "No folder on this device is connected."}</p><small>{localBackup.lastBackupAt ? `Last copy ${new Date(localBackup.lastBackupAt).toLocaleString()}` : "Downloads work in every modern browser."}</small></article>
    </div>

    <section className="export-card"><div><p className="eyebrow">PORTABLE COPIES</p><h2>Export now</h2><p>Exports can contain measurements and fit notes in plain text. Store them somewhere private.</p></div><div className="download-list"><button className="primary" onClick={exportJson}>Complete JSON backup <span>↓</span></button><button onClick={() => download(renderWorkspaceMarkdown(workspace), workspaceMarkdownFilename(), "text/markdown;charset=utf-8")}>All-project summary.md <span>↓</span></button>{activeProject && <button onClick={() => download(renderProjectMarkdown(workspace, activeProject.id), projectMarkdownFilename(activeProject), "text/markdown;charset=utf-8")}>{activeProject.title}.md <span>↓</span></button>}<button onClick={() => download(projectsCsv(workspace.projects), "sewing-studio-projects.csv", "text/csv;charset=utf-8")}>Project library.csv <span>↓</span></button>{activeProject && <button onClick={() => download(tasksCsv(activeProject.tasks), `${activeProject.id}-tasks.csv`, "text/csv;charset=utf-8")}>Active tasks.csv <span>↓</span></button>}{activeProject && <button onClick={() => download(measurementsCsv(activeProject.measurements), `${activeProject.id}-measurements.csv`, "text/csv;charset=utf-8")}>Active measurements.csv <span>↓</span></button>}{activeProject && <button onClick={() => download(fittingLogCsv(activeProject.fittingLog), `${activeProject.id}-fit-log.csv`, "text/csv;charset=utf-8")}>Active fit log.csv <span>↓</span></button>}</div></section>

    <section className="local-folder-card"><div><p className="eyebrow">CHOOSE A DATA HOME</p><h2>Keep dated JSON copies in a folder you control</h2><p>Supported browsers can write one latest backup plus one dated copy per day, only after you choose and approve the folder.</p></div><div className="backup-destination-grid"><article><strong>Local folder</strong><span>Choose a private folder on this device or an external drive.</span></article><article><strong>Obsidian vault</strong><span>Choose a private backup subfolder. JSON restores the app; Markdown stays readable in your vault.</span></article><article><strong>Google Drive</strong><span>Choose a folder synced by Google Drive for desktop. Sewing Studio never receives Google credentials.</span></article></div><div className="backup-actions">{localBackup.phase === "disconnected" && <button className="secondary-button" onClick={() => void localBackup.connect(workspace)}>Choose backup folder</button>}{(localBackup.phase === "needs-permission" || localBackup.phase === "error") && <button className="secondary-button" onClick={() => void localBackup.reconnect(workspace)}>Reconnect folder</button>}{localBackup.folderName && <button className="secondary-button" onClick={() => void localBackup.backupNow(workspace)}>Back up now</button>}{localBackup.folderName && <button className="text-button" onClick={() => void localBackup.disconnect()}>Disconnect</button>}</div>{localBackup.message && <div className="inline-alert" role="status">{localBackup.message}</div>}<p className="fine-print">The folder handle stays in this browser. The app cannot inspect other folders, sign in to cloud providers, or read an entire Obsidian vault.</p></section>

    <section className="restore-card"><div><p className="eyebrow">VALIDATED RESTORE</p><h2>Preview before replacing anything</h2><p>Version 0.1.0 uses an all-or-nothing replacement. Invalid files are rejected before the current workspace changes.</p></div><label className="file-picker"><span>Choose JSON backup</span><input type="file" accept="application/json,.json" onChange={(event) => void handleImport(event.target.files?.[0])} /></label>{errors.length > 0 && <div className="restore-errors" role="alert"><strong>Nothing was imported.</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}{candidate && summary && <div className="restore-preview"><strong>Valid backup from {new Date(candidate.exportedAt).toLocaleString()}</strong><p>{summary.projects} projects · {summary.measurementProfiles} profiles · {summary.slopers} slopers · {summary.constructionSteps} steps · {summary.fitSessions} fit sessions</p><p><b>Action:</b> replace the entire current workspace. Stable IDs from the backup will be preserved.</p><label className="restore-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I understand this replaces the current browser workspace.</span></label><button className="danger-button" disabled={!confirmed || restoring} onClick={() => void applyRestore()}>{restoring ? "Restoring…" : "Replace workspace"}</button></div>}{message && <div className="restore-message" role="status">{message}</div>}</section>

    <section className="origin-warning"><span>!</span><div><strong>Browser storage follows the address.</strong><p><code>localhost:3000</code> and <code>127.0.0.1:3000</code> are different origins with different IndexedDB data. Clearing browser data can erase autosave. Keep using one documented address and export JSON regularly.</p></div></section>
  </section>;
}
