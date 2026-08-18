let projectionLock = false;

export function isPokerHeroHpProjectionLocked(): boolean {
	return projectionLock;
}

export function withPokerHeroHpProjectionLock<T>(fn: () => T): T {
	projectionLock = true;
	try {
		return fn();
	} finally {
		projectionLock = false;
	}
}
