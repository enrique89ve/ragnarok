import type { CombatLogEntry } from '../../stores/combat/types';
import type { GameLogEntry } from '../../stores/gameLogStore';
import { CombatAction } from '../../types/PokerCombatTypes';
import type { GameFeedbackTone } from '@/game/effects/core/gameEffectTypes';

const ACTION_VERBS: Record<CombatAction, string> = {
	[CombatAction.ATTACK]: 'bet',
	[CombatAction.COUNTER_ATTACK]: 'raise',
	[CombatAction.ENGAGE]: 'call',
	[CombatAction.DEFEND]: 'check',
	[CombatAction.BRACE]: 'fold',
};

export const FEEDBACK_ENTER_MS = 200;
export const FEEDBACK_EXIT_MS = 160;
export const FEEDBACK_MIN_DWELL_MS = 1600;
export const FEEDBACK_MAX_DWELL_MS = 3200;
export const FEEDBACK_MS_PER_WORD = 80;
/** One readable chip at a time; subsequent messages stay in the queue. */
export const FEEDBACK_STACK_CAP = 1;
export const FEEDBACK_PENDING_CAP = 4;
export const FEEDBACK_STAGGER_MS = 80;

export type FeedbackLane = 'cinema' | 'stack' | 'floater' | 'error';
export type FeedbackTone = GameFeedbackTone;
export type GameLogDraft = Omit<GameLogEntry, 'id' | 'timestamp'>;

export type CombatLogPresentation =
	| { readonly kind: 'target-bound' }
	| { readonly kind: 'log-only' }
	| {
			readonly kind: 'toast';
			readonly lane: 'stack' | 'error';
			readonly tone: FeedbackTone;
			readonly title: string;
		};

type UnknownRecord = Record<string, unknown>;

const TARGET_BOUND_LOG_TYPES: ReadonlySet<CombatLogEntry['type']> = new Set([
	'attack',
	'damage',
	'heal',
	'death',
]);

const TARGET_ANCHOR_KEYS = [
	'targetId',
	'targetEntityId',
	'targetInstanceId',
	'targetHeroId',
	'targetCardId',
	'defenderId',
] as const;

const NESTED_TARGET_KEYS = ['target', 'defender', 'targetEntity', 'result', 'resolution'] as const;

const INPUT_ERROR_COPY = /\b(invalid|cannot|can't|failed|failure|error|requires|not enough|no active|unable|not allowed|must wait)\b/i;

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null;
}

function isEntityReference(value: unknown): boolean {
	return (typeof value === 'string' && value.trim().length > 0)
		|| (typeof value === 'number' && Number.isFinite(value));
}

function containsTargetAnchor(value: unknown, depth = 0): boolean {
	if (!isRecord(value)) return false;
	if (TARGET_ANCHOR_KEYS.some(key => isEntityReference(value[key]))) return true;
	if (depth >= 2) return false;
	return NESTED_TARGET_KEYS.some(key => containsTargetAnchor(value[key], depth + 1));
}

function compactToastTitle(message: string): string {
	const normalized = message.replace(/\s+/g, ' ').trim();
	if (normalized.length <= 96) return normalized;
	return `${normalized.slice(0, 93).trimEnd()}…`;
}

function isInputError(entry: CombatLogEntry): boolean {
	return INPUT_ERROR_COPY.test(entry.message);
}

/**
 * Determines whether a combat log entry already has a visual destination.
 * Target-bound combat facts stay in the battle log and are represented by
 * their existing impact effect; only unanchored transient feedback becomes a
 * toast. This function is pure so routing cannot mutate gameplay state.
 */
export function combatLogPresentation(entry: CombatLogEntry): CombatLogPresentation {
	const isTargetBound = TARGET_BOUND_LOG_TYPES.has(entry.type) || containsTargetAnchor(entry.details);
	if (isInputError(entry)) {
		return {
			kind: 'toast',
			lane: 'error',
			tone: 'error',
			title: compactToastTitle(entry.message),
		};
	}

	if (isTargetBound) {
		return { kind: 'target-bound' };
	}

	// Poker phase/action copy has dedicated HUD/cinematic surfaces. Keeping it
	// in the log avoids replaying the same literal sentence as a second toast.
	if (entry.type === 'poker' || entry.type === 'phase') {
		return { kind: 'log-only' };
	}

	if (entry.type === 'spell' || entry.type === 'ability') {
		return {
			kind: 'toast',
			lane: 'stack',
			tone: 'info',
			title: compactToastTitle(entry.message),
		};
	}

	return { kind: 'log-only' };
}

