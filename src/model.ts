export type GenderCategory = "MMP" | "FMP";
export type Possession = "offense" | "defense";
export type PointOutcome = "us" | "opponent";
export type FieldSide = "left" | "right";
export type TargetScore = 13 | 15;

export type Player = {
  id: string;
  name: string;
  genderCategory: GenderCategory;
  jerseyNumber?: string;
  notes?: string;
  active: boolean;
  archived: boolean;
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
  schemaVersion: 2;
  teams: Team[];
  activeTeamId: string | null;
  activeSeasonId: string | null;
  activeTournamentId: string | null;
  activeGameId: string | null;
};

export type Team = {
  id: string;
  name: string;
  players: Player[];
  seasons: Season[];
};

export type Season = {
  id: string;
  name: string;
  teamId: string;
  seasonRosterPlayerIds: string[];
  tournaments: Tournament[];
  createdAt: string;
};

export type Tournament = {
  id: string;
  name: string;
  seasonId: string;
  startsAt?: string;
  activeRosterPlayerIds: string[];
  unavailablePlayerIds: string[];
  availabilityEvents: AvailabilityEvent[];
  games: Game[];
};

export type Game = {
  id: string;
  tournamentId: string;
  name: string;
  opponent?: string;
  settings: GameSettings;
  pointLog: PointLogEntry[];
  manualHalfTimeTarget: number | null;
  pendingHalfTimeCap: boolean;
  finalized: boolean;
  createdAt: string;
};

export type AvailabilityEvent = {
  id: string;
  playerId: string;
  tournamentId: string;
  status: "unavailable" | "available";
  reason?: string;
  createdAt: string;
};

export type StatKind = "d" | "score" | "assist" | "throwaway";

export type StatEvent = {
  id: string;
  gameId: string;
  pointNumber: number;
  playerId: string;
  kind: StatKind;
  createdAt: string;
};

export type PlayerSummary = {
  player: Player;
  total: number;
  offense: number;
  defense: number;
};

type PrototypePlayer = Omit<Player, "archived" | "jerseyNumber" | "notes">;

type PrototypeAppState = {
  players: PrototypePlayer[];
  gameSettings: GameSettings | null;
  pointLog: PointLogEntry[];
  manualHalfTimeTarget?: number | null;
  pendingHalfTimeCap?: boolean;
};

const STORAGE_KEY = "ultimate-line-caller:v2";
const PROTOTYPE_STORAGE_KEY = "ultimate-line-caller:v1";
const DEFAULT_TEAM_ID = "team_default";
const DEFAULT_SEASON_ID = "season_default";
const DEFAULT_TOURNAMENT_ID = "tournament_default";
const DEFAULT_GAME_ID = "game_default";
const DEFAULT_CREATED_AT = "2026-08-05T00:00:00.000Z";

export const emptyState: AppState = {
  schemaVersion: 2,
  activeTeamId: DEFAULT_TEAM_ID,
  activeSeasonId: DEFAULT_SEASON_ID,
  activeTournamentId: DEFAULT_TOURNAMENT_ID,
  activeGameId: null,
  teams: [
    {
      id: DEFAULT_TEAM_ID,
      name: "Default Team",
      players: [],
      seasons: [
        {
          id: DEFAULT_SEASON_ID,
          name: "Default Season",
          teamId: DEFAULT_TEAM_ID,
          seasonRosterPlayerIds: [],
          tournaments: [
            {
              id: DEFAULT_TOURNAMENT_ID,
              name: "Default Tournament",
              seasonId: DEFAULT_SEASON_ID,
              activeRosterPlayerIds: [],
              unavailablePlayerIds: [],
              availabilityEvents: [],
              games: [],
            },
          ],
          createdAt: DEFAULT_CREATED_AT,
        },
      ],
    },
  ],
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
    archived: false,
  }));
}

export function loadState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (raw) {
    try {
      const parsed = JSON.parse(raw);

      if (isAppState(parsed)) {
        return normalizeAppState(parsed);
      }
    } catch {
      // Fall through to prototype migration or empty state.
    }
  }

  const prototypeRaw = localStorage.getItem(PROTOTYPE_STORAGE_KEY);

  if (prototypeRaw) {
    try {
      const parsed = JSON.parse(prototypeRaw);

      if (isPrototypeAppState(parsed)) {
        return migratePrototypeState(normalizePrototypeState(parsed));
      }
    } catch {
      // Fall through to empty state.
    }
  }

  return emptyState;
}

