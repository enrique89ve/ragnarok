/**
 * norseHeroPowerUtils.ts
 * 
 * Execution logic for Norse Hero powers in Ragnarok Poker.
 * Handles all hero power execution, weapon upgrades, and hero passives.
 */

import { GameState, CardInstance, CardData, EquippedWeapon } from '../types';
import { NorseHero, NorseHeroPower, HeroPassiveTrigger, NorseHeroPassive } from '../types/NorseTypes';
import { ALL_NORSE_HEROES, getAnyHeroById } from '../data/norseHeroes';
import { debug } from '../config/debugConfig';
import { destroyCard } from './zoneUtils';
import { dealDamage } from './effects/damageUtils';
import { addKeyword, clearKeywords, hasKeyword } from './cards/keywordUtils';
import { MAX_BATTLEFIELD_SIZE, MAX_HAND_SIZE } from '../constants/gameConstants';

/**
 * Helper to safely get attack from card data
 */
function getCardAttack(card: CardData): number {
  return (card as any).attack || 0;
}

/**
 * Helper to safely get health from card data
 */
function getCardHealth(card: CardData): number {
  return (card as any).health || 1;
}

/**
 * Get a Norse hero by ID
 */
export function getNorseHeroById(heroId: string): NorseHero | undefined {
  return getAnyHeroById(heroId);
}

/**
 * Check if player can use hero power
 */
export function canUseHeroPower(
  state: GameState,
  playerType: 'player' | 'opponent',
  heroId: string
): boolean {
  const hero = getNorseHeroById(heroId);
  if (!hero) return false;

  const player = state.players[playerType];
  
  // Check mana
  if (player.mana.current < hero.heroPower.cost) return false;
  
  // Check if already used this turn
  if (player.heroPower?.used) return false;
  
  return true;
}

/**
 * Execute a Norse hero power
 */
export function executeNorseHeroPower(
  state: GameState,
  playerType: 'player' | 'opponent',
  heroId: string,
  targetId?: string,
  isUpgraded: boolean = false
): GameState {
  const hero = getNorseHeroById(heroId);
  if (!hero) return state;

  const power = isUpgraded ? hero.upgradedHeroPower : hero.heroPower;
  
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = newState.players[opponentType];

  // NOTE: Mana deduction and hero power marking is handled by the caller (UI's executeHeroPowerEffect)
  // Do NOT deduct mana here to avoid double-deduction

  debug.log(`[Hero Power] ${hero.name} used ${power.name}: ${power.description}`);

  // Execute based on effect type
  switch (power.effectType) {
    case 'damage_single':
      newState = executeDamageSingle(newState, playerType, targetId, power);
      break;
    case 'damage_aoe':
      newState = executeDamageAoE(newState, playerType, power);
      break;
    case 'damage_random':
      newState = executeDamageRandom(newState, playerType, power);
      break;
    case 'heal_single':
      newState = executeHealSingle(newState, playerType, targetId, power);
      break;
    case 'heal_aoe':
      newState = executeHealAoE(newState, playerType, power);
      break;
    case 'buff_single':
      newState = executeBuffSingle(newState, playerType, targetId, power);
      break;
    case 'buff_aoe':
      newState = executeBuffAoE(newState, playerType, power);
      break;
    case 'debuff_single':
      newState = executeDebuffSingle(newState, playerType, targetId, power);
      break;
    case 'debuff_aoe':
      newState = executeDebuffAoE(newState, playerType, power);
      break;
    case 'summon':
      newState = executeSummon(newState, playerType, power);
      break;
    case 'freeze':
      newState = executeFreeze(newState, playerType, targetId, power);
      break;
    case 'stealth':
      newState = executeStealth(newState, playerType, targetId, power);
      break;
    case 'draw':
      newState = executeDraw(newState, playerType, power);
      break;
    case 'copy':
      newState = executeCopy(newState, playerType, power);
      break;
    case 'scry':
      newState = executeScry(newState, playerType, power);
      break;
    case 'reveal':
      newState = executeReveal(newState, playerType, power);
      break;
    case 'grant_keyword':
      newState = executeGrantKeyword(newState, playerType, targetId, power);
      break;
    case 'heal':
      newState = executeHeal(newState, playerType, targetId, power);
      break;
    case 'damage_hero':
      newState = executeDamageHero(newState, playerType, power);
      break;
    case 'summon_random':
      newState = executeSummonRandom(newState, playerType, power);
      break;
    case 'silence':
      newState = executeSilence(newState, playerType, targetId, power);
      break;
    case 'set_stats':
      newState = executeSetStats(newState, playerType, targetId, power);
      break;
    case 'self_damage_and_summon':
      newState = executeSelfDamageAndSummon(newState, playerType, power);
      break;
    case 'sacrifice_summon':
      newState = executeSacrificeSummon(newState, playerType, targetId, power);
      break;
    case 'heal_and_buff':
      newState = executeHealAndBuff(newState, playerType, targetId, power);
      break;
    case 'grant_divine_shield':
      newState = executeGrantDivineShield(newState, playerType, targetId, power);
      break;
    case 'generate_enemy_class_card':
      newState = executeGenerateEnemyClassCard(newState, playerType, power);
      break;
    case 'equip_weapon':
      newState = executeEquipWeapon(newState, playerType, power);
      break;
    case 'equip_random_weapon':
      newState = executeEquipRandomWeapon(newState, playerType, power);
      break;
    case 'discover':
      newState = executeDiscover(newState, playerType, power);
      break;
    case 'damage_and_poison':
      newState = executeDamageAndPoison(newState, playerType, targetId, power);
      break;
    case 'damage_all':
      newState = executeDamageAll(newState, playerType, power);
      break;
    case 'conditional_destroy':
      newState = executeConditionalDestroy(newState, playerType, targetId, power);
      break;
    case 'bounce':
      newState = executeBounce(newState, playerType, targetId, power);
      break;
    case 'bounce_damage':
      newState = executeBounceDamage(newState, playerType, targetId, power);
      break;
    case 'bounce_to_hand':
      newState = executeBounceToHand(newState, playerType, targetId, power);
      break;
    case 'bounce_and_damage_hero':
      newState = executeBounceAndDamageHero(newState, playerType, targetId, power);
      break;
    case 'heal_all_friendly':
      newState = executeHealAllFriendly(newState, playerType, power);
      break;
    case 'gain_armor':
      newState = executeGainArmor(newState, playerType, power);
      break;
    case 'chain_damage':
      newState = executeChainDamage(newState, playerType, targetId, power);
      break;
    case 'draw_and_damage':
      newState = executeDrawAndDamage(newState, playerType, power);
      break;
    case 'buff_hero':
      newState = executeBuffHero(newState, playerType, power);
      break;
    case 'roll_the_dice':
      newState = executeRollTheDice(newState, playerType, power, false);
      break;
    case 'roll_the_dice_double':
      newState = executeRollTheDice(newState, playerType, power, true);
      break;
    case 'generate_fate_strand':
      newState = executeGenerateFateStrand(newState, playerType, power);
      break;
    case 'escalating_damage':
      newState = executeEscalatingDamage(newState, playerType, targetId, power);
      break;
    default:
      debug.warn(`[HERO POWER] Unknown effect type: ${power.effectType}`);
  }

  // Handle secondary effects (e.g., heal hero after buff)
  if (power.secondaryValue && power.effectType === 'buff_single') {
    const maxHp = player.maxHealth;
    player.heroHealth = Math.min((player.heroHealth || maxHp) + power.secondaryValue, maxHp);
  }

  // Check for game over after any hero power effect
  if (newState.gamePhase !== 'game_over') {
    const playerHp = newState.players[playerType].heroHealth ?? newState.players[playerType].health;
    const opponentHp = newState.players[opponentType].heroHealth ?? newState.players[opponentType].health;
    if (playerHp <= 0) {
      newState.gamePhase = 'game_over';
      newState.winner = opponentType;
    } else if (opponentHp <= 0) {
      newState.gamePhase = 'game_over';
      newState.winner = playerType;
    }
  }

  return newState;
}

