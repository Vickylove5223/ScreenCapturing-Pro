/** Fix: Added DOM library reference to resolve missing browser global types like localStorage and IndexedDB */
/// <reference lib="dom" />

export interface RecordingMeta {
  id: string;
  name: string;
  timestamp: number;
  size: number;
  mimeType: string;
}

const DB_NAME = 'VibeRecorderDB';
const STORE_NAME = 'blobs';
const META_KEY = 'vibe_recordings_meta';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveRecordingToStorage = async (blob: Blob, name?: string): Promise<RecordingMeta> => {
  const id = crypto.randomUUID();
  const meta: RecordingMeta = {
    id,
    name: name || `Recording ${new Date().toLocaleString()}`,
    timestamp: Date.now(),
    size: blob.size,
    mimeType: blob.type,
  };

  // Save Blob to IndexedDB
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  await new Promise<void>((resolve, reject) => {
    const request = store.put(blob, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // Save Metadata to LocalStorage
  const existingMetaJSON = localStorage.getItem(META_KEY);
  const existingMeta: RecordingMeta[] = existingMetaJSON ? JSON.parse(existingMetaJSON) : [];
  existingMeta.unshift(meta);
  localStorage.setItem(META_KEY, JSON.stringify(existingMeta));

  return meta;
};

export const updateRecordingName = (id: string, newName: string): void => {
  const existingMetaJSON = localStorage.getItem(META_KEY);
  if (existingMetaJSON) {
    const existingMeta: RecordingMeta[] = JSON.parse(existingMetaJSON);
    const index = existingMeta.findIndex(m => m.id === id);
    if (index !== -1) {
      existingMeta[index].name = newName;
      localStorage.setItem(META_KEY, JSON.stringify(existingMeta));
    }
  }
};

export const getRecordingBlob = async (id: string): Promise<Blob> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) resolve(request.result);
      else reject(new Error('Recording not found'));
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteRecording = async (id: string): Promise<void> => {
  // Delete from IndexedDB
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  await new Promise<void>((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // Delete from LocalStorage
  const existingMetaJSON = localStorage.getItem(META_KEY);
  if (existingMetaJSON) {
    const existingMeta: RecordingMeta[] = JSON.parse(existingMetaJSON);
    const newMeta = existingMeta.filter(m => m.id !== id);
    localStorage.setItem(META_KEY, JSON.stringify(newMeta));
  }
};

export const getRecordingList = (): RecordingMeta[] => {
  const json = localStorage.getItem(META_KEY);
  return json ? JSON.parse(json) : [];
};