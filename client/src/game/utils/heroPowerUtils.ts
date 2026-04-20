import { HeroClass, HeroPower, GameState, CardInstance, Position, CardData, CardRarity, CardType, EquippedWeapon } from '../types';
import { NorseHero, NorseHeroPower } from '../types/NorseTypes';
import { updateEnrageEffects } from './mechanics/enrageUtils';
import { destroyCard } from './zoneUtils';
import { drawCard, addCardToHand } from './deckUtils';
import { handleInspireEffects } from './mechanicsUtils';
import { ALL_NORSE_HEROES } from '../data/norseHeroes';
import { NORSE_HEROES } from '../data/norseHeroes/heroDefinitions';
import { isMinion, isWeapon, isSpell, isHero, getAttack, getHealth, getDurability } from './cards/typeGuards';
import { addKeyword, clearKeywords } from './cards/keywordUtils';
import { trackQuestProgress } from './quests/questProgress';
import { debug } from '../config/debugConfig';
import { dealDamage, addArmor } from './effects/damageUtils';
import { MAX_BATTLEFIELD_SIZE } from '../constants/gameConstants';

// Type for animation callback function
// Used to trigger animations when hero power is used
type AnimationCallback = (position: Position, heroClass: HeroClass) => void;

/**
 * Hero Power upgrade interface for upgraded versions
 */
export interface HeroPowerUpgrade {
  name: string;
  description: string;
  requiresSourceCard?: boolean; // Does this upgrade require a specific source card?
  sourceCardName?: string; // Name of the card that grants this upgrade (e.g., "Justicar Trueheart")
}

/**
 * Get the default hero power for a given hero class
 */
export function getDefaultHeroPower(heroClass: HeroClass): HeroPower {
  // Check if we have a Norse hero definition for this class
  // For Odin (Mage class), we want Wisdom of the Ravens
  const odin = NORSE_HEROES['hero-odin'];
  switch (heroClass) {
    case 'mage':
      return {
        name: odin.heroPower.name,
        description: odin.heroPower.description,
        cost: odin.heroPower.cost,
        used: false,
        class: 'mage'
      };
    case 'warrior':
      return {
        name: 'Armor Up!',
        description: 'Gain 2 armor.',
        cost: 2,
        used: false,
        class: 'warrior'
      };
    case 'paladin':
      return {
        name: 'Reinforce',
        description: 'Summon a 1/1 Silver Hand Recruit.',
        cost: 2,
        used: false,
        class: 'paladin'
      };
    case 'hunter':
      return {
        name: 'Steady Shot',
        description: 'Deal 2 damage to the enemy hero.',
        cost: 2,
        used: false,
        class: 'hunter'
      };
    case 'druid':
      return {
        name: 'Shapeshift',
        description: 'Gain 1 Attack this turn and 1 Armor.',
        cost: 2,
        used: false,
        class: 'druid'
      };
    case 'priest':
      return {
        name: 'Lesser Heal',
        description: 'Restore 2 Health to any target.',
        cost: 2,
        used: false,
        class: 'priest'
      };
    case 'warlock':
      return {
        name: 'Life Tap',
        description: 'Draw a card and take 2 damage.',
        cost: 2,
        used: false,
        class: 'warlock'
      };
    case 'shaman':
      return {
        name: 'Totemic Call',
        description: 'Summon a random basic Totem.',
        cost: 2,
        used: false,
        class: 'shaman'
      };
    case 'rogue':
      return {
        name: 'Dagger Mastery',
        description: 'Equip a 1/2 Dagger.',
        cost: 2,
        used: false,
        class: 'rogue'
      };
    case 'berserker':
      return {
        name: 'Berserker Claws',
        description: 'Gain +1 Attack this turn.',
        cost: 1, // Berserker's hero power costs 1 mana
        used: false,
        class: 'berserker'
      };
    default:
      // Default to mage if something goes wrong
      return {
        name: 'Fireblast',
        description: 'Deal 1 damage to any target.',
        cost: 2,
        used: false,
        class: 'mage'
      };
  }
}

/**
 * Get an upgraded hero power for a given hero class
 * These are usually granted by cards like Justicar Trueheart or through quests
 */
export function getUpgradedHeroPower(heroClass: HeroClass): HeroPower {
  // Check for Odin's upgraded power
  const odin = NORSE_HEROES['hero-odin'];
  if (heroClass === 'mage' && odin?.upgradedHeroPower) {
    return {
      name: odin.upgradedHeroPower.name,
      description: odin.upgradedHeroPower.description,
      cost: odin.upgradedHeroPower.cost,
      used: false,
      class: 'mage',
      isUpgraded: true
    };
  }

  switch (heroClass) {
    case 'mage':
      return {
        name: 'Fireblast Rank 2',
        description: 'Deal 2 damage to any target.',
        cost: 2,
        used: false,
        class: 'mage',
        isUpgraded: true
      };
    case 'warrior':
      return {
        name: 'Tank Up!',
        description: 'Gain 4 armor.',
        cost: 2,
        used: false,
        class: 'warrior',
        isUpgraded: true
      };
    case 'paladin':
      return {
        name: 'The Silver Hand',
        description: 'Summon two 1/1 Silver Hand Recruits.',
        cost: 2,
        used: false,
        class: 'paladin',
        isUpgraded: true
      };
    case 'hunter':
      return {
        name: 'Ballista Shot',
        description: 'Deal 3 damage to the enemy hero.',
        cost: 2,
        used: false,
        class: 'hunter',
        isUpgraded: true
      };
    case 'druid':
      return {
        name: 'Dire Shapeshift',
        description: 'Gain 2 Attack this turn and 2 Armor.',
        cost: 2,
        used: false,
        class: 'druid',
        isUpgraded: true
      };
    case 'priest':
      return {
        name: 'Heal',
        description: 'Restore 4 Health to any target.',
        cost: 2,
        used: false,
        class: 'priest',
        isUpgraded: true
      };
    case 'warlock':
      return {
        name: 'Soul Tap',
        description: 'Draw a card.',
        cost: 2,
        used: false,
        class: 'warlock',
        isUpgraded: true
      };
    case 'shaman':
      return {
        name: 'Totemic Slam',
        description: 'Summon a Totem of your choice.',
        cost: 2,
        used: false,
        class: 'shaman',
        isUpgraded: true
      };
    case 'rogue':
      return {
        name: 'Poisoned Daggers',
        description: 'Equip a 2/2 Dagger.',
        cost: 2,
        used: false,
        class: 'rogue',
        isUpgraded: true
      };
    case 'berserker':
      return {
        name: 'Berserker\'s Bite',
        description: 'Gain +2 Attack this turn.',
        cost: 1,
        used: false,
        class: 'berserker',
        isUpgraded: true
      };
    default:
      return getDefaultHeroPower(heroClass);
  }
}