function isAppState(value: unknown): value is AppState {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as AppState).schemaVersion === 2 &&
    Array.isArray((value as AppState).teams) &&
    "activeTeamId" in value &&
    "activeSeasonId" in value &&
    "activeTournamentId" in value &&
    "activeGameId" in value
  );
}

function isPrototypeAppState(value: unknown): value is PrototypeAppState {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as PrototypeAppState).players) &&
    Array.isArray((value as PrototypeAppState).pointLog) &&
    "gameSettings" in value
  );
}

function normalizePrototypeState(state: PrototypeAppState): PrototypeAppState {
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

function normalizeAppState(state: AppState): AppState {
  return {
    schemaVersion: 2,
    activeTeamId: state.activeTeamId,
    activeSeasonId: state.activeSeasonId,
    activeTournamentId: state.activeTournamentId,
    activeGameId: state.activeGameId,
    teams: state.teams.map((team) => ({
      ...team,
      players: team.players.map(normalizePlayer),
      seasons: team.seasons.map((season) => ({
        ...season,
        seasonRosterPlayerIds: season.seasonRosterPlayerIds ?? [],
        tournaments: season.tournaments.map((tournament) => ({
          ...tournament,
          activeRosterPlayerIds: tournament.activeRosterPlayerIds ?? [],
          unavailablePlayerIds: tournament.unavailablePlayerIds ?? [],
          availabilityEvents: tournament.availabilityEvents ?? [],
          games: tournament.games.map(normalizeGame),
        })),
        createdAt: season.createdAt ?? DEFAULT_CREATED_AT,
      })),
    })),
  };
}

function normalizePlayer(player: Player): Player {
  return {
    ...player,
    active: player.active ?? true,
    archived: player.archived ?? false,
  };
}

function normalizeGame(game: Game): Game {
  return {
    ...game,
    settings: normalizeGameSettings(game.settings),
    pointLog: game.pointLog.map((point) => ({
      ...point,
      startingFieldSide:
        point.startingFieldSide ?? game.settings.startingFieldSide ?? "left",
    })),
    manualHalfTimeTarget: game.manualHalfTimeTarget ?? null,
    pendingHalfTimeCap: game.pendingHalfTimeCap ?? false,
    finalized: game.finalized ?? false,
    createdAt: game.createdAt ?? DEFAULT_CREATED_AT,
  };
}

function normalizeGameSettings(settings: GameSettings): GameSettings {
  return {
    ...settings,
    startingFieldSide: settings.startingFieldSide ?? "left",
    targetScore: settings.targetScore ?? 15,
  };
}

function migratePrototypeState(state: PrototypeAppState): AppState {
  const players = state.players.map((player) => ({
    ...player,
    active: player.active ?? true,
    archived: false,
  }));
  const activeRosterPlayerIds = players
    .filter((player) => player.active && !player.archived)
    .map((player) => player.id);
  const game: Game | null = state.gameSettings
    ? {
        id: DEFAULT_GAME_ID,
        tournamentId: DEFAULT_TOURNAMENT_ID,
        name: "Game 1",
        settings: state.gameSettings,
        pointLog: state.pointLog,
        manualHalfTimeTarget: state.manualHalfTimeTarget ?? null,
        pendingHalfTimeCap: state.pendingHalfTimeCap ?? false,
        finalized: false,
        createdAt: state.pointLog[0]?.createdAt ?? DEFAULT_CREATED_AT,
      }
    : null;

  return {
    schemaVersion: 2,
    activeTeamId: DEFAULT_TEAM_ID,
    activeSeasonId: DEFAULT_SEASON_ID,
    activeTournamentId: DEFAULT_TOURNAMENT_ID,
    activeGameId: game?.id ?? null,
    teams: [
      {
        id: DEFAULT_TEAM_ID,
        name: "Default Team",
        players,
        seasons: [
          {
            id: DEFAULT_SEASON_ID,
            name: "Default Season",
            teamId: DEFAULT_TEAM_ID,
            seasonRosterPlayerIds: players.map((player) => player.id),
            tournaments: [
              {
                id: DEFAULT_TOURNAMENT_ID,
                name: "Default Tournament",
                seasonId: DEFAULT_SEASON_ID,
                activeRosterPlayerIds,
                unavailablePlayerIds: [],
                availabilityEvents: [],
                games: game ? [game] : [],
              },
            ],
            createdAt: game?.createdAt ?? DEFAULT_CREATED_AT,
          },
        ],
      },
    ],
  };
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PROTOTYPE_STORAGE_KEY);
}

