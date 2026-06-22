import type {
  AppState,
  GameSettings,
  GenderCategory,
  Player,
  PlayerSummary,
  PointLogEntry,
  PointOutcome,
  Possession,
} from "./types";

export const emptyState: AppState = {
  players: [],
  gameSettings: null,
  pointLog: [],
};

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function oppositeMmpCount(count: 3 | 4): 3 | 4 {
  return count === 4 ? 3 : 4;
}

export function getRequiredMmpCount(
  pointNumber: number,
  startingMmpCount: 3 | 4,
): 3 | 4 {
  return pointNumber % 2 === 1
    ? startingMmpCount
    : oppositeMmpCount(startingMmpCount);
}

export function getScore(pointLog: PointLogEntry[]) {
  return pointLog.reduce(
    (score, point) => {
      if (point.outcome === "us") {
        score.us += 1;
      } else {
        score.opponent += 1;
      }

      return score;
    },
    { us: 0, opponent: 0 },
  );
}

export function getCurrentPossession(
  gameSettings: GameSettings,
  pointLog: PointLogEntry[],
): Possession {
  const lastPoint = pointLog.at(-1);

  if (!lastPoint) {
    return gameSettings.startingPossession;
  }

  return lastPoint.outcome === "us" ? "defense" : "offense";
}

export function getPointNumber(pointLog: PointLogEntry[]): number {
  return pointLog.length + 1;
}

export function countLineCategories(players: Player[], linePlayerIds: string[]) {
  const byId = new Map(players.map((player) => [player.id, player]));

  return linePlayerIds.reduce(
    (counts, playerId) => {
      const player = byId.get(playerId);

      if (player?.genderCategory === "MMP") {
        counts.MMP += 1;
      }

      if (player?.genderCategory === "FMP") {
        counts.FMP += 1;
      }

      return counts;
    },
    { MMP: 0, FMP: 0 } satisfies Record<GenderCategory, number>,
  );
}

export function validateLine(
  players: Player[],
  linePlayerIds: string[],
  requiredMmpCount: 3 | 4,
): string[] {
  const errors: string[] = [];
  const playerById = new Map(players.map((player) => [player.id, player]));
  const selectedPlayers = linePlayerIds
    .map((id) => playerById.get(id))
    .filter(Boolean) as Player[];
  const inactivePlayer = selectedPlayers.find((player) => !player.active);
  const counts = countLineCategories(players, linePlayerIds);

  if (linePlayerIds.length !== 7) {
    errors.push(`Selected ${linePlayerIds.length}/7`);
  }

  if (counts.MMP !== requiredMmpCount) {
    errors.push(`MMP ${counts.MMP}/${requiredMmpCount}`);
  }

  if (counts.FMP !== 7 - requiredMmpCount) {
    errors.push(`FMP ${counts.FMP}/${7 - requiredMmpCount}`);
  }

  if (inactivePlayer) {
    errors.push(`${inactivePlayer.name} is inactive`);
  }

  return errors;
}

export function summarizePlayers(
  players: Player[],
  pointLog: PointLogEntry[],
): PlayerSummary[] {
  return players
    .map((player) => {
      let total = 0;
      let offense = 0;
      let defense = 0;

      for (const point of pointLog) {
        if (!point.linePlayerIds.includes(player.id)) {
          continue;
        }

        total += 1;

        if (point.startingPossession === "offense") {
          offense += 1;
        } else {
          defense += 1;
        }
      }

      return { player, total, offense, defense };
    })
    .sort((a, b) => {
      if (b.player.active !== a.player.active) {
        return Number(b.player.active) - Number(a.player.active);
      }

      if (a.total !== b.total) {
        return a.total - b.total;
      }

      return a.player.name.localeCompare(b.player.name);
    });
}

export function getSuggestedLine(
  players: Player[],
  pointLog: PointLogEntry[],
  requiredMmpCount: 3 | 4,
): string[] {
  const summaries = summarizePlayers(players, pointLog).filter(
    ({ player }) => player.active,
  );

  const pick = (category: GenderCategory, needed: number) =>
    summaries
      .filter(({ player }) => player.genderCategory === category)
      .slice(0, needed)
      .map(({ player }) => player.id);

  return [
    ...pick("MMP", requiredMmpCount),
    ...pick("FMP", 7 - requiredMmpCount),
  ];
}

export function createPointLogEntry(params: {
  gameSettings: GameSettings;
  pointLog: PointLogEntry[];
  linePlayerIds: string[];
  outcome: PointOutcome;
}): PointLogEntry {
  const pointNumber = getPointNumber(params.pointLog);

  return {
    id: createId("point"),
    pointNumber,
    linePlayerIds: [...params.linePlayerIds],
    startingPossession: getCurrentPossession(
      params.gameSettings,
      params.pointLog,
    ),
    requiredMmpCount: getRequiredMmpCount(
      pointNumber,
      params.gameSettings.startingMmpCount,
    ),
    outcome: params.outcome,
    createdAt: new Date().toISOString(),
  };
}

