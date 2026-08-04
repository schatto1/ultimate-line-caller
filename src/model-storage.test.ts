import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearState,
  emptyState,
  loadState,
  saveState,
} from "./model";
import type { AppState } from "./model";

const storageKey = "ultimate-line-caller:v1";

class MemoryStorage implements Storage {
  private items = new Map<string, string>();

  get length() {
    return this.items.size;
  }

  clear() {
    this.items.clear();
  }

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.items.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.items.delete(key);
  }

  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

describe("model storage", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads empty state when storage is empty, invalid, or malformed", () => {
    expect(loadState()).toEqual(emptyState);

    storage.setItem(storageKey, "{bad json");
    expect(loadState()).toEqual(emptyState);

    storage.setItem(storageKey, JSON.stringify({ players: [] }));
    expect(loadState()).toEqual(emptyState);
  });

  it("saves, loads, and clears app state", () => {
    const state: AppState = {
      players: [
        {
          id: "p1",
          name: "Player One",
          genderCategory: "MMP",
          active: true,
        },
      ],
      gameSettings: {
        startingPossession: "offense",
        startingMmpCount: 4,
        startingFieldSide: "right",
        targetScore: 13,
      },
      pointLog: [
        {
          id: "point-1",
          pointNumber: 1,
          linePlayerIds: ["p1"],
          startingPossession: "offense",
          startingFieldSide: "right",
          requiredMmpCount: 4,
          outcome: "us",
          createdAt: "2026-06-17T00:00:00.000Z",
        },
      ],
      manualHalfTimeTarget: 7,
      pendingHalfTimeCap: false,
    };

    saveState(state);
    expect(loadState()).toEqual(state);

    clearState();
    expect(storage.getItem(storageKey)).toBeNull();
  });

  it("normalizes older stored games with missing field side, target score, and cap fields", () => {
    storage.setItem(
      storageKey,
      JSON.stringify({
        players: [],
        gameSettings: {
          startingPossession: "defense",
          startingMmpCount: 3,
        },
        pointLog: [
          {
            id: "point-1",
            pointNumber: 1,
            linePlayerIds: [],
            startingPossession: "defense",
            requiredMmpCount: 3,
            outcome: "opponent",
            createdAt: "2026-06-17T00:00:00.000Z",
          },
        ],
      }),
    );

    expect(loadState()).toMatchObject({
      gameSettings: {
        startingPossession: "defense",
        startingMmpCount: 3,
        startingFieldSide: "left",
        targetScore: 15,
      },
      pointLog: [
        {
          startingFieldSide: "left",
        },
      ],
      manualHalfTimeTarget: null,
      pendingHalfTimeCap: false,
    });
  });

  it("normalizes older setup-only state with missing cap fields", () => {
    storage.setItem(
      storageKey,
      JSON.stringify({
        players: [],
        gameSettings: null,
        pointLog: [],
      }),
    );

    expect(loadState()).toEqual({
      players: [],
      gameSettings: null,
      pointLog: [],
      manualHalfTimeTarget: null,
      pendingHalfTimeCap: false,
    });
  });
});
