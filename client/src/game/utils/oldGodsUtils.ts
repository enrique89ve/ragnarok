/**
 * Utility functions for handling Elder Titan mechanics
 * Gullveig (grows via buffs), Hyrrokkin (deathrattle resurrection),
 * Utgarda-Loki (random spell casting), Fornjot (summon from deck)
 *
 * Internal keys (cthunData, buffCThun, yogg_saron, etc.) kept for backwards compat.
 */

import { GameState, CardData, CardInstance, GameLogEventType, Player } from '../types';
import { createGameLogEvent } from './logUtils';
import { getCardDatabase } from '../data/cardDatabaseUtils';
import { applyDamage } from './gameUtils';
import { dealDamage } from './effects/damageUtils';
import { getRandomInt } from './randomUtils';
import { isMinion, getAttack, getHealth } from './cards/typeGuards';
import { debug } from '../config/debugConfig';
import { MAX_BATTLEFIELD_SIZE } from '../constants/gameConstants';
import { hasKeyword } from './cards/keywordUtils';
import { executeSpell } from './spells/spellUtils';

interface CThunState {
  baseAttack: number;
  baseHealth: number;
  currentAttack: number;
  currentHealth: number;
  buffsApplied: number;
}

interface PlayerWithCThun extends Player {
  cthunData?: CThunState;
  spellsCastThisGame?: number;
}

interface GameStateWithCThun extends Omit<GameState, 'players'> {
  players: {
    player: PlayerWithCThun;
    opponent: PlayerWithCThun;
  };
}

/**
 * Initialize Gullveig state for a player
 * Sets the initial values for Gullveig's stats (6/6)
 * @param state Current game state
 * @param playerType Player to initialize Gullveig for
 * @returns Updated game state with Gullveig initialized
 */
