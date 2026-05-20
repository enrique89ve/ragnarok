/**
 * genesisAdmin.ts - Admin tools for initializing the Ragnarok NFT system on Hive
 *
 * Usage (from browser console after Keychain login as the configured admin):
 *   import { broadcastGenesis, broadcastSeal, broadcastMint } from '@/data/blockchain/genesisAdmin';
 *   await broadcastGenesis();   // Initialize supply caps (one-time, irreversible)
 *   await broadcastSeal();      // Permanently lock direct minting
 *
 * Ceremony ops use v1 canonical format: custom_json id="ragnarok-cards"
 * with { p: "ragnarok-cards", action: "genesis"|"mint_batch"|"seal" }.
 * Browser admin approval is signed with Active authority, then the server
 * broadcasts with the configured operator Active key.
 */

import { hiveSync } from '../HiveSync';
import type { HiveBroadcastResult } from '../HiveSync';
import {
	RAGNAROK_ACCOUNT,
	RAGNAROK_GENESIS_ACCOUNT,
} from './hiveConfig';
import { ragnarokAdminAdapter } from './adminAdapters';
import { RAGNAROK_APP_ID } from '../schemas/HiveTypes';
import { getRagnarokCollectionId } from '../../game/config/networkConfig';
import { debug } from '../../game/config/debugConfig';

/** Per-card supply caps — each unique card_id can have at most this many NFTs */
const SUPPLY_CAPS: Record<string, number> = {
	common:    2_000,
	rare:      1_000,
	epic:        500,
	mythic:      250,
};

const GENESIS_SIGNERS = [RAGNAROK_ACCOUNT, RAGNAROK_GENESIS_ACCOUNT];

function requireGenesisSigner(): HiveBroadcastResult | null {
	const username = hiveSync.getUsername();
	if (!username) {
		return { success: false, error: 'Not logged in. Connect a Hive wallet first.' };
	}
	if (!GENESIS_SIGNERS.includes(username)) {
		return { success: false, error: `Must be logged in as a genesis signer, currently @${username}` };
	}
	return null;
}

export async function broadcastGenesis(): Promise<HiveBroadcastResult> {
	let readerHash = '';
	try {
		const wasmBinary = await fetch(import.meta.env.BASE_URL + 'engine.wasm').then(r => r.arrayBuffer());
		const hashBuffer = await crypto.subtle.digest('SHA-256', wasmBinary);
		readerHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
	} catch (err) {
		debug.warn('[genesisAdmin] Could not hash WASM binary:', err);
	}

	return ragnarokAdminAdapter.broadcast('genesis', {
		version: 1,
		collection: getRagnarokCollectionId(),
		engine_hash: readerHash,
		supply: {
			pack_supply: SUPPLY_CAPS,
			reward_supply: { common: 0, rare: 0, epic: 150, mythic: 50 },
		},
	});
}

export async function broadcastSeal(): Promise<HiveBroadcastResult> {
	return ragnarokAdminAdapter.broadcast('seal', {
		version: 1,
	});
}

export async function broadcastMint(params: {
	to: string;
	cards: Array<{
		nft_id: string;
		card_id: number;
		rarity: string;
		name?: string;
		type?: string;
		race?: string;
		image?: string;
		foil?: string;
	}>;
}): Promise<HiveBroadcastResult> {
	if (!params.to || !params.cards?.length) {
		return { success: false, error: 'to and cards[] are required' };
	}

	return ragnarokAdminAdapter.broadcast('mint_batch', {
		to: params.to,
		cards: params.cards,
	});
}

export async function broadcastPackMint(params: {
	packType: string;
	quantity: number;
	to: string;
}): Promise<HiveBroadcastResult> {
	return ragnarokAdminAdapter.broadcast('pack_mint', {
		pack_type: params.packType,
		quantity: params.quantity,
		to: params.to,
	});
}

export async function broadcastPackDistribute(_params: {
	packUids: string[];
	to: string;
}): Promise<HiveBroadcastResult> {
	return {
		success: false,
		error: 'Pack distribution is disabled until the admin route can bundle the required atomic HIVE transfer.',
	};
}

export interface UnsignedGenesisTx {
	customJsonId: string;
	payload: Record<string, unknown>;
	txDigest: string;
}

export async function buildUnsignedGenesisTx(): Promise<UnsignedGenesisTx> {
	const err = requireGenesisSigner();
	if (err) throw new Error(err.error);

	let readerHash = '';
	try {
		const wasmBinary = await fetch(import.meta.env.BASE_URL + 'engine.wasm').then(r => r.arrayBuffer());
		const hashBuffer = await crypto.subtle.digest('SHA-256', wasmBinary);
		readerHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
	} catch {
		// WASM hash optional for unsigned tx building
	}

	const payload: Record<string, unknown> = {
		p: RAGNAROK_APP_ID,
		action: 'genesis',
		version: 1,
		collection: getRagnarokCollectionId(),
		engine_hash: readerHash,
		supply: {
			pack_supply: SUPPLY_CAPS,
			reward_supply: { common: 0, rare: 0, epic: 150, mythic: 50 },
		},
	};

	const payloadStr = JSON.stringify(payload);
	const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payloadStr));
	const txDigest = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

	return { customJsonId: RAGNAROK_APP_ID, payload, txDigest };
}

export async function buildUnsignedSealTx(): Promise<UnsignedGenesisTx> {
	const err = requireGenesisSigner();
	if (err) throw new Error(err.error);

	const payload: Record<string, unknown> = {
		p: RAGNAROK_APP_ID,
		action: 'seal',
		version: 1,
	};
	const payloadStr = JSON.stringify(payload);
	const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payloadStr));
	const txDigest = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

	return { customJsonId: RAGNAROK_APP_ID, payload, txDigest };
}

export async function buildAuthorityBrickTx(account: string): Promise<{ operations: unknown[] }> {
	const err = requireGenesisSigner();
	if (err) throw new Error(err.error);

	return {
		operations: [['account_update', {
			account,
			owner: { weight_threshold: 255, account_auths: [], key_auths: [] },
			active: { weight_threshold: 255, account_auths: [], key_auths: [] },
			posting: { weight_threshold: 255, account_auths: [], key_auths: [] },
			memo_key: 'STM1111111111111111111111111111111114T1Anm',
			json_metadata: '{}',
		}]],
	};
}

export { SUPPLY_CAPS, GENESIS_SIGNERS };
