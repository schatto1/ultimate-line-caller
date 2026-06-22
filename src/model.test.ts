import { describe, expect, it } from "vitest";
import {
  lineErrors,
  newPoint,
  pointContext,
  summaries,
} from "./model";
import type { GameSettings, Player, PointLogEntry } from "./model";

const players: Player[] = [
  ...["m1", "m2", "m3", "m4"].map((id) => ({
    id,
    name: id.toUpperCase(),
    genderCategory: "MMP" as const,
    active: true,
  })),
  ...["f1", "f2", "f3"].map((id) => ({
    id,
    name: id.toUpperCase(),
    genderCategory: "FMP" as const,
    active: true,
  })),
  { id: "f4", name: "F4", genderCategory: "FMP", active: false },
];

const settings: GameSettings = {
  startingPossession: "offense",
  startingMmpCount: 4,
};

function point(
  pointNumber: number,
  outcome: "us" | "opponent",
  startingPossession: "offense" | "defense",
  linePlayerIds = ["m1", "m2", "m3", "m4", "f1", "f2", "f3"],
): PointLogEntry {
  return {
    id: `point-${pointNumber}`,
    pointNumber,
    linePlayerIds,
    startingPossession,
    requiredMmpCount: pointNumber % 2 === 1 ? 4 : 3,
    outcome,
    createdAt: "2026-06-17T00:00:00.000Z",
  };
}

describe("model", () => {
  it("derives score, next possession, point number, and ratio together", () => {
    expect(pointContext(settings, [])).toMatchObject({
      pointNumber: 1,
      possession: "offense",
      requiredMmpCount: 4,
      requiredFmpCount: 3,
      score: { us: 0, opponent: 0 },
    });

    expect(
      pointContext(settings, [point(1, "us", "offense")]),
    ).toMatchObject({
      pointNumber: 2,
      possession: "defense",
      requiredMmpCount: 3,
      requiredFmpCount: 4,
      score: { us: 1, opponent: 0 },
    });
  });

  it("validates line size, ratio, and inactive players", () => {
    expect(
      lineErrors(players, ["m1", "m2", "m3", "m4", "f1", "f2", "f3"], 4),
    ).toEqual([]);

    expect(lineErrors(players, ["m1", "m2", "m3", "f1", "f2"], 4)).toEqual([
      "Selected 5/7",
      "MMP 3/4",
      "FMP 2/3",
    ]);

    expect(
      lineErrors(players, ["m1", "m2", "m3", "m4", "f1", "f2", "f4"], 4),
    ).toContain("F4 is inactive");
  });

  it("summarizes player totals and O/D splits", () => {
    const summary = summaries(players, [
      point(1, "us", "offense"),
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

    expect(summary.find(({ player }) => player.id === "m1")).toMatchObject({
      total: 2,
      offense: 1,
      defense: 1,
    });
    expect(summary.find(({ player }) => player.id === "m4")).toMatchObject({
      total: 1,
      offense: 1,
      defense: 0,
    });
  });

  it("creates point log entries from current game state", () => {
    const firstPoint = newPoint(
      settings,
      [],
      ["m1", "m2", "m3", "m4", "f1", "f2", "f3"],
      "us",
    );
    const secondPoint = newPoint(
      settings,
      [firstPoint],
      ["m1", "m2", "m3", "f1", "f2", "f3", "f4"],
      "opponent",
    );

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

