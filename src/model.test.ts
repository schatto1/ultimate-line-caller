import { describe, expect, it } from "vitest";
import {
  canAddPlayerToLine,
  lineErrors,
  newPoint,
  pointContext,
  requiredMmpCountForPoint,
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
    requiredMmpCount: requiredMmpCountForPoint(
      pointNumber,
      settings.startingMmpCount,
    ),
    outcome,
    createdAt: "2026-06-17T00:00:00.000Z",
  };
}

describe("model", () => {
  it("uses the USAU ABBA ratio pattern from the starting ratio", () => {
    expect(
      [1, 2, 3, 4, 5, 6, 7, 8].map((pointNumber) =>
        requiredMmpCountForPoint(pointNumber, 4),
      ),
    ).toEqual([4, 3, 3, 4, 4, 3, 3, 4]);

    expect(
      [1, 2, 3, 4, 5, 6, 7, 8].map((pointNumber) =>
        requiredMmpCountForPoint(pointNumber, 3),
      ),
    ).toEqual([3, 4, 4, 3, 3, 4, 4, 3]);
  });

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

    expect(
      pointContext(settings, [
        point(1, "us", "offense"),
        point(2, "opponent", "defense"),
      ]),
    ).toMatchObject({
      pointNumber: 3,
      requiredMmpCount: 3,
      requiredFmpCount: 4,
      score: { us: 1, opponent: 1 },
    });

    expect(
      pointContext(settings, [
        point(1, "us", "offense"),
        point(2, "opponent", "defense"),
        point(3, "us", "offense"),
      ]),
    ).toMatchObject({
      pointNumber: 4,
      requiredMmpCount: 4,
      requiredFmpCount: 3,
      score: { us: 2, opponent: 1 },
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

  it("blocks adding players after their category limit is reached", () => {
    const selectedPlayer = players.find((player) => player.id === "m1")!;
    const mmpPlayer = players.find((player) => player.id === "m4")!;
    const fmpPlayer = players.find((player) => player.id === "f3")!;
    const inactivePlayer = players.find((player) => player.id === "f4")!;
    const extraFmpPlayer: Player = {
      id: "f5",
      name: "F5",
      genderCategory: "FMP",
      active: true,
    };

    expect(
      canAddPlayerToLine(players, ["m1", "m2", "m3", "f1"], mmpPlayer, 3),
    ).toBe(false);
    expect(
      canAddPlayerToLine(players, ["m1", "m2", "m3", "f1"], fmpPlayer, 3),
    ).toBe(true);
    expect(
      canAddPlayerToLine(players, ["m1", "m2", "f1"], mmpPlayer, 3),
    ).toBe(true);
    expect(
      canAddPlayerToLine(players, ["m1", "m2", "f1"], selectedPlayer, 3),
    ).toBe(false);
    expect(
      canAddPlayerToLine(players, ["m1", "m2", "f1"], inactivePlayer, 3),
    ).toBe(false);
    expect(
      canAddPlayerToLine(
        [...players, extraFmpPlayer],
        ["m1", "m2", "m3", "m4", "f1", "f2", "f3"],
        extraFmpPlayer,
        4,
      ),
    ).toBe(false);
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
