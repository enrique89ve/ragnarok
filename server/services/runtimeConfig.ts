import {
	resolveRagnarokRuntimeConfig,
	type RagnarokRuntimeConfig,
	type RagnarokRuntimeEnv,
} from '../../shared/runtimeConfig';

function getServerRuntimeEnv(): RagnarokRuntimeEnv {
	return {
		VITE_NETWORK_STAGE: process.env.VITE_NETWORK_STAGE,
		VITE_RAGNAROK_PROTOCOL_ID: process.env.VITE_RAGNAROK_PROTOCOL_ID,
		VITE_RAGNAROK_COLLECTION_ID: process.env.VITE_RAGNAROK_COLLECTION_ID,
		VITE_RAGNAROK_ADMIN_ACCOUNT: process.env.VITE_RAGNAROK_ADMIN_ACCOUNT,
		VITE_RAGNAROK_GENESIS_ACCOUNT: process.env.VITE_RAGNAROK_GENESIS_ACCOUNT,
		VITE_RAGNAROK_TREASURY_ACCOUNT: process.env.VITE_RAGNAROK_TREASURY_ACCOUNT,
		VITE_RAGNAROK_INDEX_ACCOUNT: process.env.VITE_RAGNAROK_INDEX_ACCOUNT,
		VITE_RAGNAROK_INDEXER_URL: process.env.VITE_RAGNAROK_INDEXER_URL,
		VITE_RAGNAROK_ART_INDEXER_URL: process.env.VITE_RAGNAROK_ART_INDEXER_URL,
		VITE_NFTLOX_PROTOCOL_ID: process.env.VITE_NFTLOX_PROTOCOL_ID,
		VITE_NFT_ART_BASE_URL: process.env.VITE_NFT_ART_BASE_URL,
		VITE_EXTERNAL_URL_BASE: process.env.VITE_EXTERNAL_URL_BASE,
		RAGNAROK_PROTOCOL_ID: process.env.RAGNAROK_PROTOCOL_ID,
	};
}

export function getRagnarokServerRuntimeConfig(): RagnarokRuntimeConfig {
	return Object.freeze(resolveRagnarokRuntimeConfig(getServerRuntimeEnv()));
}
