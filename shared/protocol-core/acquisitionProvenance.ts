export type DuatAcquisitionProvenance = {
	readonly source: 'duat_airdrop';
	readonly account: string;
	readonly claimTrxId: string;
	readonly claimBlockNum: number;
	readonly packsEarned: number;
	readonly packUid?: string;
	readonly packIndex?: number;
	readonly burnTrxId?: string;
	readonly burnBlockNum?: number;
};

export type AcquisitionProvenance = DuatAcquisitionProvenance;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function isDuatAcquisitionProvenance(value: unknown): value is DuatAcquisitionProvenance {
	if (!isRecord(value)) return false;
	if (value.source !== 'duat_airdrop') return false;
	return typeof value.account === 'string'
		&& value.account.length > 0
		&& typeof value.claimTrxId === 'string'
		&& value.claimTrxId.length > 0
		&& typeof value.claimBlockNum === 'number'
		&& Number.isInteger(value.claimBlockNum)
		&& value.claimBlockNum >= 0
		&& typeof value.packsEarned === 'number'
		&& Number.isInteger(value.packsEarned)
		&& value.packsEarned > 0
		&& (value.packUid === undefined || typeof value.packUid === 'string')
		&& (value.packIndex === undefined || (typeof value.packIndex === 'number' && Number.isInteger(value.packIndex) && value.packIndex >= 0))
		&& (value.burnTrxId === undefined || typeof value.burnTrxId === 'string')
		&& (value.burnBlockNum === undefined || (typeof value.burnBlockNum === 'number' && Number.isInteger(value.burnBlockNum) && value.burnBlockNum >= 0));
}

export function createDuatPackAcquisition(input: {
	readonly account: string;
	readonly claimTrxId: string;
	readonly claimBlockNum: number;
	readonly packsEarned: number;
	readonly packUid: string;
	readonly packIndex: number;
}): DuatAcquisitionProvenance {
	return {
		source: 'duat_airdrop',
		account: input.account,
		claimTrxId: input.claimTrxId,
		claimBlockNum: input.claimBlockNum,
		packsEarned: input.packsEarned,
		packUid: input.packUid,
		packIndex: input.packIndex,
	};
}

export function createDuatCardAcquisition(input: {
	readonly packAcquisition: unknown;
	readonly fallbackPackUid: string;
	readonly burnTrxId: string;
	readonly burnBlockNum: number;
}): DuatAcquisitionProvenance | undefined {
	if (!isDuatAcquisitionProvenance(input.packAcquisition)) return undefined;
	return {
		...input.packAcquisition,
		packUid: input.packAcquisition.packUid ?? input.fallbackPackUid,
		burnTrxId: input.burnTrxId,
		burnBlockNum: input.burnBlockNum,
	};
}
