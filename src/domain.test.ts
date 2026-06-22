import { describe, expect, it } from "vitest";
import {
  createPointLogEntry,
  getCurrentPossession,
  getRequiredMmpCount,
  getScore,
  summarizePlayers,
  validateLine,
} from "./domain";
import type { GameSettings, Player, PointLogEntry } from "./types";

const players: Player[] = [
  { id: "m1", name: "M1", genderCategory: "MMP", active: true },
  { id: "m2", name: "M2", genderCategory: "MMP", active: true },
  { id: "m3", name: "M3", genderCategory: "MMP", active: true },
  { id: "m4", name: "M4", genderCategory: "MMP", active: true },
  { id: "f1", name: "F1", genderCategory: "FMP", active: true },
  { id: "f2", name: "F2", genderCategory: "FMP", active: true },
  { id: "f3", name: "F3", genderCategory: "FMP", active: true },
  { id: "f4", name: "F4", genderCategory: "FMP", active: false },
];

const settings: GameSettings = {
  startingPossession: "offense",
  startingMmpCount: 4,
};

function point(
  index: number,
  outcome: "us" | "opponent",
  startingPossession: "offense" | "defense",
  linePlayerIds = ["m1", "m2", "m3", "m4", "f1", "f2", "f3"],
): PointLogEntry {
  return {
    id: `p${index}`,
    pointNumber: index,
    linePlayerIds,
    startingPossession,
    requiredMmpCount: index % 2 === 1 ? 4 : 3,
    outcome,
    createdAt: "2026-06-17T00:00:00.000Z",
  };
}

describe("domain logic", () => {
  it("derives score from point outcomes", () => {
    expect(getScore([point(1, "us", "offense"), point(2, "opponent", "defense")])).toEqual({
      us: 1,
      opponent: 1,
    });
  });

  it("derives next possession from previous point result", () => {
    expect(getCurrentPossession(settings, [])).toBe("offense");
    expect(getCurrentPossession(settings, [point(1, "us", "offense")])).toBe(
      "defense",
    );
    expect(
      getCurrentPossession(settings, [point(1, "opponent", "offense")]),
    ).toBe("offense");
  });

  it("alternates ratio from the starting point", () => {
    expect(getRequiredMmpCount(1, 4)).toBe(4);
    expect(getRequiredMmpCount(2, 4)).toBe(3);
    expect(getRequiredMmpCount(3, 4)).toBe(4);
    expect(getRequiredMmpCount(1, 3)).toBe(3);
    expect(getRequiredMmpCount(2, 3)).toBe(4);
  });

  it("validates count, ratio, and inactive players", () => {
    expect(
      validateLine(players, ["m1", "m2", "m3", "m4", "f1", "f2", "f3"], 4),
    ).toEqual([]);

    expect(validateLine(players, ["m1", "m2", "m3", "f1", "f2"], 4)).toEqual([
      "Selected 5/7",
      "MMP 3/4",
      "FMP 2/3",
    ]);

    expect(
      validateLine(players, ["m1", "m2", "m3", "m4", "f1", "f2", "f4"], 4),
    ).toContain("F4 is inactive");
  });

  it("summarizes player total, offense, and defense counts", () => {
    const summary = summarizePlayers(players, [
      point(1, "us", "offense", ["m1", "m2", "m3", "m4", "f1", "f2", "f3"]),
      point(2, "opponent", "defense", [
        "m1",
        "m2",
        "m3",
        "f1",
        "f2",
        "f3",
        "f4",
      ]),
    ]);

    const m1 = summary.find(({ player }) => player.id === "m1");
    const m4 = summary.find(({ player }) => player.id === "m4");

    expect(m1).toMatchObject({ total: 2, offense: 1, defense: 1 });
    expect(m4).toMatchObject({ total: 1, offense: 1, defense: 0 });
  });

  it("creates a point log entry from the current game state", () => {
    const firstPoint = createPointLogEntry({
      gameSettings: settings,
      pointLog: [],
      linePlayerIds: ["m1", "m2", "m3", "m4", "f1", "f2", "f3"],
      outcome: "us",
    });

    const secondPoint = createPointLogEntry({
      gameSettings: settings,
      pointLog: [firstPoint],
      linePlayerIds: ["m1", "m2", "m3", "f1", "f2", "f3", "f4"],
      outcome: "opponent",
    });

    expect(firstPoint).toMatchObject({
      pointNumber: 1,
      startingPossession: "offense",
      requiredMmpCount: 4,
      outcome: "us",
    });
    expect(secondPoint).toMatchObject({
      pointNumber: 2,
      startingPossession: "defense",
      requiredMmpCount: 3,
      outcome: "opponent",
    });
  });
});

