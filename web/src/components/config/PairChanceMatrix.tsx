import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Save, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePairChance } from '../../hooks/usePairChance';

export interface BotLite {
  id: string;
  name: string;
  enabled: boolean;
  presentInGuild?: boolean;
}

interface PairChanceMatrixProps {
  guildId: string;
  bots: BotLite[];
}

const HIGH_CHANCE_WARN = 50;
const HIGH_CHANCE_COUNT_WARN = 3;
const NAME_MAX_CHARS = 12;

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(hi, Math.max(lo, n));
}

function abbreviate(name: string): string {
  if (name.length <= NAME_MAX_CHARS) return name;
  return name.slice(0, NAME_MAX_CHARS - 1) + '…';
}

export default function PairChanceMatrix({ guildId, bots }: PairChanceMatrixProps) {
  const { matrix, loading, error, setCell, save, revert, isDirty } = usePairChance(guildId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const highChanceCount = useMemo(() => {
    let count = 0;
    for (const speaker of bots) {
      for (const target of bots) {
        if (speaker.id === target.id) continue;
        const v = matrix[speaker.id]?.[target.id] ?? 0;
        if (v >= HIGH_CHANCE_WARN) count++;
      }
    }
    return count;
  }, [matrix, bots]);

  const useListMode = bots.length > 8;

  const handleSave = async () => {
    setSaving(true);
    try {
      await save();
      toast.success('Pair-chance matrix saved');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err?.response?.data?.error || err?.message || 'Failed to save matrix');
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    revert();
    toast.success('Changes reverted');
  };

  if (loading) {
    return (
      <div
        data-testid="pair-matrix"
        className="bg-discord-gray rounded-lg border border-gray-700 p-6 text-gray-400"
      >
        Loading pair-chance matrix…
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div
        data-testid="pair-matrix"
        className="bg-discord-gray rounded-lg border border-gray-700 p-6 text-gray-400"
      >
        No bots configured for this guild yet. Add bots to configure pair chances.
      </div>
    );
  }

  return (
    <div
      data-testid="pair-matrix"
      className="bg-discord-gray rounded-lg border border-gray-700 overflow-hidden"
    >
      {/* Header / help */}
      <div className="px-6 py-4 border-b border-gray-700 bg-discord-dark">
        <h3 className="text-white font-semibold mb-1">Bot-to-Bot Reply Chance</h3>
        <p className="text-sm text-gray-400">
          Each cell is the % chance that the <em>row</em> bot will reply to a message from
          the <em>column</em> bot. Diagonal cells (self) are disabled.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="px-6 py-3 bg-red-900/30 border-b border-red-700/50 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {/* Dirty state banner */}
      {isDirty && (
        <div
          role="alert"
          className="px-6 py-3 bg-orange-900/30 border-b border-orange-700/50 text-sm text-orange-200 flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          You have unsaved changes. Save or revert before leaving this page.
        </div>
      )}

      {/* Chatty aggregate warning */}
      {highChanceCount > HIGH_CHANCE_COUNT_WARN && (
        <div
          role="alert"
          className="px-6 py-3 bg-yellow-900/20 border-b border-yellow-700/50 text-sm text-yellow-200 flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {highChanceCount} cells are at or above {HIGH_CHANCE_WARN}%. High bot-to-bot
          activity likely — verify loop guard settings (chain depth, channel cooldown,
          circuit breaker).
        </div>
      )}

      {/* Body */}
      <div className="p-6">
        {useListMode ? (
          <ListMode bots={bots} matrix={matrix} setCell={setCell} />
        ) : (
          <GridMode bots={bots} matrix={matrix} setCell={setCell} />
        )}
      </div>

      {/* Controls */}
      <div className="px-6 py-4 border-t border-gray-700 bg-discord-dark flex items-center justify-end gap-3">
        <button
          type="button"
          data-testid="pair-revert-button"
          onClick={handleRevert}
          disabled={!isDirty || saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 text-gray-200 hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Undo2 className="h-4 w-4" />
          Revert
        </button>
        <button
          type="button"
          data-testid="pair-save-button"
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-discord-blurple text-white hover:bg-indigo-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function GridMode({ bots, matrix, setCell }: ModeProps) {
  return (
    <div
      data-testid="pair-matrix-grid"
      className="overflow-x-auto border border-gray-700 rounded-lg"
    >
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-discord-dark">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-discord-dark px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-r border-gray-700"
            >
              Speaker \ Target
            </th>
            {bots.map(target => (
              <th
                key={target.id}
                scope="col"
                title={target.name}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide border-b border-gray-700 ${
                  target.enabled ? 'text-gray-300' : 'text-gray-500'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span
                    aria-hidden="true"
                    className={`inline-block h-2 w-2 rounded-full ${
                      target.enabled ? 'bg-green-400' : 'bg-gray-500'
                    }`}
                  />
                  {abbreviate(target.name)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bots.map(speaker => (
            <tr key={speaker.id} className="odd:bg-discord-gray even:bg-discord-dark/40">
              <th
                scope="row"
                title={speaker.name}
                className={`sticky left-0 z-10 bg-inherit px-3 py-2 text-left border-r border-gray-700 whitespace-nowrap ${
                  speaker.enabled ? 'text-gray-200' : 'text-gray-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`inline-block h-2 w-2 rounded-full ${
                      speaker.enabled ? 'bg-green-400' : 'bg-gray-500'
                    }`}
                  />
                  {abbreviate(speaker.name)}
                </div>
              </th>
              {bots.map(target => {
                const isDiagonal = speaker.id === target.id;
                const rowColDisabled = !speaker.enabled || !target.enabled;
                const value = matrix[speaker.id]?.[target.id] ?? 0;
                const high = !isDiagonal && value >= HIGH_CHANCE_WARN;

                if (isDiagonal) {
                  return (
                    <td
                      key={target.id}
                      aria-disabled="true"
                      className="px-3 py-2 text-center text-gray-600 bg-gray-800/60 border-b border-gray-700"
                    >
                      —
                    </td>
                  );
                }

                return (
                  <td
                    key={target.id}
                    className={`px-2 py-1 border-b border-gray-700 ${
                      rowColDisabled ? 'bg-gray-800/40' : ''
                    }`}
                  >
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={10}
                      value={value}
                      disabled={rowColDisabled}
                      aria-label={`Chance ${speaker.name} to ${target.name}`}
                      data-testid={`pair-cell-${speaker.id}-${target.id}`}
                      title={
                        high
                          ? 'High chance — risk of chatty behavior'
                          : rowColDisabled
                            ? 'Bot disabled in this guild'
                            : undefined
                      }
                      onChange={e =>
                        setCell(
                          speaker.id,
                          target.id,
                          clamp(Number(e.target.value), 0, 100)
                        )
                      }
                      className={`w-16 px-2 py-1 text-center bg-discord-dark border rounded text-white focus:outline-none focus:border-discord-blurple disabled:opacity-50 disabled:cursor-not-allowed ${
                        high
                          ? 'border-yellow-400 ring-2 ring-yellow-400/50'
                          : 'border-gray-700'
                      }`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListMode({ bots, matrix, setCell }: ModeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div data-testid="pair-matrix-list" className="space-y-2">
      {bots.map(speaker => {
        const isOpen = !!expanded[speaker.id];
        const speakerDisabled = !speaker.enabled;
        return (
          <div
            key={speaker.id}
            className="border border-gray-700 rounded-lg bg-discord-dark overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(speaker.id)}
              aria-expanded={isOpen}
              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-700/40 transition ${
                speakerDisabled ? 'text-gray-500' : 'text-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    speaker.enabled ? 'bg-green-400' : 'bg-gray-500'
                  }`}
                />
                <span className="font-medium">{speaker.name}</span>
                {speakerDisabled && (
                  <span className="text-xs text-gray-500">(disabled)</span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                Replies to {bots.length - 1} other bots
              </span>
            </button>

            {isOpen && (
              <ul className="divide-y divide-gray-700 border-t border-gray-700">
                {bots.map(target => {
                  if (target.id === speaker.id) return null;
                  const value = matrix[speaker.id]?.[target.id] ?? 0;
                  const high = value >= HIGH_CHANCE_WARN;
                  const disabled = speakerDisabled || !target.enabled;
                  return (
                    <li
                      key={target.id}
                      className={`px-4 py-3 flex items-center gap-4 ${
                        disabled ? 'bg-gray-800/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-[12rem]">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            target.enabled ? 'bg-green-400' : 'bg-gray-500'
                          }`}
                        />
                        <span className={disabled ? 'text-gray-500' : 'text-gray-200'}>
                          {target.name}
                        </span>
                        {high && (
                          <AlertTriangle
                            className="h-4 w-4 text-yellow-400"
                            aria-label="High chance warning"
                          />
                        )}
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={10}
                        value={value}
                        disabled={disabled}
                        aria-label={`Chance slider ${speaker.name} to ${target.name}`}
                        onChange={e =>
                          setCell(
                            speaker.id,
                            target.id,
                            clamp(Number(e.target.value), 0, 100)
                          )
                        }
                        className="flex-1 accent-discord-blurple disabled:opacity-50"
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={10}
                        value={value}
                        disabled={disabled}
                        aria-label={`Chance ${speaker.name} to ${target.name}`}
                        data-testid={`pair-cell-${speaker.id}-${target.id}`}
                        title={
                          high
                            ? 'High chance — risk of chatty behavior'
                            : disabled
                              ? 'Bot disabled in this guild'
                              : undefined
                        }
                        onChange={e =>
                          setCell(
                            speaker.id,
                            target.id,
                            clamp(Number(e.target.value), 0, 100)
                          )
                        }
                        className={`w-20 px-2 py-1 text-center bg-discord-gray border rounded text-white focus:outline-none focus:border-discord-blurple disabled:opacity-50 disabled:cursor-not-allowed ${
                          high
                            ? 'border-yellow-400 ring-2 ring-yellow-400/50'
                            : 'border-gray-700'
                        }`}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