// ==================== EFFECT EXECUTORS ====================

function executeDamageSingle(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  const targetMinion = opponent.battlefield.find(m => m.instanceId === targetId);
  if (targetMinion) {
    targetMinion.currentHealth = (targetMinion.currentHealth || getCardHealth(targetMinion.card)) - (power.value || 0);

    // Remove dead minions
    opponent.battlefield = opponent.battlefield.filter(m => (m.currentHealth || 0) > 0);

    // Apply secondary debuff if present
    if (power.secondaryValue && power.duration) {
      targetMinion.currentAttack = Math.max(0, (targetMinion.currentAttack || getCardAttack(targetMinion.card)) - power.secondaryValue);
    }
  }

  return state;
}

function executeDamageAoE(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  opponent.battlefield.forEach(minion => {
    minion.currentHealth = (minion.currentHealth || getCardHealth(minion.card)) - (power.value || 0);
  });

  opponent.battlefield = opponent.battlefield.filter(m => (m.currentHealth || 0) > 0);

  return state;
}

function executeDamageRandom(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  if (opponent.battlefield.length > 0) {
    const randomIndex = Math.floor(Math.random() * opponent.battlefield.length);
    const target = opponent.battlefield[randomIndex];
    target.currentHealth = (target.currentHealth || getCardHealth(target.card)) - (power.value || 0);

    opponent.battlefield = opponent.battlefield.filter(m => (m.currentHealth || 0) > 0);
  }

  return state;
}

// ── v1.1: Gefjon's "Roll the Dice" ──
// Rolls 1d6 (or 2d6-keep-highest for upgraded), deals that damage to a random enemy.

function executeRollTheDice(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower,
  rollTwice: boolean
): GameState {
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  // Roll the dice
  const roll1 = Math.floor(Math.random() * 6) + 1;
  const roll2 = rollTwice ? Math.floor(Math.random() * 6) + 1 : 0;
  const damage = rollTwice ? Math.max(roll1, roll2) : roll1;

  debug.log(`[Gefjon] Roll: ${roll1}${rollTwice ? ` / ${roll2} → keep ${damage}` : ` → ${damage} damage`}`);

  // Pick a random enemy target (minion or hero)
  const targets: Array<{ type: 'minion'; index: number } | { type: 'hero' }> = [];
  opponent.battlefield.forEach((_, i) => targets.push({ type: 'minion', index: i }));
  targets.push({ type: 'hero' });

  if (targets.length === 0) return state;

  const chosen = targets[Math.floor(Math.random() * targets.length)];

  if (chosen.type === 'hero') {
    opponent.heroHealth = (opponent.heroHealth ?? opponent.health) - damage;
  } else {
    const minion = opponent.battlefield[chosen.index];
    if (minion) {
      minion.currentHealth = (minion.currentHealth || getCardHealth(minion.card)) - damage;
      opponent.battlefield = opponent.battlefield.filter(m => (m.currentHealth || 0) > 0);
    }
  }

  // Passive: rolling a 6 draws a card
  if (damage === 6) {
    state = executeDraw(state, playerType, { value: 1 } as NorseHeroPower);
    debug.log('[Gefjon] Rolled a 6! Drew a card.');
  }

  return state;
}

// ── v1.1: Verdandi's "Fate Strand" (combo enabler) ──

