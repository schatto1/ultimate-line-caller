import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ListRestart,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import {
  clearState,
  id,
  lineErrors as getLineErrors,
  loadState,
  newPoint,
  pointContext,
  sampleRoster,
  saveState,
  suggestedLine as getSuggestedLine,
  summaries as summarizePlayers,
} from "./model";
import type {
  AppState,
  GameSettings,
  GenderCategory,
  Player,
  PointOutcome,
  Possession,
} from "./model";

function classNames(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(" ");
}

function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerCategory, setNewPlayerCategory] =
    useState<GenderCategory>("MMP");
  const [draftSettings, setDraftSettings] = useState<GameSettings>({
    startingPossession: "offense",
    startingMmpCount: 4,
  });
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const summaries = useMemo(
    () => summarizePlayers(state.players, state.pointLog),
    [state.players, state.pointLog],
  );
  const game = state.gameSettings
    ? pointContext(state.gameSettings, state.pointLog)
    : null;
  const score = game?.score ?? { us: 0, opponent: 0 };
  const pointNumber = game?.pointNumber ?? state.pointLog.length + 1;
  const currentPossession = game?.possession ?? null;
  const requiredMmpCount = game?.requiredMmpCount ?? null;
  const requiredFmpCount = game?.requiredFmpCount ?? null;
  const lineErrors =
    requiredMmpCount === null
      ? ["Start game"]
      : getLineErrors(state.players, selectedLineIds, requiredMmpCount);
  const canLogPoint = state.gameSettings !== null && lineErrors.length === 0;
  const suggestedLine = requiredMmpCount
    ? getSuggestedLine(state.players, state.pointLog, requiredMmpCount)
    : [];
  const selectedLine = selectedLineIds
    .map((id) => state.players.find((player) => player.id === id))
    .filter(Boolean) as Player[];
  const activePlayerCount = state.players.filter((player) => player.active).length;

  function addPlayer() {
    const name = newPlayerName.trim();

    if (!name) {
      return;
    }

    setState((current) => ({
      ...current,
      players: [
        ...current.players,
        {
          id: id("player"),
          name,
          genderCategory: newPlayerCategory,
          active: true,
        },
      ],
    }));
    setNewPlayerName("");
  }

  function updatePlayer(id: string, patch: Partial<Player>) {
    setState((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === id ? { ...player, ...patch } : player,
      ),
    }));
  }

  function deletePlayer(id: string) {
    setSelectedLineIds((current) => current.filter((playerId) => playerId !== id));
    setState((current) => ({
      ...current,
      players: current.players.filter((player) => player.id !== id),
      pointLog: current.pointLog.map((point) => ({
        ...point,
        linePlayerIds: point.linePlayerIds.filter((playerId) => playerId !== id),
      })),
    }));
  }

  function startGame() {
    setState((current) => ({
      ...current,
      gameSettings: draftSettings,
      pointLog: [],
    }));
    setSelectedLineIds([]);
  }

  function resetGame() {
    setState((current) => ({
      ...current,
      pointLog: [],
      gameSettings: null,
    }));
    setSelectedLineIds([]);
  }

  function togglePlayerForLine(player: Player) {
    if (!player.active) {
      return;
    }

    setSelectedLineIds((current) => {
      if (current.includes(player.id)) {
        return current.filter((id) => id !== player.id);
      }

      if (current.length >= 7) {
        return [...current.slice(1), player.id];
      }

      return [...current, player.id];
    });
  }

  function logPoint(outcome: PointOutcome) {
    if (!state.gameSettings || !canLogPoint) {
      return;
    }

    const point = newPoint(
      state.gameSettings,
      state.pointLog,
      selectedLineIds,
      outcome,
    );

    setState((current) => ({
      ...current,
      pointLog: [...current.pointLog, point],
    }));
    setSelectedLineIds([]);
  }

  function undoLastPoint() {
    setState((current) => ({
      ...current,
      pointLog: current.pointLog.slice(0, -1),
    }));
  }

  function loadSampleRoster() {
    setState((current) => ({
      ...current,
      players: sampleRoster(),
      pointLog: [],
    }));
    setSelectedLineIds([]);
  }

  function resetEverything() {
    clearState();
    setState({ players: [], gameSettings: null, pointLog: [] });
    setSelectedLineIds([]);
  }

  return (
    <main className="appShell">
      <section className="scoreBand" aria-label="Game status">
        <div>
          <p className="label">Score</p>
          <div className="score">
            <span>{score.us}</span>
            <span className="scoreDivider">-</span>
            <span>{score.opponent}</span>
          </div>
        </div>
        <div className="statusTiles">
          <StatusTile label="Point" value={String(pointNumber)} />
          <StatusTile
            label="O/D"
            value={currentPossession ? possessionLabel(currentPossession) : "-"}
          />
          <StatusTile
            label="Ratio"
            value={
              requiredMmpCount ? `${requiredMmpCount}M / ${requiredFmpCount}F` : "-"
            }
          />
          <StatusTile label="Active" value={String(activePlayerCount)} />
        </div>
      </section>

      <section className="workGrid">
        <div className="panel rosterPanel">
          <div className="panelHeader">
            <div>
              <h1>Ultimate Line Caller</h1>
              <p>{state.players.length} rostered</p>
            </div>
            <button
              className="iconButton"
              type="button"
              onClick={loadSampleRoster}
              title="Load sample roster"
              aria-label="Load sample roster"
            >
              <Users size={20} />
            </button>
          </div>

          <form
            className="addPlayerForm"
            onSubmit={(event) => {
              event.preventDefault();
              addPlayer();
            }}
          >
            <input
              value={newPlayerName}
              onChange={(event) => setNewPlayerName(event.target.value)}
              placeholder="Player name"
              aria-label="Player name"
            />
            <Segmented
              value={newPlayerCategory}
              options={[
                { label: "MMP", value: "MMP" },
                { label: "FMP", value: "FMP" },
              ]}
              onChange={(value) => setNewPlayerCategory(value as GenderCategory)}
            />
            <button className="primaryButton compactButton" type="submit">
              <Plus size={18} />
              Add
            </button>
          </form>

          <div className="rosterList">
            {state.players.map((player) => (
              <div className="rosterRow" key={player.id}>
                <input
                  value={player.name}
                  onChange={(event) =>
                    updatePlayer(player.id, { name: event.target.value })
                  }
                  aria-label={`${player.name} name`}
                />
                <select
                  value={player.genderCategory}
                  onChange={(event) =>
                    updatePlayer(player.id, {
                      genderCategory: event.target.value as GenderCategory,
                    })
                  }
                  aria-label={`${player.name} category`}
                >
                  <option value="MMP">MMP</option>
                  <option value="FMP">FMP</option>
                </select>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={player.active}
                    onChange={(event) =>
                      updatePlayer(player.id, { active: event.target.checked })
                    }
                  />
                  Active
                </label>
                <button
                  className="iconButton danger"
                  type="button"
                  onClick={() => deletePlayer(player.id)}
                  title="Delete player"
                  aria-label={`Delete ${player.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel gamePanel">
          <div className="panelHeader">
            <div>
              <h2>Game</h2>
              <p>{state.pointLog.length} logged</p>
            </div>
            <button
              className="iconButton"
              type="button"
              onClick={resetGame}
              title="Reset game"
              aria-label="Reset game"
            >
              <ListRestart size={20} />
            </button>
          </div>

          <div className="setupGrid">
            <div>
              <p className="sectionLabel">Start</p>
              <Segmented
                value={draftSettings.startingPossession}
                options={[
                  { label: "O", value: "offense" },
                  { label: "D", value: "defense" },
                ]}
                onChange={(value) =>
                  setDraftSettings((current) => ({
                    ...current,
                    startingPossession: value as Possession,
                  }))
                }
                disabled={state.pointLog.length > 0}
              />
            </div>
            <div>
              <p className="sectionLabel">Point 1</p>
              <Segmented
                value={String(draftSettings.startingMmpCount)}
                options={[
                  { label: "4M", value: "4" },
                  { label: "3M", value: "3" },
                ]}
                onChange={(value) =>
                  setDraftSettings((current) => ({
                    ...current,
                    startingMmpCount: Number(value) as 3 | 4,
                  }))
                }
                disabled={state.pointLog.length > 0}
              />
            </div>
            <button
              className="primaryButton"
              type="button"
              onClick={startGame}
              disabled={state.pointLog.length > 0}
            >
              <Save size={18} />
              Start
            </button>
          </div>

          <div className="lineActions">
            <button
              className="secondaryButton"
              type="button"
              onClick={() => setSelectedLineIds(suggestedLine)}
              disabled={!requiredMmpCount || suggestedLine.length < 7}
            >
              <Check size={18} />
              Fill Suggested
            </button>
            <button
              className="secondaryButton"
              type="button"
              onClick={() => setSelectedLineIds([])}
              disabled={selectedLineIds.length === 0}
            >
              Clear Line
            </button>
          </div>

          <div className="lineSummary">
            <p className="sectionLabel">Current Line</p>
            <div className="selectedLine">
              {selectedLine.length === 0 ? (
                <span className="emptyLine">No players selected</span>
              ) : (
                selectedLine.map((player) => (
                  <span className="lineChip" key={player.id}>
                    {player.name}
                  </span>
                ))
              )}
            </div>
            <div className="validationRow">
              {lineErrors.length === 0 ? (
                <span className="valid">Valid line</span>
              ) : (
                lineErrors.map((error) => (
                  <span className="warning" key={error}>
                    {error}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="playerGroups">
            <PlayerGroup
              title="MMP"
              players={state.players.filter(
                (player) => player.genderCategory === "MMP",
              )}
              selectedLineIds={selectedLineIds}
              suggestedLineIds={suggestedLine}
              summaries={summaries}
              onToggle={togglePlayerForLine}
            />
            <PlayerGroup
              title="FMP"
              players={state.players.filter(
                (player) => player.genderCategory === "FMP",
              )}
              selectedLineIds={selectedLineIds}
              suggestedLineIds={suggestedLine}
              summaries={summaries}
              onToggle={togglePlayerForLine}
            />
          </div>

          <div className="resultDock">
            <button
              className="scoreButton us"
              type="button"
              onClick={() => logPoint("us")}
              disabled={!canLogPoint}
            >
              Us Scored
            </button>
            <button
              className="scoreButton them"
              type="button"
              onClick={() => logPoint("opponent")}
              disabled={!canLogPoint}
            >
              Opp Scored
            </button>
            <button
              className="iconButton"
              type="button"
              onClick={undoLastPoint}
              disabled={state.pointLog.length === 0}
              title="Undo last point"
              aria-label="Undo last point"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        <div className="panel summaryPanel">
          <div className="panelHeader">
            <div>
              <h2>Counts</h2>
              <p>Sorted low to high</p>
            </div>
            <button
              className="iconButton danger"
              type="button"
              onClick={resetEverything}
              title="Reset all"
              aria-label="Reset all"
            >
              <Trash2 size={19} />
            </button>
          </div>

          <div className="countTable" role="table" aria-label="Player counts">
            <div className="countRow header" role="row">
              <span>Name</span>
              <span>Total</span>
              <span>O</span>
              <span>D</span>
            </div>
            {summaries.map(({ player, total, offense, defense }) => (
              <div
                className={classNames("countRow", !player.active && "inactive")}
                role="row"
                key={player.id}
              >
                <span>{player.name}</span>
                <strong>{total}</strong>
                <span>{offense}</span>
                <span>{defense}</span>
              </div>
            ))}
          </div>

          <div className="pointLog">
            <p className="sectionLabel">Point Log</p>
            {state.pointLog.length === 0 ? (
              <p className="emptyState">No points logged</p>
            ) : (
              state.pointLog
                .slice()
                .reverse()
                .map((point) => (
                  <div className="pointLogRow" key={point.id}>
                    <span>P{point.pointNumber}</span>
                    <span>{possessionLabel(point.startingPossession)}</span>
                    <span>{point.requiredMmpCount}M</span>
                    <strong>{point.outcome === "us" ? "Us" : "Opp"}</strong>
                  </div>
                ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

type SegmentedProps = {
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function Segmented({ value, options, onChange, disabled }: SegmentedProps) {
  return (
    <div className={classNames("segmented", disabled && "disabled")}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? "active" : ""}
          onClick={() => onChange(option.value)}
          disabled={disabled}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="statusTile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type PlayerGroupProps = {
  title: GenderCategory;
  players: Player[];
  selectedLineIds: string[];
  suggestedLineIds: string[];
  summaries: ReturnType<typeof summarizePlayers>;
  onToggle: (player: Player) => void;
};

function PlayerGroup({
  title,
  players,
  selectedLineIds,
  suggestedLineIds,
  summaries,
  onToggle,
}: PlayerGroupProps) {
  const summaryById = new Map(
    summaries.map((summary) => [summary.player.id, summary]),
  );

  return (
    <div className="playerGroup">
      <div className="groupHeader">
        <h3>{title}</h3>
        <span>{players.filter((player) => player.active).length} active</span>
      </div>
      <div className="playerButtonGrid">
        {players.map((player) => {
          const summary = summaryById.get(player.id);
          const selected = selectedLineIds.includes(player.id);
          const suggested = suggestedLineIds.includes(player.id);

          return (
            <button
              className={classNames(
                "playerButton",
                selected && "selected",
                suggested && !selected && "suggested",
                !player.active && "inactive",
              )}
              key={player.id}
              type="button"
              onClick={() => onToggle(player)}
              disabled={!player.active}
            >
              <span>{player.name}</span>
              <small>
                {summary?.total ?? 0} pts / O {summary?.offense ?? 0} / D{" "}
                {summary?.defense ?? 0}
              </small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function possessionLabel(possession: Possession) {
  return possession === "offense" ? "O" : "D";
}

export default App;
