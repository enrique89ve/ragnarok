import { getRagnarokNetworkConfig } from '../../game/config/networkConfig';

const networkConfig = getRagnarokNetworkConfig();

export const HIVE_NODES = [
	'https://api.hive.blog',
	'https://api.deathwing.me',
	'https://api.openhive.network',
] as const;

export const RAGNAROK_ACCOUNT = networkConfig.adminAccount;
export const RAGNAROK_GENESIS_ACCOUNT = networkConfig.genesisAccount;
export const RAGNAROK_TREASURY_ACCOUNT = networkConfig.treasuryAccount;
export const RAGNAROK_INDEX_ACCOUNT = networkConfig.indexAccount;

// NFTLox integration — NFT birth layer for card minting/packs
export const NFTLOX_PROTOCOL_ID = networkConfig.nftLoxProtocolId;
export const NFTLOX_PROTOCOL_VERSION = '0.4.0';
export const NFTLOX_COLLECTION_SYMBOL = 'RGNRK';
export const NFTLOX_MAX_OPS_PER_TX = 5;
export const NFTLOX_MAX_JSON_SIZE = 8000; // bytes per custom_json
export const NFTLOX_SAFE_PAYLOAD_MAX = 7372; // 90% of 8192 (safety margin)
export const NFTLOX_MAX_BULK_ITEMS = 50; // max distinct seeds per bulk_distribute
export const NFTLOX_MAX_DROP_TABLE = 50; // max entries in pack drop table

// On-chain NFT metadata URLs (ERC-1155 standard for blockchain explorers/marketplaces).
// NOT used for in-game art rendering — all runtime art loads via assetPath() from local files.
// Players download all art; each player is their own CDN. No centralized servers.
// Points to GitHub Pages deployment — permanent, decentralized hosting.
export const NFT_ART_BASE_URL = networkConfig.nftArtBaseUrl;

export const EXTERNAL_URL_BASE = networkConfig.externalUrlBase;

export const HIVE_EXPLORER_URL = 'https://hivehub.dev/tx/';
export const HIVE_BLOCK_EXPLORER_URL = 'https://hivehub.dev/b/';

export const DEFAULT_ELO_RATING = 1000;

// Edition boundary: cards minted before this Hive block number are 'alpha', after are 'beta'.
// Set to a future block; update before beta launch.
export const ALPHA_EDITION_CUTOFF_BLOCK = 100_000_000;