export function initializeCThun(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameStateWithCThun {
  // Create a deep copy of the state to avoid mutation
  const newState: GameStateWithCThun = JSON.parse(JSON.stringify(state));
  
  // Initialize Gullveig data if it doesn't exist
  if (!newState.players[playerType].cthunData) {
    newState.players[playerType].cthunData = {
      baseAttack: 6,
      baseHealth: 6,
      currentAttack: 6,
      currentHealth: 6,
      buffsApplied: 0
    };
  }
  
  return newState;
}

/**
 * Apply a buff to Gullveig (wherever she is)
 * @param state Current game state
 * @param playerType Player whose Gullveig to buff
 * @param attackBuff Attack buff to apply
 * @param healthBuff Health buff to apply
 * @returns Updated game state with Gullveig buffed
 */
export function buffCThun(
  state: GameState,
  playerType: 'player' | 'opponent',
  attackBuff: number,
  healthBuff: number
): GameStateWithCThun {
  // Create a deep copy of the state to avoid mutation
  let newState: GameStateWithCThun = JSON.parse(JSON.stringify(state));
  
  // Initialize Gullveig data if it doesn't exist
  if (!newState.players[playerType].cthunData) {
    newState = initializeCThun(newState, playerType);
  }
  
  // Apply buffs
  const cthunData = newState.players[playerType].cthunData!;
  cthunData.currentAttack += attackBuff;
  cthunData.currentHealth += healthBuff;
  cthunData.buffsApplied += 1;
  
  // Log the buff
  newState.gameLog.push(
    createGameLogEvent({
      type: 'cthun_buff' as GameLogEventType,
      player: playerType,
      text: `Gullveig gained +${attackBuff}/+${healthBuff} (now ${cthunData.currentAttack}/${cthunData.currentHealth}).`,
      value: cthunData.buffsApplied
    })
  );
  
  // Update any Gullveig card in the player's hand or battlefield (CardInstance)
  const updateCardInstanceStats = (card: CardInstance): CardInstance => {
    if (card.card.id === 60001 && isMinion(card.card)) { // Gullveig's ID
      card.card.attack = cthunData.currentAttack;
      card.card.health = cthunData.currentHealth;
      card.currentHealth = cthunData.currentHealth;
    }
    return card;
  };
  
  // Update any Gullveig card in the deck (CardData)
  const updateCardDataStats = (card: CardData): CardData => {
    if (card.id === 60001 && isMinion(card)) { // Gullveig's ID
      return {
        ...card,
        attack: cthunData.currentAttack,
        health: cthunData.currentHealth
      };
    }
    return card;
  };
  
  // Update all Gullveig instances
  newState.players[playerType].hand = newState.players[playerType].hand.map(updateCardInstanceStats);
  newState.players[playerType].deck = newState.players[playerType].deck.map(updateCardDataStats);
  newState.players[playerType].battlefield = newState.players[playerType].battlefield.map(updateCardInstanceStats);
  
  return newState;
}

/**
 * Check if Gullveig has at least 10 attack
 * Used for conditional effects like Jotun Shieldbearer
 * @param state Current game state
 * @param playerType Player to check Gullveig for
 * @returns Boolean indicating if Gullveig has 10+ attack
 */
export function isCThunPowered(
  state: GameState | GameStateWithCThun, 
  playerType: 'player' | 'opponent'
): boolean {
  // Cast to extended type to access cthunData
  const extendedState = state as GameStateWithCThun;
  
  // If Gullveig data doesn't exist, return false
  if (!extendedState.players[playerType].cthunData) {
    return false;
  }
  
  // Check if Gullveig has at least 10 attack
  return extendedState.players[playerType].cthunData.currentAttack >= 10;
}

/**
 * Execute Gullveig's battlecry
 * Deals damage equal to Gullveig's attack randomly split among all enemies
 * @param state Current game state
 * @param cthunInstanceId ID of the Gullveig instance
 * @param playerType Player who played Gullveig
 * @returns Updated game state after Gullveig's battlecry
 */
export function executeCThunBattlecry(
  state: GameState,
  cthunInstanceId: string,
  playerType: 'player' | 'opponent'
): GameState {
  // Create a deep copy of the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state));
  
  // Get the enemy player type
  const enemyType = playerType === 'player' ? 'opponent' : 'player';
  
  // Find Gullveig on the battlefield
  const cthunIndex = newState.players[playerType].battlefield.findIndex(
    (card: CardInstance) => card.instanceId === cthunInstanceId
  );
  
  if (cthunIndex === -1) {
    debug.error("Gullveig not found on battlefield");
    return state;
  }
  
  // Get Gullveig's attack value
  const cthun = newState.players[playerType].battlefield[cthunIndex];
  const damageAmount = getAttack(cthun.card);
  
  // Log the battlecry
  newState.gameLog.push(
    createGameLogEvent({
      type: 'cthun_battlecry' as GameLogEventType,
      player: playerType,
      text: `Gullveig unleashes ${damageAmount} damage randomly split among enemies.`,
      cardId: cthun.card.id.toString(),
      value: damageAmount
    })
  );
  
  // Get valid targets (enemy minions and hero)
  const enemyMinions = newState.players[enemyType].battlefield;
  
  // Split damage randomly
  for (let i = 0; i < damageAmount; i++) {
    // Gather all valid targets
    const targets = [...enemyMinions];
    
    // Add the enemy hero
    targets.push({
      instanceId: `${enemyType}_hero`,
      isHero: true
    } as any);
    
    // Skip if no targets
    if (targets.length === 0) {
      break;
    }
    
    // Select a random target
    const randomIndex = getRandomInt(0, targets.length - 1);
    const target = targets[randomIndex];
    
    // Apply 1 damage
    if ((target as any).isHero) {
      newState = dealDamage(newState as GameState, enemyType, 'hero', 1, undefined, undefined, playerType);
    } else {
      // Damage minion
      const targetPlayerId = enemyType; // Target is from the enemy
      newState = applyDamage(newState, targetPlayerId, target.instanceId, 1);
    }
  }
  
  return newState;
}

/**
 * Execute Hyrrokkin's battlecry
 * Resurrects deathrattle minions that died this game
 * @param state Current game state
 * @param nzothInstanceId ID of the Hyrrokkin instance
 * @param playerType Player who played Hyrrokkin
 * @returns Updated game state after Hyrrokkin's battlecry
 */
export function executeNZothBattlecry(
  state: GameState,
  nzothInstanceId: string,
  playerType: 'player' | 'opponent'
): GameState {
  // Create a deep copy of the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state));
  
  // Get the player's graveyard
  const graveyard = newState.players[playerType].graveyard || [];
  
  // Filter for deathrattle minions
  const deathrattleMinions = graveyard.filter(
    (card: CardInstance) => isMinion(card.card) &&
    (hasKeyword(card, 'deathrattle') || card.card.deathrattle)
  );
  
  // Log the battlecry
  newState.gameLog.push(
    createGameLogEvent({
      type: 'nzoth_battlecry' as GameLogEventType,
      player: playerType,
      text: `Hyrrokkin launches ${deathrattleMinions.length} Deathrattle minions back from the grave.`,
      cardId: '60101', // Hyrrokkin's ID
      value: deathrattleMinions.length
    })
  );
  
  // If no deathrattle minions, return unchanged state
  if (deathrattleMinions.length === 0) {
    return newState;
  }
  
  // Get available battlefield slots
  const maxMinions = 5;
  const currentMinions = newState.players[playerType].battlefield.length;
  const availableSlots = Math.max(0, maxMinions - currentMinions);
  
  // Only resurrect up to available slots
  const minionsToResurrect = deathrattleMinions.slice(0, availableSlots);
  
  // Summon each minion
  for (const minion of minionsToResurrect) {
    // Create a fresh copy of the minion
    const newMinion: CardInstance = {
      ...JSON.parse(JSON.stringify(minion)),
      instanceId: `${playerType}_nzoth_${minion.card.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      isPlayed: false,
      isSummoningSick: true,
      attacksPerformed: 0,
      currentHealth: getHealth(minion.card)
    };
    
    // Add to battlefield
    newState.players[playerType].battlefield.push(newMinion);
    
    // Log resurrection
    newState.gameLog.push(
      createGameLogEvent({
        type: 'summon' as GameLogEventType,
        player: playerType,
        text: `Hyrrokkin resurrected ${minion.card.name}.`,
        cardId: minion.card.id.toString()
      })
    );
  }
  
  return newState;
}

/**
 * Execute Utgarda-Loki's battlecry
 * Casts random spells for each spell played this game
 * @param state Current game state
 * @param yoggInstanceId ID of the Utgarda-Loki instance
 * @param playerType Player who played Utgarda-Loki
 * @returns Updated game state after Utgarda-Loki's battlecry
 */
export function executeYoggSaronBattlecry(
  state: GameState,
  yoggInstanceId: string,
  playerType: 'player' | 'opponent'
): GameState {
  // Create a deep copy of the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state));
  
  // Get number of spells cast this game
  const spellsCast = (newState.players[playerType] as any).spellsCastThisGame || 0;
  
  // Log the battlecry
  newState.gameLog.push(
    createGameLogEvent({
      type: 'yogg_saron_battlecry' as GameLogEventType,
      player: playerType,
      text: `Utgarda-Loki will cast ${spellsCast} random spells.`,
      cardId: '60102', // Utgarda-Loki's ID
      value: spellsCast
    })
  );
  
  // If no spells cast, return unchanged state
  if (spellsCast === 0) {
    return newState;
  }
  
  // Get all spells from the card database
  const cardDatabase = getCardDatabase();
  const allSpells = cardDatabase.filter(card => card.type === 'spell');
  
  // Cast random spells
  for (let i = 0; i < spellsCast; i++) {
    // Skip if Utgarda-Loki is no longer on the battlefield (destroyed by a previous spell)
    const yoggStillExists = newState.players[playerType].battlefield.some(
      (card: CardInstance) => card.instanceId === yoggInstanceId
    );
    
    if (!yoggStillExists) {
      newState.gameLog.push(
        createGameLogEvent({
          type: 'yogg_saron_stopped' as GameLogEventType,
          player: playerType,
          text: `Utgarda-Loki was destroyed, stopping spell casting.`,
          cardId: '60102'
        })
      );
      break;
    }
    
    // Pick a random spell
    const randomSpellIndex = getRandomInt(0, allSpells.length - 1);
    const randomSpell = allSpells[randomSpellIndex];
    
    // Log the spell cast
    newState.gameLog.push(
      createGameLogEvent({
        type: 'yogg_saron_cast' as GameLogEventType,
        player: playerType,
        text: `Utgarda-Loki casts ${randomSpell.name}.`,
        cardId: randomSpell.id.toString()
      })
    );
    
    // Execute the spell effect if the card has one
    if ((randomSpell as any).spellEffect) {
      const fakeInstance = { instanceId: `yogg-${i}`, card: randomSpell, currentHealth: 0, canAttack: false, isPlayed: true, isSummoningSick: false, attacksPerformed: 0 } as CardInstance;
      newState = executeSpell(newState, fakeInstance);
    }
  }
  
  return newState;
}

/**
 * Process Fornjot's end of turn effect
 * Summons a minion from the player's deck
 * @param state Current game state
 * @param yshaarjInstanceId ID of the Fornjot instance
 * @param playerType Player who controls Fornjot
 * @returns Updated game state after Fornjot's effect
 */
export function executeYShaarjEffect(
  state: GameState,
  yshaarjInstanceId: string,
  playerType: 'player' | 'opponent'
): GameState {
  // Create a deep copy of the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state));
  
  // Get the player's deck
  const deck = newState.players[playerType].deck;
  
  // If deck is empty, return unchanged state
  if (deck.length === 0) {
    newState.gameLog.push(
      createGameLogEvent({
        type: 'yshaarj_effect_failed' as GameLogEventType,
        player: playerType,
        text: `Fornjot had no minions to summon from an empty deck.`,
        cardId: '60103'
      })
    );
    return newState;
  }
  
  // Filter for minions in deck - deck contains CardData, not CardInstance
  const minionsInDeck = deck.filter((card: CardData) => isMinion(card));
  
  // If no minions, return unchanged state
  if (minionsInDeck.length === 0) {
    newState.gameLog.push(
      createGameLogEvent({
        type: 'yshaarj_effect_failed' as GameLogEventType,
        player: playerType,
        text: `Fornjot had no minions in deck to summon.`,
        cardId: '60103'
      })
    );
    return newState;
  }
  
  // Check if the battlefield is full
  if (newState.players[playerType].battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    newState.gameLog.push(
      createGameLogEvent({
        type: 'yshaarj_effect_failed' as GameLogEventType,
        player: playerType,
        text: `Fornjot's battlefield is full, cannot summon.`,
        cardId: '60103'
      })
    );
    return newState;
  }
  
  // Pick a random minion from the deck
  const randomIndex = getRandomInt(0, minionsInDeck.length - 1);
  const cardToSummon = minionsInDeck[randomIndex];
  
  // Remove from deck by index since deck is CardData[] without instanceId
  const deckIndex = deck.findIndex((card: CardData) => card.id === cardToSummon.id);
  if (deckIndex !== -1) {
    newState.players[playerType].deck.splice(deckIndex, 1);
  }
  
  // Create a CardInstance from the CardData and add to battlefield
  const newInstance: CardInstance = {
    instanceId: `${playerType}_yshaarj_${cardToSummon.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    card: cardToSummon,
    currentHealth: getHealth(cardToSummon),
    isSummoningSick: true,
    attacksPerformed: 0
  };
  
  newState.players[playerType].battlefield.push(newInstance);
  
  // Log the summon
  newState.gameLog.push(
    createGameLogEvent({
      type: 'yshaarj_effect' as GameLogEventType,
      player: playerType,
      text: `Fornjot summoned ${cardToSummon.name} from your deck.`,
      cardId: cardToSummon.id.toString()
    })
  );
  
  return newState;
}

/**
 * Check if Gullveig is in the player's hand, deck, or battlefield
 * @param state Current game state
 * @param playerType Player to check
 * @returns Boolean indicating if the player has Gullveig
 */
export function playerHasCThun(
  state: GameState,
  playerType: 'player' | 'opponent'
): boolean {
  const player = state.players[playerType];
  
  // Check hand
  const inHand = player.hand.some((card: CardInstance) => card.card.id === 60001);
  
  // Check deck
  const inDeck = player.deck.some((card: CardData) => card.id === 60001);
  
  // Check battlefield
  const onBattlefield = player.battlefield.some((card: CardInstance) => card.card.id === 60001);
  
  return inHand || inDeck || onBattlefield;
}