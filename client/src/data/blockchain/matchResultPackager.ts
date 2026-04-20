import type { GameState } from '../../game/types';
import type {
	PackagedMatchResult,
	PackagedMatchResultOnChain,
	MatchPackagerInput,
	CardXPReward,
	MatchPlayerData,
	EloChange,
} from './types';
import { MATCH_RESULT_VERSION } from './types';
import { hashMatchResult, sha256Hash, canonicalStringify } from './hashUtils';
import { calculateXPRewards } from './cardXPSystem';
import type { HiveCardAsset } from '../schemas/HiveTypes';
import { getPlayerNonce, advancePlayerNonce } from './replayDB';
// Access combat store lazily to break blockchain ↔ combat-stores circular dependency
// The store registers itself on globalThis at creation time (see unifiedCombatStore.ts)
function getPokerHandsWon(side: 'player' | 'opponent'): number {
	const store = (globalThis as Record<string, unknown>).__ragnarokCombatStore as
		{ getState: () => { pokerHandsWonPlayer: number; pokerHandsWonOpponent: number } } | undefined;
	if (!store) return 0;
	const state = store.getState();
	return side === 'player' ? state.pokerHandsWonPlayer : state.pokerHandsWonOpponent;
}

const ELO_K_FACTOR = 32;
const RUNE_WIN_RANKED  = 10;
const RUNE_LOSS_RANKED = 3;

// Typed game log entry for damage calculation
interface DamageLogEntry {
	type: 'damage';
	source: 'player' | 'opponent';
	amount: number;
}

function isDamageEntry(entry: unknown): entry is DamageLogEntry {
	if (!entry || typeof entry !== 'object') return false;
	const e = entry as Record<string, unknown>;
	return e.type === 'damage' &&
	       (e.source === 'player' || e.source === 'opponent') &&
	       typeof e.amount === 'number';
}

function calculateEloChange(playerElo: number, opponentElo: number, isWinner: boolean): number {
	const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
	const actualScore = isWinner ? 1 : 0;
	return Math.round(ELO_K_FACTOR * (actualScore - expectedScore));
}

function extractPlayerData(
	gameState: GameState,
	side: 'player' | 'opponent',
	input: MatchPackagerInput
): MatchPlayerData {
	const player = gameState.players[side];
	const isPlayerSide = side === 'player';

	const cardIds = [
		...player.battlefield.map(c => c.card?.id),
		...player.graveyard.map(c => c.card?.id),
	].filter((id): id is number => typeof id === 'number');

	const uniqueCardIds = [...new Set(cardIds)];

	let damageDealt = 0;
	for (const entry of gameState.gameLog) {
		if (isDamageEntry(entry) && entry.source === side) {
			damageDealt += entry.amount;
		}
	}

	return {
		username: isPlayerSide ? input.playerUsername : input.opponentUsername,
		heroClass: player.heroClass || 'unknown',
		heroId: isPlayerSide ? input.playerHeroId : input.opponentHeroId,
		finalHp: player.heroHealth ?? player.health ?? 0,
		damageDealt,
		pokerHandsWon: getPokerHandsWon(side),
		cardsUsed: uniqueCardIds,
	};
}

