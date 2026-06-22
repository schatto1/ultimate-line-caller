export type GenderCategory = "MMP" | "FMP";
export type Possession = "offense" | "defense";
export type PointOutcome = "us" | "opponent";

export type Player = {
  id: string;
  name: string;
  genderCategory: GenderCategory;
  active: boolean;
};

export type GameSettings = {
  startingPossession: Possession;
  startingMmpCount: 3 | 4;
};

export type PointLogEntry = {
  id: string;
  pointNumber: number;
  linePlayerIds: string[];
  startingPossession: Possession;
  requiredMmpCount: 3 | 4;
  outcome: PointOutcome;
  createdAt: string;
};

export type AppState = {
  players: Player[];
  gameSettings: GameSettings | null;
  pointLog: PointLogEntry[];
};

export type PlayerSummary = {
  player: Player;
  total: number;
  offense: number;
  defense: number;
};

