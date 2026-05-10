import {
	PACK_SIZES,
	getRuneExchangePackQuote,
	type RuneExchangeAdapter,
	type RuneExchangeFulfillment,
} from '../../../../shared/protocol-core/types';
import { sha256Hash } from '../../../../shared/protocol-core/hash';
import { getPack, getPackSupply, putPack, putPackSupply } from './replayDB';

const getQuote: RuneExchangeAdapter['getQuote'] = getRuneExchangePackQuote;

async function fulfill(input: RuneExchangeFulfillment): Promise<void> {
	let createdCount = 0;
	let fulfilledCount = 0;

	for (let i = 0; i < input.quantity; i++) {
		const uid = `pack_${input.trxId}:rune:${i}`;
		if (await getPack(uid)) {
			fulfilledCount++;
			continue;
		}

		await putPack({
			uid,
			packType: input.packType,
			dna: await sha256Hash(`${input.trxId}:rune:${i}:${input.packType}`),
			owner: input.account,
			sealed: true,
			mintTrxId: input.trxId,
			mintBlockNum: input.blockNum,
			lastTransferBlock: input.blockNum,
			cardCount: PACK_SIZES[input.packType] ?? 0,
			edition: 'alpha',
		});
		createdCount++;
		fulfilledCount++;
	}

	const supply = await getPackSupply(input.packType);
	const quote = getQuote({ packType: input.packType, quantity: input.quantity });
	const cap = quote?.globalPackCap ?? supply?.cap ?? 0;
	await putPackSupply({
		packType: input.packType,
		minted: Math.max((supply?.minted ?? 0) + createdCount, fulfilledCount),
		burned: supply?.burned ?? 0,
		cap,
	});
}

export const clientRuneExchangeAdapter: RuneExchangeAdapter = {
	getQuote,
	async getGlobalMinted(input) {
		return (await getPackSupply(input.packType))?.minted ?? 0;
	},
	fulfill,
};