export function selectActiveTeam(state: AppState): Team | null {
  return state.teams.find((team) => team.id === state.activeTeamId) ?? null;
}

export function selectActiveSeason(state: AppState): Season | null {
  const team = selectActiveTeam(state);

  return (
    team?.seasons.find((season) => season.id === state.activeSeasonId) ?? null
  );
}

export function selectActiveTournament(state: AppState): Tournament | null {
  const season = selectActiveSeason(state);

  return (
    season?.tournaments.find(
      (tournament) => tournament.id === state.activeTournamentId,
    ) ?? null
  );
}

export function selectActiveGame(state: AppState): Game | null {
  const tournament = selectActiveTournament(state);

  return tournament?.games.find((game) => game.id === state.activeGameId) ?? null;
}

export function selectActiveRosterPlayers(state: AppState): Player[] {
  const team = selectActiveTeam(state);
  const tournament = selectActiveTournament(state);

  if (!team || !tournament) {
    return [];
  }

  const playerById = new Map(team.players.map((player) => [player.id, player]));

  return tournament.activeRosterPlayerIds
    .map((playerId) => playerById.get(playerId))
    .filter(
      (player): player is Player => player !== undefined && !player.archived,
    );
}

export function selectUnavailablePlayers(state: AppState): Player[] {
  const team = selectActiveTeam(state);
  const tournament = selectActiveTournament(state);

  if (!team || !tournament) {
    return [];
  }

  const playerById = new Map(team.players.map((player) => [player.id, player]));

  return tournament.unavailablePlayerIds
    .map((playerId) => playerById.get(playerId))
    .filter(
      (player): player is Player => player !== undefined && !player.archived,
    );
}

export function updateActiveTeam(
  state: AppState,
  updater: (team: Team) => Team,
): AppState {
  return {
    ...state,
    teams: state.teams.map((team) =>
      team.id === state.activeTeamId ? updater(team) : team,
    ),
  };
}

export function updateActiveSeason(
  state: AppState,
  updater: (season: Season) => Season,
): AppState {
  return updateActiveTeam(state, (team) => ({
    ...team,
    seasons: team.seasons.map((season) =>
      season.id === state.activeSeasonId ? updater(season) : season,
    ),
  }));
}

export function updateActiveTournament(
  state: AppState,
  updater: (tournament: Tournament) => Tournament,
): AppState {
  return updateActiveSeason(state, (season) => ({
    ...season,
    tournaments: season.tournaments.map((tournament) =>
      tournament.id === state.activeTournamentId
        ? updater(tournament)
        : tournament,
    ),
  }));
}

export function updateActiveGame(
  state: AppState,
  updater: (game: Game) => Game,
): AppState {
  return updateActiveTournament(state, (tournament) => ({
    ...tournament,
    games: tournament.games.map((game) =>
      game.id === state.activeGameId ? updater(game) : game,
    ),
  }));
}

export function addPlayerToActiveTeam(state: AppState, player: Player): AppState {
  return updateActiveTeam(state, (team) => ({
    ...team,
    players: [...team.players, player],
    seasons: team.seasons.map((season) =>
      season.id === state.activeSeasonId
        ? {
            ...season,
            seasonRosterPlayerIds: uniqueIds([
              ...season.seasonRosterPlayerIds,
              player.id,
            ]),
            tournaments: season.tournaments.map((tournament) =>
              tournament.id === state.activeTournamentId
                ? {
                    ...tournament,
                    activeRosterPlayerIds:
                      player.active && !player.archived
                        ? uniqueIds([
                            ...tournament.activeRosterPlayerIds,
                            player.id,
                          ])
                        : tournament.activeRosterPlayerIds,
                  }
                : tournament,
            ),
          }
        : season,
    ),
  }));
}

