/** Absolute gameplay limits shared by client validation and replay adapters. */
export const MAX_BATTLEFIELD = 5 as const;
export const MAX_HAND = 6 as const;
export const MAX_MANA = 10 as const;
export const MAX_ARMOR = 30 as const;

export type ResourceInvariantSnapshot = Readonly<{
	 battlefieldCount: number;
	 handCount: number;
	 manaCurrent: number;
	 manaMax: number;
	 armor: number;
	 currentHealth: number;
	 maxHealth: number;
	 currentStamina?: number;
	 maxStamina?: number;
}>;

/** Resource subset carried by each side of the universal Poker combat state. */
export type PokerResourceInvariantSnapshot = Readonly<{
	 manaCurrent: number;
	 manaMax: number;
	 armor: number;
	 currentHealth: number;
	 maxHealth: number;
	 currentStamina: number;
	 maxStamina: number;
}>;

export type ResourceInvariantViolation = Readonly<{
	code:
		| 'battlefield_overflow'
		| 'hand_overflow'
		| 'mana_invalid'
		| 'armor_invalid'
		| 'health_invalid'
		| 'stamina_invalid';
	value: number;
	maximum?: number;
}>;

export function validateResourceInvariants(
	input: ResourceInvariantSnapshot,
): ResourceInvariantViolation | null {
	return validateBattlefieldCount(input.battlefieldCount)
		?? validateHandCount(input.handCount)
		?? validateMana(input.manaCurrent, input.manaMax)
		?? validateArmor(input.armor)
		?? validateHealth(input.currentHealth, input.maxHealth)
		?? validateStamina(input.currentStamina, input.maxStamina);
}

export function validatePokerResourceInvariants(
	input: PokerResourceInvariantSnapshot,
): ResourceInvariantViolation | null {
	return validateResourceInvariants({
		battlefieldCount: 0,
		handCount: 0,
		...input,
	});
}

function isNonNegativeInteger(value: number): boolean {
	return Number.isInteger(value) && value >= 0;
}

function validateBattlefieldCount(value: number): ResourceInvariantViolation | null {
	return !isNonNegativeInteger(value) || value > MAX_BATTLEFIELD
		? { code: 'battlefield_overflow', value, maximum: MAX_BATTLEFIELD }
		: null;
}

function validateHandCount(value: number): ResourceInvariantViolation | null {
	return !isNonNegativeInteger(value) || value > MAX_HAND
		? { code: 'hand_overflow', value, maximum: MAX_HAND }
		: null;
}

function validateMana(current: number, maximum: number): ResourceInvariantViolation | null {
	return !isNonNegativeInteger(current)
		|| !isNonNegativeInteger(maximum)
		|| current > maximum
		|| maximum > MAX_MANA
		? { code: 'mana_invalid', value: current, maximum: MAX_MANA }
		: null;
}

function validateArmor(value: number): ResourceInvariantViolation | null {
	return !isNonNegativeInteger(value) || value > MAX_ARMOR
		? { code: 'armor_invalid', value, maximum: MAX_ARMOR }
		: null;
}

function validateHealth(current: number, maximum: number): ResourceInvariantViolation | null {
	return !isNonNegativeInteger(maximum)
		|| !isNonNegativeInteger(current)
		|| current > maximum
		? { code: 'health_invalid', value: current, maximum }
		: null;
}

function validateStamina(current: number | undefined, maximum: number | undefined): ResourceInvariantViolation | null {
	if (current === undefined && maximum === undefined) return null;
	return current === undefined
		|| maximum === undefined
		|| !isNonNegativeInteger(current)
		|| !isNonNegativeInteger(maximum)
		|| current > maximum
		? { code: 'stamina_invalid', value: current ?? Number.NaN, maximum }
		: null;
}
