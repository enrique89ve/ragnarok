import { CardInstance, GameState, ZoneType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { shouldTriggerDeathrattle, processPendingDeathrattles } from './deathrattleUtils';
import { debug } from '../config/debugConfig';
import { executeDeathrattle } from './deathrattleUtils';
import { logCardDraw, logCardDeath } from './gameLogUtils';
import { processAllOnMinionDeathEffects, isNorseActive } from './norseIntegration';
import { processArtifactOnMinionDeath } from './artifactTriggerProcessor';
import { isMinion, getHealth } from './cards/typeGuards';
import { createCardInstance } from './cards/cardUtils';
import { MAX_BATTLEFIELD_SIZE, MAX_HAND_SIZE } from '../constants/gameConstants';
import { checkPetEvolutionTrigger } from './petEvolutionTriggers';
import { removeKeyword } from './cards/keywordUtils';
import { recalculateAuras } from './mechanics/auraUtils';
import { GameEventBus } from '@/core/events/GameEventBus';

/**
 * Moves a card from one zone to another
 * Returns the updated state and the moved card instance
 */
export function moveCard(
  state: GameState,
  cardId: string,
  fromZone: ZoneType,
  toZone: ZoneType,
  playerId: 'player' | 'opponent'
): { newState: GameState; movedCard: CardInstance | null } {
  // Create a deep copy of the state to avoid mutation
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  let movedCard: CardInstance | null = null;
  
  // Get the player object
  const player = newState.players[playerId];
  
  // Find the card in the source zone
  let sourceZone: CardInstance[] = [];
  switch (fromZone) {
    case 'deck':
      sourceZone = player.deck.map(card => createCardInstance(card));
      break;
    case 'hand':
      sourceZone = player.hand;
      break;
    case 'battlefield':
      sourceZone = player.battlefield;
      break;
    case 'graveyard':
      sourceZone = player.graveyard || [];
      break;
    default:
      debug.error(`Unknown source zone: ${fromZone}`);
      return { newState: state, movedCard: null };
  }
  
  // Find the card in the source zone
  const cardIndex = sourceZone.findIndex(card => card.instanceId === cardId);
  if (cardIndex === -1) {
    debug.error(`Card ${cardId} not found in zone ${fromZone}`);
    return { newState: state, movedCard: null };
  }
  
  // Remove the card from the source zone
  movedCard = sourceZone[cardIndex];
  sourceZone.splice(cardIndex, 1);
  
  // Update the source zone in the state
  switch (fromZone) {
    case 'deck':
      // For deck, we've already created instances, so we need to remove from the actual deck
      player.deck.splice(cardIndex, 1);
      break;
    case 'hand':
      player.hand = sourceZone;
      break;
    case 'battlefield':
      player.battlefield = sourceZone;
      break;
    case 'graveyard':
      player.graveyard = sourceZone;
      break;
  }
  
  // If the card wasn't found, return the original state
  if (!movedCard) {
    return { newState: state, movedCard: null };
  }
  
  // Add the card to the destination zone
  switch (toZone) {
    case 'hand':
      // When adding to hand, make sure it's not marked as played
      if (player.hand.length >= MAX_HAND_SIZE) {
        break;
      }
      movedCard.isPlayed = false;
      player.hand.push(movedCard);
      break;
    case 'battlefield':
      // When adding to battlefield, mark it as played and update summoning sickness
      movedCard.isPlayed = true;
      
      // Check for both Charge and Rush keywords (safely handle undefined keywords)
      const keywords = movedCard.card.keywords || [];
      const hasCharge = keywords.includes('charge');
      const hasRush = keywords.includes('rush');
      const canAttackImmediately = hasCharge || hasRush;
      
      if (!canAttackImmediately) {
        // Regular minions have summoning sickness and can't attack
        movedCard.isSummoningSick = true;
        movedCard.canAttack = false;
      } else {
        // Charge/Rush minions can attack immediately
        movedCard.isSummoningSick = false;
        movedCard.canAttack = true;
        
        // Make sure to set the correct properties for rush minions
        if (hasRush) {
          movedCard.hasRush = true;
          movedCard.isRush = true;
        }
      }
      
      player.battlefield.push(movedCard);
      break;
    case 'graveyard':
      // When adding to graveyard, just store the card as-is
      if (!player.graveyard) {
        player.graveyard = [];
      }
      player.graveyard.push(movedCard);
      break;
    case 'deck':
      // Returning a card to the deck is rare (shuffle effects)
      player.deck.push(movedCard.card);
      break;
    default:
      debug.error(`Unknown destination zone: ${toZone}`);
      return { newState: state, movedCard: null };
  }
  
  return { newState, movedCard };
}

/**
 * Draws a card from the deck to the hand
 */
export function drawCardFromDeck(
  state: GameState,
  playerId: 'player' | 'opponent'
): GameState {
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];

  // Check if there are cards left in the deck
  if (player.deck.length === 0) {
    return newState;
  }

  // Get the top card from the deck
  const cardData = player.deck[0];

  if (player.hand.length >= MAX_HAND_SIZE) {
    return newState;
  }

  // Remove the card from the deck
  player.deck.splice(0, 1);

  // Create a card instance for the hand
  const cardInstance = createCardInstance(cardData);

  // Add the card to the hand if there's room
  player.hand.push(cardInstance);

  // Pet evolution: on_draw_card
  newState = checkPetEvolutionTrigger(newState, 'on_draw_card');

  // Add to game log
  const updatedState = logCardDraw(
    newState,
    playerId,
    cardInstance.instanceId
  );

  // Emit card drawn event for animations
  GameEventBus.emitCardDrawn({
    cardId: String(cardData.id),
    cardName: cardData.name || 'Unknown',
    player: playerId,
    fromFatigue: false,
  });

  return updatedState;
}

