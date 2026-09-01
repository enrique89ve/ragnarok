/**
 * Local P2P match resume. Hard reload remains an explicit Alfa blocker until
 * an approved session-key renewal ceremony exists.
 *
 * The browser owns the match snapshot. The relay only reopens the room
 * (max 2 attempts). This is not server-authored gameplay state.
 */
import { readP2PMatchTicket, type P2PMatchTicket } from '@shared/p2pAvailability';

import { sha256 } from '@noble/hashes/sha2.js';

import { createRuntimeDatabaseName, createRuntimeStorageKey, getRagnarokNetworkConfig } from '../config/networkConfig';
import type { GameState } from '../types';
import type { ArmySelection } from '../types/ChessTypes';
import type { RoundFlowState } from '../flow/round/types';
import type { HeroDeckLoadout } from '../deck/heroDeckRules';

export const P2P_MATCH_RESUME_VERSION = 3;
export const P2P_MATCH_RESUME_TTL_MS = 90_000;
export const P2P_MATCH_REJOIN_ATTEMPTS = 2;

const SESSION_KEY = createRuntimeStorageKey('p2p-match-resume');
const DB_NAME = createRuntimeDatabaseName('p2p-match-resume');
const STORE_NAME = 'records';

export type P2PCombatResumeSnapshot = {
	readonly chessPieces: unknown;
	readonly boardState: unknown;
	readonly pendingCombat: unknown;
	readonly combatPhase: unknown;
	readonly pokerState: unknown;
	readonly pokerCombatState: unknown;
	readonly pokerIsActive: boolean;
	readonly sharedDeck: unknown;
	readonly sharedDeckCardIds: ReadonlyArray<number>;
	readonly battlefield: unknown;
	readonly turnState: unknown;
};

export type P2PResumeWatermark = {
	readonly matchId: string;
	readonly matchSeed: string;
	readonly roomId: string;
	readonly resetEpoch: string;
	readonly seq: number;
	readonly turnNumber: number;
	readonly chessMoveCount: number;
	readonly savedAt: number;
};

export type P2PMatchResumeRecord = {
	readonly version: typeof P2P_MATCH_RESUME_VERSION;
	readonly account: string;
	readonly resetEpoch: string;
	readonly seq: number;
	readonly turnNumber: number;
	readonly chessMoveCount: number;
	readonly matchId: string;
	readonly matchSeed: string;
	readonly roomId: string;
	readonly myPeerId: string;
	readonly remotePeerId: string | null;
	readonly matchTicket: P2PMatchTicket | null;
	readonly isHost: boolean;
	readonly myCanonicalSide: 'player' | 'opponent';
	readonly playerArmy: ArmySelection;
	readonly opponentArmy: ArmySelection;
	readonly deckCardIds: ReadonlyArray<number>;
	readonly deckCardIdsByPiece: HeroDeckLoadout;
	readonly gameState: GameState;
	readonly combat: P2PCombatResumeSnapshot;
	readonly flow: RoundFlowState | null;
	readonly savedAt: number;
	readonly seal: string;
};

let acceptedWatermark: P2PResumeWatermark | null = null;

export function resumeWatermarkOf(record: P2PMatchResumeRecord): P2PResumeWatermark {
	return {
		matchId: record.matchId,
		matchSeed: record.matchSeed,
		roomId: record.roomId,
		resetEpoch: record.resetEpoch,
		seq: record.seq,
		turnNumber: record.turnNumber,
		chessMoveCount: record.chessMoveCount,
		savedAt: record.savedAt,
	};
}

const SEAL_HEX = '0123456789abcdef';

function bytesToHex(bytes: Uint8Array): string {
	let out = '';
	for (let i = 0; i < bytes.length; i++) {
		const b = bytes[i];
		out += SEAL_HEX[(b >>> 4) & 0xf] + SEAL_HEX[b & 0xf];
	}
	return out;
}

export function computeResumeSeal(input: {
	readonly account: string;
	readonly resetEpoch: string;
	readonly matchId: string;
	readonly matchSeed: string;
	readonly roomId: string;
	readonly myPeerId: string;
	readonly seq: number;
	readonly turnNumber: number;
	readonly chessMoveCount: number;
	readonly ticketToken: string | null;
}): string {
	const material = [
		input.account,
		input.resetEpoch,
		input.matchId,
		input.matchSeed,
		input.roomId,
		input.myPeerId,
		String(input.seq),
		String(input.turnNumber),
		String(input.chessMoveCount),
		input.ticketToken ?? '-',
	].join('|');
	return bytesToHex(sha256(new TextEncoder().encode(material)));
}

