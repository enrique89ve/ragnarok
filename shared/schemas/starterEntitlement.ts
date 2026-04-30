/**
 * Canonical off-chain starter entitlement.
 *
 * These are the fixed card IDs every account owns without Hive L1 NFT identity.
 * The set is intentionally explicit: cards outside this list must not be
 * accepted as owned starter assets in Hive mode just because they carry
 * `category: 'starter'`.
 */

export const STARTER_ENTITLEMENT_CARD_IDS_BY_CLASS = {
	Mage: [100, 101, 102, 103, 104, 105, 106, 107, 108, 109],
	Warrior: [110, 111, 112, 113, 114, 115, 116, 117, 118, 119],
	Priest: [120, 121, 122, 123, 124, 125, 126, 127, 128, 129],
	Rogue: [130, 131, 132, 133, 134, 135, 136, 137, 138, 139],
	Neutral: [140, 141, 142, 143, 144],
} as const satisfies Record<string, readonly number[]>;

export const STARTER_ENTITLEMENT_CARD_IDS = Object.freeze(
	Object.values(STARTER_ENTITLEMENT_CARD_IDS_BY_CLASS).flat(),
);

const STARTER_ENTITLEMENT_CARD_ID_SET = new Set<number>(STARTER_ENTITLEMENT_CARD_IDS);

export function isStarterEntitlementCardId(cardId: number | undefined): boolean {
	return typeof cardId === 'number' && STARTER_ENTITLEMENT_CARD_ID_SET.has(cardId);
}
