import { getNetworkStage, type NetworkStage } from './featureFlags';

export interface RagnarokNetworkConfig {
	readonly stage: NetworkStage;
	readonly protocolId: string;
	readonly collectionId: string;
	readonly adminAccount: string;
	readonly genesisAccount: string;
	readonly treasuryAccount: string;
	readonly indexAccount: string;
	readonly indexerUrl: string;
	readonly artIndexerUrl: string;
	readonly nftLoxProtocolId: string;
	readonly nftArtBaseUrl: string;
	readonly externalUrlBase: string;
	readonly resettable: boolean;
	readonly economic: boolean;
}

const GITHUB_PAGES_BASE_URL = 'https://dhenz14.github.io/norse-mythos-card-game';

export const RAGNAROK_NETWORK_CONFIGS = {
	local: {
		stage: 'local',
		protocolId: 'ragnarok-cards-local',
		collectionId: 'ragnarok-local',
		adminAccount: 'ragnarok',
		genesisAccount: 'ragnarok-genesis',
		treasuryAccount: 'ragnarok-treasury',
		indexAccount: 'ragnarok-index',
		indexerUrl: '',
		artIndexerUrl: '',
		nftLoxProtocolId: 'nftlox_testnet',
		nftArtBaseUrl: GITHUB_PAGES_BASE_URL,
		externalUrlBase: GITHUB_PAGES_BASE_URL,
		resettable: true,
		economic: false,
	},
	testnet: {
		stage: 'testnet',
		protocolId: 'rk_game_testnet',
		collectionId: 'ragnarok-testnet',
		adminAccount: 'ragnarok-test',
		genesisAccount: 'ragnarok-test',
		treasuryAccount: 'ragnarok-test',
		indexAccount: 'ragnarok-test-index',
		indexerUrl: '',
		artIndexerUrl: '',
		nftLoxProtocolId: 'nftlox_testnet',
		nftArtBaseUrl: GITHUB_PAGES_BASE_URL,
		externalUrlBase: GITHUB_PAGES_BASE_URL,
		resettable: true,
		economic: false,
	},
	mainnet: {
		stage: 'mainnet',
		protocolId: 'ragnarok-cards',
		collectionId: 'ragnarok-alpha',
		adminAccount: 'ragnarok',
		genesisAccount: 'ragnarok-genesis',
		treasuryAccount: 'ragnarok-treasury',
		indexAccount: 'ragnarok-index',
		indexerUrl: '',
		artIndexerUrl: '',
		nftLoxProtocolId: 'nftlox',
		nftArtBaseUrl: GITHUB_PAGES_BASE_URL,
		externalUrlBase: GITHUB_PAGES_BASE_URL,
		resettable: false,
		economic: true,
	},
} satisfies Record<NetworkStage, RagnarokNetworkConfig>;

function overrideString(value: string | undefined, fallback: string): string {
	return value && value.trim().length > 0 ? value.trim() : fallback;
}

function resolveRagnarokNetworkConfig(): RagnarokNetworkConfig {
	const base = RAGNAROK_NETWORK_CONFIGS[getNetworkStage()];

	return {
		...base,
		protocolId: overrideString(import.meta.env.VITE_RAGNAROK_PROTOCOL_ID as string | undefined, base.protocolId),
		collectionId: overrideString(import.meta.env.VITE_RAGNAROK_COLLECTION_ID as string | undefined, base.collectionId),
		adminAccount: overrideString(import.meta.env.VITE_RAGNAROK_ADMIN_ACCOUNT as string | undefined, base.adminAccount),
		genesisAccount: overrideString(import.meta.env.VITE_RAGNAROK_GENESIS_ACCOUNT as string | undefined, base.genesisAccount),
		treasuryAccount: overrideString(import.meta.env.VITE_RAGNAROK_TREASURY_ACCOUNT as string | undefined, base.treasuryAccount),
		indexAccount: overrideString(import.meta.env.VITE_RAGNAROK_INDEX_ACCOUNT as string | undefined, base.indexAccount),
		indexerUrl: overrideString(import.meta.env.VITE_RAGNAROK_INDEXER_URL as string | undefined, base.indexerUrl),
		artIndexerUrl: overrideString(import.meta.env.VITE_RAGNAROK_ART_INDEXER_URL as string | undefined, base.artIndexerUrl),
		nftLoxProtocolId: overrideString(import.meta.env.VITE_NFTLOX_PROTOCOL_ID as string | undefined, base.nftLoxProtocolId),
		nftArtBaseUrl: overrideString(import.meta.env.VITE_NFT_ART_BASE_URL as string | undefined, base.nftArtBaseUrl),
		externalUrlBase: overrideString(import.meta.env.VITE_EXTERNAL_URL_BASE as string | undefined, base.externalUrlBase),
	};
}

export const RAGNAROK_NETWORK_CONFIG = Object.freeze(resolveRagnarokNetworkConfig());

export function getRagnarokNetworkConfig(): RagnarokNetworkConfig {
	return RAGNAROK_NETWORK_CONFIG;
}

export function getRagnarokProtocolId(): string {
	return RAGNAROK_NETWORK_CONFIG.protocolId;
}

export function getRagnarokCollectionId(): string {
	return RAGNAROK_NETWORK_CONFIG.collectionId;
}