/**
 * Execute hero power based on the player's hero class
 */
export function executeHeroPower(
  state: GameState, 
  playerType: 'player' | 'opponent',
  targetId?: string, // Card ID or 'hero' for the opponent's hero
  targetType?: 'card' | 'hero', // Type of the target
  targetPosition?: Position, // Position for animation effects
  onHeroPowerAnimation?: AnimationCallback // Optional callback for animation effects
): GameState {
  // Deep clone the state to avoid mutation
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerType];
  
  // Check if hero power can be used
  if (player.heroPower.used) {
    debug.error('Hero power already used this turn');
    return state;
  }
  
  // Check if player has enough mana
  if (player.mana.current < player.heroPower.cost) {
    debug.error(`Not enough mana. Need ${player.heroPower.cost} but only have ${player.mana.current}`);
    return state;
  }
  
  // Execute the hero power based on class
  const heroClass = player.heroClass;
  
  // Trigger hero power animation if callback and target position are provided
  if (onHeroPowerAnimation && targetPosition) {
    onHeroPowerAnimation(targetPosition, heroClass);
  }
  
  let updatedState;
  
  // SPECIAL HANDLING: If the current hero has a custom Norse Hero definition, use it
  const heroId = player.hero?.id;
  const norseHero = heroId ? ALL_NORSE_HEROES[heroId] : null;

  if (norseHero) {
    updatedState = executeNorseHeroPower(newState, playerType, norseHero, targetId, targetType);
  } else {
    // Execute the appropriate default hero power based on class
    switch (heroClass) {
      case 'mage':
        updatedState = executeMagePower(newState, playerType, targetId, targetType);
        break;
      case 'warrior':
        updatedState = executeWarriorPower(newState, playerType);
        break;
      case 'paladin':
        updatedState = executePaladinPower(newState, playerType);
        break;
      case 'hunter':
        updatedState = executeHunterPower(newState, playerType);
        break;
      case 'druid':
        updatedState = executeDruidPower(newState, playerType);
        break;
      case 'priest':
        updatedState = executePriestPower(newState, playerType, targetId, targetType);
        break;
      case 'warlock':
        updatedState = executeWarlockPower(newState, playerType);
        break;
      case 'shaman':
        updatedState = executeShamanPower(newState, playerType);
        break;
      case 'rogue':
        updatedState = executeRoguePower(newState, playerType);
        break;
      case 'berserker':
        updatedState = executeBerserkerPower(newState, playerType);
        break;
      default:
        debug.error('Unknown hero class');
        return state;
    }
  }
  
  // Process any Inspire effects after hero power execution
  updatedState = handleInspireEffects(updatedState, playerType);
  
  return updatedState;
}

/**
 * Execute custom Norse hero powers based on effectType
 * Handles all 76 Norse hero powers with their unique effects
 */
