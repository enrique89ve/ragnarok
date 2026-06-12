/**
 * Card family discriminator for the poker-combat arena.
 *
 * Three families exist on the poker board and must remain visually
 * and animationally distinct so a player can read the table at a glance:
 *   - 'poker'       : 52-card deck cards (PokerCard instances).
 *   - 'poker-spell' : bluff_rune, fate_peek, etc. (type === 'poker_spell').
 *   - 'nft'         : NFT minion cards, including wagerEffect bearers.
 *
 * The family is resolved at the render/VFX boundary rather than stamped
 * on `BaseCardData`, because the discriminator information is already
 * derivable from the card shape (PokerCard is a separate interface;
 * PokerSpellCard has `type: 'poker_spell'`; NFT minion has the
 * `wager` keyword or a `wagerEffect` block).
 *
 * This keeps `BaseCardData` clean and avoids touching 11 existing
 * CardFrame variants — the family axis is opt-in via the `cardFamily`
 * prop on <CardFrame>.
 */

export type CardFamily = 'poker' | 'poker-spell' | 'nft';

export const CARD_FAMILY_VALUES = ['poker', 'poker-spell', 'nft'] as const;

/**
 * Resolve the visual family of a card at the render/VFX boundary.
 *
 * Order matters: type-discriminator checks first (most specific), then
 * shape-based detection (PokerCard has no `type` field but has
 * `suit` + `value` strings), then keyword/effect detection, then
 * default to 'nft' for any minion-class card.
 */
export function resolveCardFamily(card: unknown): CardFamily {
	if (!card || typeof card !== 'object') return 'nft';
	const c = card as {
		type?: string;
		keywords?: string[];
		wagerEffect?: unknown;
	};

	if (c.type === 'poker_spell') return 'poker-spell';

	if (Array.isArray(c.keywords) && c.keywords.includes('wager')) return 'nft';
	if (c.wagerEffect) return 'nft';

	if (
		typeof (card as { suit?: unknown }).suit === 'string' &&
		typeof (card as { value?: unknown }).value === 'string'
	) {
		return 'poker';
	}

	return 'nft';
}
