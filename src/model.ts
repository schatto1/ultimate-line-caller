export type GenderCategory = "MMP" | "FMP";
export type Possession = "offense" | "defense";
export type PointOutcome = "us" | "opponent";
export type FieldSide = "left" | "right";
export type TargetScore = 13 | 15;

export type Player = {
  id: string;
  name: string;
  genderCategory: GenderCategory;
  active: boolean;
};

export type GameSettings = {
  startingPossession: Possession;
  startingMmpCount: 3 | 4;
  startingFieldSide: FieldSide;
  targetScore: TargetScore;
};

export type PointLogEntry = {
  id: string;
  pointNumber: number;
  linePlayerIds: string[];
  startingPossession: Possession;
  startingFieldSide: FieldSide;
  requiredMmpCount: 3 | 4;
  outcome: PointOutcome;
  createdAt: string;
};

export type AppState = {
  players: Player[];
  gameSettings: GameSettings | null;
  pointLog: PointLogEntry[];
  manualHalfTimeTarget: number | null;
  pendingHalfTimeCap: boolean;
};

export type PlayerSummary = {
  player: Player;
  total: number;
  offense: number;
  defense: number;
};

const STORAGE_KEY = "ultimate-line-caller:v1";

export const emptyState: AppState = {
  players: [],
  gameSettings: null,
  pointLog: [],
  manualHalfTimeTarget: null,
  pendingHalfTimeCap: false,
};

const sampleRosterData: Array<Pick<Player, "name" | "genderCategory">> = [
  ...Array.from({ length: 7 }, (_, index) => ({
    name: `MMP ${index + 1}`,
    genderCategory: "MMP" as const,
  })),
  ...Array.from({ length: 7 }, (_, index) => ({
    name: `FMP ${index + 1}`,
    genderCategory: "FMP" as const,
  })),
];

export function id(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function sampleRoster(): Player[] {
  return sampleRosterData.map((player) => ({
    ...player,
    id: id("player"),
    active: true,
  }));
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    if (
      parsed &&
      Array.isArray(parsed.players) &&
      Array.isArray(parsed.pointLog) &&
      "gameSettings" in parsed
    ) {
      return normalizeState(parsed);
    }

    return emptyState;
  } catch {
    return emptyState;
  }
}