/**
 * Sends a card from the battlefield to the graveyard (when destroyed)
 * 
 * This now includes triggering death animations and a slight delay to make 
 * deaths more dramatic and visible during combat.
 */
export function destroyCard(
  state: GameState,
  cardId: string,
  playerId: 'player' | 'opponent'
): GameState {
  // First, get the card that's going to be destroyed to check for deathrattle
  const player = state.players[playerId];
  const cardToDestroy = player.battlefield.find(card => card.instanceId === cardId);
  
  // Move the card to the graveyard
  const result = moveCard(state, cardId, 'battlefield', 'graveyard', playerId);
  let newState = result.newState;
  
  if (result.movedCard) {

    // Emit minion destroyed event for death animations
    GameEventBus.emitMinionDestroyed({
      instanceId: result.movedCard.instanceId,
      cardId: String(result.movedCard.card?.id || 0),
      cardName: result.movedCard.card?.name || 'Unknown',
      player: playerId,
      hasDeathrattle: shouldTriggerDeathrattle(result.movedCard),
    });

    // Add to game log
    newState = logCardDeath(newState, playerId, result.movedCard);

    // Helheim realm: banish_on_death — skip ALL death effects (deathrattle, reborn, einherjar, chain)
    const isBanished = newState.activeRealm?.effects?.some(e => e.type === 'banish_on_death');
    if (isBanished) {
      debug.state(`[Helheim Banish] ${cardToDestroy?.card?.name ?? 'unknown'} banished — no death effects trigger`);
      newState = recalculateAuras(newState);
      return newState;
    }

    // Check if the card has a deathrattle effect and trigger it
    if (cardToDestroy && shouldTriggerDeathrattle(cardToDestroy)) {
      newState = executeDeathrattle(newState, cardToDestroy, playerId);
    }
    
    // Trigger Norse on-minion-death passives (King and Hero passives)
    if (isNorseActive()) {
      newState = processAllOnMinionDeathEffects(newState, playerId, cardId);
    }

    // Process artifact on-minion-death triggers (Helm of the Underworld)
    newState = processArtifactOnMinionDeath(newState, playerId);
    
    // Process any pending deathrattles that were queued (from AOE damage deaths, etc.)
    newState = processPendingDeathrattles(newState);

    // Reborn: resummon a fresh copy with 1 HP (after all deathrattle processing)
    const hadReborn = cardToDestroy?.card?.keywords?.includes('reborn') ||
                      (cardToDestroy as any)?.hasReborn;

    if (hadReborn && newState.players[playerId].battlefield.length < MAX_BATTLEFIELD_SIZE) {
      const rebornCopy = createCardInstance(cardToDestroy!.card);
      rebornCopy.currentHealth = 1;
      rebornCopy.hasReborn = false;
      removeKeyword(rebornCopy, 'reborn');
      rebornCopy.isSummoningSick = true;
      rebornCopy.canAttack = false;
      newState.players[playerId].battlefield.push(rebornCopy);
      debug.state(`[Reborn] ${cardToDestroy!.card.name} resummoned with 1 HP for ${playerId}`);
    }

    // Einherjar: shuffle a +1/+1 copy into deck (max 3 returns)
    const hadEinherjar = cardToDestroy?.card?.keywords?.includes('einherjar');
    const einherjarGen = cardToDestroy?.einherjarGeneration || 0;

    if (hadEinherjar && einherjarGen < 3) {
      const risenCard = { ...cardToDestroy!.card } as any;
      risenCard.attack = (risenCard.attack || 0) + 1;
      risenCard.health = (risenCard.health || 0) + 1;
      const suffix = einherjarGen === 0 ? ' (Risen)' : einherjarGen === 1 ? ' (Risen II)' : ' (Risen III)';
      if (!risenCard.name.includes('(Risen')) {
        risenCard.name = risenCard.name + suffix;
      }
      risenCard.einherjarGeneration = einherjarGen + 1;

      const deck = newState.players[playerId].deck;
      const insertIdx = Math.floor(Math.random() * (deck.length + 1));
      deck.splice(insertIdx, 0, risenCard as any);
      debug.state(`[Einherjar] ${cardToDestroy!.card.name} shuffled back as ${risenCard.name} (gen ${einherjarGen + 1}) for ${playerId}`);
    }

    // Blood Echo: add a 0-cost copy to owner's hand (costs bloodPrice HP to play)
    const hadBloodEcho = cardToDestroy?.card?.keywords?.includes('blood_echo');
    if (hadBloodEcho) {
      const hand = newState.players[playerId].hand;
      if (hand.length < MAX_HAND_SIZE) {
        const echoCopy = createCardInstance({ ...cardToDestroy!.card } as any);
        (echoCopy.card as any).manaCost = 0;
        echoCopy.isSummoningSick = false;
        hand.push(echoCopy);
        debug.state(`[Blood Echo] ${cardToDestroy!.card.name} added 0-cost copy to ${playerId}'s hand (blood price: ${(cardToDestroy!.card as any).bloodPrice} HP)`);
      }
    }

    // Valhalla's Call: track einherjar deaths, summon 5/5 Valkyrie after 3 returns
    if (hadEinherjar && einherjarGen >= 2) {
      if (newState.players[playerId].battlefield.length < MAX_BATTLEFIELD_SIZE) {
        const valkyrieCard = {
          id: 9070,
          name: 'Valkyrie of Valhalla',
          type: 'minion',
          manaCost: 0,
          attack: 5,
          health: 5,
          rarity: 'common',
          keywords: ['taunt'],
          description: 'Summoned by Valhalla\'s Call.',
          collectible: false,
        };
        const valkyrieInstance = createCardInstance(valkyrieCard as any);
        valkyrieInstance.isTaunt = true;
        valkyrieInstance.isSummoningSick = true;
        valkyrieInstance.canAttack = false;
        newState.players[playerId].battlefield.push(valkyrieInstance);
        debug.state(`[Valhalla's Call] Einherjar ${cardToDestroy!.card.name} died 3 times — summoning 5/5 Valkyrie for ${playerId}`);

        const cardDesc = (cardToDestroy!.card as any).description || '';
        if (cardDesc.includes('+2/+2')) {
          for (const m of newState.players[playerId].battlefield) {
            m.currentAttack = (m.currentAttack || 0) + 2;
            m.currentHealth = (m.currentHealth || 0) + 2;
          }
          debug.state(`[Valhalla's Call] Eternal Shieldbearer: all friendlies gain +2/+2 for ${playerId}`);
        }
      }
    }

    // Ragnarok Chain: process onPartnerDeath for chain partners
    const deadCardData = cardToDestroy?.card as any;
    if (deadCardData?.chainPartner) {
      const partnerInstanceId = cardToDestroy?.chainPartnerInstanceId;
      for (const side of ['player', 'opponent'] as const) {
        const partner = partnerInstanceId
          ? newState.players[side].battlefield.find(
              (m: CardInstance) => m.instanceId === partnerInstanceId
            )
          : newState.players[side].battlefield.find(
              (m: CardInstance) => m.card.id === deadCardData.chainPartner
            );
        if (partner) {
          const partnerData = partner.card as any;
          const chainEff = partnerData?.chainEffect?.onPartnerDeath;
          if (chainEff) {
            switch (chainEff.type) {
              case 'buff_self':
                partner.currentAttack = (partner.currentAttack ?? 0) + (chainEff.value || 0);
                partner.currentHealth = (partner.currentHealth ?? 0) + (chainEff.value || 0);
                if (chainEff.keywords?.includes('rush')) (partner as any).hasRush = true;
                if (chainEff.keywords?.includes('windfury')) (partner as any).hasWindfury = true;
                break;
              case 'draw': {
                const drawCount = chainEff.value || 1;
                const deck = newState.players[side].deck;
                const hand = newState.players[side].hand;
                for (let i = 0; i < drawCount && deck.length > 0 && hand.length < MAX_HAND_SIZE; i++) {
                  const drawn = deck.shift();
                  if (drawn) hand.push(drawn as any);
                }
                break;
              }
              case 'transform_self':
                partner.currentAttack = chainEff.value || 6;
                partner.currentHealth = chainEff.value || 6;
                break;
              case 'gain_taunt_and_health':
                (partner as any).isTaunt = true;
                partner.currentHealth = (partner.currentHealth ?? 0) + (chainEff.value || 2);
                break;
            }
          }
        }
      }
    }

    newState = recalculateAuras(newState);

  }

  return newState;
}

