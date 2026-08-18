/**
 * Combat hero HP account.
 *
 * Ethereum-style: one balance, integer transitions, no parallel ledger.
 * The P2P commitment is the existing phase-boundary state root, which
 * already binds current / max / committed. Do not add a second HP hash.
 *
 * Chess `piece.health` is the same account persisted at the phase handoff.
 * During poker this module is the only writer that new HP mutations should use.
 */

export type CombatHpAccount = {
	readonly current: number;
	readonly max: number;
	readonly committed: number;
};

export type CombatHpTransition = {
	readonly before: CombatHpAccount;
	readonly after: CombatHpAccount;
	readonly applied: number;
};

function asInt(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.trunc(value);
}

function clampCurrent(current: number, max: number): number {
	if (current < 0) return 0;
	if (current > max) return max;
	return current;
}

export function readCombatHp(account: CombatHpAccount): CombatHpAccount {
	const max = Math.max(0, asInt(account.max));
	return {
		current: clampCurrent(asInt(account.current), max),
		max,
		committed: Math.max(0, asInt(account.committed)),
	};
}

export function applyCombatHpDelta(account: CombatHpAccount, delta: number): CombatHpTransition {
	const before = readCombatHp(account);
	const after = readCombatHp({
		...before,
		current: before.current + asInt(delta),
	});
	return {
		before,
		after,
		applied: after.current - before.current,
	};
}

export function setCombatHpCurrent(account: CombatHpAccount, current: number): CombatHpTransition {
	const before = readCombatHp(account);
	return applyCombatHpDelta(before, asInt(current) - before.current);
}

export function commitCombatHp(account: CombatHpAccount, amount: number): CombatHpTransition {
	const before = readCombatHp(account);
	const committed = Math.min(before.current, Math.max(0, asInt(amount)));
	const after = readCombatHp({
		current: before.current - committed,
		max: before.max,
		committed: before.committed + committed,
	});
	return {
		before,
		after,
		applied: after.current - before.current,
	};
}

export function uncommitCombatHp(account: CombatHpAccount, amount: number): CombatHpTransition {
	const before = readCombatHp(account);
	const released = Math.min(before.committed, Math.max(0, asInt(amount)));
	const after = readCombatHp({
		current: before.current + released,
		max: before.max,
		committed: before.committed - released,
	});
	return {
		before,
		after,
		applied: after.current - before.current,
	};
}

export function settleCombatHp(account: CombatHpAccount, current: number): CombatHpTransition {
	const before = readCombatHp(account);
	const after = readCombatHp({
		current: asInt(current),
		max: before.max,
		committed: 0,
	});
	return {
		before,
		after,
		applied: after.current - before.current,
	};
}

export function growCombatHpMax(account: CombatHpAccount, amount: number): CombatHpTransition {
	const before = readCombatHp(account);
	const add = Math.max(0, asInt(amount));
	const after = readCombatHp({
		current: before.current + add,
		max: before.max + add,
		committed: before.committed,
	});
	return {
		before,
		after,
		applied: after.current - before.current,
	};
}