export function countWords(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

export function readingDwellMs(text: string): number {
	const budget = 400 + countWords(text) * FEEDBACK_MS_PER_WORD;
	return Math.min(FEEDBACK_MAX_DWELL_MS, Math.max(FEEDBACK_MIN_DWELL_MS, budget));
}

export function overlayHoldMs(text: string): number {
	return FEEDBACK_ENTER_MS + readingDwellMs(text) + FEEDBACK_EXIT_MS;
}

export function shouldForwardCombatLog(entry: CombatLogEntry): boolean {
	if (entry.type === 'phase') return /poker/i.test(entry.message);
	return entry.type === 'poker'
		|| entry.type === 'spell'
		|| entry.type === 'damage'
		|| entry.type === 'attack'
		|| entry.type === 'heal'
		|| entry.type === 'death'
		|| entry.type === 'ability';
}

export function inferLogActor(message: string): GameLogEntry['actor'] {
	if (/^(your|you)\b/i.test(message) || /\bplayer\b/i.test(message)) return 'player';
	if (/\b(opponent|enemy)\b/i.test(message)) return 'opponent';
	return 'system';
}

export function mapCombatLogType(entry: CombatLogEntry): GameLogEntry['type'] {
	if (entry.type === 'spell') return 'spell';
	if (entry.type === 'damage') return 'damage';
	if (entry.type === 'heal') return 'heal';
	if (entry.type === 'attack') return 'attack';
	if (entry.type === 'death') return 'death';
	if (entry.type === 'ability') return 'hero_power';
	if (entry.type === 'poker' && /fold/i.test(entry.message)) return 'poker_bet';
	if (entry.type === 'poker' && /\b(bet|raise|call|check)\b/i.test(entry.message)) {
		return 'poker_bet';
	}
	return 'poker_phase';
}

export function overlayLaneForCombatLog(entry: CombatLogEntry): 'stack' | 'error' | null {
	const presentation = combatLogPresentation(entry);
	return presentation.kind === 'toast' ? presentation.lane : null;
}

export function toastForCombatLog(entry: CombatLogEntry): {
	readonly lane: 'stack' | 'error';
	readonly title: string;
	readonly tone: FeedbackTone;
} | null {
	const presentation = combatLogPresentation(entry);
	if (presentation.kind !== 'toast') return null;
	return {
		lane: presentation.lane,
		title: presentation.title,
		tone: presentation.tone,
	};
}

export type CombatLogRouting = {
	readonly log: GameLogDraft;
	readonly presentation: CombatLogPresentation;
};

export function mapCombatLogToGameLog(
	entry: CombatLogEntry,
	turn: number,
	phaseLabel?: string,
): GameLogDraft {
	const amountMatch = entry.message.match(/(-?\d+)\s*(?:HP|damage|STA|mana)/i);
	const amount = amountMatch ? Number(amountMatch[1]) : undefined;
	return {
		turn,
		actor: inferLogActor(entry.message),
		type: mapCombatLogType(entry),
		message: entry.message,
		details: {
			phaseLabel,
			amount: amount !== undefined && Number.isFinite(amount) ? Math.abs(amount) : undefined,
		},
	};
}

/** Maps every eligible combat entry to the persistent log before presentation. */
export function routeCombatLogEntry(
	entry: CombatLogEntry,
	turn: number,
	phaseLabel?: string,
): CombatLogRouting {
	return {
		log: mapCombatLogToGameLog(entry, turn, phaseLabel),
		presentation: combatLogPresentation(entry),
	};
}

export function pokerActionVerb(action: CombatAction | string | null | undefined): string {
	if (!action) return 'act';
	if (action in ACTION_VERBS) return ACTION_VERBS[action as CombatAction];
	return String(action).replace(/_/g, ' ');
}

export interface PokerResourceSnapshot {
	readonly playerHpCommitted: number;
	readonly opponentHpCommitted: number;
	readonly playerStamina: number;
	readonly opponentStamina: number;
	readonly playerAction: string | null;
	readonly opponentAction: string | null;
}

function actorLine(
	actor: 'player' | 'opponent',
	action: string | null,
	hpDelta: number,
	staDelta: number,
	turn: number,
	phaseLabel?: string,
): GameLogDraft {
	const verb = pokerActionVerb(action);
	const who = actor === 'player' ? 'You' : 'Opponent';
	const parts: string[] = [`${who} ${verb}`];
	if (hpDelta > 0) parts[0] = `${who} ${verb} ${hpDelta} HP`;
	if (staDelta !== 0) {
		const sign = staDelta > 0 ? '+' : '';
		parts.push(`(${sign}${staDelta} STA)`);
	}
	const type: GameLogEntry['type'] = hpDelta > 0 || action
		? 'poker_bet'
		: 'stamina';
	return {
		turn,
		actor,
		type,
		message: parts.join(' '),
		details: {
			phaseLabel,
			amount: hpDelta > 0 ? hpDelta : Math.abs(staDelta),
		},
	};
}

export function logsFromPokerResourceDiff(
	previous: PokerResourceSnapshot,
	next: PokerResourceSnapshot,
	turn: number,
	phaseLabel?: string,
): GameLogDraft[] {
	const logs: GameLogDraft[] = [];
	const playerHp = next.playerHpCommitted - previous.playerHpCommitted;
	const opponentHp = next.opponentHpCommitted - previous.opponentHpCommitted;
	const playerSta = next.playerStamina - previous.playerStamina;
	const opponentSta = next.opponentStamina - previous.opponentStamina;
	const playerActed = playerHp !== 0 || (playerSta !== 0 && next.playerAction !== previous.playerAction);
	const opponentActed = opponentHp !== 0 || (opponentSta !== 0 && next.opponentAction !== previous.opponentAction);

	if (playerActed) {
		logs.push(actorLine('player', next.playerAction, playerHp, playerSta, turn, phaseLabel));
	}
	if (opponentActed) {
		logs.push(actorLine('opponent', next.opponentAction, opponentHp, opponentSta, turn, phaseLabel));
	}
	return logs;
}

export function manaLogEntry(
	actor: 'player' | 'opponent',
	delta: number,
	turn: number,
): GameLogDraft | null {
	if (delta === 0) return null;
	const who = actor === 'player' ? 'You' : 'Opponent';
	const verb = delta < 0 ? 'spent' : 'gained';
	return {
		turn,
		actor,
		type: 'mana',
		message: `${who} ${verb} ${Math.abs(delta)} mana`,
		details: { amount: Math.abs(delta) },
	};
}
