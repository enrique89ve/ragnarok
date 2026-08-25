import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { STARTER_ENTITLEMENT } from '../../../../shared/schemas/starterEntitlement';
import { getCardById } from '../data/cardRegistry';
import type {
	CardData,
	CardInstance,
	GameState,
	Player,
	WeaponCardData,
} from '../types';
import { executeBattlecry } from './battlecryUtils';
import { executeComboEffect } from './comboUtils';
import { executeSpell } from './spells/spellUtils';
import { exportCardDataToWasm, type WasmCardLoader } from '../engine/cardDataExporter';
import { debug } from '../config/debugConfig';

vi.mock('../animations/AnimationManager', () => ({
	useAnimationStore: { getState: () => ({ addAnimation: vi.fn() }) },
}));
vi.mock('../animations/UnifiedAnimationOrchestrator', () => ({
	scheduleSpellEffect: vi.fn(),
}));
vi.mock('../stores/activityLogStore', () => ({ logActivity: vi.fn() }));

const weaponCard: WeaponCardData = {
	id: 999_901,
	name: 'Starter test weapon',
	type: 'weapon',
	manaCost: 1,
	attack: 1,
	durability: 2,
	rarity: 'common',
};

function card(cardId: number): CardData {
	const result = getCardById(cardId);
	if (!result) throw new Error(`missing card fixture ${cardId}`);
	return result;
}

function instance(cardId: number, instanceId = `card-${cardId}`): CardInstance {
	const data = card(cardId);
	return {
		instanceId,
		card: data,
		currentAttack: data.type === 'minion' ? data.attack : undefined,
		currentHealth: data.type === 'minion' ? data.health : undefined,
		canAttack: true,
		isSummoningSick: false,
		attacksPerformed: 0,
	};
}

function player(overrides: Partial<Player> = {}): Player {
	return {
		id: 'player',
		name: 'Player',
		hand: [],
		battlefield: [],
		deck: [],
		graveyard: [],
		secrets: [],
		mana: { current: 10, max: 10, overloaded: 0, pendingOverload: 0 },
		health: 30,
		maxHealth: 30,
		heroHealth: 30,
		heroArmor: 0,
		heroClass: 'neutral',
		heroPower: { id: 0 } as unknown as Player['heroPower'],
		cardsPlayedThisTurn: 0,
		attacksPerformedThisTurn: 0,
		...overrides,
	};
}

function state(
	playerOverrides: Partial<Player> = {},
	opponentOverrides: Partial<Player> = {},
): GameState {
	return {
		players: {
			player: player(playerOverrides),
			opponent: player({ id: 'opponent', name: 'Opponent', ...opponentOverrides }),
		},
		currentTurn: 'player',
		turnNumber: 1,
		gamePhase: 'playing',
		gameLog: [],
	};
}

function executeStarterSpell(
	cardId: number,
	gameState: GameState,
	targetId?: string,
	targetType?: 'minion' | 'hero',
): GameState {
	return executeSpell(gameState, instance(cardId), targetId, targetType, () => 0.25);
}

function switchCases(relativePath: string): ReadonlySet<string> {
	const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
	return new Set(Array.from(source.matchAll(/case\s+['"]([^'"]+)['"]/g), match => match[1]));
}

function wasmLoader(cardCount: number) {
	return {
		beginCard: vi.fn(),
		setCardStats: vi.fn(),
		setCardMeta: vi.fn(),
		addCardKeyword: vi.fn(),
		setCardBattlecry: vi.fn(),
		setCardDeathrattle: vi.fn(),
		setCardSpellEffect: vi.fn(),
		commitCard: vi.fn(),
		clearCardData: vi.fn(),
		getCardCount: vi.fn(() => cardCount),
	} satisfies WasmCardLoader;
}

function malformedLegacySpell(cardId: number, effectType: string): CardData {
	return {
		id: cardId,
		name: `Malformed legacy ${cardId}`,
		type: 'spell',
		manaCost: 1,
		rarity: 'common',
		spellEffect: { type: effectType },
	};
}

