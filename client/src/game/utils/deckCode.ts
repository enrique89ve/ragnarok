import type { HeroDeck } from '../stores/heroDeckStore';
import { cardRegistry } from '../data/cardRegistry';

const DECK_CODE_VERSION = 2;

const HERO_CLASSES = [
	'mage', 'hunter', 'warrior', 'priest', 'rogue',
	'paladin', 'warlock', 'druid', 'shaman',
	'deathknight', 'berserker', 'monk',
] as const;

function encodeId(bytes: number[], id: number) {
	bytes.push((id >> 16) & 0xFF);
	bytes.push((id >> 8) & 0xFF);
	bytes.push(id & 0xFF);
}

function decodeId(bytes: Uint8Array, offset: number): number {
	return (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
}

export function encodeDeck(deck: HeroDeck): string {
	const bytes: number[] = [];

	bytes.push(DECK_CODE_VERSION);

	const classIndex = HERO_CLASSES.indexOf(deck.heroClass as typeof HERO_CLASSES[number]);
	bytes.push(classIndex >= 0 ? classIndex : 255);

	const heroIdBytes = new TextEncoder().encode(deck.heroId);
	bytes.push(heroIdBytes.length);
	for (const b of heroIdBytes) bytes.push(b);

	const counts = new Map<number, number>();
	for (const id of deck.cardIds) {
		counts.set(id, (counts.get(id) || 0) + 1);
	}

	const singles: number[] = [];
	const doubles: number[] = [];
	for (const [id, count] of counts) {
		if (count === 1) singles.push(id);
		else doubles.push(id);
	}

	singles.sort((a, b) => a - b);
	doubles.sort((a, b) => a - b);

	bytes.push(singles.length);
	for (const id of singles) {
		encodeId(bytes, id);
	}

	bytes.push(doubles.length);
	for (const id of doubles) {
		encodeId(bytes, id);
	}

	return btoa(String.fromCharCode(...bytes));
}

export function decodeDeck(code: string): { heroId: string; heroClass: string; cardIds: number[] } | null {
	try {
		const raw = atob(code);
		const bytes = new Uint8Array(raw.length);
		for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

		let offset = 0;

		const version = bytes[offset++];
		if (version !== 1 && version !== DECK_CODE_VERSION) return null;

		const classIndex = bytes[offset++];
		const heroClass = classIndex < HERO_CLASSES.length ? HERO_CLASSES[classIndex] : 'mage';

		const heroIdLen = bytes[offset++];
		const heroIdBytes = bytes.slice(offset, offset + heroIdLen);
		offset += heroIdLen;
		const heroId = new TextDecoder().decode(heroIdBytes);

		const cardIds: number[] = [];
		const idSize = version === 1 ? 2 : 3;

		if (offset >= bytes.length) return null;
		const singlesCount = bytes[offset++];
		for (let i = 0; i < singlesCount; i++) {
			if (offset + idSize > bytes.length) return null;
			const id = version === 1
				? (bytes[offset] << 8) | bytes[offset + 1]
				: decodeId(bytes, offset);
			offset += idSize;
			cardIds.push(id);
		}

		if (offset >= bytes.length) return null;
		const doublesCount = bytes[offset++];
		for (let i = 0; i < doublesCount; i++) {
			if (offset + idSize > bytes.length) return null;
			const id = version === 1
				? (bytes[offset] << 8) | bytes[offset + 1]
				: decodeId(bytes, offset);
			offset += idSize;
			cardIds.push(id);
			cardIds.push(id);
		}

		return { heroId, heroClass, cardIds };
	} catch {
		return null;
	}
}

export function validateDeckCode(code: string): boolean {
	const result = decodeDeck(code);
	if (!result) return false;

	// Validate deck size
	if (result.cardIds.length !== 30) return false;

	// Validate all cards exist and enforce copy limits
	const counts = new Map<number, number>();
	for (const id of result.cardIds) {
		const card = cardRegistry.find(c => Number(c.id) === id);
		if (!card) return false;
		const count = (counts.get(id) || 0) + 1;
		// Max 1 copy of mythic, max 2 of anything else
		const maxCopies = card.rarity === 'mythic' ? 1 : 2;
		if (count > maxCopies) return false;
		counts.set(id, count);
	}
	return true;
}

export function deckCodeToUrl(code: string): string {
	return `${window.location.origin}?deck=${encodeURIComponent(code)}`;
}

export function deckCodeFromUrl(): string | null {
	const params = new URLSearchParams(window.location.search);
	return params.get('deck');
}
