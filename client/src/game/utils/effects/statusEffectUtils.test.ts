import { describe, expect, it } from 'vitest';
import type { CardData, CardInstance, GameState } from '../../types';
import { getEffectiveAttack } from './statusEffectUtils';
import { applyEnrageEffect } from '../mechanics/enrageUtils';
import { recalculateAuras } from '../mechanics/auraUtils';
import { executeFrenzyEffect } from '../mechanics/frenzyUtils';
import { createCardInstance } from '../cards/cardUtils';
import { initializeGame, processAttack } from '../gameUtils';

function minion(overrides: Partial<CardInstance> = {}): CardInstance {
  return {
    instanceId: 'minion-1',
    card: {
      id: 1,
      name: 'Test Minion',
      type: 'minion',
      rarity: 'common',
      manaCost: 2,
      attack: 5,
      health: 8,
      keywords: [],
    },
    currentAttack: 5,
    currentHealth: 8,
    canAttack: true,
    isPlayed: true,
    isSummoningSick: false,
    ...overrides,
  };
}

describe('getEffectiveAttack', () => {
  it('resolves a normal minion from card.attack when no projection exists', () => {
    expect(getEffectiveAttack(minion({ currentAttack: undefined }))).toBe(5);
  });

  it('uses the buffed instance stat before status modifiers', () => {
    expect(getEffectiveAttack(minion({ currentAttack: 8 }))).toBe(8);
  });

  it('applies Weakness exactly once', () => {
    expect(getEffectiveAttack(minion({ currentAttack: 8, isWeakened: true }))).toBe(5);
  });

  it('applies Burn outgoing damage exactly once', () => {
    expect(getEffectiveAttack(minion({ currentAttack: 8, isBurning: true }))).toBe(11);
  });

  it('includes an Enrage projection produced by the existing Enrage resolver', () => {
    const enraged = applyEnrageEffect(minion({
      card: {
        ...minion().card,
        name: 'Enraged Berserker',
        keywords: ['enrage'],
      },
      currentHealth: 4,
    }));

    expect(enraged.currentAttack).toBe(8);
    expect(getEffectiveAttack(enraged)).toBe(8);
  });

  it('includes an Aura projection after aura recalculation', () => {
    const source = minion({
      instanceId: 'aura-source',
      card: {
        ...minion().card,
        name: 'Banner',
        aura: { type: 'attack_buff', targetType: 'all_friendly_minions', value: 2 },
      },
    });
    const target = minion({ instanceId: 'aura-target' });
    const state = {
      players: {
        player: { battlefield: [source, target] },
        opponent: { battlefield: [] },
      },
    } as GameState;

    recalculateAuras(state);

    expect(target.currentAttack).toBe(7);
    expect(getEffectiveAttack(target)).toBe(7);
  });

  it('keeps Enrage active when an Aura already changed currentAttack', () => {
    const enraged = applyEnrageEffect(minion({
      currentAttack: 7,
      currentHealth: 4,
      auraBuffAttack: 2,
      card: {
        ...minion().card,
        name: 'Enraged Berserker',
        keywords: ['enrage'],
      },
    }));

    expect(enraged.currentAttack).toBe(10);
    expect(getEffectiveAttack(enraged)).toBe(10);
  });

  it('keeps a Frenzy attack buff in both card and instance projections', () => {
    const state = initializeGame();
    const frenzyCard = minion({
      card: {
        ...minion().card,
        frenzyEffect: { type: 'buff', buffAttack: 2 },
        keywords: ['frenzy'],
      },
    });
    state.players.player.battlefield = [frenzyCard];

    executeFrenzyEffect(state, frenzyCard.instanceId, 'player');

    expect(frenzyCard.currentAttack).toBe(7);
    expect(frenzyCard.card.attack).toBe(7);
    expect(getEffectiveAttack(frenzyCard)).toBe(7);
  });

  it('composes simultaneous buff, aura, status, and temporary projections', () => {
    const card = minion({
      currentAttack: 12,
      isWeakened: true,
      isBurning: true,
      auraBuffAttack: 2,
    });

    // currentAttack already contains the permanent, aura, and temporary
    // projection; status effects are applied at the combat boundary.
    expect(getEffectiveAttack(card)).toBe(12);
  });

  it('feeds the effective value into the manual combat resolver', () => {
    const state = initializeGame();
    state.gamePhase = 'playing';

    const attacker = createCardInstance({
      ...minion().card,
      id: 2,
      name: 'Burning Attacker',
      attack: 8,
      health: 8,
    } as CardData, 'attacker');
    attacker.isPlayed = true;
    attacker.isSummoningSick = false;
    attacker.canAttack = true;
    attacker.currentHealth = 8;
    attacker.isBurning = true;

    const target = createCardInstance({
      ...minion().card,
      id: 3,
      name: 'Target',
      attack: 2,
      health: 20,
    } as CardData, 'target');
    target.isPlayed = true;
    target.isSummoningSick = false;
    target.canAttack = true;
    target.currentHealth = 20;

    state.players.player.battlefield = [attacker];
    state.players.opponent.battlefield = [target];

    const resolved = processAttack(state, 'attacker', 'target', () => 0.5);

    expect(resolved.players.opponent.battlefield[0]?.currentHealth).toBe(9);
    expect(resolved.players.player.battlefield[0]?.currentHealth).toBe(3);
  });
});
