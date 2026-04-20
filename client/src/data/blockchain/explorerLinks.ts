import { HIVE_EXPLORER_URL, HIVE_BLOCK_EXPLORER_URL } from './hiveConfig';
import type { ProvenanceStamp, OfficialMint } from '../schemas/HiveTypes';

export function getTransactionUrl(trxId: string): string {
	return `${HIVE_EXPLORER_URL}${trxId}`;
}

export function getBlockUrl(blockNum: number): string {
	return `${HIVE_BLOCK_EXPLORER_URL}${blockNum}`;
}

export function buildStampWithUrls(
	from: string,
	to: string,
	trxId: string,
	block: number,
	timestamp?: number,
	signer?: string,
): ProvenanceStamp {
	return {
		from, to, trxId, block, timestamp, signer,
		txUrl: getTransactionUrl(trxId),
		blockUrl: getBlockUrl(block),
	};
}

export function buildOfficialMint(
	signer: string,
	trxId: string,
	blockNum: number,
	timestamp: number,
): OfficialMint {
	return {
		signer, trxId, blockNum, timestamp,
		txUrl: getTransactionUrl(trxId),
		blockUrl: getBlockUrl(blockNum),
	};
}