function normalizeState(state: AppState): AppState {
  const gameSettings = state.gameSettings
    ? {
        ...state.gameSettings,
        startingFieldSide: state.gameSettings.startingFieldSide ?? "left",
        targetScore: state.gameSettings.targetScore ?? 15,
      }
    : null;

  if (state.gameSettings === null) {
    return {
      ...state,
      gameSettings,
      manualHalfTimeTarget: state.manualHalfTimeTarget ?? null,
      pendingHalfTimeCap: state.pendingHalfTimeCap ?? false,
    };
  }

  const activeGameSettings = gameSettings!;

  return {
    ...state,
    gameSettings: activeGameSettings,
    pointLog: state.pointLog.map((point) => ({
      ...point,
      startingFieldSide:
        point.startingFieldSide ?? activeGameSettings.startingFieldSide,
    })),
    manualHalfTimeTarget: state.manualHalfTimeTarget ?? null,
    pendingHalfTimeCap: state.pendingHalfTimeCap ?? false,
  };
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function oppositeMmpCount(count: 3 | 4): 3 | 4 {
  return count === 4 ? 3 : 4;
}

export function oppositePossession(possession: Possession): Possession {
  return possession === "offense" ? "defense" : "offense";
}

export function oppositeFieldSide(side: FieldSide): FieldSide {
  return side === "left" ? "right" : "left";
}

export function requiredMmpCountForPoint(
  pointNumber: number,
  startingMmpCount: 3 | 4,
): 3 | 4 {
  const cyclePosition = (pointNumber - 1) % 4;
  const usesStartingRatio = cyclePosition === 0 || cyclePosition === 3;

  return usesStartingRatio ? startingMmpCount : oppositeMmpCount(startingMmpCount);
}

export function regulationHalfTimeTarget(targetScore: TargetScore): number {
  return Math.ceil(targetScore / 2);
}

export function scoreForPointLog(pointLog: PointLogEntry[]) {
  return pointLog.reduce(
    (score, point) => {
      score[point.outcome === "us" ? "us" : "opponent"] += 1;
      return score;
    },
    { us: 0, opponent: 0 },
  );
}

export function winnerForScore(
  score: { us: number; opponent: number },
  targetScore: TargetScore,
): PointOutcome | null {
  if (score.us >= targetScore) {
    return "us";
  }

  if (score.opponent >= targetScore) {
    return "opponent";
  }

  return null;
}

export function halfTimeTarget(
  gameSettings: GameSettings,
  manualHalfTimeTarget: number | null,
): number {
  return manualHalfTimeTarget ?? regulationHalfTimeTarget(gameSettings.targetScore);
}

export function cappedHalfTimeTargetAfterPoint(
  gameSettings: GameSettings,
  pointLog: PointLogEntry[],
): number {
  const score = scoreForPointLog(pointLog);
  const cappedTarget = Math.max(score.us, score.opponent) + 1;

  return Math.min(cappedTarget, regulationHalfTimeTarget(gameSettings.targetScore));
}

export function halfTimeStartPointNumber(
  pointLog: PointLogEntry[],
  target: number,
): number | null {
  const score = { us: 0, opponent: 0 };

  for (const [index, point] of pointLog.entries()) {
    score[point.outcome === "us" ? "us" : "opponent"] += 1;

    if (score.us >= target || score.opponent >= target) {
      return index + 2;
    }
  }

  return null;
}

export function fieldSideForPoint(
  pointNumber: number,
  startingFieldSide: FieldSide,
  halfTimeStartPointNumber: number | null,
): FieldSide {
  const halfOpeningPointNumber =
    halfTimeStartPointNumber !== null && pointNumber >= halfTimeStartPointNumber
      ? halfTimeStartPointNumber
      : 1;
  const halfOpeningFieldSide =
    halfOpeningPointNumber === 1
      ? startingFieldSide
      : oppositeFieldSide(startingFieldSide);
  const pointsSinceHalfOpened = pointNumber - halfOpeningPointNumber;

  return pointsSinceHalfOpened % 2 === 0
    ? halfOpeningFieldSide
    : oppositeFieldSide(halfOpeningFieldSide);
}

export function pointContext(
  gameSettings: GameSettings,
  pointLog: PointLogEntry[],
  manualHalfTimeTarget: number | null = null,
) {
  const pointNumber = pointLog.length + 1;
  const lastPoint = pointLog.at(-1);
  const score = scoreForPointLog(pointLog);
  const winner = winnerForScore(score, gameSettings.targetScore);
  const halfTarget = halfTimeTarget(gameSettings, manualHalfTimeTarget);
  const halfStartPointNumber = halfTimeStartPointNumber(pointLog, halfTarget);
  const isHalfTimeStartPoint = pointNumber === halfStartPointNumber;
  const isSecondHalf =
    halfStartPointNumber !== null && pointNumber >= halfStartPointNumber;
  const requiredMmpCount = requiredMmpCountForPoint(
    pointNumber,
    gameSettings.startingMmpCount,
  );

  return {
    pointNumber,
    requiredMmpCount,
    requiredFmpCount: 7 - requiredMmpCount,
    possession: lastPoint
      ? isHalfTimeStartPoint
        ? oppositePossession(gameSettings.startingPossession)
        : lastPoint.outcome === "us"
          ? "defense"
          : "offense"
      : gameSettings.startingPossession,
    fieldSide: fieldSideForPoint(
      pointNumber,
      gameSettings.startingFieldSide,
      halfStartPointNumber,
    ),
    half: isSecondHalf ? "second" : "first",
    halfTimeTarget: halfTarget,
    halfTimeStartPointNumber: halfStartPointNumber,
    halfTimeReached: halfStartPointNumber !== null,
    manualHalfTimeTarget,
    winner,
    gameOver: winner !== null,
    score,
  };
}

export function summaries(
  players: Player[],
  pointLog: PointLogEntry[],
): PlayerSummary[] {
  return players
    .map((player) => {
      const playerPoints = pointLog.filter((point) =>
        point.linePlayerIds.includes(player.id),
      );

      return {
        player,
        total: playerPoints.length,
        offense: playerPoints.filter(
          (point) => point.startingPossession === "offense",
        ).length,
        defense: playerPoints.filter(
          (point) => point.startingPossession === "defense",
        ).length,
      };
    })
    .sort((a, b) => {
      if (b.player.active !== a.player.active) {
        return Number(b.player.active) - Number(a.player.active);
      }

      return a.total - b.total || a.player.name.localeCompare(b.player.name);
    });
}

export function lineErrors(
  players: Player[],
  linePlayerIds: string[],
  requiredMmpCount: 3 | 4,
) {
  const selectedPlayers = linePlayers(players, linePlayerIds);
  const counts = lineCounts(players, linePlayerIds);
  const inactivePlayer = selectedPlayers.find((player) => !player.active);
  const errors: string[] = [];

  if (linePlayerIds.length !== 7) errors.push(`Selected ${linePlayerIds.length}/7`);
  if (counts.MMP !== requiredMmpCount) errors.push(`MMP ${counts.MMP}/${requiredMmpCount}`);
  if (counts.FMP !== 7 - requiredMmpCount) errors.push(`FMP ${counts.FMP}/${7 - requiredMmpCount}`);
  if (inactivePlayer) errors.push(`${inactivePlayer.name} is inactive`);

  return errors;
}

export function linePlayers(players: Player[], linePlayerIds: string[]) {
  const playersById = new Map(players.map((player) => [player.id, player]));

  return linePlayerIds
    .map((playerId) => playersById.get(playerId))
    .filter(Boolean) as Player[];
}

export function lineCounts(
  players: Player[],
  linePlayerIds: string[],
): Record<GenderCategory, number> {
  return linePlayers(players, linePlayerIds).reduce(
    (counts, player) => {
      counts[player.genderCategory] += 1;
      return counts;
    },
    { MMP: 0, FMP: 0 },
  );
}

export function lineLimit(category: GenderCategory, requiredMmpCount: 3 | 4) {
  return category === "MMP" ? requiredMmpCount : 7 - requiredMmpCount;
}

export function canAddPlayerToLine(
  players: Player[],
  linePlayerIds: string[],
  player: Player,
  requiredMmpCount: 3 | 4,
) {
  if (!player.active || linePlayerIds.includes(player.id) || linePlayerIds.length >= 7) {
    return false;
  }

  return lineCounts(players, linePlayerIds)[player.genderCategory] <
    lineLimit(player.genderCategory, requiredMmpCount);
}

export function suggestedLine(
  players: Player[],
  pointLog: PointLogEntry[],
  requiredMmpCount: 3 | 4,
) {
  const activeSummaries = summaries(players, pointLog).filter(
    ({ player }) => player.active,
  );
  const pick = (category: GenderCategory, count: number) =>
    activeSummaries
      .filter(({ player }) => player.genderCategory === category)
      .slice(0, count)
      .map(({ player }) => player.id);

  return [
    ...pick("MMP", requiredMmpCount),
    ...pick("FMP", 7 - requiredMmpCount),
  ];
}

export function newPoint(
  gameSettings: GameSettings,
  pointLog: PointLogEntry[],
  linePlayerIds: string[],
  outcome: PointOutcome,
  manualHalfTimeTarget: number | null = null,
): PointLogEntry {
  const context = pointContext(gameSettings, pointLog, manualHalfTimeTarget);

  return {
    id: id("point"),
    pointNumber: context.pointNumber,
    linePlayerIds: [...linePlayerIds],
    startingPossession: context.possession,
    startingFieldSide: context.fieldSide,
    requiredMmpCount: context.requiredMmpCount,
    outcome,
    createdAt: new Date().toISOString(),
  };
}
