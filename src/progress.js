import { LEVEL_ONE, playableLevel } from "./levels.js";

const KEY = "siegedolls.progress";
const browserStorage = () => globalThis.localStorage;

export function readProgress(storage = browserStorage) {
  try {
    const saved = JSON.parse(storage()?.getItem(KEY));
    if (saved?.version === 1) {
      return {
        selected: playableLevel(saved.selected)?.id ?? LEVEL_ONE.id,
        completed: Array.isArray(saved.completed)
          ? [...new Set(saved.completed.filter((id) => playableLevel(id)))]
          : [],
      };
    }
  } catch {
    // A fresh session remains playable when storage is denied or corrupt.
  }
  return { selected: LEVEL_ONE.id, completed: [] };
}

export function saveProgress(progress, storage = browserStorage) {
  try {
    storage()?.setItem(KEY, JSON.stringify({ version: 1, ...progress }));
  } catch {
    // Keep the in-memory selection and completion for the rest of the session.
  }
}