function executeGenerateFateStrand(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];
  const MAX_HAND = 6;

  if (player.hand.length >= MAX_HAND) {
    debug.log('[Verdandi] Hand full, cannot add Fate Strand');
    return state;
  }

  const dmg = power.value || 1;
  const fateStrand: CardData = {
    id: 9070 + dmg,
    name: dmg > 1 ? 'Greater Fate Strand' : 'Fate Strand',
    manaCost: 0,
    description: `Deal ${dmg} damage to a random enemy.`,
    flavorText: 'A thread of destiny, plucked from the loom.',
    type: 'spell',
    rarity: 'basic',
    class: 'Neutral',
    spellEffect: { type: 'damage_random', value: dmg, targetType: 'random_enemy' },
    collectible: false,
  } as CardData;

  const instance: CardInstance = {
    instanceId: `fate_strand_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    card: fateStrand,
    currentHealth: 0,
    currentAttack: 0,
    canAttack: false,
    isSummoningSick: false,
  };

  player.hand.push(instance);
  debug.log(`[Verdandi] Added ${fateStrand.name} (${dmg} dmg) to hand`);

  return state;
}

// ── v1.1: Vali's "Escalating Damage" ──
// Tracks uses via a hidden counter on game state. Each use deals base + escalation.

const VALI_ESCALATION_KEY = '__vali_escalation';

function executeEscalatingDamage(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  // Track escalation counter on game state metadata
  const meta = (state as unknown as Record<string, unknown>);
  const counterKey = `${VALI_ESCALATION_KEY}_${playerType}`;
  const escalation = (meta[counterKey] as number) || 0;
  const totalDamage = (power.value || 1) + escalation;

  debug.log(`[Vali] Blood Debt: base ${power.value} + ${escalation} escalation = ${totalDamage} damage`);

  // Apply to target minion
  if (targetId && targetId !== 'hero') {
    const target = opponent.battlefield.find(m => m.instanceId === targetId);
    if (target) {
      target.currentHealth = (target.currentHealth || getCardHealth(target.card)) - totalDamage;
      opponent.battlefield = opponent.battlefield.filter(m => (m.currentHealth || 0) > 0);
    }
  } else if (opponent.battlefield.length > 0) {
    // Fallback: random enemy minion
    const idx = Math.floor(Math.random() * opponent.battlefield.length);
    const target = opponent.battlefield[idx];
    target.currentHealth = (target.currentHealth || getCardHealth(target.card)) - totalDamage;
    opponent.battlefield = opponent.battlefield.filter(m => (m.currentHealth || 0) > 0);
  }

  // Increment escalation counter
  meta[counterKey] = escalation + 1;

  return state;
}

function executeHealSingle(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];

  if (targetId === 'hero') {
    const maxHp = player.maxHealth;
    player.heroHealth = Math.min((player.heroHealth || maxHp) + (power.value || 0), maxHp);
  } else if (targetId) {
    const targetMinion = player.battlefield.find(m => m.instanceId === targetId);
    if (targetMinion) {
      const maxHealth = getCardHealth(targetMinion.card);
      targetMinion.currentHealth = Math.min(
        (targetMinion.currentHealth || maxHealth) + (power.value || 0),
        maxHealth
      );
    }
  }

  return state;
}

function executeHealAoE(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];

  player.battlefield.forEach(minion => {
    const maxHealth = getCardHealth(minion.card);
    minion.currentHealth = Math.min(
      (minion.currentHealth || maxHealth) + (power.value || 0),
      maxHealth
    );
  });

  return state;
}

function executeBuffSingle(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];

  if (!targetId) {
    // Random friendly target
    if (player.battlefield.length > 0) {
      const randomIndex = Math.floor(Math.random() * player.battlefield.length);
      const target = player.battlefield[randomIndex];
      target.currentAttack = (target.currentAttack || getCardAttack(target.card)) + (power.value || 0);
      target.currentHealth = (target.currentHealth || getCardHealth(target.card)) + (power.value || 0);
    }
  } else {
    const targetMinion = player.battlefield.find(m => m.instanceId === targetId);
    if (targetMinion) {
      targetMinion.currentAttack = (targetMinion.currentAttack || getCardAttack(targetMinion.card)) + (power.value || 0);
      targetMinion.currentHealth = (targetMinion.currentHealth || getCardHealth(targetMinion.card)) + (power.value || 0);

      // Grant keyword if present
      if (power.grantKeyword) {
        applyKeyword(targetMinion, power.grantKeyword);
      }
    }
  }

  return state;
}

function executeBuffAoE(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];

  player.battlefield.forEach(minion => {
    minion.currentAttack = (minion.currentAttack || getCardAttack(minion.card)) + (power.value || 0);
    minion.currentHealth = (minion.currentHealth || getCardHealth(minion.card)) + (power.value || 0);
  });

  return state;
}

function executeDebuffSingle(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  const targetMinion = opponent.battlefield.find(m => m.instanceId === targetId);
  if (targetMinion) {
    const newAttack = (targetMinion.currentAttack || getCardAttack(targetMinion.card)) - (power.value || 0);
    targetMinion.currentAttack = Math.max(0, newAttack);
  }

  return state;
}

function executeDebuffAoE(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  opponent.battlefield.forEach(minion => {
    const newAttack = (minion.currentAttack || getCardAttack(minion.card)) - (power.value || 0);
    minion.currentAttack = Math.max(0, newAttack);
  });

  return state;
}

function executeReveal(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  const revealCount = power.value || 1;
  if (opponent.hand.length > 0) {
    const revealed: string[] = [];
    for (let i = 0; i < Math.min(revealCount, opponent.hand.length); i++) {
      const randomIndex = Math.floor(Math.random() * opponent.hand.length);
      const card = opponent.hand[randomIndex];
      revealed.push(card.card.name);
      (card as any).isRevealed = true;
    }
  }

  return state;
}

function executeSummon(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];

  if (!power.summonData || player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return state;

  const token: CardInstance = {
    instanceId: `${playerType}_hero_summon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    card: {
      id: 99998,
      name: power.summonData.name,
      manaCost: 0,
      attack: power.summonData.attack,
      health: power.summonData.health,
      description: power.summonData.keywords?.join(', ') || '',
      rarity: 'token' as any,
      type: 'minion',
      keywords: power.summonData.keywords || []
    },
    currentHealth: power.summonData.health,
    currentAttack: power.summonData.attack,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: true,
    attacksPerformed: 0,
    hasDivineShield: power.summonData.keywords?.includes('divine_shield') || false,
    isFrozen: false
  };

  player.battlefield.push(token);

  return state;
}

function executeFreeze(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  const targetMinion = opponent.battlefield.find(m => m.instanceId === targetId);
  if (targetMinion) {
    targetMinion.isFrozen = true;

    // Deal damage if upgraded
    if (power.value) {
      targetMinion.currentHealth = (targetMinion.currentHealth || getCardHealth(targetMinion.card)) - power.value;
      opponent.battlefield = opponent.battlefield.filter(m => (m.currentHealth || 0) > 0);
    }
  }

  return state;
}

function executeStealth(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const player = state.players[playerType];

  const targetMinion = player.battlefield.find(m => m.instanceId === targetId);
  if (targetMinion) {
    (targetMinion as any).hasStealth = true;

    // Apply attack buff if present
    if (power.value) {
      targetMinion.currentAttack = (targetMinion.currentAttack || getCardAttack(targetMinion.card)) + power.value;
    }
  }

  return state;
}

