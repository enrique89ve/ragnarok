import type { CardAsset, ForgeCommitRecord, OpResult, SupplyRecord } from './types';
import type { EitrLedgerEntry } from './eitrEconomy';

type ForgeLedgerMovement = Omit<EitrLedgerEntry, 'balanceBefore' | 'balanceAfter'>;

export type ForgeMutation =
	| { kind: 'open' | 'refund'; commit: ForgeCommitRecord; movement: ForgeLedgerMovement }
	| { kind: 'mint'; commit: ForgeCommitRecord; card: CardAsset; supply: readonly [SupplyRecord, SupplyRecord] };

type SupplyCount = Pick<SupplyRecord, 'cap' | 'minted'>;

type ForgeSnapshot = {
	readonly commit?: ForgeCommitRecord;
	readonly balance?: number;
	readonly movementExists?: boolean;
	readonly cardExists?: boolean;
	readonly supply?: readonly [SupplyCount | undefined, SupplyCount | undefined];
};

type ForgeWriteDecision =
	| { status: 'applied'; entry: EitrLedgerEntry | null }
	| Exclude<OpResult, { status: 'applied' }>;

/** Recheck the write against the data held by the adapter's write transaction. */
export function prepareForgeWrite(mutation: ForgeMutation, snapshot: ForgeSnapshot): ForgeWriteDecision {
	if (mutation.kind === 'open' ? snapshot.commit : snapshot.commit?.revealed) {
		return { status: 'ignored' };
	}
	if (mutation.kind !== 'open' && !snapshot.commit) {
		return { status: 'rejected', reason: 'no matching forge_commit' };
	}
	if (mutation.kind === 'mint') {
		if (snapshot.cardExists || !snapshot.supply || !mutation.supply.every((next, i) => {
			const current = snapshot.supply?.[i];
			return (i !== 0 || current !== undefined)
				&& (current?.cap ?? next.cap) === next.cap
				&& (current?.minted ?? 0) + 1 === next.minted
				&& next.minted <= next.cap;
		})) {
			throw new Error('Forge inventory changed before settlement');
		}
		return { status: 'applied', entry: null };
	}
	if (snapshot.movementExists) {
		throw new Error('Forge ledger movement exists without its matching commitment state');
	}
	if (snapshot.balance === undefined) throw new Error('Forge balance was not loaded');
	const balanceAfter = snapshot.balance + (mutation.kind === 'open' ? -mutation.movement.amount : mutation.movement.amount);
	if (balanceAfter < 0) return { status: 'rejected', reason: 'insufficient Eitr' };
	return {
		status: 'applied',
		entry: { ...mutation.movement, balanceBefore: snapshot.balance, balanceAfter },
	};
}