export function updatePlayerInActiveTeam(
  state: AppState,
  playerId: string,
  patch: Partial<Player>,
): AppState {
  const nextState = updateActiveTeam(state, (team) => ({
    ...team,
    players: team.players.map((player) =>
      player.id === playerId ? { ...player, ...patch } : player,
    ),
  }));

  if (!("active" in patch)) {
    return nextState;
  }

  return updateActiveTournament(nextState, (tournament) => {
    const activeRosterPlayerIds =
      patch.active === true
        ? uniqueIds([...tournament.activeRosterPlayerIds, playerId])
        : tournament.activeRosterPlayerIds.filter((id) => id !== playerId);

    return {
      ...tournament,
      activeRosterPlayerIds,
    };
  });
}

export function replaceActiveTeamRoster(
  state: AppState,
  players: Player[],
): AppState {
  return updateActiveTeam(state, (team) => ({
    ...team,
    players,
    seasons: team.seasons.map((season) =>
      season.id === state.activeSeasonId
        ? {
            ...season,
            seasonRosterPlayerIds: players.map((player) => player.id),
            tournaments: season.tournaments.map((tournament) =>
              tournament.id === state.activeTournamentId
                ? {
                    ...tournament,
                    activeRosterPlayerIds: players
                      .filter((player) => player.active && !player.archived)
                      .map((player) => player.id),
                    unavailablePlayerIds: tournament.unavailablePlayerIds.filter(
                      (playerId) => players.some((player) => player.id === playerId),
                    ),
                  }
                : tournament,
            ),
          }
        : season,
    ),
  }));
}

export function archivePlayer(state: AppState, playerId: string): AppState {
  return updateActiveTeam(state, (team) => ({
    ...team,
    players: team.players.map((player) =>
      player.id === playerId
        ? { ...player, active: false, archived: true }
        : player,
    ),
    seasons: team.seasons.map((season) => ({
      ...season,
      tournaments: season.tournaments.map((tournament) => ({
        ...tournament,
        activeRosterPlayerIds: tournament.activeRosterPlayerIds.filter(
          (id) => id !== playerId,
        ),
        unavailablePlayerIds: tournament.unavailablePlayerIds.filter(
          (id) => id !== playerId,
        ),
      })),
    })),
  }));
}

export function startActiveGame(
  state: AppState,
  settings: GameSettings,
): AppState {
  const tournament = selectActiveTournament(state);

  if (!tournament || state.activeGameId !== null) {
    return state;
  }

  const game: Game = {
    id: id("game"),
    tournamentId: tournament.id,
    name: `Game ${tournament.games.length + 1}`,
    settings,
    pointLog: [],
    manualHalfTimeTarget: null,
    pendingHalfTimeCap: false,
    finalized: false,
    createdAt: new Date().toISOString(),
  };

  return {
    ...updateActiveTournament(state, (currentTournament) => ({
      ...currentTournament,
      games: [...currentTournament.games, game],
    })),
    activeGameId: game.id,
  };
}

export function clearActiveGame(state: AppState): AppState {
  const activeGameId = state.activeGameId;

  if (!activeGameId) {
    return state;
  }

  return {
    ...updateActiveTournament(state, (tournament) => ({
      ...tournament,
      games: tournament.games.filter((game) => game.id !== activeGameId),
    })),
    activeGameId: null,
  };
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
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
      const aAvailable = a.player.active && !a.player.archived;
      const bAvailable = b.player.active && !b.player.archived;

      if (bAvailable !== aAvailable) {
        return Number(bAvailable) - Number(aAvailable);
      }

      if (a.player.archived !== b.player.archived) {
        return Number(a.player.archived) - Number(b.player.archived);
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
  const archivedPlayer = selectedPlayers.find((player) => player.archived);
  const errors: string[] = [];

  if (linePlayerIds.length !== 7) errors.push(`Selected ${linePlayerIds.length}/7`);
  if (counts.MMP !== requiredMmpCount) errors.push(`MMP ${counts.MMP}/${requiredMmpCount}`);
  if (counts.FMP !== 7 - requiredMmpCount) errors.push(`FMP ${counts.FMP}/${7 - requiredMmpCount}`);
  if (inactivePlayer) errors.push(`${inactivePlayer.name} is inactive`);
  if (archivedPlayer) errors.push(`${archivedPlayer.name} is archived`);

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
  if (
    !player.active ||
    player.archived ||
    linePlayerIds.includes(player.id) ||
    linePlayerIds.length >= 7
  ) {
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
    ({ player }) => player.active && !player.archived,
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