function executeDraw(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  let newState = state;
  const player = newState.players[playerType];

  // First handle the draw effect
  const drawCount = power.value || 1;
  for (let i = 0; i < drawCount; i++) {
    if (player.deck.length > 0 && player.hand.length < MAX_HAND_SIZE) {
      const drawnCardData = player.deck.shift();
      if (drawnCardData) {
        const cardInstance: CardInstance = {
          instanceId: `${playerType}_draw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          card: drawnCardData,
          currentHealth: getCardHealth(drawnCardData),
          currentAttack: getCardAttack(drawnCardData),
          canAttack: false,
          isPlayed: false,
          isSummoningSick: true,
          attacksPerformed: 0
        };
        player.hand.push(cardInstance);
      }
    }
  }

  // Handle Odin's secondary "reveal" effect if present
  if (power.secondaryValue && power.id.startsWith('odin-power')) {
    newState = executeReveal(newState, playerType, {
      ...power,
      value: power.secondaryValue
    });
  }

  return newState;
}

function executeCopy(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  const copyCount = power.value || 1;
  for (let i = 0; i < copyCount; i++) {
    if (opponent.hand.length > 0 && player.hand.length < MAX_HAND_SIZE) {
      const randomIndex = Math.floor(Math.random() * opponent.hand.length);
      const copiedCard = { ...opponent.hand[randomIndex] };
      copiedCard.instanceId = `${playerType}_copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      player.hand.push(copiedCard);
    }
  }

  return state;
}

function executeScry(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];

  const scryCount = power.value || 1;
  // Note: Actual scry UI would need to be handled by the game UI

  return state;
}

function executeGrantKeyword(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId || !power.grantKeyword) return state;

  const player = state.players[playerType];
  const targetMinion = player.battlefield.find(m => m.instanceId === targetId);

  if (targetMinion) {
    applyKeyword(targetMinion, power.grantKeyword);
  }

  return state;
}

/**
 * Apply a keyword to a minion
 */
function applyKeyword(minion: CardInstance, keyword: string): void {
  switch (keyword) {
    case 'taunt':
      addKeyword(minion, 'taunt');
      break;
    case 'divine_shield':
      minion.hasDivineShield = true;
      break;
    case 'stealth':
      (minion as any).hasStealth = true;
      break;
    case 'frozen':
      minion.isFrozen = true;
      break;
    case 'poisonous':
      minion.hasPoisonous = true;
      break;
    case 'lifesteal':
      minion.hasLifesteal = true;
      break;
    case 'rush':
      minion.isRush = true;
      break;
  }
}

// ==================== NEW EFFECT EXECUTORS ====================

/**
 * Heal - Restore health to target minion or hero
 */
function executeHeal(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];
  const healAmount = power.value || 0;

  if (!targetId) return state;

  if (targetId === 'hero' || targetId === 'friendly_hero') {
    const maxHp = player.maxHealth;
    player.heroHealth = Math.min((player.heroHealth || maxHp) + healAmount, maxHp);
  } else if (targetId === 'enemy_hero') {
    const oppMaxHp = opponent.maxHealth;
    opponent.heroHealth = Math.min((opponent.heroHealth || oppMaxHp) + healAmount, oppMaxHp);
  } else {
    const friendlyMinion = player.battlefield.find(m => m.instanceId === targetId);
    if (friendlyMinion) {
      const maxHealth = getCardHealth(friendlyMinion.card);
      friendlyMinion.currentHealth = Math.min(
        (friendlyMinion.currentHealth || maxHealth) + healAmount,
        maxHealth
      );
    } else {
      const enemyMinion = opponent.battlefield.find(m => m.instanceId === targetId);
      if (enemyMinion) {
        const maxHealth = getCardHealth(enemyMinion.card);
        enemyMinion.currentHealth = Math.min(
          (enemyMinion.currentHealth || maxHealth) + healAmount,
          maxHealth
        );
      }
    }
  }

  return state;
}

/**
 * Damage Hero - Deal direct damage to enemy hero
 */
function executeDamageHero(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const damageAmount = power.value || 0;
  return dealDamage(state, opponentType, 'hero', damageAmount, undefined, undefined, playerType);
}

/**
 * Summon Random - Summon a random minion from summonPool
 */
function executeSummonRandom(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];

  if (!power.summonPool || power.summonPool.length === 0 || player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    return state;
  }

  const randomIndex = Math.floor(Math.random() * power.summonPool.length);
  const summonName = power.summonPool[randomIndex];

  const bonusAttack = power.bonusStats?.attack || 0;
  const bonusHealth = power.bonusStats?.health || 0;

  const baseAttack = 1;
  const baseHealth = 1;

  const token: CardInstance = {
    instanceId: `${playerType}_random_summon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    card: {
      id: 99997,
      name: summonName,
      manaCost: 0,
      attack: baseAttack + bonusAttack,
      health: baseHealth + bonusHealth,
      description: '',
      rarity: 'token' as any,
      type: 'minion',
      keywords: []
    },
    currentHealth: baseHealth + bonusHealth,
    currentAttack: baseAttack + bonusAttack,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: true,
    attacksPerformed: 0,
    hasDivineShield: false,
    isFrozen: false
  };

  player.battlefield.push(token);

  return state;
}

/**
 * Silence - Remove all text/buffs from target minion
 */
function executeSilence(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  let targetMinion = player.battlefield.find(m => m.instanceId === targetId);
  if (!targetMinion) {
    targetMinion = opponent.battlefield.find(m => m.instanceId === targetId);
  }

  if (targetMinion) {
    targetMinion.currentAttack = getCardAttack(targetMinion.card);
    targetMinion.currentHealth = Math.min(
      targetMinion.currentHealth || getCardHealth(targetMinion.card),
      getCardHealth(targetMinion.card)
    );

    targetMinion.hasDivineShield = false;
    targetMinion.isTaunt = false;
    targetMinion.hasLifesteal = false;
    targetMinion.hasPoisonous = false;
    targetMinion.isFrozen = false;
    (targetMinion as any).hasStealth = false;
    targetMinion.isRush = false;
    targetMinion.hasCharge = false;

    clearKeywords(targetMinion);
    (targetMinion.card as any).battlecry = undefined;
    (targetMinion.card as any).deathrattle = undefined;
    (targetMinion.card as any).aura = undefined;
    (targetMinion.card as any).passive = undefined;

    (targetMinion as any).isSilenced = true;

  }

  return state;
}

/**
 * Set Stats - Set a minion's attack and health to specific values
 */
function executeSetStats(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  let targetMinion = player.battlefield.find(m => m.instanceId === targetId);
  if (!targetMinion) {
    targetMinion = opponent.battlefield.find(m => m.instanceId === targetId);
  }

  if (targetMinion) {
    const newAttack = power.value || 0;
    const newHealth = power.secondaryValue || power.value || 0;

    targetMinion.currentAttack = newAttack;
    targetMinion.currentHealth = newHealth;

  }

  return state;
}

/**
 * Self Damage and Summon - Take self-damage and summon a minion
 */
function executeSelfDamageAndSummon(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];
  const selfDamageAmount = power.selfDamage || 0;

  if (selfDamageAmount > 0) {
    player.heroHealth = Math.max(0, (player.heroHealth ?? player.health ?? 100) - selfDamageAmount);
  }

  if (power.summonData && player.battlefield.length < MAX_BATTLEFIELD_SIZE) {
    const token: CardInstance = {
      instanceId: `${playerType}_selfdmg_summon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      card: {
        id: 99996,
        name: power.summonData.name,
        manaCost: 0,
        attack: power.summonData.attack,
        health: power.summonData.health,
        description: power.summonData.keywords?.join(', ') || '',
        rarity: 'token' as any,
        type: 'minion',
        keywords: power.summonData.keywords || []
      },
      currentHealth: power.summonData.health,
      currentAttack: power.summonData.attack,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0,
      hasDivineShield: power.summonData.keywords?.includes('divine_shield') || false,
      isFrozen: false
    };

    player.battlefield.push(token);
  }

  return state;
}

