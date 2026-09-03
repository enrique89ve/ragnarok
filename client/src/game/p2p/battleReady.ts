import type { ArmySelection } from '../types/ChessTypes';

export type P2PBattleReadyProof = Readonly<{
	matchId: string;
	engineHash: string;
	rulesetHash: string;
	loadoutHash: string;
	initialStateRoot: string;
}>;

/** Optional testnet diagnosis. Never part of the compared BattleReady proof. */
export type BattleReadyDebug = Readonly<{
	chessHash: string;
	cardsHash: string;
	matchSeedHash: string;
	localLoadoutHash: string;
	remoteLoadoutHash: string;
}>;

export type BattleReadyProofComparison =
	| { readonly ok: true }
	| { readonly ok: false; readonly reason: string };

export function buildBattleReadyLoadoutCommitmentPayload(input: Readonly<{
	readonly army: ArmySelection;
	readonly deckCardIds: readonly number[];
}>): Readonly<{
	readonly army: Readonly<Record<'king' | 'queen' | 'rook' | 'bishop' | 'knight', string>>;
	readonly deckCardIds: readonly number[];
}> {
	return {
		army: {
			king: input.army.king.id,
			queen: input.army.queen.id,
			rook: input.army.rook.id,
			bishop: input.army.bishop.id,
			knight: input.army.knight.id,
		},
		deckCardIds: [...input.deckCardIds],
	};
}

export function compareBattleReadyProofs(
	local: P2PBattleReadyProof,
	remote: P2PBattleReadyProof,
	options: Readonly<{
		readonly expectedRemoteLoadoutHash?: string | null;
	}> = {},
): BattleReadyProofComparison {
	if (local.matchId !== remote.matchId) return { ok: false, reason: 'Battle-ready match identity mismatch' };
	if (local.engineHash !== remote.engineHash) return { ok: false, reason: 'Game engine mismatch' };
	if (local.rulesetHash !== remote.rulesetHash) return { ok: false, reason: 'Ruleset mismatch' };
	if (local.initialStateRoot !== remote.initialStateRoot) return { ok: false, reason: 'Initial state root mismatch' };
	if (remote.loadoutHash.length === 0) return { ok: false, reason: 'Opponent loadout proof is missing' };
	if (options.expectedRemoteLoadoutHash !== undefined
		&& options.expectedRemoteLoadoutHash !== null
		&& remote.loadoutHash !== options.expectedRemoteLoadoutHash) {
		return { ok: false, reason: 'Opponent loadout proof does not match the announced loadout' };
	}
	return { ok: true };
}

function loadoutPairKey(debug: BattleReadyDebug): string {
	return [debug.localLoadoutHash, debug.remoteLoadoutHash].sort().join('|');
}

function debugLine(label: string, matches: boolean): string {
	return `${label.padEnd(8)} ${matches ? 'MATCH' : 'MISMATCH'}`;
}

export function describeBattleReadyDebugMismatch(
	local: BattleReadyDebug | null | undefined,
	remote: BattleReadyDebug | null | undefined,
): string {
	if (!local || !remote) return 'BattleReady debug unavailable on one or both peers';
	return [
		debugLine('Chess', local.chessHash === remote.chessHash),
		debugLine('Cards', local.cardsHash === remote.cardsHash),
		debugLine('Seed', local.matchSeedHash === remote.matchSeedHash),
		debugLine('Loadout', loadoutPairKey(local) === loadoutPairKey(remote)),
	].join('\n');
}
