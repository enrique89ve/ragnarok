import {
	getSessionEvents,
	recordSessionEvent,
	type SessionEvent,
} from '../../data/blockchain/transcriptBuilder';
import { getRagnarokStorageNamespace, isQaFullCatalogEntitlementEnabled, type RagnarokRuntimeConfig } from '@shared/runtimeConfig';
import { RAGNAROK_NETWORK_CONFIG } from '../config/networkConfig';

declare const __BUILD_HASH__: string;

export type CeremonyKind =
	| 'starter_claim'
	| 'duat_airdrop_claim'
	| 'duat_pack_opening'
	| 'daily_quest_claim'
	| 'campaign_reward'
	| 'rune_pack_exchange'
	| 'rune_pack_opening'
	| 'vault_pack_opening';

export interface CeremonyEvidenceInput {
	readonly ceremony: CeremonyKind;
	readonly account: string | null;
	readonly context?: Record<string, unknown>;
}

export interface CeremonyRuntimeEvidence {
	readonly stage: RagnarokRuntimeConfig['stage'];
	readonly executionMode: RagnarokRuntimeConfig['executionMode'];
	readonly protocolId: string;
	readonly collectionId: string;
	readonly nftLoxProtocolId: string;
	readonly resetEpoch: string;
	readonly resettable: boolean;
	readonly economic: boolean;
	readonly seasonStart: string;
	readonly storageNamespace: string;
	readonly qaFullCatalogEnabled: boolean;
}

export interface CeremonyEvidencePayload {
	readonly version: 1;
	readonly exportedAt: number;
	readonly buildHash: string;
	readonly ceremony: CeremonyKind;
	readonly account: string | null;
	readonly runtime: CeremonyRuntimeEvidence;
	readonly context: Record<string, unknown>;
	readonly events: SessionEvent[];
}

export function buildCeremonyRuntimeEvidence(config: RagnarokRuntimeConfig): CeremonyRuntimeEvidence {
	return {
		stage: config.stage,
		executionMode: config.executionMode,
		protocolId: config.protocolId,
		collectionId: config.collectionId,
		nftLoxProtocolId: config.nftLoxProtocolId,
		resetEpoch: config.resetEpoch,
		resettable: config.resettable,
		economic: config.economic,
		seasonStart: config.seasonStart,
		storageNamespace: getRagnarokStorageNamespace(config),
		qaFullCatalogEnabled: isQaFullCatalogEntitlementEnabled(config),
	};
}

export function buildCeremonyEvidencePayload(
	input: CeremonyEvidenceInput,
	config: RagnarokRuntimeConfig = RAGNAROK_NETWORK_CONFIG,
	events: readonly SessionEvent[] = getSessionEvents(),
): CeremonyEvidencePayload {
	return {
		version: 1,
		exportedAt: Date.now(),
		buildHash: getBuildHash(),
		ceremony: input.ceremony,
		account: normalizeAccount(input.account),
		runtime: buildCeremonyRuntimeEvidence(config),
		context: input.context ?? {},
		events: [...events],
	};
}

export function recordCeremonyFeedbackEvent(
	ceremony: CeremonyKind,
	action: string,
	payload: Record<string, unknown> = {},
	config: RagnarokRuntimeConfig = RAGNAROK_NETWORK_CONFIG,
): void {
	recordSessionEvent(`ceremony_${ceremony}_${action}`, {
		...payload,
		ceremony,
		runtime: buildCeremonyRuntimeEvidence(config),
	});
}

export function downloadCeremonyEvidence(input: CeremonyEvidenceInput): void {
	if (typeof document === 'undefined' || typeof URL === 'undefined') {
		throw new Error('Ceremony evidence download requires a browser document.');
	}

	const payload = buildCeremonyEvidencePayload(input);
	const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = `${buildCeremonyEvidenceFilename(payload)}.json`;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

export function buildCeremonyEvidenceFilename(payload: Pick<CeremonyEvidencePayload, 'ceremony' | 'account' | 'exportedAt' | 'runtime'>): string {
	const account = payload.account ? sanitizeFilenameSegment(payload.account) : 'guest';
	const reset = sanitizeFilenameSegment(payload.runtime.resetEpoch);
	return [
		'ragnarok',
		'ceremony',
		sanitizeFilenameSegment(payload.ceremony),
		account,
		reset,
		String(payload.exportedAt),
	].join('-');
}

function getBuildHash(): string {
	return typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';
}

function normalizeAccount(account: string | null): string | null {
	const normalized = account?.trim().toLowerCase();
	return normalized && normalized.length > 0 ? normalized : null;
}

function sanitizeFilenameSegment(value: string): string {
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return normalized.length > 0 ? normalized : 'unknown';
}