/**
 * Sacrifice Summon - Destroy a friendly minion to summon something
 */
function executeSacrificeSummon(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];

  if (!targetId) {
    if (player.battlefield.length === 0) return state;
    const randomIndex = Math.floor(Math.random() * player.battlefield.length);
    const sacrificed = player.battlefield[randomIndex];
    state = destroyCard(state, sacrificed.instanceId, playerType);
  } else {
    const targetIndex = player.battlefield.findIndex(m => m.instanceId === targetId);
    if (targetIndex === -1) return state;
    const sacrificed = player.battlefield[targetIndex];
    state = destroyCard(state, sacrificed.instanceId, playerType);
  }

  if (power.summonData && player.battlefield.length < MAX_BATTLEFIELD_SIZE) {
    const token: CardInstance = {
      instanceId: `${playerType}_sacrifice_summon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      card: {
        id: 99995,
        name: power.summonData.name,
        manaCost: 0,
        attack: power.summonData.attack,
        health: power.summonData.health,
        description: power.summonData.keywords?.join(', ') || '',
        rarity: 'token' as any,
        type: 'minion',
        keywords: power.summonData.keywords || []
      },
      currentHealth: power.summonData.health,
      currentAttack: power.summonData.attack,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0,
      hasDivineShield: power.summonData.keywords?.includes('divine_shield') || false,
      isFrozen: false
    };

    player.battlefield.push(token);
  }

  return state;
}

// ==================== NEW EFFECT HANDLERS ====================

/**
 * Heal and Buff - Heal a target AND give stat buffs
 * Parameters: healValue (or value), attack buff, health buff (via secondaryValue or bonusStats)
 */
function executeHealAndBuff(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const player = state.players[playerType];
  const targetMinion = player.battlefield.find(m => m.instanceId === targetId);

  if (targetMinion) {
    const healAmount = (power as any).healValue || power.value || 0;
    const attackBuff = (power as any).attack || power.bonusStats?.attack || 0;
    const healthBuff = (power as any).health || power.bonusStats?.health || power.secondaryValue || 0;

    const maxHealth = getCardHealth(targetMinion.card);
    targetMinion.currentHealth = Math.min(
      (targetMinion.currentHealth || maxHealth) + healAmount,
      maxHealth + healthBuff
    );
    targetMinion.currentAttack = (targetMinion.currentAttack || getCardAttack(targetMinion.card)) + attackBuff;
    if (healthBuff > 0) {
      targetMinion.currentHealth = (targetMinion.currentHealth || maxHealth) + healthBuff;
    }

  }

  return state;
}

/**
 * Grant Divine Shield - Give a friendly minion Divine Shield keyword
 */
function executeGrantDivineShield(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const player = state.players[playerType];
  const targetMinion = player.battlefield.find(m => m.instanceId === targetId);

  if (targetMinion) {
    targetMinion.hasDivineShield = true;
    addKeyword(targetMinion, 'divine_shield');
  }

  return state;
}

/**
 * Generate Enemy Class Card - Add a random card from enemy's class to hand
 */
function executeGenerateEnemyClassCard(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  if (player.hand.length >= MAX_HAND_SIZE) {
    return state;
  }

  const enemyClass = opponent.heroClass || (opponent as any).class || 'neutral';
  
  const generatedCard: CardInstance = {
    instanceId: `${playerType}_generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    card: {
      id: 99990,
      name: `${enemyClass} Card`,
      manaCost: Math.floor(Math.random() * 5) + 1,
      description: `Generated from ${enemyClass} class`,
      rarity: 'common' as any,
      type: 'spell',
      class: enemyClass
    },
    canAttack: false,
    isPlayed: false,
    isSummoningSick: true,
    attacksPerformed: 0
  };

  player.hand.push(generatedCard);

  return state;
}

/**
 * Equip Weapon - Equip a specific weapon to the hero
 * Parameters: weaponData or weaponId
 */
function executeEquipWeapon(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];

  const weaponData = power.weaponData;
  if (!weaponData) {
    debug.warn(`  - No weapon data provided for equip_weapon`);
    return state;
  }

  const weapon: EquippedWeapon = {
    attack: weaponData.attack,
    durability: weaponData.durability,
    card: {
      id: 99991,
      name: weaponData.name || 'Hero Weapon',
      manaCost: power.weaponCost || 0,
      attack: weaponData.attack,
      durability: weaponData.durability,
      description: weaponData.keywords?.join(', ') || '',
      rarity: 'common' as any,
      type: 'weapon',
      keywords: weaponData.keywords || []
    } as any
  };

  player.weapon = weapon as any;

  return state;
}

/**
 * Equip Random Weapon - Equip a random weapon from a pool
 * Uses weaponPool or summonPool for weapon names
 */
function executeEquipRandomWeapon(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];

  const weaponPool = (power as any).weaponPool || power.summonPool || ['Random Axe', 'Random Sword', 'Random Mace'];
  const randomIndex = Math.floor(Math.random() * weaponPool.length);
  const weaponName = weaponPool[randomIndex];

  const baseAttack = power.weaponData?.attack || 2;
  const baseDurability = power.weaponData?.durability || 2;

  const weapon: EquippedWeapon = {
    attack: baseAttack,
    durability: baseDurability,
    card: {
      id: 99992,
      name: weaponName,
      manaCost: power.weaponCost || 0,
      attack: baseAttack,
      durability: baseDurability,
      description: '',
      rarity: 'common' as any,
      type: 'weapon',
      keywords: power.weaponData?.keywords || []
    } as any
  };

  player.weapon = weapon as any;

  return state;
}

