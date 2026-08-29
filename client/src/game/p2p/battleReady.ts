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

export function compareBattleReadyProofs(
	local: P2PBattleReadyProof,
	remote: P2PBattleReadyProof,
): BattleReadyProofComparison {
	if (local.matchId !== remote.matchId) return { ok: false, reason: 'Battle-ready match identity mismatch' };
	if (local.engineHash !== remote.engineHash) return { ok: false, reason: 'Game engine mismatch' };
	if (local.rulesetHash !== remote.rulesetHash) return { ok: false, reason: 'Ruleset mismatch' };
	if (local.initialStateRoot !== remote.initialStateRoot) return { ok: false, reason: 'Initial state root mismatch' };
	if (remote.loadoutHash.length === 0) return { ok: false, reason: 'Opponent loadout proof is missing' };
	return { ok: true };
}
