import type { ArmySelection } from '../types/ChessTypes';

export type P2PBattleReadyProof = Readonly<{
	matchId: string;
	engineHash: string;
	rulesetHash: string;
	loadoutHash: string;
	initialStateRoot: string;
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