/**
 * Discover - Show 3 random cards from pool, player picks one
 * Parameters: discoverPool or discoverType
 * Note: Full UI interaction would need to be handled by the game UI layer
 */
function executeDiscover(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];

  if (player.hand.length >= MAX_HAND_SIZE) {
    return state;
  }

  const discoverPool = (power as any).discoverPool || power.summonPool || ['Foreseen Card'];
  
  const choices: string[] = [];
  for (let i = 0; i < 3 && i < discoverPool.length; i++) {
    const randomIndex = Math.floor(Math.random() * discoverPool.length);
    choices.push(discoverPool[randomIndex]);
  }

  const selectedCard = choices[Math.floor(Math.random() * choices.length)];

  const costReduction = power.costReduction || 0;
  const baseCost = Math.max(0, Math.floor(Math.random() * 5) + 1 - costReduction);

  const discoveredCard: CardInstance = {
    instanceId: `${playerType}_discover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    card: {
      id: 99993,
      name: selectedCard,
      manaCost: baseCost,
      description: `Foreseen card${costReduction > 0 ? ` (cost reduced by ${costReduction})` : ''}`,
      rarity: 'rare' as any,
      type: 'spell',
      keywords: []
    },
    canAttack: false,
    isPlayed: false,
    isSummoningSick: true,
    attacksPerformed: 0
  };

  player.hand.push(discoveredCard);

  (player as any).pendingDiscover = {
    choices,
    selected: selectedCard,
    resolved: true
  };

  return state;
}

/**
 * Damage and Poison - Deal damage AND apply Poison status effect
 * Parameters: value (damage amount)
 */
function executeDamageAndPoison(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  const targetMinion = opponent.battlefield.find(m => m.instanceId === targetId);
  if (targetMinion) {
    const damageAmount = power.value || 1;
    
    targetMinion.currentHealth = (targetMinion.currentHealth || getCardHealth(targetMinion.card)) - damageAmount;

    targetMinion.hasPoisonous = true;
    (targetMinion as any).isPoisoned = true;
    addKeyword(targetMinion, 'poisoned');

    opponent.battlefield = opponent.battlefield.filter(m => (m.currentHealth || 0) > 0);
  }

  return state;
}

// ==================== NEW MISSING EFFECT HANDLERS ====================

/**
 * Damage All - Deal damage to ALL minions on the board (both friendly and enemy)
 * Parameters: value (damage amount)
 */
function executeDamageAll(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];
  const damageAmount = power.value || 0;

  opponent.battlefield.forEach(minion => {
    minion.currentHealth = (minion.currentHealth || getCardHealth(minion.card)) - damageAmount;
  });

  player.battlefield.forEach(minion => {
    minion.currentHealth = (minion.currentHealth || getCardHealth(minion.card)) - damageAmount;
  });

  opponent.battlefield = opponent.battlefield.filter(m => (m.currentHealth || 0) > 0);
  player.battlefield = player.battlefield.filter(m => (m.currentHealth || 0) > 0);

  return state;
}

/**
 * Conditional Destroy - Destroy target minion if it meets a condition
 * Parameters: condition (e.g., "damaged", "cost_less_than_3", maxAttack, etc.)
 */
function executeConditionalDestroy(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  let targetMinion = opponent.battlefield.find(m => m.instanceId === targetId);
  let targetOwner = opponent;
  if (!targetMinion) {
    targetMinion = player.battlefield.find(m => m.instanceId === targetId);
    targetOwner = player;
  }

  if (!targetMinion) return state;

  let shouldDestroy = false;
  const condition = power.condition;

  if (condition) {
    if (condition.maxAttack !== undefined) {
      const minionAttack = targetMinion.currentAttack || getCardAttack(targetMinion.card);
      shouldDestroy = minionAttack <= condition.maxAttack;
    }
    if (condition.minAttack !== undefined) {
      const minionAttack = targetMinion.currentAttack || getCardAttack(targetMinion.card);
      shouldDestroy = shouldDestroy || minionAttack >= condition.minAttack;
    }
    if (condition.maxHealth !== undefined) {
      const minionHealth = targetMinion.currentHealth || getCardHealth(targetMinion.card);
      shouldDestroy = shouldDestroy || minionHealth <= condition.maxHealth;
    }
    if (condition.hasKeyword) {
      shouldDestroy = shouldDestroy || hasKeyword(targetMinion, condition.hasKeyword);
    }
  } else {
    const maxHealth = getCardHealth(targetMinion.card);
    const currentHealth = targetMinion.currentHealth || maxHealth;
    shouldDestroy = currentHealth < maxHealth;
  }

  if (shouldDestroy) {
    targetOwner.battlefield = targetOwner.battlefield.filter(m => m.instanceId !== targetId);
  } else {
  }

  return state;
}

/**
 * Bounce - Return a minion to its owner's hand
 */
function executeBounce(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];

  let targetMinion = opponent.battlefield.find(m => m.instanceId === targetId);
  let targetOwner = opponent;

  if (!targetMinion) {
    targetMinion = player.battlefield.find(m => m.instanceId === targetId);
    targetOwner = player;
  }

  if (targetMinion && targetOwner.hand.length < MAX_HAND_SIZE) {
    targetOwner.battlefield = targetOwner.battlefield.filter(m => m.instanceId !== targetId);

    const returnedCard: CardInstance = {
      ...targetMinion,
      instanceId: `${targetOwner === player ? playerType : opponentType}_bounced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currentHealth: getCardHealth(targetMinion.card),
      currentAttack: getCardAttack(targetMinion.card),
      isPlayed: false,
      canAttack: false,
      isSummoningSick: true,
      attacksPerformed: 0
    };
    targetOwner.hand.push(returnedCard);
  }

  return state;
}

/**
 * Bounce Damage - Return minion to hand AND deal damage to it (or its controller)
 * Parameters: damageValue (or value)
 */
