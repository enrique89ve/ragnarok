/*
  pvpData.ts — narrative data for the PvP layer.

  Three things live here:
    1. FACTIONS — the five houses a player can pledge to after completing
       the Norse chapter. Each has a name, blurb, and signature god.
    2. YGGDRASIL_RANKS — cosmetic ladder labels. Replaces "Bronze 5" with
       "Niflheim", "Silver 4" with "Svartalfheim", etc. Internally the
       game still uses ELO numbers; this is purely the display layer.
    3. HERO_FEUDS — table of hero-vs-hero rivalry quips. Keyed by an
       unordered hero pair so the lookup is symmetric. Used by the
       matchmaking lobby to fire a "feud detected" banner before P2P
       connect, and by the combat arena to display a one-time taunt at
       the start of the first round.

  All three are pure data \u2014 no React, no Zustand. Imported by the
  factionStore + rivalryStore + matchmaking lobby components.
*/

export type FactionId = 'aesir' | 'vanir' | 'jotun' | 'helheim' | 'muspell';

export interface FactionDef {
	id: FactionId;
	name: string;
	tagline: string;
	description: string;
	color: string;          // Hex, used for accents in the pledge UI
	signatureHeroId: string; // The most iconic hero of this faction
}

export const FACTIONS: FactionDef[] = [
	{
		id: 'aesir',
		name: 'House of the Aesir',
		tagline: 'The Sky-Builders',
		description: 'You stand with Odin, Thor, Frigg and the gods of order. You raise walls. You write runes. You fight for the cosmos as it should be.',
		color: '#c9a44c',
		signatureHeroId: 'hero-odin',
	},
	{
		id: 'vanir',
		name: 'House of the Vanir',
		tagline: 'The Green-Hearted',
		description: 'You stand with Freyr, Freyja, Njord. You walk in green earth. You read fate in the wind. The Aesir burned your seeress, and the wound has not closed.',
		color: '#5fb86a',
		signatureHeroId: 'hero-freya',
	},
	{
		id: 'jotun',
		name: 'House of the Jotnar',
		tagline: 'Children of the Drowning',
		description: 'You stand with Bergelmir\u2019s heirs. You remember Ymir. The cosmos was made from your grandfather\u2019s body and the gods have never paid their debt.',
		color: '#7ec3e6',
		signatureHeroId: 'hero-thorgrim',
	},
	{
		id: 'helheim',
		name: 'House of Helheim',
		tagline: 'The Long Quiet',
		description: 'You stand with Hel and her unworthy dead. You walk the road that has only one direction. You know the world is going to end, and you have made peace with carrying the bones of it.',
		color: '#a78bdc',
		signatureHeroId: 'hero-hel',
	},
	{
		id: 'muspell',
		name: 'House of Muspell',
		tagline: 'The First Fire',
		description: 'You stand with Surtr and the fire-giants of the south. The cosmos began in flame. The cosmos will end in flame. Between those two flames, you burn what deserves to burn.',
		color: '#e77a3a',
		signatureHeroId: 'hero-surtr',
	},
];

export function getFaction(id: FactionId): FactionDef | undefined {
	return FACTIONS.find(f => f.id === id);
}

/*
  YGGDRASIL_RANKS \u2014 cosmetic ladder display.

  The matchmaking system computes an ELO number per player. We map that
  number into one of nine \u201crealms\u201d on Yggdrasil so the ladder feels
  like a climb through the cosmos rather than a Bronze/Silver/Gold grind.
  Cutoffs are inclusive on the lower bound: an ELO of 1000 lands in
  Niflheim; 1100 in Svartalfheim; 1900 in Asgard.

  Reaching Asgard (rank 9) is a story moment; the matchmaking lobby
  will fire a one-shot \u201cYou ascend the World Tree\u201d cinematic when the
  player crosses the threshold for the first time.
*/
export interface YggdrasilRank {
	id: number;          // 1-9
	realmId: string;     // matches realm IDs in the campaign
	name: string;        // display name
	flavor: string;      // one-sentence flavor for the rank-up popup
	minElo: number;      // inclusive lower bound
	color: string;       // accent hex
}

export const YGGDRASIL_RANKS: YggdrasilRank[] = [
	{ id: 1, realmId: 'niflheim',     name: 'Niflheim',     flavor: 'You begin in the cold and the mist. The journey ahead is long.', minElo: 0,    color: '#7ec3e6' },
	{ id: 2, realmId: 'svartalfheim', name: 'Svartalfheim', flavor: 'The dwarven forges burn for those who can hold a hammer.',         minElo: 1100, color: '#a07a3a' },
	{ id: 3, realmId: 'helheim',      name: 'Helheim',      flavor: 'You walk the road that has only one direction. You walk it well.', minElo: 1200, color: '#a78bdc' },
	{ id: 4, realmId: 'jotunheim',    name: 'Jotunheim',    flavor: 'The frost-giants test all challengers. You survive the test.',     minElo: 1350, color: '#7ec3e6' },
	{ id: 5, realmId: 'midgard',      name: 'Midgard',      flavor: 'You stand at the center of the Nine Realms. The cosmos notices.',  minElo: 1500, color: '#c9a44c' },
	{ id: 6, realmId: 'muspelheim',   name: 'Muspelheim',   flavor: 'The fires of the south recognize their own.',                       minElo: 1650, color: '#e77a3a' },
	{ id: 7, realmId: 'vanaheim',     name: 'Vanaheim',     flavor: 'The green earth bows to you. The Vanir keep your name in their songs.', minElo: 1750, color: '#5fb86a' },
	{ id: 8, realmId: 'alfheim',      name: 'Alfheim',      flavor: 'The light-elves crown you with their crystallized sun.',            minElo: 1850, color: '#ffe6a0' },
	{ id: 9, realmId: 'asgard',       name: 'Asgard',       flavor: 'You climb the rainbow bridge as a peer of the gods. The Aesir set a thirteenth throne.', minElo: 2000, color: '#ffd97a' },
];

