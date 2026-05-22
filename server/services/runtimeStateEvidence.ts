import path from 'path';
import {
	getRagnarokRuntimePhase,
	type RagnarokRuntimeConfig,
} from '../../shared/runtimeConfig';
import { getStateFilePath } from './chainState';

const OWNERSHIP_SOURCES = ['json', 'nftlox', 'hive-replay', 'local-dev'] as const;
type RagnarokOwnershipSource = typeof OWNERSHIP_SOURCES[number];

export type RagnarokServerStateEvidence = {
	readonly persistence: 'json-file';
	readonly chainStateFile: string;
	readonly stateDirectory: string;
	readonly chainStateFileConfigured: boolean;
	readonly ownershipSource: RagnarokOwnershipSource;
	readonly ownershipSourceConfigured: boolean;
};

function isOwnershipSource(value: string | undefined): value is RagnarokOwnershipSource {
	return OWNERSHIP_SOURCES.includes(value as RagnarokOwnershipSource);
}

function normalizeOwnershipSource(value: string | undefined): RagnarokOwnershipSource | null {
	const normalized = value?.trim().toLowerCase();
	return isOwnershipSource(normalized) ? normalized : null;
}

function getDefaultOwnershipSource(runtime: RagnarokRuntimeConfig): RagnarokOwnershipSource {
	if (runtime.stage === 'local') return 'local-dev';
	if (getRagnarokRuntimePhase(runtime) === 'alfa-testnet') return 'json';
	return 'nftlox';
}

export function buildServerStateEvidence(runtime: RagnarokRuntimeConfig): RagnarokServerStateEvidence {
	const configuredOwnershipSource = normalizeOwnershipSource(process.env.RAGNAROK_NFT_OWNERSHIP_SOURCE);
	const chainStateFile = getStateFilePath();

	return {
		persistence: 'json-file',
		chainStateFile,
		stateDirectory: path.dirname(chainStateFile),
		chainStateFileConfigured: Boolean(process.env.RAGNAROK_CHAIN_STATE_FILE?.trim()),
		ownershipSource: configuredOwnershipSource ?? getDefaultOwnershipSource(runtime),
		ownershipSourceConfigured: configuredOwnershipSource !== null,
	};
}