function executeBounceDamage(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];
  const damageValue = (power as any).damageValue || power.value || 0;

  let targetMinion = opponent.battlefield.find(m => m.instanceId === targetId);
  let targetOwner = opponent;

  if (!targetMinion) {
    targetMinion = player.battlefield.find(m => m.instanceId === targetId);
    targetOwner = player;
  }

  if (targetMinion) {
    targetMinion.currentHealth = (targetMinion.currentHealth || getCardHealth(targetMinion.card)) - damageValue;

    if ((targetMinion.currentHealth || 0) > 0 && targetOwner.hand.length < MAX_HAND_SIZE) {
      targetOwner.battlefield = targetOwner.battlefield.filter(m => m.instanceId !== targetId);

      const returnedCard: CardInstance = {
        ...targetMinion,
        instanceId: `bounced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        currentHealth: getCardHealth(targetMinion.card),
        currentAttack: getCardAttack(targetMinion.card),
        isPlayed: false,
        canAttack: false,
        isSummoningSick: true,
        attacksPerformed: 0
      };
      targetOwner.hand.push(returnedCard);
    } else if ((targetMinion.currentHealth || 0) <= 0) {
      targetOwner.battlefield = targetOwner.battlefield.filter(m => (m.currentHealth || 0) > 0);
    }
  }

  return state;
}

/**
 * Bounce To Hand - Return any minion to its owner's hand (alias for bounce)
 */
function executeBounceToHand(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  return executeBounce(state, playerType, targetId, power);
}

/**
 * Bounce And Damage Hero - Return minion to hand AND damage the enemy hero
 */
function executeBounceAndDamageHero(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];
  const damageValue = (power as any).damageValue || power.value || 0;

  let targetMinion = opponent.battlefield.find(m => m.instanceId === targetId);
  let targetOwner = opponent;

  if (!targetMinion) {
    targetMinion = player.battlefield.find(m => m.instanceId === targetId);
    targetOwner = player;
  }

  if (targetMinion && targetOwner.hand.length < MAX_HAND_SIZE) {
    targetOwner.battlefield = targetOwner.battlefield.filter(m => m.instanceId !== targetId);

    const returnedCard: CardInstance = {
      ...targetMinion,
      instanceId: `bounced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currentHealth: getCardHealth(targetMinion.card),
      currentAttack: getCardAttack(targetMinion.card),
      isPlayed: false,
      canAttack: false,
      isSummoningSick: true,
      attacksPerformed: 0
    };
    targetOwner.hand.push(returnedCard);
  }

  return dealDamage(state, opponentType, 'hero', damageValue, undefined, undefined, playerType);
}

/**
 * Heal All Friendly - Heal all friendly characters (hero + minions)
 * Parameters: value (heal amount)
 */
function executeHealAllFriendly(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];
  const healAmount = power.value || 0;

  const maxHp = player.maxHealth;
  player.heroHealth = Math.min((player.heroHealth || maxHp) + healAmount, maxHp);

  player.battlefield.forEach(minion => {
    const maxHealth = getCardHealth(minion.card);
    minion.currentHealth = Math.min(
      (minion.currentHealth || maxHealth) + healAmount,
      maxHealth
    );
  });

  return state;
}

/**
 * Gain Armor - Add armor to the hero
 * Parameters: value (armor amount)
 */
function executeGainArmor(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];
  const armorAmount = power.armorValue || power.value || 0;

  player.heroArmor = Math.min(30, (player.heroArmor || 0) + armorAmount);

  return state;
}

/**
 * Chain Damage - Deal damage to a target and adjacent minions
 * Parameters: value (damage amount)
 */
function executeChainDamage(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId: string | undefined,
  power: NorseHeroPower
): GameState {
  if (!targetId) return state;

  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];
  const damageAmount = power.value || 0;

  const targetIndex = opponent.battlefield.findIndex(m => m.instanceId === targetId);
  if (targetIndex === -1) return state;

  const indicesToDamage = [targetIndex];
  if (targetIndex > 0) indicesToDamage.push(targetIndex - 1);
  if (targetIndex < opponent.battlefield.length - 1) indicesToDamage.push(targetIndex + 1);

  indicesToDamage.forEach(idx => {
    const minion = opponent.battlefield[idx];
    if (minion) {
      minion.currentHealth = (minion.currentHealth || getCardHealth(minion.card)) - damageAmount;
    }
  });

  opponent.battlefield = opponent.battlefield.filter(m => (m.currentHealth || 0) > 0);

  return state;
}

/**
 * Draw And Damage - Draw cards AND take self damage
 * Parameters: drawCount (or value), damageValue (or selfDamage)
 */