/**
 * CENTRALIZED function to remove all dead minions from both players' battlefields.
 * This should be called after ANY damage event to ensure dead minions are properly cleaned up.
 * 
 * Dead minions are defined as having currentHealth <= 0 (or baseHealth if currentHealth is undefined).
 * 
 * This fixes the bug where minions could remain on the battlefield with 0 or negative health,
 * causing inconsistent game state and visual glitches.
 */
export function removeDeadMinions(state: GameState): GameState {
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Process both players
  for (const playerId of ['player', 'opponent'] as const) {
    const battlefield = newState.players[playerId].battlefield;
    
    // Find dead minions (health <= 0)
    const deadMinions = battlefield.filter(minion => {
      const health = minion.currentHealth ?? getHealth(minion.card) ?? 0;
      return health <= 0;
    });
    
    // Process each dead minion through the proper destroyCard flow
    // This ensures deathrattles trigger and animations play
    for (const deadMinion of deadMinions) {
      debug.state(`[removeDeadMinions] Removing ${deadMinion.card.name} (health: ${deadMinion.currentHealth}) for ${playerId}`);
      newState = destroyCard(newState, deadMinion.instanceId, playerId);
    }
  }
  
  return newState;
}

/**
 * Check if any minions are dead on the battlefield (helper function)
 */
export function hasDeadMinions(state: GameState): boolean {
  for (const playerId of ['player', 'opponent'] as const) {
    for (const minion of state.players[playerId].battlefield) {
      const health = minion.currentHealth ?? getHealth(minion.card) ?? 0;
      if (health <= 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Gets all cards in a specific zone
 */
export function getCardsInZone(
  state: GameState,
  zone: ZoneType,
  playerId: 'player' | 'opponent'
): CardInstance[] {
  const player = state.players[playerId];
  
  switch (zone) {
    case 'hand':
      return player.hand;
    case 'battlefield':
      return player.battlefield;
    case 'graveyard':
      return player.graveyard || [];
    case 'deck':
      // For deck, we have to create instances on the fly since deck stores CardData
      return player.deck.map(card => createCardInstance(card));
    default:
      debug.error(`Unknown zone: ${zone}`);
      return [];
  }
}

/**
 * Return all cards that died this game (in graveyard)
 */
export function getDeadCards(
  state: GameState,
  playerId: 'player' | 'opponent'
): CardInstance[] {
  const player = state.players[playerId];
  return player.graveyard || [];
}