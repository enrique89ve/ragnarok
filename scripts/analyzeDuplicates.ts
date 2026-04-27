#!/usr/bin/env npx tsx
/**
 * Classify duplicate-name cards into actionable buckets.
 *
 *   - TOKEN_VS_CARD  : one is collectible=false (token), other is collectible=true
 *                     → rename the token to "<Name> Token"
 *   - DUPLICATE_BUG  : same type/manaCost/attack/health/description (or close)
 *                     → delete one (prefer the higher-id legacy)
 *   - DISTINCT_CARDS : differ in stats/effects → user must pick: rename or delete
 *   - SUMMONED_TOKEN : the lower-id is a spell, the higher-id is its token
 *                     (linked via summonCardId) → rename the token
 *
 * Reads the cardRegistry runtime; outputs a JSON plan that downstream
 * scripts can apply (rename via renameCardsByIds, delete via removeCardsByIds).
 */

import * as fs from 'node:fs';
import { cardRegistry } from '../client/src/game/data/cardRegistry';

interface RawCard {
	readonly id: number | string;
	readonly name: string;
	readonly type: string;
	readonly manaCost?: number;
	readonly attack?: number;
	readonly health?: number;
	readonly description?: string;
	readonly rarity?: string;
	readonly collectible?: boolean;
	readonly class?: string;
	readonly heroClass?: string;
	readonly set?: string;
	readonly category?: string;
	readonly spellEffect?: { readonly summonCardId?: number };
}

type Verdict = 'TOKEN_VS_CARD' | 'DUPLICATE_BUG' | 'DISTINCT_CARDS' | 'SUMMONED_TOKEN';

interface DupGroup {
	readonly name: string;
	readonly cards: ReadonlyArray<RawCard>;
	readonly verdict: Verdict;
	readonly recommendation: string;
}

const groupByName = (cards: ReadonlyArray<RawCard>): Map<string, RawCard[]> => {
	const out = new Map<string, RawCard[]>();
	for (const c of cards) {
		if (!c.name) continue;
		const list = out.get(c.name) ?? [];
		list.push(c);
		out.set(c.name, list);
	}
	return out;
};

const sameStats = (a: RawCard, b: RawCard): boolean =>
	a.type === b.type
	&& a.manaCost === b.manaCost
	&& a.attack === b.attack
	&& a.health === b.health
	&& a.description === b.description;

const findSummonedTokenLink = (cards: ReadonlyArray<RawCard>): RawCard | null => {
	for (const c of cards) {
		const target = c.spellEffect?.summonCardId;
		if (typeof target !== 'number') continue;
		const linked = cards.find(x => x.id === target);
		if (linked && linked.collectible === false) return linked;
	}
	return null;
};

const classify = (name: string, cards: ReadonlyArray<RawCard>): DupGroup => {
	const tokens = cards.filter(c => c.collectible === false);
	const collectibles = cards.filter(c => c.collectible !== false);

	const linkedToken = findSummonedTokenLink(cards);
	if (linkedToken) {
		return {
			name,
			cards,
			verdict: 'SUMMONED_TOKEN',
			recommendation: `Rename token id=${linkedToken.id} to "${name} Token"`,
		};
	}

	if (tokens.length === 1 && collectibles.length === 1) {
		return {
			name,
			cards,
			verdict: 'TOKEN_VS_CARD',
			recommendation: `Rename token id=${tokens[0].id} to "${name} Token"`,
		};
	}

	if (cards.length === 2 && sameStats(cards[0], cards[1])) {
		const sorted = [...cards].sort((a, b) => Number(a.id) - Number(b.id));
		const keep = sorted[0];
		const drop = sorted[1];
		return {
			name,
			cards,
			verdict: 'DUPLICATE_BUG',
			recommendation: `Identical stats. Keep id=${keep.id}, delete id=${drop.id}`,
		};
	}

	return {
		name,
		cards,
		verdict: 'DISTINCT_CARDS',
		recommendation: 'Different cards sharing a name. Rename one or pick canonical.',
	};
};

const formatGroup = (g: DupGroup): string => {
	const lines = [`[${g.verdict}] ${g.name}`];
	lines.push(`  → ${g.recommendation}`);
	for (const c of g.cards) {
		const stats = c.type === 'minion'
			? `${c.manaCost ?? '?'} mana ${c.attack ?? '?'}/${c.health ?? '?'}`
			: c.type === 'spell' ? `${c.manaCost ?? '?'} mana spell`
			: c.type;
		const meta = `${c.collectible === false ? 'token' : 'card'} ${c.class ?? c.heroClass ?? ''} ${c.rarity ?? ''}`.trim();
		lines.push(`     id=${c.id}  ${stats}  (${meta})`);
		if (c.description) lines.push(`        "${c.description.slice(0, 100)}"`);
	}
	return lines.join('\n');
};

const main = (): void => {
	const cards = cardRegistry as unknown as RawCard[];
	const groups = groupByName(cards);

	const dupGroups: DupGroup[] = [];
	for (const [name, list] of groups) {
		if (list.length < 2) continue;
		dupGroups.push(classify(name, list));
	}

	const byVerdict: Record<Verdict, DupGroup[]> = {
		TOKEN_VS_CARD: [],
		DUPLICATE_BUG: [],
		DISTINCT_CARDS: [],
		SUMMONED_TOKEN: [],
	};
	for (const g of dupGroups) byVerdict[g.verdict].push(g);

	console.log(`Total duplicate-name groups: ${dupGroups.length}`);
	console.log(`  TOKEN_VS_CARD:  ${byVerdict.TOKEN_VS_CARD.length}  (rename token)`);
	console.log(`  DUPLICATE_BUG:  ${byVerdict.DUPLICATE_BUG.length}  (delete one)`);
	console.log(`  SUMMONED_TOKEN: ${byVerdict.SUMMONED_TOKEN.length}  (rename token)`);
	console.log(`  DISTINCT_CARDS: ${byVerdict.DISTINCT_CARDS.length}  (manual decision)`);
	console.log();

	for (const verdict of ['TOKEN_VS_CARD', 'SUMMONED_TOKEN', 'DUPLICATE_BUG', 'DISTINCT_CARDS'] as const) {
		const list = byVerdict[verdict];
		if (list.length === 0) continue;
		console.log(`─── ${verdict} (${list.length}) ───`);
		for (const g of list) console.log(formatGroup(g) + '\n');
	}

	if (process.argv.includes('--json')) {
		const out = dupGroups.map(g => ({
			name: g.name,
			verdict: g.verdict,
			ids: g.cards.map(c => c.id),
			recommendation: g.recommendation,
		}));
		fs.writeFileSync('/tmp/dup-classification.json', JSON.stringify(out, null, 2));
		console.error('Wrote /tmp/dup-classification.json');
	}
};

main();