export type P2PResumeMatchKey = Pick<P2PResumeWatermark, 'matchId' | 'matchSeed' | 'roomId' | 'resetEpoch'>;

export function isSameResumeMatch(left: P2PResumeMatchKey, right: P2PResumeMatchKey): boolean {
	return left.matchId === right.matchId
		&& left.matchSeed === right.matchSeed
		&& left.roomId === right.roomId
		&& left.resetEpoch === right.resetEpoch;
}

export function isResumeAheadOrEqual(
	candidate: P2PResumeWatermark,
	baseline: P2PResumeWatermark,
): boolean {
	if (!isSameResumeMatch(candidate, baseline)) return false;
	if (candidate.turnNumber !== baseline.turnNumber) {
		return candidate.turnNumber > baseline.turnNumber;
	}
	if (candidate.chessMoveCount !== baseline.chessMoveCount) {
		return candidate.chessMoveCount > baseline.chessMoveCount;
	}
	return candidate.seq >= baseline.seq;
}

export function shouldAcceptResumeWrite(
	incoming: P2PResumeWatermark,
	stored: P2PResumeWatermark | null,
): boolean {
	if (!stored) return true;
	if (isSameResumeMatch(incoming, stored)) {
		return isResumeAheadOrEqual(incoming, stored);
	}
	return incoming.savedAt >= stored.savedAt;
}

export function pickPreferredResumeRecord(
	left: P2PMatchResumeRecord | null,
	right: P2PMatchResumeRecord | null,
): P2PMatchResumeRecord | null {
	if (!left) return right;
	if (!right) return left;
	const leftMark = resumeWatermarkOf(left);
	const rightMark = resumeWatermarkOf(right);
	if (isSameResumeMatch(leftMark, rightMark)) {
		return isResumeAheadOrEqual(leftMark, rightMark) ? left : right;
	}
	return left.savedAt >= right.savedAt ? left : right;
}

export function nextResumeSeq(match: P2PResumeMatchKey): number {
	if (acceptedWatermark && isSameResumeMatch(match, acceptedWatermark)) {
		return acceptedWatermark.seq + 1;
	}
	return 1;
}

export function markResumeWatermarkAccepted(watermark: P2PResumeWatermark): void {
	acceptedWatermark = watermark;
}

