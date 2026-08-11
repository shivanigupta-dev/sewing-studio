import { upgradeWorkspaceState, type WorkspaceState } from "./workspace";

const DATABASE_NAME = "sewing-studio";
const DATABASE_VERSION = 1;
const STORE_NAME = "workspace";
const WORKSPACE_KEY = "primary";

/**
 * IndexedDB is the convenience copy, not the portable source of truth. Keeping
 * this adapter narrow makes browser persistence replaceable and keeps all
 * migrations in the versioned domain layer.
 */
function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Browser storage could not be opened."));
    request.onblocked = () => reject(new Error("Browser storage is blocked by another open Sewing Studio tab."));
  });
}

export function supportsBrowserWorkspaceStore() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

export async function loadBrowserWorkspace(): Promise<WorkspaceState | null> {
  if (!supportsBrowserWorkspaceStore()) return null;
  const database = await openDatabase();
  try {
    return await new Promise<WorkspaceState | null>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(WORKSPACE_KEY);
      request.onsuccess = () => resolve(request.result === undefined ? null : upgradeWorkspaceState(request.result));
      request.onerror = () => reject(request.error ?? new Error("Saved sewing data could not be read."));
    });
  } finally {
    database.close();
  }
}

export async function saveBrowserWorkspace(workspace: WorkspaceState) {
  if (!supportsBrowserWorkspaceStore()) throw new Error("This browser does not provide IndexedDB storage.");
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(workspace, WORKSPACE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Sewing changes could not be saved in this browser."));
    });
  } finally {
    database.close();
  }
}

export async function clearBrowserWorkspace() {
  if (!supportsBrowserWorkspaceStore()) return;
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(WORKSPACE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Saved sewing data could not be cleared."));
    });
  } finally {
    database.close();
  }
}
