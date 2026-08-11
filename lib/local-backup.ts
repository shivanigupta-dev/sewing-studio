import { buildBackupEnvelope } from "./backup";
import type { WorkspaceState } from "./workspace";

// File-system handles are isolated from sewing records so permission changes do
// not affect the workspace database or its schema migrations.
const DATABASE_NAME = "sewing-studio-device-settings";
const STORE_NAME = "file-handles";
const HANDLE_KEY = "backup-directory";

export type DirectoryPermission = "granted" | "denied" | "prompt";
export type BackupDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission(options: { mode: "readwrite" }): Promise<DirectoryPermission>;
  requestPermission(options: { mode: "readwrite" }): Promise<DirectoryPermission>;
};

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: "read" | "readwrite"; id?: string }) => Promise<BackupDirectoryHandle>;
  }
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open device backup settings."));
  });
}

export function supportsLocalFolderBackup() {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function" && typeof indexedDB !== "undefined";
}

export async function loadBackupDirectory() {
  if (!supportsLocalFolderBackup()) return null;
  const database = await openDatabase();
  try {
    return await new Promise<BackupDirectoryHandle | null>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(HANDLE_KEY);
      request.onsuccess = () => resolve((request.result as BackupDirectoryHandle | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Unable to load the backup folder."));
    });
  } finally {
    database.close();
  }
}

export async function storeBackupDirectory(handle: BackupDirectoryHandle) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(handle, HANDLE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Unable to remember the backup folder."));
    });
  } finally {
    database.close();
  }
}

export async function forgetBackupDirectory() {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(HANDLE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Unable to forget the backup folder."));
    });
  } finally {
    database.close();
  }
}

export async function queryBackupPermission(handle: BackupDirectoryHandle) {
  return handle.queryPermission({ mode: "readwrite" });
}

export async function requestBackupPermission(handle: BackupDirectoryHandle) {
  return handle.requestPermission({ mode: "readwrite" });
}

export async function latestBackupModifiedAt(handle: BackupDirectoryHandle) {
  try {
    const fileHandle = await handle.getFileHandle("sewing-studio-latest.json");
    const file = await fileHandle.getFile();
    return new Date(file.lastModified).toISOString();
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return null;
    throw error;
  }
}

export async function chooseBackupDirectory() {
  if (!window.showDirectoryPicker) throw new Error("Local folder backup is not supported in this browser.");
  const handle = await window.showDirectoryPicker({ mode: "readwrite", id: "sewing-studio-backups" });
  await storeBackupDirectory(handle);
  return handle;
}

async function writeTextFile(directory: BackupDirectoryHandle, filename: string, content: string) {
  const file = await directory.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  try {
    await writable.write(content);
  } finally {
    await writable.close();
  }
}

async function fileExists(directory: BackupDirectoryHandle, filename: string) {
  try {
    await directory.getFileHandle(filename);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return false;
    throw error;
  }
}

export async function writeProjectBackup(directory: BackupDirectoryHandle, workspace: WorkspaceState, now = new Date()) {
  const envelope = buildBackupEnvelope(workspace, { now });
  const content = JSON.stringify(envelope, null, 2) + "\n";
  await writeTextFile(directory, "sewing-studio-latest.json", content);
  const dailyFilename = `sewing-studio-${now.toISOString().slice(0, 10)}.json`;
  if (!(await fileExists(directory, dailyFilename))) await writeTextFile(directory, dailyFilename, content);
  return { backedUpAt: now.toISOString(), dailyFilename };
}
