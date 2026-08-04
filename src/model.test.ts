import { describe, expect, it } from "vitest";
import {
  canAddPlayerToLine,
  cappedHalfTimeTargetAfterPoint,
  fieldSideForPoint,
  halfTimeStartPointNumber,
  lineErrors,
  lineCounts,
  linePlayers,
  newPoint,
  pointContext,
  requiredMmpCountForPoint,
  scoreForPointLog,
  suggestedLine,
  summaries,
  winnerForScore,
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
  startingFieldSide: "left",
  targetScore: 15,
};

const settingsTo13: GameSettings = {
  ...settings,
  targetScore: 13,
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
    startingFieldSide: "left",
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

  it("alternates field side by point while resetting opposite the game start at half", () => {
    expect(
      [1, 2, 3, 4].map((pointNumber) =>
        fieldSideForPoint(pointNumber, "left", null),
      ),
    ).toEqual(["left", "right", "left", "right"]);

    expect(
      [9, 10, 11, 12].map((pointNumber) =>
        fieldSideForPoint(pointNumber, "left", 9),
      ),
    ).toEqual(["right", "left", "right", "left"]);
  });

  it("derives score, next possession, point number, and ratio together", () => {
    expect(pointContext(settings, [])).toMatchObject({
      pointNumber: 1,
      possession: "offense",
      requiredMmpCount: 4,
      requiredFmpCount: 3,
      fieldSide: "left",
      half: "first",
      halfTimeTarget: 8,
      score: { us: 0, opponent: 0 },
    });

    expect(
      pointContext(settings, [point(1, "us", "offense")]),
    ).toMatchObject({
      pointNumber: 2,
      possession: "defense",
      requiredMmpCount: 3,
      requiredFmpCount: 4,
      fieldSide: "right",
      half: "first",
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
      fieldSide: "left",
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
      fieldSide: "right",
      score: { us: 2, opponent: 1 },
    });
  });

  it("switches starting O/D and side on the first point after regulation half time", () => {
    const pointLog = Array.from({ length: 8 }, (_, index) =>
      point(index + 1, "us", index === 0 ? "offense" : "defense"),
    );

    expect(pointContext(settings, pointLog)).toMatchObject({
      pointNumber: 9,
      possession: "defense",
      fieldSide: "right",
      half: "second",
      halfTimeTarget: 8,
      halfTimeStartPointNumber: 9,
      halfTimeReached: true,
      score: { us: 8, opponent: 0 },
    });

    expect(
      pointContext(settings, [
        ...pointLog,
        point(9, "opponent", "defense"),
      ]),
    ).toMatchObject({
      pointNumber: 10,
      possession: "offense",
      fieldSide: "left",
      half: "second",
    });
  });

  it("uses seven as the regulation half time target for games to 13", () => {
    const pointLog = Array.from({ length: 7 }, (_, index) =>
      point(index + 1, "opponent", index === 0 ? "offense" : "defense"),
    );

    expect(pointContext(settingsTo13, pointLog)).toMatchObject({
      pointNumber: 8,
      possession: "defense",
      fieldSide: "right",
      half: "second",
      halfTimeTarget: 7,
      score: { us: 0, opponent: 7 },
    });
  });

  it("uses the manual half time target when half time cap is set", () => {
    const pointLog = [
      point(1, "us", "offense"),
      point(2, "opponent", "defense"),
      point(3, "us", "offense"),
      point(4, "us", "defense"),
    ];

    expect(pointContext(settings, pointLog, 3)).toMatchObject({
      pointNumber: 5,
      possession: "defense",
      fieldSide: "right",
      half: "second",
      halfTimeTarget: 3,
      halfTimeStartPointNumber: 5,
      score: { us: 3, opponent: 1 },
    });
  });

  it("sets half time cap after the capped point without exceeding regulation half", () => {
    expect(
      cappedHalfTimeTargetAfterPoint(settings, [
        point(1, "us", "offense"),
        point(2, "opponent", "defense"),
        point(3, "us", "offense"),
        point(4, "us", "defense"),
        point(5, "opponent", "offense"),
      ]),
    ).toBe(4);

    expect(
      cappedHalfTimeTargetAfterPoint(settings, [
        ...Array.from({ length: 8 }, (_, index) =>
          point(index + 1, "us", index % 2 === 0 ? "offense" : "defense"),
        ),
      ]),
    ).toBe(8);

    expect(
      cappedHalfTimeTargetAfterPoint(settingsTo13, [
        ...Array.from({ length: 7 }, (_, index) =>
          point(index + 1, "opponent", index % 2 === 0 ? "offense" : "defense"),
        ),
      ]),
    ).toBe(7);
  });

  it("marks the game over when either team reaches the target score", () => {
    expect(
      pointContext(settings, [
        ...Array.from({ length: 15 }, (_, index) =>
          point(index + 1, "us", index % 2 === 0 ? "offense" : "defense"),
        ),
      ]),
    ).toMatchObject({
      winner: "us",
      gameOver: true,
      score: { us: 15, opponent: 0 },
    });

    expect(
      pointContext(settingsTo13, [
        ...Array.from({ length: 13 }, (_, index) =>
          point(index + 1, "opponent", index % 2 === 0 ? "offense" : "defense"),
        ),
      ]),
    ).toMatchObject({
      winner: "opponent",
      gameOver: true,
      score: { us: 0, opponent: 13 },
    });
  });

  it("does not mark the game over before either team reaches the target score", () => {
    expect(winnerForScore({ us: 14, opponent: 13 }, 15)).toBeNull();
    expect(winnerForScore({ us: 12, opponent: 12 }, 13)).toBeNull();
  });

  it("derives score from point outcomes", () => {
    expect(
      scoreForPointLog([
        point(1, "us", "offense"),
        point(2, "opponent", "defense"),
        point(3, "us", "offense"),
        point(4, "opponent", "defense"),
        point(5, "us", "offense"),
      ]),
    ).toEqual({ us: 3, opponent: 2 });
  });

  it("returns the first point after the half time target is reached", () => {
    expect(
      halfTimeStartPointNumber(
        [
          point(1, "us", "offense"),
          point(2, "opponent", "defense"),
          point(3, "us", "offense"),
          point(4, "opponent", "defense"),
        ],
        3,
      ),
    ).toBeNull();

    expect(
      halfTimeStartPointNumber(
        [
          point(1, "us", "offense"),
          point(2, "opponent", "defense"),
          point(3, "us", "offense"),
          point(4, "us", "defense"),
        ],
        3,
      ),
    ).toBe(5);
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

  it("ignores unknown player IDs when resolving line players and counts", () => {
    expect(linePlayers(players, ["f2", "missing", "m1"]).map(({ id }) => id))
      .toEqual(["f2", "m1"]);
    expect(lineCounts(players, ["f2", "missing", "m1", "m2"])).toEqual({
      MMP: 2,
      FMP: 1,
    });
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

  it("sorts summaries with active players before inactive players, then by lowest workload", () => {
    const summary = summaries(players, [
      point(1, "us", "offense", ["m1", "m2", "m3", "m4", "f1", "f2", "f3"]),
      point(2, "us", "defense", ["m1", "m2", "m3", "m4", "f1", "f2", "f3"]),
      point(3, "us", "offense", ["m1", "m2", "m3", "m4", "f1", "f2", "f4"]),
    ]);

    expect(summary.map(({ player }) => player.id)).toEqual([
      "f3",
      "f1",
      "f2",
      "m1",
      "m2",
      "m3",
      "m4",
      "f4",
    ]);
  });

  it("suggests the lowest-workload active players by required ratio", () => {
    const pointLog = [
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
    ];

    expect(suggestedLine(players, pointLog, 4)).toEqual([
      "m4",
      "m1",
      "m2",
      "m3",
      "f1",
      "f2",
      "f3",
    ]);
    expect(suggestedLine(players, pointLog, 3)).toEqual([
      "m4",
      "m1",
      "m2",
      "f1",
      "f2",
      "f3",
    ]);
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
      startingFieldSide: "left",
      requiredMmpCount: 4,
      outcome: "us",
    });
    expect(secondPoint).toMatchObject({
      pointNumber: 2,
      startingPossession: "defense",
      startingFieldSide: "right",
      requiredMmpCount: 3,
      outcome: "opponent",
    });
  });

  it("copies line IDs when creating a point log entry", () => {
    const linePlayerIds = ["m1", "m2", "m3", "m4", "f1", "f2", "f3"];
    const loggedPoint = newPoint(settings, [], linePlayerIds, "us");

    linePlayerIds.pop();

    expect(loggedPoint.linePlayerIds).toEqual([
      "m1",
      "m2",
      "m3",
      "m4",
      "f1",
      "f2",
      "f3",
    ]);
  });
});
