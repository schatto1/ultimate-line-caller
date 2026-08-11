import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearState,
  emptyState,
  loadState,
  saveState,
  selectActiveGame,
  selectActiveSeason,
  selectActiveTeam,
  selectActiveTournament,
} from "./model";
import type { AppState } from "./model";

const storageKey = "ultimate-line-caller:v2";
const prototypeStorageKey = "ultimate-line-caller:v1";

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

  it("loads empty v2 state when storage is empty, invalid, or malformed", () => {
    expect(loadState()).toEqual(emptyState);

    storage.setItem(storageKey, "{bad json");
    expect(loadState()).toEqual(emptyState);

    storage.setItem(storageKey, JSON.stringify({ players: [] }));
    expect(loadState()).toEqual(emptyState);
  });

  it("saves, loads, and clears v2 app state", () => {
    const state: AppState = {
      schemaVersion: 2,
      activeTeamId: "team-1",
      activeSeasonId: "season-1",
      activeTournamentId: "tournament-1",
      activeGameId: "game-1",
      teams: [
        {
          id: "team-1",
          name: "Team One",
          players: [
            {
              id: "p1",
              name: "Player One",
              genderCategory: "MMP",
              active: true,
              archived: false,
            },
          ],
          seasons: [
            {
              id: "season-1",
              name: "2026 Season",
              teamId: "team-1",
              seasonRosterPlayerIds: ["p1"],
              tournaments: [
                {
                  id: "tournament-1",
                  name: "Opening Weekend",
                  seasonId: "season-1",
                  activeRosterPlayerIds: ["p1"],
                  unavailablePlayerIds: [],
                  availabilityEvents: [],
                  games: [
                    {
                      id: "game-1",
                      tournamentId: "tournament-1",
                      name: "Game 1",
                      settings: {
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
                      finalized: false,
                      createdAt: "2026-06-17T00:00:00.000Z",
                    },
                  ],
                },
              ],
              createdAt: "2026-06-17T00:00:00.000Z",
            },
          ],
        },
      ],
    };

    saveState(state);
    expect(storage.getItem(storageKey)).not.toBeNull();
    expect(loadState()).toEqual(state);

    storage.setItem(prototypeStorageKey, JSON.stringify({ players: [] }));
    clearState();
    expect(storage.getItem(storageKey)).toBeNull();
    expect(storage.getItem(prototypeStorageKey)).toBeNull();
  });

  it("migrates prototype state into a default team, season, tournament, and active game", () => {
    storage.setItem(
      prototypeStorageKey,
      JSON.stringify({
        players: [
          {
            id: "p1",
            name: "Player One",
            genderCategory: "MMP",
            active: true,
          },
          {
            id: "p2",
            name: "Player Two",
            genderCategory: "FMP",
            active: false,
          },
        ],
        gameSettings: {
          startingPossession: "defense",
          startingMmpCount: 3,
        },
        pointLog: [
          {
            id: "point-1",
            pointNumber: 1,
            linePlayerIds: ["p1", "p2"],
            startingPossession: "defense",
            requiredMmpCount: 3,
            outcome: "opponent",
            createdAt: "2026-06-17T00:00:00.000Z",
          },
        ],
      }),
    );

    const state = loadState();
    const activeTeam = selectActiveTeam(state);
    const activeSeason = selectActiveSeason(state);
    const activeTournament = selectActiveTournament(state);
    const activeGame = selectActiveGame(state);

    expect(state.schemaVersion).toBe(2);
    expect(activeTeam).toMatchObject({
      id: "team_default",
      name: "Default Team",
      players: [
        {
          id: "p1",
          name: "Player One",
          genderCategory: "MMP",
          active: true,
          archived: false,
        },
        {
          id: "p2",
          name: "Player Two",
          genderCategory: "FMP",
          active: false,
          archived: false,
        },
      ],
    });
    expect(activeSeason).toMatchObject({
      id: "season_default",
      name: "Default Season",
      seasonRosterPlayerIds: ["p1", "p2"],
    });
    expect(activeTournament).toMatchObject({
      id: "tournament_default",
      name: "Default Tournament",
      activeRosterPlayerIds: ["p1"],
      unavailablePlayerIds: [],
    });
    expect(activeGame).toMatchObject({
      id: "game_default",
      name: "Game 1",
      settings: {
        startingPossession: "defense",
        startingMmpCount: 3,
        startingFieldSide: "left",
        targetScore: 15,
      },
      pointLog: [
        {
          id: "point-1",
          startingFieldSide: "left",
        },
      ],
      manualHalfTimeTarget: null,
      pendingHalfTimeCap: false,
      finalized: false,
    });
  });

  it("migrates prototype setup-only state without creating an active game", () => {
    storage.setItem(
      prototypeStorageKey,
      JSON.stringify({
        players: [],
        gameSettings: null,
        pointLog: [],
      }),
    );

    const state = loadState();

    expect(state).toMatchObject({
      schemaVersion: 2,
      activeTeamId: "team_default",
      activeSeasonId: "season_default",
      activeTournamentId: "tournament_default",
      activeGameId: null,
    });
    expect(selectActiveGame(state)).toBeNull();
    expect(selectActiveTournament(state)?.games).toEqual([]);
  });
});