function executeNorseHeroPower(
  state: GameState,
  playerType: 'player' | 'opponent',
  hero: NorseHero,
  targetId?: string,
  targetType?: 'card' | 'hero'
): GameState {
  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];
  const power = player.heroPower.isUpgraded && hero.upgradedHeroPower ? hero.upgradedHeroPower : hero.heroPower;
  
  if (!power) {
    debug.error(`[Hero Power] Norse hero power not found for ${hero.name}`);
    return state;
  }

  // Apply cost and mark as used
  player.mana.current -= player.heroPower.cost;
  player.heroPower.used = true;

  debug.log(`[Hero Power] ${hero.name} used ${power.name}: ${power.description}`);

  // Execute based on effectType
  switch (power.effectType) {
    // ==================== DRAW EFFECTS ====================
    case 'draw': {
      const drawCount = power.value || 1;
      for (let i = 0; i < drawCount; i++) {
        state = drawCard(state, playerType);
      }
      // Handle reveal if secondaryValue exists (like Odin)
      if (power.secondaryValue && opponent.hand.length > 0) {
        const revealCount = Math.min(power.secondaryValue, opponent.hand.length);
        const revealedCards = opponent.hand.slice(0, revealCount);
        debug.log(`[Hero Power] Revealed ${revealCount} cards from opponent's hand:`, revealedCards.map(c => c.card.name));
        // Mark cards as revealed (visual indicator)
        for (let i = 0; i < revealCount; i++) {
          if (opponent.hand[i]) {
            (opponent.hand[i] as any).isRevealed = true;
          }
        }
      }
      return state;
    }

    case 'reveal': {
      const revealCount = power.value || 1;
      if (opponent.hand.length > 0) {
        const actualReveal = Math.min(revealCount, opponent.hand.length);
        for (let i = 0; i < actualReveal; i++) {
          const randomIdx = Math.floor(Math.random() * opponent.hand.length);
          (opponent.hand[randomIdx] as any).isRevealed = true;
          debug.log(`[Hero Power] Revealed: ${opponent.hand[randomIdx].card.name}`);
        }
      }
      return state;
    }

    // ==================== DAMAGE EFFECTS ====================
    case 'damage_aoe': {
      const damage = power.value || 1;
      // Deal damage to all enemy minions
      for (const minion of opponent.battlefield) {
        if (minion.currentHealth !== undefined) {
          minion.currentHealth -= damage;
          debug.log(`[Hero Power] Dealt ${damage} damage to ${minion.card.name}`);
        }
      }
      // Check for deaths
      state = updateEnrageEffects(state);
      const deadMinions = opponent.battlefield.filter(m => (m.currentHealth ?? 0) <= 0);
      for (const dead of deadMinions) {
        state = destroyCard(state, dead.instanceId, opponentType);
      }
      return state;
    }

    case 'damage_single': {
      const damage = power.value || 1;
      if (!targetId) {
        debug.error('[Hero Power] damage_single requires a target');
        return state;
      }
      
      if (targetType === 'hero') {
        state = dealDamage(state, opponentType, 'hero', damage, undefined, undefined, playerType);
        debug.log(`[Hero Power] Dealt ${damage} damage to enemy hero`);
      } else {
        // Find target minion
        const allBattlefields = [...player.battlefield, ...opponent.battlefield];
        const targetMinion = allBattlefields.find(m => m.instanceId === targetId);
        if (targetMinion && targetMinion.currentHealth !== undefined) {
          targetMinion.currentHealth -= damage;
          debug.log(`[Hero Power] Dealt ${damage} damage to ${targetMinion.card.name}`);
          
          // Apply secondary effects (freeze, debuff, etc.)
          if (power.grantKeyword === 'frozen') {
            (targetMinion as any).isFrozen = true;
            debug.log(`[Hero Power] Froze ${targetMinion.card.name}`);
          }
          
          state = updateEnrageEffects(state);
          if (targetMinion.currentHealth <= 0) {
            const isEnemy = opponent.battlefield.includes(targetMinion);
            state = destroyCard(state, targetMinion.instanceId, isEnemy ? opponentType : playerType);
          }
        }
      }
      
      // Handle secondaryValue for armor gain (like Tyr)
      if (power.secondaryValue) {
        state.players[playerType].heroArmor = Math.min(30, (state.players[playerType].heroArmor || 0) + power.secondaryValue);
        debug.log(`[Hero Power] Gained ${power.secondaryValue} armor`);
      }
      return state;
    }

    case 'damage_random': {
      const damage = power.value || 1;
      if (opponent.battlefield.length === 0) {
        debug.log('[Hero Power] No enemy minions to damage');
        return state;
      }
      const randomIdx = Math.floor(Math.random() * opponent.battlefield.length);
      const target = opponent.battlefield[randomIdx];
      if (target.currentHealth !== undefined) {
        target.currentHealth -= damage;
        debug.log(`[Hero Power] Dealt ${damage} random damage to ${target.card.name}`);
      }
      
      // Handle splash damage (secondaryValue)
      const splashDamageAmount = (power as NorseHeroPower).secondaryValue ?? 0;
      if (splashDamageAmount > 0) {
        for (let i = 0; i < opponent.battlefield.length; i++) {
          const minion = opponent.battlefield[i];
          if (i !== randomIdx && minion && minion.currentHealth !== undefined) {
            minion.currentHealth -= splashDamageAmount;
          }
        }
      }
      
      state = updateEnrageEffects(state);
      const deadMinions = opponent.battlefield.filter(m => (m.currentHealth ?? 0) <= 0);
      for (const dead of deadMinions) {
        state = destroyCard(state, dead.instanceId, opponentType);
      }
      return state;
    }

    case 'damage_hero': {
      const damage = power.value || 2;
      state = dealDamage(state, opponentType, 'hero', damage, undefined, undefined, playerType);
      debug.log(`[Hero Power] Dealt ${damage} damage to enemy hero`);
      return state;
    }

    // ==================== BUFF EFFECTS ====================
    case 'buff_single': {
      const value = power.value || 1;
      const healthValue = power.secondaryValue ?? value;
      
      if (!targetId && power.targetType === 'random_friendly' && player.battlefield.length > 0) {
        const randomIdx = Math.floor(Math.random() * player.battlefield.length);
        const target = player.battlefield[randomIdx];
        if (isMinion(target.card)) {
          target.card.attack = (target.card.attack ?? 0) + value;
          if (power.duration !== 'this_turn' && target.currentHealth !== undefined) {
            target.currentHealth += healthValue;
            target.card.health = (target.card.health ?? 0) + healthValue;
          }
        }
        debug.log(`[Hero Power] Buffed ${target.card.name} +${value}/+${healthValue}`);
        
        if (power.grantKeyword) {
          applyKeywordToMinion(target, power.grantKeyword);
        }
      } else if (targetId) {
        const target = player.battlefield.find(m => m.instanceId === targetId);
        if (target && isMinion(target.card)) {
          target.card.attack = (target.card.attack ?? 0) + value;
          if (power.duration !== 'this_turn' && target.currentHealth !== undefined) {
            target.currentHealth += healthValue;
            target.card.health = (target.card.health ?? 0) + healthValue;
          }
          debug.log(`[Hero Power] Buffed ${target.card.name} +${value}/+${healthValue}`);
          
          if (power.grantKeyword) {
            applyKeywordToMinion(target, power.grantKeyword);
          }
        }
      }
      
      // Heal hero if secondaryValue specified for that purpose (like Freya)
      if (power.secondaryValue && hero.id === 'hero-freya') {
        const freyaMaxHp = player.maxHealth;
        player.heroHealth = Math.min((player.heroHealth || freyaMaxHp) + power.secondaryValue, freyaMaxHp);
        debug.log(`[Hero Power] Restored ${power.secondaryValue} health to hero`);
      }
      return state;
    }

    case 'buff' as any:
    case 'buff_aoe': {
      const value = power.value || 1;
      for (const minion of player.battlefield) {
        if (isMinion(minion.card) && minion.currentHealth !== undefined) {
          minion.card.attack = (minion.card.attack ?? 0) + value;
          minion.currentHealth += value;
          minion.card.health = (minion.card.health ?? 0) + value;
        }
      }
      debug.log(`[Hero Power] Buffed all friendly minions +${value}/+${value}`);
      return state;
    }

    case 'buff_hero': {
      const attackValue = power.value || 1;
      const armorValue = power.armorValue || 1;
      if (!player.tempStats) player.tempStats = { attack: 0 };
      player.tempStats.attack = (player.tempStats.attack || 0) + attackValue;
      player.heroArmor = Math.min(30, (player.heroArmor || 0) + armorValue);
      debug.log(`[Hero Power] Hero gained +${attackValue} attack and +${armorValue} armor`);
      return state;
    }

    // ==================== HEAL EFFECTS ====================
    case 'heal':
    case 'heal_single': {
      const healAmount = power.value || 2;
      if (!targetId) {
        debug.error('[Hero Power] heal requires a target');
        return state;
      }
      
      if (targetType === 'hero' || targetId === 'player' || targetId === 'opponent') {
        const targetPlayer = targetId === 'opponent' ? opponent : player;
        const tpMaxHp = targetPlayer.maxHealth;
        targetPlayer.heroHealth = Math.min((targetPlayer.heroHealth || tpMaxHp) + healAmount, tpMaxHp);
        debug.log(`[Hero Power] Restored ${healAmount} health to hero`);
      } else {
        const allMinions = [...player.battlefield, ...opponent.battlefield];
        const target = allMinions.find(m => m.instanceId === targetId);
        if (target && target.currentHealth !== undefined) {
          const maxHealth = getHealth(target.card) || 1;
          target.currentHealth = Math.min(target.currentHealth + healAmount, maxHealth);
          debug.log(`[Hero Power] Restored ${healAmount} health to ${target.card.name}`);
        }
      }
      return state;
    }

    case 'heal_aoe':
    case 'heal_all_friendly': {
      const healAmount = power.value || 1;
      for (const minion of player.battlefield) {
        if (minion.currentHealth !== undefined) {
          const maxHealth = getHealth(minion.card) || 1;
          minion.currentHealth = Math.min(minion.currentHealth + healAmount, maxHealth);
        }
      }
      debug.log(`[Hero Power] Restored ${healAmount} health to all friendly minions`);
      return state;
    }

    case 'heal_and_buff': {
      const healAmount = power.value || 2;
      const buffAmount = power.secondaryValue || 1;
      if (targetId) {
        const target = player.battlefield.find(m => m.instanceId === targetId);
        if (target && isMinion(target.card) && target.currentHealth !== undefined) {
          const maxHealth = getHealth(target.card) || 1;
          target.currentHealth = Math.min(target.currentHealth + healAmount, maxHealth);
          target.card.attack = (target.card.attack ?? 0) + buffAmount;
          debug.log(`[Hero Power] Healed ${target.card.name} for ${healAmount} and gave +${buffAmount} attack`);
        }
      }
      return state;
    }

    // ==================== COPY EFFECTS ====================
    case 'copy': {
      const copyCount = power.value || 1;
      if (opponent.hand.length === 0) {
        debug.log('[Hero Power] No cards to copy from opponent');
        return state;
      }
      
      for (let i = 0; i < copyCount && opponent.hand.length > 0; i++) {
        const randomIdx = Math.floor(Math.random() * opponent.hand.length);
        const cardToCopy = opponent.hand[randomIdx].card;
        state = addCardToHand(state, playerType, { ...cardToCopy });
        debug.log(`[Hero Power] Copied ${cardToCopy.name} from opponent's hand`);
      }
      return state;
    }

    // ==================== SUMMON EFFECTS ====================
    case 'summon': {
      if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
        debug.log('[Hero Power] Battlefield is full');
        return state;
      }
      
      const summonData = power.summonData;
      if (!summonData) {
        debug.error('[Hero Power] No summon data provided');
        return state;
      }
      
      const summonedMinion: CardInstance = {
        instanceId: `${playerType}_summon_${Date.now()}`,
        card: {
          id: 99000 + Math.floor(Math.random() * 1000),
          name: summonData.name,
          manaCost: 1,
          attack: summonData.attack,
          health: summonData.health,
          description: summonData.keywords?.join(', ') || '',
          rarity: 'common' as CardRarity,
          type: 'minion' as const,
          keywords: summonData.keywords || []
        },
        currentHealth: summonData.health,
        canAttack: summonData.keywords?.includes('charge') || false,
        isPlayed: true,
        isSummoningSick: !summonData.keywords?.includes('charge') && !summonData.keywords?.includes('rush'),
        attacksPerformed: 0,
        hasDivineShield: summonData.keywords?.includes('divine_shield') || false
      };
      
      // Handle Rush
      if (summonData.keywords?.includes('rush')) {
        (summonedMinion as any).hasRush = true;
        summonedMinion.canAttack = true;
      }
      
      player.battlefield.push(summonedMinion);
      debug.log(`[Hero Power] Summoned ${summonData.name} (${summonData.attack}/${summonData.health})`);
      
      // Track quest progress for summoned minion
      trackQuestProgress(playerType, 'summon_minion', summonedMinion.card);
      return state;
    }

    case 'summon_random': {
      if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
        debug.log('[Hero Power] Battlefield is full');
        return state;
      }
      
      const summonPool = power.summonPool || ['healing_totem', 'searing_totem', 'stoneclaw_totem', 'wrath_of_air_totem'];
      const totemDefinitions: Record<string, { name: string; attack: number; health: number; keywords: string[] }> = {
        'healing_totem': { name: 'Healing Totem', attack: 0, health: 2, keywords: [] },
        'searing_totem': { name: 'Searing Totem', attack: 1, health: 1, keywords: [] },
        'stoneclaw_totem': { name: 'Stoneclaw Totem', attack: 0, health: 2, keywords: ['taunt'] },
        'wrath_of_air_totem': { name: 'Wrath of Air Totem', attack: 0, health: 2, keywords: ['spell_damage'] }
      };
      
      const existingTotems = player.battlefield
        .filter(m => m.card.name.includes('Totem'))
        .map(m => m.card.name);
      
      const availablePool = summonPool.filter(t => !existingTotems.includes(totemDefinitions[t]?.name));
      if (availablePool.length === 0) {
        debug.log('[Hero Power] All totems already summoned');
        return state;
      }
      
      const selected = availablePool[Math.floor(Math.random() * availablePool.length)];
      const totemData = totemDefinitions[selected] || { name: 'Totem', attack: 0, health: 2, keywords: [] };
      
      const bonusStats = power.bonusStats || { attack: 0, health: 0 };
      
      const totem: CardInstance = {
        instanceId: `${playerType}_totem_${Date.now()}`,
        card: {
          id: 99100 + Math.floor(Math.random() * 100),
          name: totemData.name,
          manaCost: 1,
          attack: totemData.attack + bonusStats.attack,
          health: totemData.health + bonusStats.health,
          description: totemData.keywords.join(', '),
          rarity: 'common' as CardRarity,
          type: 'minion' as CardType,
          keywords: totemData.keywords,
          race: 'spirit'
        } as CardData,
        currentHealth: totemData.health + bonusStats.health,
        canAttack: false,
        isPlayed: true,
        isSummoningSick: true,
        attacksPerformed: 0,
        hasDivineShield: false
      };
      
      player.battlefield.push(totem);
      debug.log(`[Hero Power] Summoned ${totemData.name}`);
      
      // Track quest progress for summoned totem
      trackQuestProgress(playerType, 'summon_minion', totem.card);
      return state;
    }

    case 'self_damage_and_summon': {
      const selfDamage = power.value || 2;
      player.heroHealth = Math.max(0, (player.heroHealth || 100) - selfDamage);
      debug.log(`[Hero Power] Took ${selfDamage} damage`);
      
      if (player.heroHealth <= 0) {
        state.gamePhase = "game_over";
        state.winner = opponentType;
        return state;
      }
      
      if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
        debug.log('[Hero Power] Battlefield is full');
        return state;
      }
      
      const summonData = power.summonData;
      if (summonData) {
        const minion: CardInstance = {
          instanceId: `${playerType}_summon_${Date.now()}`,
          card: {
            id: 99200 + Math.floor(Math.random() * 100),
            name: summonData.name,
            manaCost: 1,
            attack: summonData.attack,
            health: summonData.health,
            description: '',
            rarity: 'common' as CardRarity,
            type: 'minion' as const,
            keywords: summonData.keywords || []
          },
          currentHealth: summonData.health,
          canAttack: summonData.keywords?.includes('rush') || summonData.keywords?.includes('charge') || false,
          isPlayed: true,
          isSummoningSick: !summonData.keywords?.includes('charge'),
          attacksPerformed: 0,
          hasDivineShield: false
        };
        
        if (summonData.keywords?.includes('rush')) {
          (minion as any).hasRush = true;
        }
        
        player.battlefield.push(minion);
        debug.log(`[Hero Power] Summoned ${summonData.name}`);
        
        // Track quest progress for summoned minion
        trackQuestProgress(playerType, 'summon_minion', minion.card);
      }
      return state;
    }

    // ==================== KEYWORD EFFECTS ====================
    case 'grant_keyword':
    case 'grant_divine_shield': {
      if (!targetId) {
        debug.error('[Hero Power] grant_keyword requires a target');
        return state;
      }
      
      const target = player.battlefield.find(m => m.instanceId === targetId);
      if (target && isMinion(target.card)) {
        const keyword = power.grantKeyword || 'divine_shield';
        applyKeywordToMinion(target, keyword);
        debug.log(`[Hero Power] Granted ${keyword} to ${target.card.name}`);
        
        // Handle stat bonuses with keyword
        if (power.value) {
          target.card.attack = (target.card.attack ?? 0) + power.value;
          debug.log(`[Hero Power] Also gave +${power.value} attack`);
        }
        if (power.secondaryValue && target.currentHealth !== undefined) {
          target.currentHealth += power.secondaryValue;
          target.card.health = (target.card.health ?? 0) + power.secondaryValue;
          debug.log(`[Hero Power] Also gave +${power.secondaryValue} health`);
        }
      }
      return state;
    }

    case 'stealth': {
      if (!targetId) {
        debug.error('[Hero Power] stealth requires a target');
        return state;
      }
      
      const target = player.battlefield.find(m => m.instanceId === targetId);
      if (target && isMinion(target.card)) {
        (target as any).hasStealth = true;
        addKeyword(target, 'stealth');
        debug.log(`[Hero Power] Granted Stealth to ${target.card.name}`);
      }
      return state;
    }

    case 'silence': {
      if (!targetId) {
        debug.error('[Hero Power] silence requires a target');
        return state;
      }
      
      const allMinions = [...player.battlefield, ...opponent.battlefield];
      const target = allMinions.find(m => m.instanceId === targetId);
      if (target && isMinion(target.card)) {
        // Remove all keywords and effects
        clearKeywords(target);
        target.card.battlecry = undefined;
        target.card.deathrattle = undefined;
        (target as any).hasDivineShield = false;
        (target as any).hasTaunt = false;
        (target as any).hasStealth = false;
        (target as any).isSilenced = true;
        debug.log(`[Hero Power] Silenced ${target.card.name}`);
        
        // Deal damage if upgraded (Hoenir+)
        if (power.value && target.currentHealth !== undefined) {
          target.currentHealth -= power.value;
          state = updateEnrageEffects(state);
          if (target.currentHealth <= 0) {
            const isEnemy = opponent.battlefield.includes(target);
            state = destroyCard(state, target.instanceId, isEnemy ? opponentType : playerType);
          }
        }
      }
      return state;
    }

    case 'freeze': {
      if (!targetId) {
        debug.error('[Hero Power] freeze requires a target');
        return state;
      }
      
      const target = opponent.battlefield.find(m => m.instanceId === targetId);
      if (target) {
        (target as any).isFrozen = true;
        target.canAttack = false;
        debug.log(`[Hero Power] Froze ${target.card.name}`);
      }
      return state;
    }

    // ==================== UTILITY EFFECTS ====================
    case 'scry': {
      const scryCount = power.value || 1;
      if (player.deck.length === 0) {
        debug.log('[Hero Power] Deck is empty');
        return state;
      }
      
      // Look at top cards
      const topCards = player.deck.slice(0, scryCount);
      debug.log(`[Hero Power] Scrying top ${scryCount} card(s):`, topCards.map(c => c.name));
      
      // For now, just draw the first card (simplified scry)
      state = drawCard(state, playerType);
      return state;
    }

    case 'debuff_single': {
      const debuffAmount = power.value || 2;
      if (!targetId) {
        debug.error('[Hero Power] debuff_single requires a target');
        return state;
      }
      
      const target = opponent.battlefield.find(m => m.instanceId === targetId);
      if (target && isMinion(target.card)) {
        target.card.attack = Math.max(0, getAttack(target.card) - debuffAmount);
        debug.log(`[Hero Power] Reduced ${target.card.name}'s attack by ${debuffAmount}`);
      }
      return state;
    }

    case 'equip_weapon': {
      const weaponData = power.weaponData;
      if (!weaponData) {
        debug.error('[Hero Power] No weapon data provided');
        return state;
      }
      
      const weapon: EquippedWeapon = {
        card: {
          id: 99300 + Math.floor(Math.random() * 100),
          name: weaponData.name || 'Wicked Knife',
          manaCost: power.weaponCost || 1,
          attack: weaponData.attack,
          durability: weaponData.durability,
          description: '',
          rarity: 'common' as CardRarity,
          type: 'weapon' as CardType,
          keywords: weaponData.keywords || []
        } as CardData,
        durability: weaponData.durability,
        attack: weaponData.attack
      };
      
      player.weapon = weapon as any;
      debug.log(`[Hero Power] Equipped ${weaponData.name || 'Wicked Knife'} (${weaponData.attack}/${weaponData.durability})`);
      return state;
    }

    // ==================== SPECIAL EFFECTS ====================
    case 'conditional_destroy': {
      if (!targetId) {
        debug.error('[Hero Power] conditional_destroy requires a target');
        return state;
      }
      
      const target = opponent.battlefield.find(m => m.instanceId === targetId);
      if (target && power.condition) {
        const maxAttack = power.condition.maxAttack ?? Infinity;
        const attack = getAttack(target.card);
        if (attack <= maxAttack) {
          state = destroyCard(state, target.instanceId, opponentType);
          debug.log(`[Hero Power] Destroyed ${target.card.name}`);
        } else {
          debug.log(`[Hero Power] ${target.card.name} doesn't meet condition (attack > ${maxAttack})`);
        }
      }
      return state;
    }

    case 'set_stats': {
      if (!targetId) {
        debug.error('[Hero Power] set_stats requires a target');
        return state;
      }
      
      const value = power.value || 2;
      const allMinions = [...player.battlefield, ...opponent.battlefield];
      const target = allMinions.find(m => m.instanceId === targetId);
      if (target && isMinion(target.card)) {
        (target.card as any).attack = value;
        (target.card as any).health = value;
        if (target.currentHealth !== undefined) {
          target.currentHealth = value;
        }
        debug.log(`[Hero Power] Set ${target.card.name}'s stats to ${value}/${value}`);
      }
      return state;
    }

    case 'bounce_to_hand':
    case 'bounce': {
      if (!targetId) {
        debug.error('[Hero Power] bounce requires a target');
        return state;
      }
      
      const targetIdx = opponent.battlefield.findIndex(m => m.instanceId === targetId);
      if (targetIdx !== -1) {
        const target = opponent.battlefield[targetIdx];
        opponent.battlefield.splice(targetIdx, 1);
        
        // Return to hand (reset stats)
        const cardData = { ...target.card };
        state = addCardToHand(state, opponentType, cardData);
        debug.log(`[Hero Power] Returned ${cardData.name} to opponent's hand`);
      }
      return state;
    }

    case 'bounce_and_damage_hero':
    case 'bounce_damage': {
      if (!targetId) {
        debug.error('[Hero Power] bounce_and_damage requires a target');
        return state;
      }
      
      const targetIdx = opponent.battlefield.findIndex(m => m.instanceId === targetId);
      if (targetIdx !== -1) {
        const target = opponent.battlefield[targetIdx];
        opponent.battlefield.splice(targetIdx, 1);
        
        const cardData = { ...target.card };
        state = addCardToHand(state, opponentType, cardData);
        debug.log(`[Hero Power] Returned ${cardData.name} to opponent's hand`);
        
        // Deal damage to hero
        const damage = power.value || 2;
        state = dealDamage(state, opponentType, 'hero', damage, undefined, undefined, playerType);
        debug.log(`[Hero Power] Dealt ${damage} damage to enemy hero`);
      }
      return state;
    }

    case 'sacrifice_summon': {
      if (!targetId) {
        debug.error('[Hero Power] sacrifice_summon requires a target');
        return state;
      }
      
      const targetIdx = player.battlefield.findIndex(m => m.instanceId === targetId);
      if (targetIdx !== -1) {
        const target = player.battlefield[targetIdx];
        debug.log(`[Hero Power] Sacrificed ${target.card.name}`);
        state = destroyCard(state, target.instanceId, playerType);
        
        // Summon replacement
        const summonData = power.summonData;
        if (summonData && player.battlefield.length < MAX_BATTLEFIELD_SIZE) {
          const minion: CardInstance = {
            instanceId: `${playerType}_shade_${Date.now()}`,
            card: {
              id: 99400 + Math.floor(Math.random() * 100),
              name: summonData.name,
              manaCost: 1,
              attack: summonData.attack,
              health: summonData.health,
              description: '',
              rarity: 'common' as CardRarity,
              type: 'minion' as const,
              keywords: summonData.keywords || []
            },
            currentHealth: summonData.health,
            canAttack: false,
            isPlayed: true,
            isSummoningSick: true,
            attacksPerformed: 0,
            hasDivineShield: false
          };
          
          player.battlefield.push(minion);
          debug.log(`[Hero Power] Summoned ${summonData.name}`);
          
          // Track quest progress for summoned minion
          trackQuestProgress(playerType, 'summon_minion', minion.card);
        }
      }
      return state;
    }

    case 'damage_and_poison': {
      const damage = power.value || 1;
      if (!targetId) {
        debug.error('[Hero Power] damage_and_poison requires a target');
        return state;
      }
      
      const target = opponent.battlefield.find(m => m.instanceId === targetId);
      if (target && target.currentHealth !== undefined) {
        target.currentHealth -= damage;
        (target as any).isPoisoned = true;
        debug.log(`[Hero Power] Dealt ${damage} damage to ${target.card.name} and applied Poison`);
        
        state = updateEnrageEffects(state);
        if (target.currentHealth <= 0) {
          state = destroyCard(state, target.instanceId, opponentType);
        }
      }
      return state;
    }

    // ==================== DEFAULT FALLBACK ====================
    default:
      debug.warn(`[Hero Power] Unhandled effectType: ${power.effectType} for ${hero.name}`);
      // Fallback to class-based power
      switch (player.heroClass) {
        case 'mage': return executeMagePower(state, playerType, targetId, targetType);
        case 'warrior': return executeWarriorPower(state, playerType);
        case 'paladin': return executePaladinPower(state, playerType);
        case 'hunter': return executeHunterPower(state, playerType);
        case 'druid': return executeDruidPower(state, playerType);
        case 'priest': return executePriestPower(state, playerType, targetId, targetType);
        case 'warlock': return executeWarlockPower(state, playerType);
        case 'shaman': return executeShamanPower(state, playerType);
        case 'rogue': return executeRoguePower(state, playerType);
        case 'berserker': return executeBerserkerPower(state, playerType);
        default: return state;
      }
  }
}

