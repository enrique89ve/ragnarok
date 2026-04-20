/**
 * genesisAdmin.ts - Admin tools for initializing the Ragnarok NFT system on Hive
 *
 * Usage (from browser console after Keychain login as @ragnarok):
 *   import { broadcastGenesis, broadcastSeal, broadcastMint } from '@/data/blockchain/genesisAdmin';
 *   await broadcastGenesis();   // Initialize supply caps (one-time, irreversible)
 *   await broadcastSeal();      // Permanently lock direct minting
 *
 * Ceremony ops use v1 canonical format: custom_json id="ragnarok-cards"
 * with { p: "ragnarok-cards", action: "genesis"|"mint_batch"|"seal" }.
 * Unsigned tx builders produce the same canonical payloads for multisig signing.
 * Only the @ragnarok account (2-of-3 multisig) can execute these.
 */

import { hiveSync } from '../HiveSync';
import type { HiveBroadcastResult } from '../HiveSync';
import { RAGNAROK_ACCOUNT, RAGNAROK_GENESIS_ACCOUNT } from './hiveConfig';

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
		return { success: false, error: 'Not logged in. Call hiveSync.login() first.' };
	}
	if (!GENESIS_SIGNERS.includes(username)) {
		return { success: false, error: `Must be logged in as a genesis signer, currently @${username}` };
	}
	return null;
}

function requireAdmin(): HiveBroadcastResult | null {
	const username = hiveSync.getUsername();
	if (!username) {
		return { success: false, error: 'Not logged in. Call hiveSync.login() first.' };
	}
	if (username !== RAGNAROK_ACCOUNT) {
		return { success: false, error: `Must be logged in as @${RAGNAROK_ACCOUNT}, currently @${username}` };
	}
	return null;
}

export async function broadcastGenesis(): Promise<HiveBroadcastResult> {
	const err = requireAdmin();
	if (err) return err;

	let readerHash = '';
	try {
		const wasmBinary = await fetch(import.meta.env.BASE_URL + 'engine.wasm').then(r => r.arrayBuffer());
		const hashBuffer = await crypto.subtle.digest('SHA-256', wasmBinary);
		readerHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
	} catch (err) {
		console.warn('[genesisAdmin] Could not hash WASM binary:', err);
	}

	return hiveSync.broadcastCustomJson('ragnarok-cards', {
		p: 'ragnarok-cards',
		action: 'genesis',
		version: 1,
		collection: 'ragnarok-alpha',
		engine_hash: readerHash,
		supply: {
			pack_supply: SUPPLY_CAPS,
			reward_supply: { common: 0, rare: 0, epic: 150, mythic: 50 },
		},
	});
}

export async function broadcastSeal(): Promise<HiveBroadcastResult> {
	const err = requireAdmin();
	if (err) return err;

	return hiveSync.broadcastCustomJson('ragnarok-cards', {
		p: 'ragnarok-cards',
		action: 'seal',
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
	const err = requireAdmin();
	if (err) return err;

	if (!params.to || !params.cards?.length) {
		return { success: false, error: 'to and cards[] are required' };
	}

	return hiveSync.broadcastCustomJson('ragnarok-cards', {
		p: 'ragnarok-cards',
		action: 'mint_batch',
		to: params.to,
		cards: params.cards,
	});
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
		p: 'ragnarok-cards',
		action: 'genesis',
		version: 1,
		collection: 'ragnarok-alpha',
		engine_hash: readerHash,
		supply: {
			pack_supply: SUPPLY_CAPS,
			reward_supply: { common: 0, rare: 0, epic: 150, mythic: 50 },
		},
	};

	const payloadStr = JSON.stringify(payload);
	const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payloadStr));
	const txDigest = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

	return { customJsonId: 'ragnarok-cards', payload, txDigest };
}

export async function buildUnsignedSealTx(): Promise<UnsignedGenesisTx> {
	const err = requireGenesisSigner();
	if (err) throw new Error(err.error);

	const payload: Record<string, unknown> = {
		p: 'ragnarok-cards',
		action: 'seal',
		version: 1,
	};
	const payloadStr = JSON.stringify(payload);
	const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payloadStr));
	const txDigest = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

	return { customJsonId: 'ragnarok-cards', payload, txDigest };
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