function executeDrawAndDamage(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];
  const drawCount = (power as any).drawCount || power.value || 1;
  const damageValue = (power as any).damageValue || power.selfDamage || 0;

  player.heroHealth = Math.max(0, (player.heroHealth ?? player.health ?? 100) - damageValue);

  for (let i = 0; i < drawCount; i++) {
    if (player.deck.length > 0 && player.hand.length < MAX_HAND_SIZE) {
      const drawnCardData = player.deck.shift();
      if (drawnCardData) {
        const cardInstance: CardInstance = {
          instanceId: `${playerType}_draw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          card: drawnCardData,
          currentHealth: getCardHealth(drawnCardData),
          currentAttack: getCardAttack(drawnCardData),
          canAttack: false,
          isPlayed: false,
          isSummoningSick: true,
          attacksPerformed: 0
        };
        player.hand.push(cardInstance);
      }
    }
  }

  return state;
}

/**
 * Buff Hero - Give the hero a temporary attack buff (and optionally armor)
 * Parameters: attack (attack value), armorValue (optional)
 */
function executeBuffHero(
  state: GameState,
  playerType: 'player' | 'opponent',
  power: NorseHeroPower
): GameState {
  const player = state.players[playerType];
  const attackBuff = (power as any).attack || power.value || 0;
  const armorBuff = power.armorValue || 0;

  // Initialize tempStats if it doesn't exist
  if (!player.tempStats) {
    player.tempStats = {};
  }
  
  player.tempStats.attack = (player.tempStats.attack || 0) + attackBuff;

  if (armorBuff > 0) {
    player.heroArmor = Math.min(30, (player.heroArmor || 0) + armorBuff);
  }

  return state;
}

// ==================== WEAPON UPGRADE ====================

/**
 * Apply a weapon upgrade to a hero
 */
export function applyWeaponUpgrade(
  state: GameState,
  playerType: 'player' | 'opponent',
  heroId: string
): GameState {
  const hero = getNorseHeroById(heroId);
  if (!hero) return state;

  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerType];

  // Check mana
  if (player.mana.current < 5) return state;

  // Deduct mana
  player.mana.current -= 5;


  // Execute immediate effect (simplified - would need full effect system)

  // Upgrade the hero power
  player.heroPower = {
    ...player.heroPower,
    name: hero.upgradedHeroPower.name,
    description: hero.upgradedHeroPower.description
  };

  // Mark as upgraded in game state (extended property)
  (player as any).heroPowerUpgraded = true;
  (player as any).upgradedHeroId = heroId;


  return newState;
}

// ==================== HERO PASSIVES ====================

/**
 * Execute hero passive effects for a specific trigger
 */
export function executeHeroPassive(
  state: GameState,
  heroId: string,
  ownerType: 'player' | 'opponent',
  trigger: HeroPassiveTrigger,
  context?: {
    playedMinionId?: string;
    attackingMinionId?: string;
    attackTargetId?: string;
    targetIsFrozen?: boolean;
    targetType?: 'friendly' | 'enemy';
    minionElement?: string;
  }
): GameState {
  const hero = getNorseHeroById(heroId);
  if (!hero) return state;

  const passive = hero.passive;
  if (passive.trigger !== trigger) return state;

  // Check conditions
  if (passive.condition) {
    if (passive.condition.minionElement && context?.minionElement !== passive.condition.minionElement) {
      return state;
    }
    if (passive.condition.targetType && context?.targetType !== passive.condition.targetType) {
      return state;
    }
  }

  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  const owner = newState.players[ownerType];
  const opponent = newState.players[ownerType === 'player' ? 'opponent' : 'player'];


  // Helper to check minion eligibility based on conditions
  const isEligible = (minion: CardInstance): boolean => {
    if (passive.condition?.minionElement && (minion.card as any).element !== passive.condition.minionElement) {
      return false;
    }
    // For requiresFrozen, check if the attack target is frozen (not just any enemy)
    if (passive.condition?.requiresFrozen) {
      if (context?.attackTargetId) {
        const target = opponent.battlefield.find(m => m.instanceId === context.attackTargetId);
        if (!target?.isFrozen && !context?.targetIsFrozen) return false;
      } else {
        // Fallback: check if any enemy is frozen for aura-type passives
        const hasAnyFrozenEnemy = opponent.battlefield.some(m => m.isFrozen);
        if (!hasAnyFrozenEnemy) return false;
      }
    }
    if (passive.condition?.requiresStealth && !(minion as any).hasStealth) {
      return false;
    }
    return true;
  };

  // Apply passive effect based on type
  switch (passive.effectType) {
    case 'buff_attack':
      owner.battlefield.forEach(minion => {
        if (isEligible(minion)) {
          minion.currentAttack = (minion.currentAttack || getCardAttack(minion.card)) + (passive.value || 0);
        }
      });
      break;
    case 'buff_health':
      owner.battlefield.forEach(minion => {
        if (isEligible(minion)) {
          minion.currentHealth = (minion.currentHealth || getCardHealth(minion.card)) + (passive.value || 0);
        }
      });
      break;
    case 'buff':
      owner.battlefield.forEach(minion => {
        if (isEligible(minion)) {
          minion.currentAttack = (minion.currentAttack || getCardAttack(minion.card)) + (passive.value || 0);
          minion.currentHealth = (minion.currentHealth || getCardHealth(minion.card)) + (passive.value || 0);
        }
      });
      break;
    case 'buff_damage':
      owner.battlefield.forEach(minion => {
        if (isEligible(minion)) {
          (minion as any).bonusDamage = ((minion as any).bonusDamage || 0) + (passive.value || 0);
        }
      });
      break;
    case 'damage_reduction':
      owner.battlefield.forEach(minion => {
        if (isEligible(minion)) {
          (minion as any).damageReduction = ((minion as any).damageReduction || 0) + (passive.value || 0);
        }
      });
      break;
    case 'damage_hero': {
      const opponentType: 'player' | 'opponent' = ownerType === 'player' ? 'opponent' : 'player';
      newState = dealDamage(newState, opponentType, 'hero', passive.value || 0, undefined, undefined, ownerType);
      break;
    }
    case 'cost_reduction':
      owner.hand.forEach(card => {
        if (!passive.condition?.minionElement || (card.card as any).element === passive.condition.minionElement) {
          (card as any).costReduction = ((card as any).costReduction || 0) + (passive.value || 0);
        }
      });
      break;
    case 'grant_keyword':
      const keywordToGrant = passive.grantKeyword || 'poisonous';
      owner.battlefield.forEach(minion => {
        if (isEligible(minion)) {
          applyKeyword(minion, keywordToGrant);
        }
      });
      break;
    case 'heal':
      owner.battlefield.forEach(minion => {
        if (isEligible(minion)) {
          const maxHealth = getCardHealth(minion.card);
          minion.currentHealth = Math.min(
            (minion.currentHealth || maxHealth) + (passive.value || 0),
            maxHealth
          );
        }
      });
      break;
    case 'debuff_attack':
      opponent.battlefield.forEach(minion => {
        minion.currentAttack = Math.max(0, (minion.currentAttack || getCardAttack(minion.card)) - (passive.value || 0));
      });
      break;
    case 'reveal':
      if (opponent.hand.length > 0) {
        const randomIndex = Math.floor(Math.random() * opponent.hand.length);
        (opponent.hand[randomIndex] as any).isRevealed = true;
      }
      break;
    case 'copy':
      if (opponent.deck.length > 0 && owner.hand.length < MAX_HAND_SIZE) {
        const randomIndex = Math.floor(Math.random() * opponent.deck.length);
        const copiedCardData = opponent.deck[randomIndex];
        const copiedCardInstance: CardInstance = {
          instanceId: `${ownerType}_passive_copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          card: { ...copiedCardData },
          currentHealth: getCardHealth(copiedCardData),
          currentAttack: getCardAttack(copiedCardData),
          canAttack: false,
          isPlayed: false,
          isSummoningSick: true,
          attacksPerformed: 0
        };
        owner.hand.push(copiedCardInstance);
      }
      break;
    default:
      debug.warn(`[HERO PASSIVE] Unknown effect type: ${passive.effectType}`);
  }

  return newState;
}

/**
 * Get passive description for UI display
 */
export function getHeroPassiveDescription(heroId: string): string {
  const hero = getNorseHeroById(heroId);
  if (!hero) return '';
  
  return `${hero.passive.name}: ${hero.passive.description}`;
}

/**
 * Get hero power description for UI
 */
export function getHeroPowerDescription(heroId: string, isUpgraded: boolean = false): string {
  const hero = getNorseHeroById(heroId);
  if (!hero) return '';
  
  const power = isUpgraded ? hero.upgradedHeroPower : hero.heroPower;
  return `${power.name} (${power.cost} mana): ${power.description}`;
}
