import type { ProtocolPhaseId, ProtocolRuntimeFingerprint } from './protocolPhase';
import { canonicalStringify } from './protocol-core/hash';
import { fnv1a } from './protocol-core/broadcast-utils';

export type MigrationDataClass = 'preferences' | 'accessibility' | 'saved_decks' | 'transcripts' | 'campaign_evidence' | 'daily_quest_evidence' | 'rune' | 'elo' | 'season_score' | 'card_xp' | 'level_ups' | 'outbox' | 'market' | 'packs' | 'nft_ownership' | 'local_settlement';
export type MigrationInventory = Readonly<Partial<Record<MigrationDataClass, number>>>;
export type MigrationAction = 'carry' | 'archive' | 'reset' | 'never_promote';
export type MigrationDecision =
	| { readonly status: 'ready'; readonly migrationId: string; readonly projectionHash: string; readonly from: ProtocolRuntimeFingerprint; readonly to: ProtocolRuntimeFingerprint; readonly actions: Readonly<Record<MigrationDataClass, MigrationAction>>; readonly inventory: MigrationInventory; readonly totals: Readonly<Record<MigrationAction, number>>; readonly localEconomyPromoted: false }
	| { readonly status: 'no_op'; readonly code: 'same_fingerprint'; readonly migrationId: string }
	| { readonly status: 'rejected'; readonly code: 'phase_skip' | 'phase_regression' | 'reset_epoch_unchanged' | 'fingerprint_mismatch' | 'invalid_inventory'; readonly migrationId: string };

const ORDER: readonly ProtocolPhaseId[] = ['local-gameplay-v1', 'hive-testnet-v1', 'mainnet-v1'];
const ACTIONS: Readonly<Record<MigrationDataClass, MigrationAction>> = { preferences: 'carry', accessibility: 'carry', saved_decks: 'carry', transcripts: 'archive', campaign_evidence: 'archive', daily_quest_evidence: 'archive', rune: 'reset', elo: 'reset', season_score: 'reset', card_xp: 'reset', level_ups: 'reset', outbox: 'reset', market: 'reset', packs: 'reset', nft_ownership: 'reset', local_settlement: 'never_promote' };
export function planProtocolPhaseMigration(from: ProtocolRuntimeFingerprint, to: ProtocolRuntimeFingerprint, inventory: MigrationInventory = {}): MigrationDecision {
	const migrationId = `phase-migration:${fnv1a(canonicalStringify({ from, to, inventory }))}`;
	if (Object.values(inventory).some(value => !Number.isInteger(value) || (value as number) < 0)) return { status: 'rejected', code: 'invalid_inventory', migrationId };
	if (from.representation === to.representation) return { status: 'no_op', code: 'same_fingerprint', migrationId };
	const fromIndex = ORDER.indexOf(from.phaseId); const toIndex = ORDER.indexOf(to.phaseId);
	if (fromIndex < 0 || toIndex < 0 || toIndex === fromIndex) return { status: 'rejected', code: 'fingerprint_mismatch', migrationId };
	if (toIndex < fromIndex) return { status: 'rejected', code: 'phase_regression', migrationId };
	if (toIndex > fromIndex + 1) return { status: 'rejected', code: 'phase_skip', migrationId };
	if (from.resetEpoch === to.resetEpoch) return { status: 'rejected', code: 'reset_epoch_unchanged', migrationId };
	const totals = { carry: 0, archive: 0, reset: 0, never_promote: 0 };
	for (const key of Object.keys(ACTIONS) as MigrationDataClass[]) totals[ACTIONS[key]] += inventory[key] ?? 0;
	const projectionHash = fnv1a(canonicalStringify({ migrationId, from: from.representation, to: to.representation, inventory, actions: ACTIONS }));
	return { status: 'ready', migrationId, projectionHash, from, to, actions: ACTIONS, inventory, totals, localEconomyPromoted: false };
}

export type ProtocolFingerprintError = Error & { readonly code: 'fingerprint_mismatch'; readonly expected: string; readonly actual: string };
export function assertProtocolRuntimeFingerprint(expected: ProtocolRuntimeFingerprint, actual: ProtocolRuntimeFingerprint): void {
	const expectedCanonical = canonicalStringify([expected.stage, expected.phaseId, expected.protocolId, expected.resetEpoch, expected.seasonStart, expected.indexStartBlock]);
	const actualCanonical = canonicalStringify([actual.stage, actual.phaseId, actual.protocolId, actual.resetEpoch, actual.seasonStart, actual.indexStartBlock]);
	if (expectedCanonical === actualCanonical && expected.representation === actual.representation) return;
	const error = new Error(`protocol runtime fingerprint mismatch: expected ${expected.representation}, got ${actual.representation}`) as ProtocolFingerprintError;
	Object.assign(error, { code: 'fingerprint_mismatch', expected: expected.representation, actual: actual.representation });
	throw error;
}