export function getAcceptedResumeWatermark(): P2PResumeWatermark | null {
	return acceptedWatermark;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

function isArmyLike(value: unknown): value is ArmySelection {
	if (!isRecord(value)) return false;
	for (const key of ['king', 'queen', 'rook', 'bishop', 'knight'] as const) {
		const piece = value[key];
		if (!isRecord(piece) || !isNonEmptyString(piece.id)) return false;
	}
	return true;
}

function isGameStateLike(value: unknown): value is GameState {
	if (!isRecord(value) || !isRecord(value.players)) return false;
	if (!isRecord(value.players.player) || !isRecord(value.players.opponent)) return false;
	if (value.currentTurn !== 'player' && value.currentTurn !== 'opponent') return false;
	if (typeof value.turnNumber !== 'number' || !Number.isInteger(value.turnNumber)) return false;
	return true;
}

function isDeckLoadout(value: unknown): value is HeroDeckLoadout {
	if (!isRecord(value)) return false;
	for (const key of ['queen', 'rook', 'bishop', 'knight'] as const) {
		if (!Array.isArray(value[key])) return false;
	}
	return true;
}

function isFlowState(value: unknown): value is RoundFlowState {
	if (!isRecord(value) || typeof value.tag !== 'string') return false;
	return value.tag === 'chess'
		|| value.tag === 'chess_intro'
		|| value.tag === 'vs_screen'
		|| value.tag === 'poker_combat'
		|| value.tag === 'game_over'
		|| value.tag === 'cinematic'
		|| value.tag === 'mission_intro';
}

function readChessMoveCount(boardState: unknown): number {
	if (!isRecord(boardState) || !isNonNegativeInt(boardState.moveCount)) return 0;
	return boardState.moveCount;
}

function matchesCurrentEpochAndTurn(input: Record<string, unknown>): boolean {
	if (input.resetEpoch !== getRagnarokNetworkConfig().resetEpoch) return false;
	if (!isGameStateLike(input.gameState) || input.turnNumber !== input.gameState.turnNumber) return false;
	return isCombatSnapshot(input.combat)
		&& input.chessMoveCount === readChessMoveCount(input.combat.boardState);
}

function matchesResumeSeal(input: Record<string, unknown>, ticketToken: string | null): boolean {
	if (!isNonEmptyString(input.seal) || !isNonEmptyString(input.account)) return false;
	if (!isNonEmptyString(input.resetEpoch) || !isNonEmptyString(input.matchId)) return false;
	if (!isNonEmptyString(input.matchSeed) || !isNonEmptyString(input.roomId)) return false;
	if (!isNonEmptyString(input.myPeerId) || !isNonNegativeInt(input.seq)) return false;
	if (!isNonNegativeInt(input.turnNumber) || !isNonNegativeInt(input.chessMoveCount)) return false;
	return input.seal === computeResumeSeal({
		account: input.account,
		resetEpoch: input.resetEpoch,
		matchId: input.matchId,
		matchSeed: input.matchSeed,
		roomId: input.roomId,
		myPeerId: input.myPeerId,
		seq: input.seq,
		turnNumber: input.turnNumber,
		chessMoveCount: input.chessMoveCount,
		ticketToken,
	});
}

function readBoundMatchTicket(
	input: Record<string, unknown>,
	now: number,
): ReturnType<typeof readP2PMatchTicket> {
	if (input.matchTicket == null) return null;
	const matchTicket = readP2PMatchTicket(input.matchTicket);
	if (!matchTicket || matchTicket.expiresAt < now) return null;
	if (matchTicket.roomId !== input.roomId || matchTicket.peerId !== input.myPeerId) return null;
	return matchTicket;
}

function isCombatSnapshot(value: unknown): value is P2PCombatResumeSnapshot {
	if (!isRecord(value)) return false;
	if (typeof value.pokerIsActive !== 'boolean') return false;
	if (!Array.isArray(value.sharedDeckCardIds)) return false;
	return true;
}

function isNonNegativeInt(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isIntegerArray(value: unknown): value is number[] {
	return Array.isArray(value) && value.every((item) => Number.isInteger(item));
}

function readResumeSide(input: Record<string, unknown>): {
	readonly isHost: boolean;
	readonly myCanonicalSide: 'player' | 'opponent';
	readonly remotePeerId: string | null;
} | null {
	if (typeof input.isHost !== 'boolean') return null;
	if (input.myCanonicalSide !== 'player' && input.myCanonicalSide !== 'opponent') return null;
	if (!(input.remotePeerId === null || isNonEmptyString(input.remotePeerId))) return null;
	return {
		isHost: input.isHost,
		myCanonicalSide: input.myCanonicalSide,
		remotePeerId: input.remotePeerId,
	};
}

function readResumeIdentity(input: Record<string, unknown>): Omit<P2PMatchResumeRecord,
	| 'matchTicket' | 'playerArmy' | 'opponentArmy' | 'deckCardIds'
	| 'deckCardIdsByPiece' | 'gameState' | 'combat' | 'flow'
> | null {
	if (input.version !== P2P_MATCH_RESUME_VERSION) return null;
	if (!isNonEmptyString(input.account) || !isNonEmptyString(input.resetEpoch)) return null;
	if (!isNonEmptyString(input.matchId) || !isNonEmptyString(input.matchSeed)) return null;
	if (!isNonEmptyString(input.roomId) || !isNonEmptyString(input.myPeerId)) return null;
	if (!isNonNegativeInt(input.seq) || !isNonNegativeInt(input.turnNumber)) return null;
	if (!isNonNegativeInt(input.chessMoveCount) || !isNonEmptyString(input.seal)) return null;
	if (typeof input.savedAt !== 'number' || !Number.isFinite(input.savedAt)) return null;
	const side = readResumeSide(input);
	if (!side) return null;
	return {
		version: P2P_MATCH_RESUME_VERSION,
		account: input.account,
		resetEpoch: input.resetEpoch,
		seq: input.seq,
		turnNumber: input.turnNumber,
		chessMoveCount: input.chessMoveCount,
		matchId: input.matchId,
		matchSeed: input.matchSeed,
		roomId: input.roomId,
		myPeerId: input.myPeerId,
		...side,
		savedAt: input.savedAt,
		seal: input.seal,
	};
}

function isLiveResumeWindow(input: {
	readonly savedAt: number;
	readonly gameState: GameState;
	readonly flow: RoundFlowState | null;
}, now: number): boolean {
	if (now - input.savedAt > P2P_MATCH_RESUME_TTL_MS) return false;
	if (input.gameState.gamePhase === 'game_over' || input.gameState.gamePhase === 'ended') return false;
	if (input.flow?.tag === 'game_over') return false;
	return true;
}

function readResumePayload(input: Record<string, unknown>): Pick<P2PMatchResumeRecord,
	| 'playerArmy' | 'opponentArmy' | 'deckCardIds' | 'deckCardIdsByPiece'
	| 'gameState' | 'combat' | 'flow'
> | null {
	if (!isArmyLike(input.playerArmy) || !isArmyLike(input.opponentArmy)) return null;
	if (!isIntegerArray(input.deckCardIds) || !isDeckLoadout(input.deckCardIdsByPiece)) return null;
	if (!isCombatSnapshot(input.combat) || !isGameStateLike(input.gameState)) return null;
	if (input.flow !== null && !isFlowState(input.flow)) return null;
	if (!matchesCurrentEpochAndTurn(input)) return null;
	return {
		playerArmy: input.playerArmy,
		opponentArmy: input.opponentArmy,
		deckCardIds: input.deckCardIds,
		deckCardIdsByPiece: input.deckCardIdsByPiece,
		gameState: input.gameState,
		combat: {
			chessPieces: input.combat.chessPieces,
			boardState: input.combat.boardState,
			pendingCombat: input.combat.pendingCombat,
			combatPhase: input.combat.combatPhase,
			pokerState: input.combat.pokerState,
			pokerCombatState: input.combat.pokerCombatState,
			pokerIsActive: input.combat.pokerIsActive,
			sharedDeck: input.combat.sharedDeck,
			sharedDeckCardIds: input.combat.sharedDeckCardIds,
			battlefield: input.combat.battlefield,
			turnState: input.combat.turnState,
		},
		flow: input.flow,
	};
}

export function readP2PMatchResumeRecord(input: unknown, now = Date.now()): P2PMatchResumeRecord | null {
	if (!isRecord(input)) return null;
	const identity = readResumeIdentity(input);
	const payload = readResumePayload(input);
	if (!identity || !payload) return null;
	if (!isLiveResumeWindow({
		savedAt: identity.savedAt,
		gameState: payload.gameState,
		flow: payload.flow,
	}, now)) return null;

	const matchTicket = readBoundMatchTicket(input, now);
	if (input.matchTicket != null && !matchTicket) return null;
	if (!matchesResumeSeal(input, matchTicket?.token ?? null)) return null;

	const record: P2PMatchResumeRecord = {
		...identity,
		matchTicket,
		...payload,
	};
	return isAcceptedWatermarkCompatible(resumeWatermarkOf(record)) ? record : null;
}

function isAcceptedWatermarkCompatible(watermark: P2PResumeWatermark): boolean {
	if (!acceptedWatermark || !isSameResumeMatch(watermark, acceptedWatermark)) return true;
	return isResumeAheadOrEqual(watermark, acceptedWatermark);
}

function writeSessionRecord(record: P2PMatchResumeRecord): void {
	try {
		window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(record));
	} catch {
		// Quota / private mode — IndexedDB may still succeed.
	}
}

function readSessionRecord(now: number): P2PMatchResumeRecord | null {
	try {
		const raw = window.sessionStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		return readP2PMatchResumeRecord(JSON.parse(raw), now);
	} catch {
		return null;
	}
}

function clearSessionRecord(): void {
	try {
		window.sessionStorage.removeItem(SESSION_KEY);
	} catch {
		// ignore
	}
}

function openResumeDb(): Promise<IDBDatabase | null> {
	if (typeof indexedDB === 'undefined') return Promise.resolve(null);
	return new Promise((resolve) => {
		let req: IDBOpenDBRequest;
		try {
			req = indexedDB.open(DB_NAME, 1);
		} catch {
			resolve(null);
			return;
		}
		req.onupgradeneeded = () => {
			if (!req.result.objectStoreNames.contains(STORE_NAME)) {
				req.result.createObjectStore(STORE_NAME, { keyPath: 'account' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => resolve(null);
	});
}

let saveQueue: Promise<boolean> = Promise.resolve(false);

function strongestWatermark(
	incoming: P2PResumeWatermark,
	candidates: ReadonlyArray<P2PResumeWatermark | null>,
): P2PResumeWatermark | null {
	const known = candidates.filter((item): item is P2PResumeWatermark => item !== null);
	if (known.length === 0) return null;
	const sameMatch = known.filter((item) => isSameResumeMatch(item, incoming));
	const pool = sameMatch.length > 0 ? sameMatch : known;
	return pool.reduce((best, item) => (
		isSameResumeMatch(item, best)
			? (isResumeAheadOrEqual(item, best) ? item : best)
			: (item.savedAt >= best.savedAt ? item : best)
	));
}

function commitAcceptedRecord(record: P2PMatchResumeRecord): void {
	writeSessionRecord(record);
	markResumeWatermarkAccepted(resumeWatermarkOf(record));
}

async function saveResumeExclusive(record: P2PMatchResumeRecord): Promise<boolean> {
	const incoming = resumeWatermarkOf(record);
	const session = readSessionRecord(Date.now());
	const db = await openResumeDb();
	if (!db) {
		const baseline = strongestWatermark(incoming, [
			session ? resumeWatermarkOf(session) : null,
			acceptedWatermark,
		]);
		if (!shouldAcceptResumeWrite(incoming, baseline)) return false;
		commitAcceptedRecord(record);
		return true;
	}

	const wrote = await new Promise<boolean>((resolve) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const getReq = store.get(record.account);
		let accepted = false;
		getReq.onsuccess = () => {
			const stored = readP2PMatchResumeRecord(getReq.result, Date.now());
			const baseline = strongestWatermark(incoming, [
				session ? resumeWatermarkOf(session) : null,
				stored ? resumeWatermarkOf(stored) : null,
				acceptedWatermark,
			]);
			if (!shouldAcceptResumeWrite(incoming, baseline)) return;
			store.put(record);
			accepted = true;
		};
		tx.oncomplete = () => resolve(accepted);
		tx.onerror = () => resolve(false);
	});
	db.close();
	if (wrote) commitAcceptedRecord(record);
	return wrote;
}

export function saveP2PMatchResume(record: P2PMatchResumeRecord): Promise<boolean> {
	saveQueue = saveQueue.then(() => saveResumeExclusive(record), () => saveResumeExclusive(record));
	return saveQueue;
}

async function readIndexedRecord(account: string, now: number): Promise<P2PMatchResumeRecord | null> {
	const db = await openResumeDb();
	if (!db) return null;
	const stored = await new Promise<unknown>((resolve) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const req = tx.objectStore(STORE_NAME).get(account);
		req.onsuccess = () => resolve(req.result ?? null);
		req.onerror = () => resolve(null);
	});
	db.close();
	const parsed = readP2PMatchResumeRecord(stored, now);
	return parsed && parsed.account === account ? parsed : null;
}

export async function loadP2PMatchResume(account: string, now = Date.now()): Promise<P2PMatchResumeRecord | null> {
	const fromSession = readSessionRecord(now);
	const session = fromSession && fromSession.account === account ? fromSession : null;
	const fromDb = await readIndexedRecord(account, now);
	const chosen = pickPreferredResumeRecord(session, fromDb);
	if (chosen) markResumeWatermarkAccepted(resumeWatermarkOf(chosen));
	return chosen;
}

export async function clearP2PMatchResume(): Promise<void> {
	acceptedWatermark = null;
	clearSessionRecord();
	const db = await openResumeDb();
	if (!db) return;
	await new Promise<void>((resolve) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		tx.objectStore(STORE_NAME).clear();
		tx.oncomplete = () => resolve();
		tx.onerror = () => resolve();
	});
	db.close();
}
