export function collectMountedMulliganCardTargets<T>(
	cardIds: readonly string[],
	refs: Readonly<Record<string, T | null | undefined>>,
): T[] {
	return cardIds
		.map(cardId => refs[cardId])
		.filter((target): target is T => target != null);
}