/**
 * Look up the Yggdrasil rank for a given ELO number. Always returns a
 * valid rank (clamps to Niflheim at the bottom, Asgard at the top).
 */
export function getYggdrasilRank(elo: number): YggdrasilRank {
	let current = YGGDRASIL_RANKS[0];
	for (const rank of YGGDRASIL_RANKS) {
		if (elo >= rank.minElo) current = rank;
	}
	return current;
}

/*
  HERO_FEUDS \u2014 hero-vs-hero rivalries. Keyed by sorted pair, so
  lookup is symmetric. The strings are pre-match taglines (display in
  matchmaking lobby) and combat-start quips (display in arena).

  Adding a feud:
    1. Pick two hero IDs that have a canonical mythological enmity
    2. Add an entry under the sorted-key string `\u201c\${a}|\${b}\u201d`
       where a < b alphabetically
    3. Provide tagline (\u224660 chars), aQuip (a vs b), bQuip (b vs a)

  The lookup function takes any pair order and normalizes.
*/
export interface HeroFeud {
	tagline: string;     // appears as a single line under the matchmaking VS card
	aQuip: string;       // what hero `a` says to hero `b`
	bQuip: string;       // what hero `b` says to hero `a`
}

const FEUD_TABLE: Record<string, HeroFeud> = {
	'hero-loki|hero-thor': {
		tagline: 'Brother. Trickster. Old wound.',
		aQuip: 'Brother. I have waited for this hand a long time.',
		bQuip: 'Mjolnir does not need to know what you call yourself this morning, Loki.',
	},
	'hero-fenrir|hero-odin': {
		tagline: 'The wolf and the one who raised him.',
		aQuip: 'Allfather. I have grown larger than your chains.',
		bQuip: 'Then I will go into your jaws as the saga said. But not yet.',
	},
	'hero-thor|hero-thorgrim': {
		tagline: 'God-hammer. Frost-blood. Old debt.',
		aQuip: 'Bergelmir\u2019s heir. I owe your line nothing more, but I will collect it anyway.',
		bQuip: 'Drowner of giants. Today the river runs the OTHER way.',
	},
	'hero-baldur|hero-loki': {
		tagline: 'The brightest one and the one who arranged the mistletoe.',
		aQuip: 'I came back from Hel for many things. Mostly for THIS.',
		bQuip: 'I never really meant it. Mostly. Probably.',
	},
	'hero-zeus|hero-thorgrim': {
		tagline: 'Sky-father vs frost-blood. Both have killed kings.',
		aQuip: 'Olympus has no room for giants. The lightning will explain.',
		bQuip: 'Your lightning is loud. Mine is older.',
	},
	'hero-odin|hero-zeus': {
		tagline: 'Two sky-fathers. Two thrones. One field.',
		aQuip: 'Greybeard. Olympus. We were always going to find this hour.',
		bQuip: 'Allfather. Your eye for my thunder. Fair trade.',
	},
	'hero-freya|hero-aphrodite': {
		tagline: 'Two goddesses of love. Both have buried husbands.',
		aQuip: 'Sister of foam. Today the cats and the doves choose sides.',
		bQuip: 'Sister of falcons. May the better mourner win.',
	},
	'hero-hades|hero-hel': {
		tagline: 'Two keepers of the dead. Both tired of the topic.',
		aQuip: 'Cousin. The dead don\u2019t need our help finding doors.',
		bQuip: 'Cousin. Today\u2019s door is one of us.',
	},
	'hero-tyr|hero-fenrir': {
		tagline: 'The hand-bitten and the hand-biter.',
		aQuip: 'I owe you one wrist. I do not owe you the rest of me.',
		bQuip: 'Tyr. You always taste better when you\u2019re ready.',
	},
	'hero-surtr|hero-frey': {
		tagline: 'The fire-giant and the god who gave away his sword.',
		aQuip: 'Vanir. I am the fire that takes the gods at the end. You traded the only blade that could stop me.',
		bQuip: 'I traded it for love. I would do it again. But not today.',
	},
};

function feudKey(a: string, b: string): string {
	return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function getHeroFeud(heroA: string, heroB: string): HeroFeud | undefined {
	if (!heroA || !heroB || heroA === heroB) return undefined;
	return FEUD_TABLE[feudKey(heroA, heroB)];
}

/**
 * Direction-aware quip lookup. Returns the quip the speaker would say
 * to the opponent in this matchup, or undefined if no feud exists.
 */
export function getHeroFeudQuip(speakerHeroId: string, opponentHeroId: string): string | undefined {
	const feud = getHeroFeud(speakerHeroId, opponentHeroId);
	if (!feud) return undefined;
	// The feud table stores aQuip for the alphabetically-earlier ID; the
	// caller might be either side. Pick the right one.
	return speakerHeroId < opponentHeroId ? feud.aQuip : feud.bQuip;
}
