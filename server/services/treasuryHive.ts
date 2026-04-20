import { createHash } from 'crypto';

const HIVE_NODES = [
	'https://api.hive.blog',
	'https://api.deathwing.me',
	'https://api.openhive.network',
];
const FETCH_TIMEOUT = 8000;
const HIVE_CHAIN_ID = 'beeab0de00000000000000000000000000000000000000000000000000000000';

export function computeThreshold(signerCount: number, txType: 'transfer' | 'authority_update' = 'transfer'): number {
	const ratio = txType === 'authority_update' ? 0.8 : 0.6;
	return Math.max(1, Math.ceil(signerCount * ratio));
}

export function authorityMatchesSigners(
	onChainAccountAuths: [string, number][],
	onChainThreshold: number,
	expectedSigners: string[],
	expectedThreshold: number
): boolean {
	if (onChainThreshold !== expectedThreshold) return false;
	const onChainUsers = onChainAccountAuths.map(([u]) => u).sort();
	const expected = [...expectedSigners].sort();
	if (onChainUsers.length !== expected.length) return false;
	return onChainUsers.every((u, i) => u === expected[i]);
}

export function buildAuthorityUpdatePayload(
	account: string,
	signerUsernames: string[],
	threshold: number,
	memoKey: string,
	jsonMetadata: string
): any[] {
	const accountAuths = signerUsernames.sort().map(u => [u, 1]);
	return [['account_update', {
		account,
		active: { weight_threshold: threshold, account_auths: accountAuths, key_auths: [] },
		posting: { weight_threshold: threshold, account_auths: accountAuths, key_auths: [] },
		memo_key: memoKey,
		json_metadata: jsonMetadata,
	}]];
}

export function buildTransferPayload(from: string, to: string, amount: string, memo: string): any[] {
	return [['transfer', { from, to, amount, memo }]];
}

async function hiveFetch(body: any): Promise<any> {
	let lastErr: Error = new Error('No nodes');
	for (const node of HIVE_NODES) {
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
		try {
			const res = await fetch(node, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				signal: ctrl.signal,
			});
			const data = await res.json();
			clearTimeout(timer);
			return data;
		} catch (err) {
			lastErr = err instanceof Error ? err : new Error(String(err));
		} finally {
			clearTimeout(timer);
		}
	}
	throw lastErr;
}

export async function getAccountAuthority(account: string): Promise<{
	active: { weight_threshold: number; account_auths: [string, number][]; key_auths: [string, number][] };
	posting: { weight_threshold: number; account_auths: [string, number][]; key_auths: [string, number][] };
	memo_key: string;
	json_metadata: string;
} | null> {
	const data = await hiveFetch({
		jsonrpc: '2.0', method: 'condenser_api.get_accounts', params: [[account]], id: 1,
	});
	const acc = data.result?.[0];
	if (!acc) return null;
	return {
		active: acc.active,
		posting: acc.posting,
		memo_key: acc.memo_key,
		json_metadata: acc.json_metadata || '{}',
	};
}

export async function getWitnessRank(username: string): Promise<number | null> {
	const data = await hiveFetch({
		jsonrpc: '2.0', method: 'condenser_api.get_witnesses_by_vote', params: ['', 200], id: 1,
	});
	const witnesses = data.result || [];
	const idx = witnesses.findIndex((w: any) => w.owner === username);
	return idx >= 0 ? idx + 1 : null;
}

export async function isTopWitness(username: string, maxRank = 150): Promise<boolean> {
	const rank = await getWitnessRank(username);
	return rank !== null && rank <= maxRank;
}

export async function getTreasuryBalance(account: string): Promise<string> {
	const data = await hiveFetch({
		jsonrpc: '2.0', method: 'condenser_api.get_accounts', params: [[account]], id: 1,
	});
	const acc = data.result?.[0];
	return acc?.hbd_balance || '0.000 HBD';
}

export async function getDynamicGlobalProperties(): Promise<{
	head_block_number: number;
	head_block_id: string;
	time: string;
}> {
	const data = await hiveFetch({
		jsonrpc: '2.0', method: 'condenser_api.get_dynamic_global_properties', params: [], id: 1,
	});
	return data.result;
}

export async function buildUnsignedTransaction(operations: any[]): Promise<{
	tx: any;
	digestHex: string;
}> {
	const props = await getDynamicGlobalProperties();
	const refBlockNum = props.head_block_number & 0xFFFF;
	const refBlockPrefix = Buffer.from(props.head_block_id, 'hex').readUInt32LE(4);
	const expiration = new Date(new Date(props.time + 'Z').getTime() + 50_000).toISOString().slice(0, -5);

	const tx = {
		ref_block_num: refBlockNum,
		ref_block_prefix: refBlockPrefix,
		expiration,
		operations,
		extensions: [],
	};

	const serialized = JSON.stringify([tx, HIVE_CHAIN_ID]);
	const digestHex = createHash('sha256').update(serialized).digest('hex');
	return { tx, digestHex };
}

export async function broadcastSignedTransaction(signedTx: any): Promise<{ id: string; block_num: number }> {
	const data = await hiveFetch({
		jsonrpc: '2.0',
		method: 'condenser_api.broadcast_transaction_synchronous',
		params: [signedTx],
		id: 1,
	});
	if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
	return { id: data.result?.id || '', block_num: data.result?.block_num || 0 };
}