/**
 * Helper function to apply keywords to minions
 */
function applyKeywordToMinion(minion: CardInstance, keyword: string): void {
  switch (keyword) {
    case 'divine_shield':
      minion.hasDivineShield = true;
      addKeyword(minion, 'divine_shield');
      break;
    case 'taunt':
      (minion as any).hasTaunt = true;
      addKeyword(minion, 'taunt');
      break;
    case 'stealth':
      (minion as any).hasStealth = true;
      addKeyword(minion, 'stealth');
      break;
    case 'frozen':
      (minion as any).isFrozen = true;
      minion.canAttack = false;
      break;
    case 'poisonous':
    case 'poisonous_temp':
      (minion as any).hasPoisonous = true;
      addKeyword(minion, 'poisonous');
      break;
    default:
      addKeyword(minion, keyword);
      break;
  }
}

/**
 * Mage hero power: Deal 1 damage to any target
 * (Default Fireblast - used when no Norse hero is active)
 */
function executeMagePower(
  state: GameState, 
  playerType: 'player' | 'opponent',
  targetId?: string,
  targetType?: 'card' | 'hero'
): GameState {
  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];
  
  // Mage power requires a target
  if (!targetId || !targetType) {
    debug.error('Mage power requires a target');
    return state;
  }
  
  // Apply cost
  player.mana.current -= player.heroPower.cost;
  player.heroPower.used = true;
  
  // Deal 1 damage to the target
  if (targetType === 'hero') {
    state = dealDamage(state, opponentType, 'hero', 1, undefined, undefined, playerType);
  } else {
    // Find the target card
    const targetField = targetId.startsWith(playerType) 
      ? player.battlefield
      : opponent.battlefield;
    
    const targetIndex = targetField.findIndex(card => card.instanceId === targetId);
    
    if (targetIndex === -1) {
      debug.error('Target card not found');
      return state;
    }
    
    // Get the target card
    const targetCard = targetField[targetIndex];
    if (!targetCard.currentHealth) {
      debug.error('Target card has no health property');
      return state;
    }
    
    // Deal 1 damage
    targetCard.currentHealth -= 1;
    
    // Apply enrage effects
    state = updateEnrageEffects(state);
    
    // Check if the minion is destroyed
    if (targetCard.currentHealth <= 0) {
      const cardName = targetCard.card.name;
      const cardId = targetCard.instanceId;
      const targetPlayerType = targetId.startsWith(playerType) ? playerType : opponentType;
      
      
      // Use the imported destroyCard function
      state = destroyCard(state, cardId, targetPlayerType);
    }
  }
  
  return state;
}

