import type { WarbandRelationStatus } from '../../shared/warbandRelations';

export type { WarbandRelationStatus };

const acceptedPairs = new Set<string>();

function normalizeAccount(account: string): string {
	return account.toLowerCase().replace(/^@/, '');
}

function pairKey(a: string, b: string): string {
	const left = normalizeAccount(a);
	const right = normalizeAccount(b);
	return left < right ? `${left}:${right}` : `${right}:${left}`;
}

export function hasAcceptedWarbandRelation(a: string, b: string): boolean {
	return acceptedPairs.has(pairKey(a, b));
}

export function setAcceptedWarbandRelationForTest(a: string, b: string): void {
	acceptedPairs.add(pairKey(a, b));
}

export function clearAcceptedWarbandRelationsForTest(): void {
	acceptedPairs.clear();
}
