import type { Episode } from './types';

const KEY = 'podpilot.episodes.v1';
const DB = 'podpilot-media-v1';
const STORE = 'recordings';

function browserStorage(): Storage {
  if (typeof window === 'undefined') throw new Error('Episode storage is available only in your browser.');
  try { return window.localStorage; } catch { throw new Error('Browser storage is blocked. Enable site storage or download your episode before leaving.'); }
}

function validEpisode(value: unknown): value is Episode {
  if (!value || typeof value !== 'object') return false;
  const episode = value as Partial<Episode>;
  return typeof episode.id === 'string' && typeof episode.createdAt === 'string' && Array.isArray(episode.transcript) && !!episode.config && !!episode.content && typeof episode.content.title === 'string';
}

export function listEpisodes(): Episode[] {
  try {
    const stored: unknown = JSON.parse(browserStorage().getItem(KEY) || '[]');
    return Array.isArray(stored) ? stored.filter(validEpisode).sort((a,b) => b.createdAt.localeCompare(a.createdAt)) : [];
  } catch { return []; }
}

export function getEpisode(id: string): Episode | undefined {
  return listEpisodes().find(episode => episode.id === id);
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser cannot store media. Download your recording before leaving.')); return; }
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Media storage could not open. Your browser may be blocking site storage.'));
    request.onblocked = () => reject(new Error('Media storage is busy in another tab. Close other PodPilot tabs and try again.'));
  });
}

async function mediaWrite(operation: (store: IDBObjectStore) => IDBRequest): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve,reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      operation(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Media could not be saved. Browser storage may be full; download the recording now.'));
      transaction.onabort = () => reject(new Error('Media storage was interrupted. Download the recording before leaving.'));
    });
  } finally { db.close(); }
}

export async function saveEpisode(episode: Episode, blob?: Blob): Promise<void> {
  const storage = browserStorage();
  const previous = storage.getItem(KEY);
  const episodes = listEpisodes().filter(existing => existing.id !== episode.id);
  try { storage.setItem(KEY, JSON.stringify([episode, ...episodes])); }
  catch { throw new Error('Episode could not be saved. Browser storage may be full or blocked. Export the transcript before leaving.'); }
  if (blob && blob.size > 0) {
    try { await mediaWrite(store => store.put(blob, episode.id)); }
    catch (error) {
      try { if (previous === null) storage.removeItem(KEY); else storage.setItem(KEY, previous); } catch { /* preserve the useful media error */ }
      throw error;
    }
  }
}

export async function getMedia(id: string): Promise<Blob | undefined> {
  const db = await database();
  try {
    return await new Promise<Blob | undefined>((resolve,reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : undefined);
      request.onerror = () => reject(new Error('This recording could not be read from browser storage.'));
    });
  } finally { db.close(); }
}

export async function deleteEpisode(id: string): Promise<void> {
  // Delete media first so a failed media deletion does not silently hide it.
  if (typeof indexedDB !== 'undefined') await mediaWrite(store => store.delete(id));
  const storage = browserStorage();
  try { storage.setItem(KEY, JSON.stringify(listEpisodes().filter(episode => episode.id !== id))); }
  catch { throw new Error('Episode metadata could not be removed. Please allow site storage and try again.'); }
}

export async function clearEpisodes(): Promise<void> {
  if (typeof indexedDB !== 'undefined') await mediaWrite(store => store.clear());
  try { browserStorage().removeItem(KEY); }
  catch { throw new Error('Episode metadata could not be cleared. Clear this site’s data in browser settings.'); }
}

export async function saveMedia(id:string,blob:Blob):Promise<void>{if(!blob.size)throw new Error('The file is empty.');await mediaWrite(store=>store.put(blob,id));}
export async function deleteMedia(id:string):Promise<void>{await mediaWrite(store=>store.delete(id));}