/**
 * Warrior hero power: Gain 2 armor
 * 
 * Note: We'll simplify this to just add 2 health since we don't have an armor system
 */
function executeWarriorPower(state: GameState, playerType: 'player' | 'opponent'): GameState {
  const player = state.players[playerType];

  // Apply cost
  player.mana.current -= player.heroPower.cost;
  player.heroPower.used = true;

  // Gain 2 armor (or 4 if upgraded)
  const armorAmount = player.heroPower.isUpgraded ? 4 : 2;
  return addArmor(state, playerType, armorAmount);
}

/**
 * Paladin hero power: Summon a 1/1 Silver Hand Recruit
 */
function executePaladinPower(state: GameState, playerType: 'player' | 'opponent'): GameState {
  const player = state.players[playerType];

  // Check if the battlefield is full (max 7 minions)
  if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    debug.error('Battlefield is full, cannot summon recruit');
    return state;
  }
  
  // Apply cost
  player.mana.current -= player.heroPower.cost;
  player.heroPower.used = true;
  
  // Create a 1/1 Silver Hand Recruit
  const recruit: CardInstance = {
    instanceId: `${playerType}_recruit_${Date.now()}`,
    card: {
      id: 9999, // Special ID for Silver Hand Recruit
      name: 'Silver Hand Recruit',
      manaCost: 1,
      attack: 1,
      health: 1,
      description: 'Summoned by Paladin hero power',
      rarity: 'common',
      type: 'minion', // Need to specify card type
      keywords: [] // No special abilities
    },
    currentHealth: 1,
    canAttack: false, // Cannot attack on the turn it's summoned
    isPlayed: true,
    isSummoningSick: true,
    attacksPerformed: 0, // New property for Windfury tracking
    hasDivineShield: false
  };
  
  // Add the recruit to the battlefield
  player.battlefield.push(recruit);
  
  // Track quest progress for summoned recruit
  trackQuestProgress(playerType, 'summon_minion', recruit.card);
  
  return state;
}