export async function packageMatchResult(
	gameState: GameState,
	input: MatchPackagerInput,
	cardCollection?: HiveCardAsset[] | null,
	cardRarities?: Map<number, string>
): Promise<PackagedMatchResult> {
	const isPlayerWinner = gameState.winner === 'player';
	const winnerSide: 'player' | 'opponent' = isPlayerWinner ? 'player' : 'opponent';
	const loserSide: 'player' | 'opponent' = isPlayerWinner ? 'opponent' : 'player';

	const winner = extractPlayerData(gameState, winnerSide, input);
	const loser = extractPlayerData(gameState, loserSide, input);

	const winnerEloBefore = isPlayerWinner ? input.playerEloBefore : input.opponentEloBefore;
	const loserEloBefore = isPlayerWinner ? input.opponentEloBefore : input.playerEloBefore;

	const winnerEloDelta = calculateEloChange(winnerEloBefore, loserEloBefore, true);
	const loserEloDelta = calculateEloChange(loserEloBefore, winnerEloBefore, false);

	const winnerElo: EloChange = {
		before: winnerEloBefore,
		after: Math.max(0, winnerEloBefore + winnerEloDelta),
		delta: winnerEloDelta,
	};
	const loserElo: EloChange = {
		before: loserEloBefore,
		after: Math.max(0, loserEloBefore + loserEloDelta),
		delta: loserEloDelta,
	};

	// XP rewards for winner's cards only (loser gets 0 — intentional "brutal" design)
	// calculateXPRewards handles null/undefined collection by defaulting card XP to 0
	let xpRewards: CardXPReward[] = [];
	if (input.matchType === 'ranked' && cardRarities && input.playerCardUids.length > 0) {
		const winnerCardUids = isPlayerWinner ? input.playerCardUids : input.opponentCardUids;
		xpRewards = calculateXPRewards(winnerCardUids, cardCollection, cardRarities, null);
	}

	const runeRewards = input.matchType === 'ranked'
		? { winner: RUNE_WIN_RANKED, loser: RUNE_LOSS_RANKED }
		: { winner: 0, loser: 0 };

	const duration = Math.max(0, Date.now() - input.startTime);

	// Monotonic anti-replay nonce. Advance locally so the next call gets +2, etc.
	const nonceRecord = await getPlayerNonce(input.playerUsername);
	const resultNonce = nonceRecord.highestMatchNonce + 1;
	await advancePlayerNonce(input.playerUsername, resultNonce);

	const resultWithoutHash: Omit<PackagedMatchResult, 'hash'> = {
		matchId: input.matchId,
		timestamp: Date.now(),
		matchType: input.matchType,
		winner,
		loser,
		duration,
		totalRounds: gameState.turnNumber,
		eloChanges: { winner: winnerElo, loser: loserElo },
		xpRewards,
		runeRewards,
		seed: input.seed,
		version: MATCH_RESULT_VERSION,
		result_nonce: resultNonce,
	};

	const hash = await hashMatchResult(resultWithoutHash);

	return { ...resultWithoutHash, hash };
}

export function encodeCardIds(cardIds: number[]): string {
	const sorted = [...new Set(cardIds)].sort((a, b) => a - b);
	return sorted.map(id => id.toString(16).padStart(4, '0')).join('');
}

export function decodeCardIds(hex: string): number[] {
	const ids: number[] = [];
	for (let i = 0; i + 4 <= hex.length; i += 4) {
		ids.push(parseInt(hex.slice(i, i + 4), 16));
	}
	return ids;
}

export async function packMatchResultForChain(result: PackagedMatchResult): Promise<PackagedMatchResultOnChain> {
	const packed: PackagedMatchResultOnChain = {
		m: result.matchId,
		w: result.winner.username,
		l: result.loser.username,
		n: result.result_nonce,
		h: result.hash,
		s: result.seed,
		v: result.version,
	};
	if (result.winner.cardsUsed.length > 0) {
		packed.c = encodeCardIds(result.winner.cardsUsed);
	}
	// Compact hash: covers only on-chain fields so the replay engine can verify integrity.
	// Tampering with `c` without updating `ch` → caught immediately.
	// Tampering with both → caught once dual-sig verification on `ch` is added.
	const chInput = { m: packed.m, w: packed.w, l: packed.l, n: packed.n, s: packed.s, v: packed.v, c: packed.c ?? '' };
	packed.ch = await sha256Hash(canonicalStringify(chInput));
	if (result.signatures) {
		packed.sig = { b: result.signatures.broadcaster, c: result.signatures.counterparty };
	}
	if (result.transcriptRoot) {
		packed.tr = result.transcriptRoot;
	}
	if (result.transcriptCID) {
		packed.tc = result.transcriptCID;
	}
	return packed;
}