describe('starter live effect contract', () => {
	it('binds every one of the 26 primary effects and 3 combo effects to a live dispatcher branch', () => {
		const dispatchers = {
			battlecry: switchCases('./battlecryUtils.ts'),
			deathrattle: switchCases('./deathrattleUtils.ts'),
			spellEffect: switchCases('./spells/spellUtils.ts'),
			comboEffect: switchCases('./comboUtils.ts'),
		} as const;
		const declared = STARTER_ENTITLEMENT.cardIds.flatMap(cardId => {
			const data = card(cardId);
			return (['battlecry', 'deathrattle', 'spellEffect', 'comboEffect'] as const).flatMap(slot => {
				if (!(slot in data)) return [];
				const effect = data[slot];
				return effect ? [{ cardId, slot, type: effect.type }] : [];
			});
		});

		expect(declared.filter(effect => effect.slot !== 'comboEffect')).toHaveLength(26);
		expect(declared.filter(effect => effect.slot === 'comboEffect')).toHaveLength(3);
		for (const effect of declared) {
			expect(
				dispatchers[effect.slot].has(effect.type),
				`card ${effect.cardId} ${effect.slot}=${effect.type}`,
			).toBe(true);
		}
	});

	it('keeps live-only starter composites out of EffectSchema without warning flood', () => {
		const loader = wasmLoader(9);
		const warn = vi.spyOn(debug, 'warn').mockImplementation(() => undefined);

		exportCardDataToWasm([102, 107, 118, 119, 129, 138, 139, 142, 143].map(card), loader);

		expect(warn).not.toHaveBeenCalled();
		expect(loader.commitCard).toHaveBeenCalledTimes(9);
		warn.mockRestore();
	});

	it('aggregates malformed legacy effects into one bounded warning and still commits every card', () => {
		const loader = wasmLoader(20);
		const warn = vi.spyOn(debug, 'warn').mockImplementation(() => undefined);
		const cards = Array.from({ length: 20 }, (_, index) => malformedLegacySpell(
			9_000 + index,
			index % 2 === 0 ? 'legacy_damage_combo' : 'legacy_draw_combo',
		));

		const exportedCount = exportCardDataToWasm(cards, loader);

		expect(exportedCount).toBe(20);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipped 20 malformed legacy effects'));
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('legacy_damage_combo:10'));
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('legacy_draw_combo:10'));
		expect(loader.setCardSpellEffect).not.toHaveBeenCalled();
		expect(loader.commitCard).toHaveBeenCalledTimes(20);
		warn.mockRestore();
	});

	it('applies the conditional self buff and random enemy battlecries', () => {
		const channeler = instance(102, 'channeler');
		const unconditioned = executeBattlecry(
			state({ battlefield: [channeler], cardsPlayedThisTurn: 2 }),
			'channeler',
		);
		expect(unconditioned.players.player.battlefield[0]).toMatchObject({
			currentAttack: 3,
			currentHealth: 2,
		});

		const afterSpell = executeStarterSpell(109, state({ deck: [card(100), card(103)] }));
		const channelerState: GameState = {
			...afterSpell,
			players: {
				...afterSpell.players,
				player: {
					...afterSpell.players.player,
					battlefield: [channeler],
				},
			},
		};
		const buffed = executeBattlecry(channelerState, 'channeler', undefined, undefined, () => 0);
		expect(buffed.players.player.battlefield[0]).toMatchObject({
			currentAttack: 4,
			currentHealth: 3,
		});

		const acolyte = instance(101, 'acolyte');
		const enemy = instance(103, 'enemy');
		const randomDamageState = state({ battlefield: [acolyte] }, { battlefield: [enemy] });
		const damaged = executeBattlecry(randomDamageState, 'acolyte', undefined, undefined, () => 0);
		expect(damaged.players.opponent.battlefield[0].currentHealth).toBe(3);
	});

	it('resolves conditional self buff authority for the opponent AI', () => {
		const opponentSpellState = state({}, { deck: [card(100), card(103)] });
		opponentSpellState.currentTurn = 'opponent';
		const afterOpponentSpell = executeStarterSpell(109, opponentSpellState);
		const opponentChanneler = instance(102, 'opponent-channeler');
		const channelerState: GameState = {
			...afterOpponentSpell,
			players: {
				...afterOpponentSpell.players,
				opponent: {
					...afterOpponentSpell.players.opponent,
					battlefield: [opponentChanneler],
				},
			},
		};

		const buffed = executeBattlecry(channelerState, 'opponent-channeler');

		expect(buffed.players.opponent.battlefield[0]).toMatchObject({
			currentAttack: 4,
			currentHealth: 3,
		});
		expect(buffed.players.player.battlefield).toHaveLength(0);
	});

	it('deals targeted damage and freezes the same minion', () => {
		const target = instance(103, 'target');
		const next = executeStarterSpell(107, state({}, { battlefield: [target] }), 'target', 'minion');
		expect(next.players.opponent.battlefield[0]).toMatchObject({
			currentHealth: 1,
			isFrozen: true,
			canAttack: false,
		});
	});

	it('uses hero armor for Shield Slam and counts damaged friendly characters for Battle Rage', () => {
		const target = instance(106, 'target');
		const slammed = executeStarterSpell(
			118,
			state({ heroArmor: 4 }, { battlefield: [target] }),
			'target',
			'minion',
		);
		expect(slammed.players.opponent.battlefield[0].currentHealth).toBe(2);

		const damagedFriendly = instance(103, 'damaged-friendly');
		damagedFriendly.currentHealth = 2;
		const rageState = state({
			heroHealth: 20,
			battlefield: [damagedFriendly],
			deck: [card(100), card(103), card(106)],
		});
		const rage = executeStarterSpell(119, rageState);
		expect(rage.players.player.hand).toHaveLength(2);
		expect(rage.players.player.deck).toHaveLength(1);
	});

	it('heals every friendly character and combines targeted heal with draw', () => {
		const wounded = instance(103, 'wounded');
		wounded.currentHealth = 1;
		const hymn = executeStarterSpell(129, state({ heroHealth: 20, battlefield: [wounded] }));
		expect(hymn.players.player.heroHealth).toBe(24);
		expect(hymn.players.player.health).toBe(24);
		expect(hymn.players.player.battlefield[0].currentHealth).toBe(4);

		const blessing = executeStarterSpell(
			143,
			state({ heroHealth: 20, deck: [card(100)] }),
			'player',
			'hero',
		);
		expect(blessing.players.player.heroHealth).toBe(24);
		expect(blessing.players.player.hand).toHaveLength(1);
	});

	it('buffs the equipped weapon and applies enemy AoE before drawing', () => {
		const weapon: CardInstance = {
			instanceId: 'weapon',
			card: weaponCard,
			currentAttack: 1,
			currentDurability: 2,
		};
		const poisoned = executeStarterSpell(138, state({ weapon }));
		expect(poisoned.players.player.weapon?.currentAttack).toBe(3);

		const enemyOne = instance(103, 'enemy-one');
		const enemyTwo = instance(104, 'enemy-two');
		const cleave = executeStarterSpell(117, state(
			{ battlefield: [instance(103, 'friendly')] },
			{ battlefield: [enemyOne, enemyTwo] },
		));
		expect(cleave.players.player.battlefield[0].currentHealth).toBe(4);
		expect(cleave.players.opponent.battlefield.map(card => card.currentHealth)).toEqual([2, 1]);

		const fan = executeStarterSpell(139, state(
			{ deck: [card(100)] },
			{ battlefield: [enemyOne, enemyTwo] },
		));
		expect(fan.players.opponent.battlefield.map(card => card.currentHealth)).toEqual([3, 2]);
		expect(fan.players.player.hand).toHaveLength(1);
	});

	it('opens a deterministic discovery for Wanderer of the Realms', () => {
		const wanderer = instance(142, 'wanderer');
		const values = [0, 0.25, 0.5];
		let index = 0;
		const next = executeBattlecry(
			state({ battlefield: [wanderer] }),
			'wanderer',
			undefined,
			undefined,
			() => values[index++ % values.length],
		);
		expect(next.discovery?.active).toBe(true);
		expect(next.discovery?.options).toHaveLength(3);
	});

	it('executes the three starter comboEffect declarations through the live minion path', () => {
		const poisonBrewer = instance(131, 'poison-brewer');
		const inactive = executeComboEffect(
			state({ battlefield: [poisonBrewer], cardsPlayedThisTurn: 1 }),
			'player',
			'poison-brewer',
		);
		expect(inactive.players.player.battlefield[0].instanceKeywords ?? []).not.toContain('poisonous');

		const poisoned = executeComboEffect(
			state({ battlefield: [poisonBrewer], cardsPlayedThisTurn: 2 }),
			'player',
			'poison-brewer',
		);
		expect(poisoned.players.player.battlefield[0].instanceKeywords).toContain('poisonous');

		const cutpurse = instance(133, 'cutpurse');
		const drawn = executeComboEffect(
			state({ battlefield: [cutpurse], cardsPlayedThisTurn: 2, deck: [card(100)] }),
			'player',
			'cutpurse',
		);
		expect(drawn.players.player.hand).toHaveLength(1);

		const bladeDancer = instance(135, 'blade-dancer');
		const enemy = instance(103, 'combo-enemy');
		const beforeTotal = 30 + (enemy.currentHealth ?? 0);
		const damaged = executeComboEffect(
			state(
				{ battlefield: [bladeDancer], cardsPlayedThisTurn: 2 },
				{ battlefield: [enemy] },
			),
			'player',
			'blade-dancer',
		);
		const afterTotal = (damaged.players.opponent.heroHealth ?? 0)
			+ (damaged.players.opponent.battlefield[0]?.currentHealth ?? 0);
		expect(afterTotal).toBe(beforeTotal - 2);
	});
});