/**
 * Hunter hero power: Deal 2 damage to the enemy hero
 */
function executeHunterPower(state: GameState, playerType: 'player' | 'opponent'): GameState {
  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];
  
  // Apply cost
  player.mana.current -= player.heroPower.cost;
  player.heroPower.used = true;
  
  // Deal 2 damage to enemy hero
  state = dealDamage(state, opponentType, 'hero', 2, undefined, undefined, playerType);

  return state;
}

/**
 * Druid hero power: Gain 1 Attack this turn and 1 Armor
 */
function executeDruidPower(state: GameState, playerType: 'player' | 'opponent'): GameState {
  const player = state.players[playerType];
  
  // Apply cost
  player.mana.current -= player.heroPower.cost;
  player.heroPower.used = true;
  
  // Gain 1 attack (we'll track this as a temp stat for this turn)
  if (!player.tempStats) {
    player.tempStats = { attack: 0 };
  }
  player.tempStats.attack = (player.tempStats.attack || 0) + 1;
  
  // Gain 1 armor 
  player.heroArmor = Math.min(30, (player.heroArmor || 0) + 1);
  
  
  return state;
}

/**
 * Priest hero power: Restore 2 Health to any target
 */
function executePriestPower(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId?: string,
  targetType?: 'card' | 'hero'
): GameState {
  const player = state.players[playerType];
  const opponentType = playerType === 'player' ? 'opponent' : 'player';
  const opponent = state.players[opponentType];
  
  // Priest power requires a target
  if (!targetId || !targetType) {
    debug.error('Priest power requires a target');
    return state;
  }
  
  // Apply cost
  player.mana.current -= player.heroPower.cost;
  player.heroPower.used = true;
  
  // Heal depending on target type
  if (targetType === 'hero') {
    const targetHero = targetId === 'player' ? state.players.player : state.players.opponent;
    
    // Heal the hero
    const heroMaxHp = targetHero.maxHealth;
    targetHero.heroHealth = Math.min((targetHero.heroHealth || heroMaxHp) + 2, heroMaxHp);
  } else {
    // Find the target card
    const targetField = targetId.startsWith(playerType) 
      ? player.battlefield
      : opponent.battlefield;
    
    const targetIndex = targetField.findIndex(card => card.instanceId === targetId);
    
    if (targetIndex === -1) {
      debug.error('Target card not found');
      return state;
    }
    
    const targetCard = targetField[targetIndex];
    if (!targetCard.currentHealth) {
      debug.error('Target card has no health property');
      return state;
    }
    
    const maxHealth = getHealth(targetCard.card) || 1;
    
    // Heal the card
    targetCard.currentHealth = Math.min(targetCard.currentHealth + 2, maxHealth);
  }
  
  return state;
}

