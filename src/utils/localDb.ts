import type {
  GalleryPhotoRecord,
  LocalProjectRecord,
  UsageHistoryRecord,
} from '../types/settings';

const DB_NAME = 'camcall_local_db';
const DB_VERSION = 1;
const STORE_PHOTOS = 'photos';
const STORE_PROJECTS = 'projects';
const STORE_HISTORY = 'history';

// In-memory fallback if IndexedDB is unavailable in sandboxed environments
const memPhotos = new Map<string, GalleryPhotoRecord>();
const memProjects = new Map<string, LocalProjectRecord>();
const memHistory = new Map<string, UsageHistoryRecord>();

let cachedDbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (cachedDbPromise) return cachedDbPromise;
  cachedDbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
          db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          cachedDbPromise = null;
        };
        db.onclose = () => {
          cachedDbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        cachedDbPromise = null;
        resolve(null);
      };
    } catch {
      cachedDbPromise = null;
      resolve(null);
    }
  });
  return cachedDbPromise;
}

async function putRecord<T extends { id: string }>(
  storeName: string,
  fallbackMap: Map<string, T>,
  record: T
): Promise<T> {
  fallbackMap.set(record.id, record);
  const db = await openDb();
  if (!db) return record;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => resolve(record);
    } catch {
      resolve(record);
    }
  });
}

async function getAllRecords<T>(
  storeName: string,
  fallbackMap: Map<string, T>
): Promise<T[]> {
  const db = await openDb();
  if (!db) return Array.from(fallbackMap.values());
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => {
        const rows = (req.result as T[]) || [];
        resolve(rows);
      };
      req.onerror = () => resolve(Array.from(fallbackMap.values()));
    } catch {
      resolve(Array.from(fallbackMap.values()));
    }
  });
}

async function deleteRecord<T>(
  storeName: string,
  fallbackMap: Map<string, T>,
  id: string
): Promise<void> {
  fallbackMap.delete(id);
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function clearStore<T>(storeName: string, fallbackMap: Map<string, T>): Promise<void> {
  fallbackMap.clear();
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function savePhotoToDb(
  photo: Omit<GalleryPhotoRecord, 'id' | 'createdAt' | 'favorite'> & {
    id?: string;
    favorite?: boolean;
  }
): Promise<GalleryPhotoRecord> {
  const record: GalleryPhotoRecord = {
    id: photo.id || `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: photo.title,
    dataUrl: photo.dataUrl,
    format: photo.format,
    source: photo.source,
    createdAt: Date.now(),
    favorite: photo.favorite ?? false,
  };
  return putRecord(STORE_PHOTOS, memPhotos, record);
}

export async function getAllPhotosFromDb(): Promise<GalleryPhotoRecord[]> {
  const rows = await getAllRecords<GalleryPhotoRecord>(STORE_PHOTOS, memPhotos);
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function togglePhotoFavoriteDb(id: string): Promise<GalleryPhotoRecord | null> {
  const all = await getAllPhotosFromDb();
  const found = all.find((p) => p.id === id);
  if (!found) return null;
  const updated: GalleryPhotoRecord = { ...found, favorite: !found.favorite };
  await putRecord(STORE_PHOTOS, memPhotos, updated);
  return updated;
}

export async function deletePhotoFromDb(id: string): Promise<void> {
  return deleteRecord(STORE_PHOTOS, memPhotos, id);
}

export async function clearPhotosFromDb(): Promise<void> {
  return clearStore(STORE_PHOTOS, memPhotos);
}

export async function saveProjectToDb(
  project: Omit<LocalProjectRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<LocalProjectRecord> {
  const now = Date.now();
  const record: LocalProjectRecord = {
    id: project.id || `proj-${now}-${Math.random().toString(36).slice(2, 6)}`,
    title: project.title,
    kind: project.kind,
    thumbnailUrl: project.thumbnailUrl,
    stateJson: project.stateJson,
    createdAt: now,
    updatedAt: now,
  };
  return putRecord(STORE_PROJECTS, memProjects, record);
}

export async function getAllProjectsFromDb(): Promise<LocalProjectRecord[]> {
  const rows = await getAllRecords<LocalProjectRecord>(STORE_PROJECTS, memProjects);
  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProjectFromDb(id: string): Promise<void> {
  return deleteRecord(STORE_PROJECTS, memProjects, id);
}

export async function clearProjectsFromDb(): Promise<void> {
  return clearStore(STORE_PROJECTS, memProjects);
}

export async function recordHistoryDb(
  kind: UsageHistoryRecord['kind'],
  itemId: string,
  label: string
): Promise<void> {
  const id = `${kind}-${itemId}`;
  const rec: UsageHistoryRecord = {
    id,
    kind,
    itemId,
    label,
    usedAt: Date.now(),
  };
  await putRecord(STORE_HISTORY, memHistory, rec);
}

export async function getHistoryDb(): Promise<UsageHistoryRecord[]> {
  const rows = await getAllRecords<UsageHistoryRecord>(STORE_HISTORY, memHistory);
  return rows.sort((a, b) => b.usedAt - a.usedAt);
}

export async function clearHistoryDb(): Promise<void> {
  return clearStore(STORE_HISTORY, memHistory);
}
