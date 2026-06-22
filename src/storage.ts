import { emptyState } from "./domain";
import type { AppState } from "./types";

const STORAGE_KEY = "ultimate-line-caller:v1";

function isState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeState = value as Partial<AppState>;

  return (
    Array.isArray(maybeState.players) &&
    Array.isArray(maybeState.pointLog) &&
    ("gameSettings" in maybeState)
  );
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return emptyState;
    }

    const parsed = JSON.parse(raw);
    return isState(parsed) ? parsed : emptyState;
  } catch {
    return emptyState;
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY);
}