/**
 * Warlock hero power: Draw a card and take 2 damage
 */
function executeWarlockPower(state: GameState, playerType: 'player' | 'opponent'): GameState {
  const player = state.players[playerType];
  
  // Apply cost
  player.mana.current -= player.heroPower.cost;
  player.heroPower.used = true;
  
  // Take 2 damage
  player.heroHealth = Math.max(0, (player.heroHealth || 100) - 2);
  
  // Check for game over (unlikely but possible if at 2 health)
  if (player.heroHealth <= 0) {
    state.gamePhase = "game_over";
    state.winner = playerType === 'player' ? 'opponent' : 'player';
    return state;
  }
  
  // Draw a card
  state = drawCard(state, playerType);
  
  return state;
}

/**
 * Shaman hero power: Summon a random basic Totem
 */
function executeShamanPower(state: GameState, playerType: 'player' | 'opponent'): GameState {
  const player = state.players[playerType];

  // Check if the battlefield is full (max 7 minions)
  if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    debug.error('Battlefield is full, cannot summon totem');
    return state;
  }
  
  // Apply cost
  player.mana.current -= player.heroPower.cost;
  player.heroPower.used = true;
  
  // Define the basic totems as proper CardData
  const basicTotems: CardData[] = [
    {
      id: 9001,
      name: 'Healing Totem',
      manaCost: 1,
      attack: 0,
      health: 2,
      description: 'At the end of your turn, restore 1 Health to all friendly minions.',
      rarity: 'common',
      type: 'minion',
      keywords: [],
      effects: [{ type: 'end_of_turn_heal', value: 1 }]
    } as CardData,
    {
      id: 9002,
      name: 'Searing Totem',
      manaCost: 1,
      attack: 1,
      health: 1,
      description: '',
      rarity: 'common',
      type: 'minion',
      keywords: []
    } as CardData,
    {
      id: 9003,
      name: 'Stoneclaw Totem',
      manaCost: 1,
      attack: 0,
      health: 2,
      description: 'Taunt',
      rarity: 'common',
      type: 'minion',
      keywords: ['taunt']
    } as CardData,
    {
      id: 9004,
      name: 'Wrath of Air Totem',
      manaCost: 1,
      attack: 0,
      health: 2,
      description: 'Spell Damage +1',
      rarity: 'common',
      type: 'minion',
      keywords: ['spell_damage'],
      spellDamage: 1
    } as CardData
  ];
  
  // Check which totems are already on the battlefield
  // Since 'totem' isn't a valid CardKeyword, we'll check by card name instead
  const existingTotemNames = player.battlefield
    .filter(card => card.card.name.includes('Totem'))
    .map(card => card.card.name);
  
  // Filter out totems that are already summoned
  const availableTotems = basicTotems.filter(totem => !existingTotemNames.includes(totem.name));
  
  // If all totems are already summoned, return
  if (availableTotems.length === 0) {
    return state;
  }
  
  // Randomly select one of the available totems
  const selectedTotem = availableTotems[Math.floor(Math.random() * availableTotems.length)];
  
  // Create a totem instance
  const totem: CardInstance = {
    instanceId: `${playerType}_totem_${Date.now()}`,
    card: selectedTotem,
    currentHealth: getHealth(selectedTotem) || 1,
    canAttack: false, // Cannot attack on the turn it's summoned
    isPlayed: true,
    isSummoningSick: true,
    attacksPerformed: 0,
    hasDivineShield: false
  };
  
  // Add the totem to the battlefield
  player.battlefield.push(totem);
  
  // Track quest progress for summoned totem
  trackQuestProgress(playerType, 'summon_minion', totem.card);
  
  return state;
}

/**
 * Rogue hero power: Equip a 1/2 Dagger
 */
function executeRoguePower(state: GameState, playerType: 'player' | 'opponent'): GameState {
  const player = state.players[playerType];
  
  // Apply cost
  player.mana.current -= player.heroPower.cost;
  player.heroPower.used = true;
  
  // Define the dagger weapon
  const dagger: EquippedWeapon = {
    card: {
      id: 9005,
      name: 'Wicked Knife',
      manaCost: 1,
      attack: 1,
      durability: 2,
      description: '',
      rarity: 'common',
      type: 'weapon',
      keywords: []
    } as CardData,
    durability: 2,
    attack: 1
  };
  
  // If player already has a weapon, destroy it
  if (player.weapon) {
  }
  
  // Equip the dagger
  player.weapon = dagger as any;
  
  return state;
}

/**
 * Berserker hero power: Gain +1 Attack this turn
 */
function executeBerserkerPower(state: GameState, playerType: 'player' | 'opponent'): GameState {
  const player = state.players[playerType];
  
  // Apply cost
  player.mana.current -= player.heroPower.cost;
  player.heroPower.used = true;
  
  // Gain 1 attack for this turn
  if (!player.tempStats) {
    player.tempStats = { attack: 0 };
  }
  player.tempStats.attack = (player.tempStats.attack || 0) + 1;
  
  
  return state;
}

/**
 * Reset hero power when the turn ends
 */
export function resetHeroPower(player: 'player' | 'opponent', state: GameState): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  newState.players[player].heroPower.used = false;
  
  // Also reset temporary stats that were granted by hero powers
  if (newState.players[player].tempStats) {
    newState.players[player].tempStats.attack = 0;
  }
  
  return newState;
}