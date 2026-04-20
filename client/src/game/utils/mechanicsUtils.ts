/**
 * Utility functions for handling the new mechanics:
 * - Discover
 * - Tradeable
 * - Inspire
 * - Dual-Class
 * - Choose One
 * - Secret
 * - Adapt
 * - Recruit
 */
import { 
  CardData, 
  CardInstance, 
  DiscoveryState, 
  GameState, 
  Player,
  CardType,
  CardRarity,
  HeroClass
} from '../types';
import { addGameLogEvent } from './gameLogUtils';
import { MAX_BATTLEFIELD_SIZE, MAX_HAND_SIZE } from '../constants/gameConstants';
import { v4 as uuidv4 } from 'uuid';
import { createCardInstance } from './cards/cardUtils';
import { 
  isMinion, 
  isSpell, 
  isWeapon, 
  isHero,
  getAttack, 
  getHealth, 
  getDurability 
} from './cards/typeGuards';
import { destroyCard } from './zoneUtils';
import { dealDamage, dealDamageToAllEnemyMinions } from './effects/damageUtils';
import { addKeyword, hasKeyword } from './cards/keywordUtils';
import allCards from '../data/allCards';

function pickRandom<T>(arr: T[], count: number): T[] {
	const pool = [...arr];
	const result: T[] = [];
	for (let i = 0; i < count && pool.length > 0; i++) {
		const idx = Math.floor(Math.random() * pool.length);
		result.push(pool.splice(idx, 1)[0]);
	}
	return result;
}

function buildDiscoverPool(
	type: 'spell' | 'minion' | 'weapon' | 'secret' | 'any',
	heroClass: string,
	race?: string,
	costFilter?: { min?: number; max?: number }
): CardData[] {
	return (allCards as CardData[]).filter(c => {
		if (!c.collectible) return false;
		if (type !== 'any' && c.type !== type) return false;
		if (heroClass !== 'any' && c.class && c.class !== 'Neutral' && c.class !== heroClass) return false;
		if (race && isMinion(c) && c.race?.toLowerCase() !== race.toLowerCase()) return false;
		if (costFilter) {
			const cost = c.manaCost ?? 0;
			if (costFilter.min != null && cost < costFilter.min) return false;
			if (costFilter.max != null && cost > costFilter.max) return false;
		}
		return true;
	});
}

// ===================== DISCOVER MECHANICS =====================
/**
 * Handles the discover mechanic.
 * @param gameState Current game state
 * @param player Player who is discovering cards
 * @param sourceCard Card that initiated the discover effect
 * @param discoveryType Type of cards to discover
 * @param discoveryCount Number of cards to choose from
 * @param discoveryClass Class of cards to discover
 * @returns Updated game state with discovery activated
 */
export const handleDiscover = (
  gameState: GameState,
  player: 'player' | 'opponent',
  sourceCard: CardData,
  discoveryType: 'spell' | 'minion' | 'weapon' | 'secret' | 'any' = 'any',
  discoveryCount: number = 3,
  discoveryClass: string = 'any'
): GameState => {
  const pool = buildDiscoverPool(discoveryType, discoveryClass);
  const options = pickRandom(pool, discoveryCount);

  const discoveryState: DiscoveryState = {
    active: true,
    options,
    sourceCardId: sourceCard.id.toString(),
    filters: {
      type: discoveryType === 'any' ? 'any' : (discoveryType as CardType),
      heroClass: discoveryClass === 'any' ? 'any' : discoveryClass,
    }
  };
  
  // Log the discovery event
  const newGameState = {
    ...gameState,
    discovery: discoveryState
  };
  
  return addGameLogEvent(newGameState, {
    id: uuidv4(),
    type: 'discover',
    turn: newGameState.turnNumber,
    timestamp: Date.now(),
    player,
    cardId: sourceCard.id.toString(),
    text: `${player} discovers a card`,
  });
};

/**
 * Handles selection from a discover effect.
 * @param gameState Current game state
 * @param player Player who made the selection
 * @param selectedCardId The ID of the selected card
 * @returns Updated game state with the selected card added to hand
 */
export const handleDiscoverSelection = (
  gameState: GameState,
  player: 'player' | 'opponent',
  selectedCardId: number
): GameState => {
  if (!gameState.discovery || !gameState.discovery.active) {
    return gameState;
  }
  
  // Find the selected card from the options
  const selectedCard = gameState.discovery.options.find(card => card.id === selectedCardId);
  if (!selectedCard) {
    return gameState;
  }
  
  // Create a copy of the game state to modify
  let newGameState = { ...gameState };
  
  // Add the selected card to player's hand (respect hand limit)
  if (newGameState.players[player].hand.length >= MAX_HAND_SIZE) {
    return newGameState;
  }
  const cardInstance = createCardInstance(selectedCard);
  newGameState.players[player].hand.push(cardInstance);
  
  // Reset discovery state
  if (newGameState.discovery) {
    newGameState.discovery = {
      ...newGameState.discovery,
      active: false
    };
  }
  
  // Log the event
  newGameState = addGameLogEvent(newGameState, {
    id: uuidv4(),
    type: 'discover',
    turn: newGameState.turnNumber,
    timestamp: Date.now(),
    player,
    cardId: selectedCard.id.toString(),
    text: `${player} chose ${selectedCard.name} from discover`,
  });
  
  return newGameState;
};

// ===================== TRADEABLE MECHANICS =====================
/**
 * Handles trading a tradeable card back into the deck.
 * @param gameState Current game state
 * @param player Player trading the card
 * @param cardInstanceId ID of the card instance being traded
 * @returns Updated game state with the card traded and a new card drawn
 */
export const handleTradeable = (
  gameState: GameState,
  player: 'player' | 'opponent',
  cardInstanceId: string
): GameState => {
  // Find the card instance in the player's hand
  const playerHand = gameState.players[player].hand;
  const cardIndex = playerHand.findIndex(card => card.instanceId === cardInstanceId);
  
  if (cardIndex === -1) {
    return gameState;
  }
  
  const cardInstance = playerHand[cardIndex];
  
  // Check if the card is tradeable
  if (!(cardInstance.card.keywords ?? []).includes('tradeable')) {
    return gameState;
  }
  
  // Check if player has enough mana (typically costs 1)
  const tradeCost = (cardInstance.card as any).tradeableInfo?.tradeCost || 1;
  if (gameState.players[player].mana.current < tradeCost) {
    return gameState;
  }
  
  // Create a copy of the game state to modify
  let newGameState = { ...gameState };
  
  // Spend mana
  newGameState.players[player].mana.current -= tradeCost;
  
  // Remove the card from hand
  const newHand = [...playerHand];
  newHand.splice(cardIndex, 1);
  newGameState.players[player] = {
    ...newGameState.players[player],
    hand: newHand
  };
  
  // Add the card back to the deck
  const cardData = cardInstance.card;
  newGameState.players[player].deck.push(cardData);
  
  // Shuffle the deck (simplified for this example)
  newGameState.players[player].deck.sort(() => Math.random() - 0.5);
  
  // Draw a card (simplified implementation)
  if (newGameState.players[player].deck.length > 0 && newGameState.players[player].hand.length < MAX_HAND_SIZE) {
    const drawnCard = newGameState.players[player].deck.pop();
    if (drawnCard) {
      const newCardInstance = createCardInstance(drawnCard);
      newGameState.players[player].hand.push(newCardInstance);
    }
  }
  
  // Log the event
  newGameState = addGameLogEvent(newGameState, {
    id: uuidv4(),
    type: 'tradeable_traded',
    turn: newGameState.turnNumber,
    timestamp: Date.now(),
    player,
    cardId: cardInstance.card.id.toString(),
    text: `${player} traded ${cardInstance.card.name} and drew a card`,
  });
  
  return newGameState;
};

// ===================== INSPIRE MECHANICS =====================
/**
 * Triggers inspire effects for all minions on the board when hero power is used.
 * @param gameState Current game state
 * @param player Player who used their hero power
 * @returns Updated game state with inspire effects resolved
 */
export const handleInspireEffects = (
  gameState: GameState,
  player: 'player' | 'opponent'
): GameState => {
  let newGameState = { ...gameState };
  const battlefield = newGameState.players[player].battlefield;
  
  // Find all minions with inspire effects
  const inspireMinions = battlefield.filter(
    minion => isMinion(minion.card) && (minion.card.keywords ?? []).includes('inspire')
  );
  
  // Process each inspire effect
  for (const minion of inspireMinions) {
    const inspireEffect = isMinion(minion.card) ? minion.card.inspireEffect : undefined;
    if (!inspireEffect) continue;
    
    // Handle different inspire effect types
    switch (inspireEffect.type) {
      case 'heal':
        // Heal effect (e.g., Tournament Medic)
        if (inspireEffect.targetType === 'friendly_hero' && inspireEffect.value) {
          // Heal hero
          const inspireMaxHp = newGameState.players[player].maxHealth;
          newGameState.players[player].heroHealth = Math.min(
            inspireMaxHp,
            (newGameState.players[player].heroHealth ?? newGameState.players[player].health) + inspireEffect.value
          );
        }
        break;
        
      case 'buff':
        // Buff effect (e.g., Mukla's Champion, Savage Combatant)
        if (inspireEffect.targetType === 'all_friendly_minions') {
          // Buff all friendly minions
          newGameState.players[player].battlefield = newGameState.players[player].battlefield.map(m => {
            if (m.instanceId !== minion.instanceId) { // Don't buff the source minion
              const baseHealth = getHealth(m.card);
              return {
                ...m,
                currentHealth: m.currentHealth 
                  ? m.currentHealth + (inspireEffect.buffHealth || 0)
                  : baseHealth ? baseHealth + (inspireEffect.buffHealth || 0) : undefined
              };
            }
            return m;
          });
        } else if (inspireEffect.targetType === 'friendly_hero') {
          // Buff hero (simplified, in real implementation would add a temporary buff)
          // For Savage Combatant-type effects
          // Would need proper hero buff tracking
        }
        break;
        
      case 'summon':
        // Summon effect (e.g., Kodorider)
        if (inspireEffect.summonCardId) {
          // Get the card to summon
          // In a real implementation, you would fetch this from your card database
          const cardToSummon = { id: inspireEffect.summonCardId } as CardData;
          
          // Create a new minion instance
          const summonedMinion = createCardInstance(cardToSummon);
          
          // Add to battlefield
          if (newGameState.players[player].battlefield.length < MAX_BATTLEFIELD_SIZE) {
            newGameState.players[player].battlefield.push(summonedMinion);
          }
        }
        break;
        
      case 'draw':
        // Draw effect (e.g., Nexus-Champion Saraad)
        // In a real implementation, this would draw from a filtered pool
        // Simplified version:
        if (inspireEffect.value && inspireEffect.value > 0) {
          for (let i = 0; i < inspireEffect.value; i++) {
            if (newGameState.players[player].deck.length > 0 && newGameState.players[player].hand.length < MAX_HAND_SIZE) {
              const drawnCard = newGameState.players[player].deck.pop();
              if (drawnCard) {
                const newCardInstance = createCardInstance(drawnCard);
                newGameState.players[player].hand.push(newCardInstance);
              }
            }
          }
        }
        break;
        
      default:
        // Unhandled inspire effect type
        break;
    }
    
    // Log the inspire event
    newGameState = addGameLogEvent(newGameState, {
      id: uuidv4(),
      type: 'inspire_triggered',
      turn: newGameState.turnNumber,
      timestamp: Date.now(),
      player,
      cardId: minion.card.id.toString(),
      text: `${minion.card.name}'s Inspire effect triggered`,
    });
  }
  
  return newGameState;
};

// ===================== DUAL-CLASS MECHANICS =====================
/**
 * Checks if a card is usable by a specific hero class.
 * @param card The card to check
 * @param heroClass The hero class to check against
 * @returns True if the card can be used by the hero class
 */
export const isCardUsableByClass = (
  card: CardData,
  heroClass: string
): boolean => {
  // Check for neutral cards (no hero class restriction)
  if (!card.heroClass) {
    return true;
  }
  
  // Check for standard class cards
  if (card.heroClass === heroClass) {
    return true;
  }
  
  // Check for dual-class cards
  const dualClassInfo = (card as any).dualClassInfo;
  if (dualClassInfo && dualClassInfo.classes.includes(heroClass)) {
    return true;
  }
  
  // Card is not usable by this class
  return false;
};

// ===================== CHOOSE ONE MECHANICS =====================
/**
 * Handles the selection of a "Choose One" option.
 * @param gameState Current game state
 * @param player Player making the choice
 * @param cardInstanceId ID of the card with Choose One
 * @param optionIndex Index of the chosen option
 * @returns Updated game state with the choice resolved
 */
export const handleChooseOneSelection = (
  gameState: GameState,
  player: 'player' | 'opponent',
  cardInstanceId: string,
  optionIndex: number
): GameState => {
  // Find the card instance in the player's hand
  const playerHand = gameState.players[player].hand;
  const cardIndex = playerHand.findIndex(card => card.instanceId === cardInstanceId);
  
  if (cardIndex === -1) {
    return gameState;
  }
  
  const cardInstance = playerHand[cardIndex];
  
  // Check if the card has Choose One
  if (!(cardInstance.card.keywords ?? []).includes('choose_one')) {
    return gameState;
  }
  
  // Check if the option index is valid
  const chooseOneOptions = (cardInstance.card as any).chooseOneOptions;
  if (!chooseOneOptions || 
      optionIndex < 0 || 
      optionIndex >= chooseOneOptions.length) {
    return gameState;
  }
  
  // Create a copy of the game state to modify
  let newGameState = { ...gameState };
  
  // Store the chosen option
  newGameState.players[player].hand[cardIndex] = {
    ...cardInstance,
    chosenOption: optionIndex
  };
  
  // Log the event
  newGameState = addGameLogEvent(newGameState, {
    id: uuidv4(),
    type: 'choose_one_selected',
    turn: newGameState.turnNumber,
    timestamp: Date.now(),
    player,
    cardId: cardInstance.card.id.toString(),
    text: `${player} chose option ${optionIndex + 1} for ${cardInstance.card.name}`,
  });
  
  return newGameState;
};

// ===================== SECRET MECHANICS =====================
/**
 * Handles triggering of secret cards.
 * @param gameState Current game state
 * @param triggerType The type of trigger that occurred
 * @param triggeringPlayer Player who triggered the secret
 * @param targetCardId Optional ID of the card involved in the trigger
 * @returns Updated game state with secrets resolved
 */
export const handleSecretTrigger = (
  gameState: GameState,
  triggerType: 'on_minion_attack' | 'on_hero_attack' | 'on_minion_death' | 
              'on_spell_cast' | 'on_minion_summon' | 'on_damage_taken' | 
              'on_turn_start' | 'on_turn_end',
  triggeringPlayer: 'player' | 'opponent',
  targetCardId?: string
): GameState => {
  let newGameState = JSON.parse(JSON.stringify(gameState)) as GameState;

  // Determine which player's secrets we're checking (the opponent of who triggered it)
  const secretOwner = triggeringPlayer === 'player' ? 'opponent' : 'player';
  
  // Find secrets that match this trigger type
  const playerSecrets = newGameState.players[secretOwner].secrets || [];
  const matchingSecrets = playerSecrets.filter(secret => {
    const secretEffect = (secret.card as any).secretEffect;
    return secretEffect && 
           secretEffect.triggerType === triggerType &&
           !secret.isRevealed;
  });
  
  if (matchingSecrets.length === 0) {
    return gameState; // No matching secrets
  }
  
  // Process each secret (in reality, only one might trigger based on game rules)
  for (const secret of matchingSecrets) {
    const secretCardEffect = (secret.card as any).secretEffect;
    if (!secretCardEffect) continue;
    
    const secretEffect = secretCardEffect.effect;
    
    // Mark the secret as revealed
    secret.isRevealed = true;
    
    // Apply the secret's effect based on its type
    switch (secretEffect.type) {
      case 'summon':
        // Summon a minion (e.g., Mirror Entity, Noble Sacrifice)
        if (secretEffect.summonCardId) {
          // Get the card to summon
          // In a real implementation, you would fetch this from your card database
          const cardToSummon = { id: secretEffect.summonCardId } as CardData;
          
          // Create a new minion instance
          const summonedMinion = createCardInstance(cardToSummon);
          
          // Add to battlefield
          if (newGameState.players[secretOwner].battlefield.length < MAX_BATTLEFIELD_SIZE) {
            newGameState.players[secretOwner].battlefield.push(summonedMinion);
          }
        }
        break;
        
      case 'damage':
        // Deal damage (e.g., Snipe, Explosive Trap)
        if (secretEffect.value && targetCardId) {
          newGameState = dealDamage(newGameState, triggeringPlayer, 'minion', secretEffect.value, targetCardId, undefined, secretOwner);
        }
        break;
        
      case 'aoe_damage':
        // Deal AoE damage (e.g., Explosive Trap)
        if (secretEffect.value) {
          // secretOwner deals damage to triggeringPlayer's minions
          newGameState = dealDamageToAllEnemyMinions(newGameState, secretOwner, secretEffect.value);

          // Deal damage to enemy hero if applicable
          if (secretEffect.targetType.includes('hero') && secretEffect.value) {
            newGameState = dealDamage(newGameState, triggeringPlayer, 'hero', secretEffect.value, undefined, undefined, secretOwner);
          }
        }
        break;
        
      case 'heal':
        // Gain armor or heal (e.g., Ice Barrier)
        if (secretEffect.value) {
          // Ice Barrier gives armor
          newGameState.players[secretOwner].heroArmor =
            (newGameState.players[secretOwner].heroArmor || 0) + secretEffect.value;
        }
        break;
        
      case 'transform':
        // Transform effects like Counterspell or Freezing Trap
        if (secretEffect.targetType === 'none') {
          // Counterspell-like effect, handled by the spell cast logic
        } else if (secretEffect.targetType === 'enemy_minion' && targetCardId) {
          // Freezing Trap-like effect (return minion to hand with increased cost)
          const enemyBattlefield = newGameState.players[triggeringPlayer].battlefield;
          const targetIndex = enemyBattlefield.findIndex(m => m.instanceId === targetCardId);
          
          if (targetIndex !== -1) {
            // Remove from battlefield
            const minion = enemyBattlefield.splice(targetIndex, 1)[0];
            
            // Increase cost (for Freezing Trap)
            const originalCost = minion.card.manaCost ?? 0;
            minion.card = {
              ...minion.card,
              manaCost: originalCost + 2
            };
            
            // Add to hand if there's space
            if (newGameState.players[triggeringPlayer].hand.length < MAX_HAND_SIZE) {
              newGameState.players[triggeringPlayer].hand.push(minion);
            }
          }
        }
        break;
        
      case 'buff':
        // Buff effect (e.g., Avenge)
        if (secretEffect.buffAttack || secretEffect.buffHealth) {
          const friendlyBattlefield = newGameState.players[secretOwner].battlefield;
          
          // Find a random friendly minion to buff
          if (friendlyBattlefield.length > 0) {
            const randomIndex = Math.floor(Math.random() * friendlyBattlefield.length);
            const minionToBuff = friendlyBattlefield[randomIndex];
            
            // Apply buff
            if (secretEffect.buffAttack && isMinion(minionToBuff.card)) {
              minionToBuff.card = {
                ...minionToBuff.card,
                attack: (minionToBuff.card.attack || 0) + secretEffect.buffAttack
              };
            }
            
            if (secretEffect.buffHealth && minionToBuff.currentHealth) {
              minionToBuff.currentHealth += secretEffect.buffHealth;
            }
          }
        }
        break;
        
      default:
        // Unhandled secret effect type
        break;
    }
    
    // Remove the revealed secret
    const updatedSecrets = playerSecrets.filter(s => !s.isRevealed);
    newGameState.players[secretOwner].secrets = updatedSecrets;
    
    // Log the secret being triggered
    newGameState = addGameLogEvent(newGameState, {
      id: uuidv4(),
      type: 'secret_triggered',
      turn: newGameState.turnNumber,
      timestamp: Date.now(),
      player: secretOwner,
      cardId: secret.card.id.toString(),
      text: `${secret.card.name} Rune was triggered`,
    });
  }
  
  return newGameState;
};

// ===================== ADAPT MECHANICS =====================
/**
 * Handles the adapt mechanic, providing adaptation options.
 * @param gameState Current game state
 * @param player Player who is adapting
 * @param cardInstanceId ID of the minion being adapted
 * @returns Updated game state with adapt options shown
 */
export const handleAdapt = (
  gameState: GameState,
  player: 'player' | 'opponent',
  cardInstanceId: string
): GameState => {
  let newGameState = { ...gameState };
  
  // Find the minion on the battlefield
  const battlefield = newGameState.players[player].battlefield;
  const targetIndex = battlefield.findIndex(minion => minion.instanceId === cardInstanceId);
  
  if (targetIndex === -1) {
    return gameState; // Target not found
  }
  
  const ADAPT_OPTIONS: CardData[] = [
    { id: 99901, name: 'Crackling Shield', description: 'Divine Shield', type: 'spell', rarity: 'common', manaCost: 0, collectible: false },
    { id: 99902, name: 'Flaming Claws', description: '+3 Attack', type: 'spell', rarity: 'common', manaCost: 0, collectible: false },
    { id: 99903, name: 'Living Spores', description: 'Deathrattle: Summon two 1/1 Plants', type: 'spell', rarity: 'common', manaCost: 0, collectible: false },
    { id: 99904, name: 'Lightning Speed', description: 'Windfury', type: 'spell', rarity: 'common', manaCost: 0, collectible: false },
    { id: 99905, name: 'Liquid Membrane', description: "Can't be targeted by spells", type: 'spell', rarity: 'common', manaCost: 0, collectible: false },
    { id: 99906, name: 'Massive', description: 'Taunt', type: 'spell', rarity: 'common', manaCost: 0, collectible: false },
    { id: 99907, name: 'Rocky Carapace', description: '+3 Health', type: 'spell', rarity: 'common', manaCost: 0, collectible: false },
    { id: 99908, name: 'Shrouding Mist', description: 'Stealth until next turn', type: 'spell', rarity: 'common', manaCost: 0, collectible: false },
    { id: 99909, name: 'Volcanic Might', description: '+1/+1', type: 'spell', rarity: 'common', manaCost: 0, collectible: false },
    { id: 99910, name: 'Poison Spit', description: 'Poisonous', type: 'spell', rarity: 'common', manaCost: 0, collectible: false },
  ] as CardData[];
  const adaptOptions = pickRandom(ADAPT_OPTIONS, 3);
  
  // Create discovery state for the adaptation
  const discoveryState: DiscoveryState = {
    active: true,
    options: adaptOptions,
    sourceCardId: cardInstanceId,
    callback: (selectedAdaptation) => {
      // This would be called when player selects an adaptation
      if (selectedAdaptation) {
        applyAdaptation(newGameState, player, cardInstanceId, selectedAdaptation);
      }
    }
  };
  
  newGameState.discovery = discoveryState;
  
  // Log the adapt event
  newGameState = addGameLogEvent(newGameState, {
    id: uuidv4(),
    type: 'adapt',
    turn: newGameState.turnNumber,
    timestamp: Date.now(),
    player,
    cardId: battlefield[targetIndex].card.id.toString(),
    text: `${player} is adapting ${battlefield[targetIndex].card.name}`,
  });
  
  return newGameState;
};

/**
 * Applies the selected adaptation to a minion.
 * @param gameState Current game state
 * @param player Player who is adapting
 * @param cardInstanceId ID of the minion being adapted
 * @param adaptation The adaptation to apply
 * @returns Updated game state with adaptation applied
 */
export const applyAdaptation = (
  gameState: GameState,
  player: 'player' | 'opponent',
  cardInstanceId: string,
  adaptation: CardData
): GameState => {
  let newGameState = { ...gameState };
  
  // Find the minion on the battlefield
  const battlefield = newGameState.players[player].battlefield;
  const targetIndex = battlefield.findIndex(minion => minion.instanceId === cardInstanceId);
  
  if (targetIndex === -1) {
    return gameState; // Target not found
  }
  
  const minion = battlefield[targetIndex];
  
  // Apply different adaptations based on the selection
  switch (adaptation.name) {
    case "Crackling Shield":
      // Divine Shield
      minion.hasDivineShield = true;
      break;
      
    case "Flaming Claws":
      // +3 Attack
      if (isMinion(minion.card)) {
        minion.card = {
          ...minion.card,
          attack: (minion.card.attack || 0) + 3
        };
      }
      break;
      
    case "Living Spores":
      addKeyword(minion, 'deathrattle');
      if (isMinion(minion.card)) {
        minion.card = { ...minion.card, deathrattle: { type: 'summon_token', count: 2, tokenAttack: 1, tokenHealth: 1, tokenName: 'Plant' } };
      }
      break;
      
    case "Lightning Speed":
      // Windfury
      addKeyword(minion, 'windfury');
      break;

    case "Massive":
      // Taunt
      addKeyword(minion, 'taunt');
      break;
      
    case "Poison Spit":
      // Poisonous
      minion.hasPoisonous = true;
      break;
      
    case "Rocky Carapace":
      // +3 Health
      minion.currentHealth = (minion.currentHealth ?? (isMinion(minion.card) ? minion.card.health ?? 0 : 0)) + 3;
      if (isMinion(minion.card)) minion.card = { ...minion.card, health: (minion.card.health ?? 0) + 3 };
      break;
      
    case "Shrouding Mist":
      // Stealth until next turn
      minion.isStealth = true;
      minion.stealthUntilAttack = false; // Will expire on player's next turn
      break;
      
      
    case "Volcanic Might":
      // +1/+1
      if (isMinion(minion.card)) {
        minion.card = { ...minion.card, attack: (minion.card.attack || 0) + 1, health: (minion.card.health ?? 0) + 1 };
      }
      minion.currentHealth = (minion.currentHealth ?? (isMinion(minion.card) ? minion.card.health ?? 0 : 0)) + 1;
      break;
      
    case "Liquid Membrane":
      // Can't be targeted by spells or Hero Powers (Elusive)
      addKeyword(minion, 'elusive');
      break;
      
    default:
      // Unhandled adaptation
      break;
  }
  
  // Log the adaptation
  newGameState = addGameLogEvent(newGameState, {
    id: uuidv4(),
    type: 'adapt_applied',
    turn: newGameState.turnNumber,
    timestamp: Date.now(),
    player,
    cardId: minion.card.id.toString(),
    text: `${minion.card.name} adapted: ${adaptation.name}`,
  });
  
  return newGameState;
};

// ===================== RECRUIT MECHANICS =====================
/**
 * Handles the recruit mechanic, pulling a minion from the deck.
 * @param gameState Current game state
 * @param player Player who is recruiting
 * @param sourceCard Card that initiated the recruit
 * @param filter Optional filter function for the recruitment
 * @param count Number of minions to recruit
 * @returns Updated game state with recruited minions
 */
export const handleRecruit = (
  gameState: GameState,
  player: 'player' | 'opponent',
  sourceCard: CardData,
  filter?: (card: CardData) => boolean,
  count: number = 1
): GameState => {
  let newGameState = { ...gameState };
  
  // Get the player's deck
  const playerDeck = [...newGameState.players[player].deck];
  
  // Find minions that match the filter
  let eligibleMinions = playerDeck.filter(card => card.type === 'minion');
  
  // Apply additional filters if provided
  if (filter) {
    eligibleMinions = eligibleMinions.filter(filter);
  }
  
  // Recruit up to 'count' minions
  const recruitsToSummon = Math.min(count, eligibleMinions.length);
  
  for (let i = 0; i < recruitsToSummon; i++) {
    // Choose a random eligible minion
    const randomIndex = Math.floor(Math.random() * eligibleMinions.length);
    const recruitedMinion = eligibleMinions[randomIndex];
    
    // Remove from eligibleMinions array to avoid duplicates
    eligibleMinions.splice(randomIndex, 1);
    
    // Remove from deck
    const deckIndex = playerDeck.findIndex(card => card.id === recruitedMinion.id);
    if (deckIndex !== -1) {
      playerDeck.splice(deckIndex, 1);
    }
    
    // Create a new minion instance
    const summonedMinion = createCardInstance(recruitedMinion);
    
    // Add to battlefield if there's space
    if (newGameState.players[player].battlefield.length < MAX_BATTLEFIELD_SIZE) {
      newGameState.players[player].battlefield.push(summonedMinion);
      
      // Log the recruit
      newGameState = addGameLogEvent(newGameState, {
        id: uuidv4(),
        type: 'recruit',
        turn: newGameState.turnNumber,
        timestamp: Date.now(),
        player,
        cardId: recruitedMinion.id.toString(),
        text: `${player} recruited ${recruitedMinion.name}`,
      });
    }
  }
  
  // Update the player's deck
  newGameState.players[player].deck = playerDeck;
  
  return newGameState;
};

// ===================== CORRUPT MECHANICS =====================
/**
 * Check if a card can be corrupted by another card.
 * @param corruptibleCard The card that might be corrupted
 * @param playedCard The card that is being played
 * @returns Boolean indicating if corruption should occur
 */
export const canBeCorrupted = (
  corruptibleCard: CardData,
  playedCard: CardData
): boolean => {
  // Check if the card is corruptible
  const corruptState = (corruptibleCard as any).corruptState;
  if (!(corruptibleCard.keywords ?? []).includes('corrupt') || 
      !corruptState || 
      !corruptState.isCorruptible ||
      corruptState.isCorrupted) {
    return false;
  }
  
  // Check if played card costs more
  const playedCardCost = playedCard.manaCost ?? 0;
  const corruptibleCardCost = corruptibleCard.manaCost ?? 0;
  return playedCardCost > corruptibleCardCost;
};

/**
 * Corrupt all eligible cards in a player's hand when a higher-cost card is played.
 * @param gameState Current game state
 * @param player Player who played the card
 * @param playedCard The card that was played
 * @returns Updated game state with corrupted cards
 */
export const handleCorruption = (
  gameState: GameState,
  player: 'player' | 'opponent',
  playedCard: CardData
): GameState => {
  let newGameState = { ...gameState };
  const playerHand = [...newGameState.players[player].hand];
  let corruptedAny = false;
  
  // Check each card in hand for corruption
  for (let i = 0; i < playerHand.length; i++) {
    const cardInstance = playerHand[i];
    const card = cardInstance.card;
    
    if (canBeCorrupted(card, playedCard)) {
      // Corrupt the card
      const corruptState = (card as any).corruptState;
      if (corruptState && corruptState.corruptedVersion) {
        const corruptedVersion = corruptState.corruptedVersion;
        
        // Update the card while preserving instance ID
        playerHand[i] = {
          ...cardInstance,
          card: {
            ...corruptedVersion,
            // Add corrupt keyword to indicate it's corrupted
            keywords: corruptedVersion.keywords.includes('corrupt') 
              ? corruptedVersion.keywords 
              : [...corruptedVersion.keywords, 'corrupt']
          },
          // Update the corrupt state to show it's been corrupted
          corruptState: {
            ...corruptState,
            isCorrupted: true,
            isCorruptible: false
          }
        };
        
        corruptedAny = true;
        
        // Log the corruption
        newGameState = addGameLogEvent(newGameState, {
          id: uuidv4(),
          type: 'card_corrupted',
          turn: newGameState.turnNumber,
          timestamp: Date.now(),
          player,
          cardId: card.id.toString(),
          text: `${card.name} was corrupted by higher-cost card`,
        });
      }
    }
  }
  
  // Update the player's hand if any cards were corrupted
  if (corruptedAny) {
    newGameState.players[player].hand = playerHand;
  }
  
  return newGameState;
};

// ===================== ENHANCED DISCOVER POOLS =====================
/**
 * Handles Kazakus' custom golem crafting discover mechanic.
 * @param gameState Current game state
 * @param player Player who is using Kazakus
 * @param costChoice The cost of golem chosen (1, 5, or 10)
 * @returns Updated game state with Kazakus potion options shown
 */
export const handleKazakusGolemDiscover = (
  gameState: GameState,
  player: 'player' | 'opponent',
  costChoice: 1 | 5 | 10
): GameState => {
  let newGameState = { ...gameState };
  
  // Define available ability pools based on cost choice
  const abilityPool: Record<number, CardData[]> = {
    1: [
      // 1-cost golem abilities
      { id: 21001, name: "Taunt", manaCost: 0, description: "Give your golem Taunt", type: "spell", rarity: "common", keywords: ["discover_option"] },
      { id: 21002, name: "+1/+1", manaCost: 0, description: "Give your golem +1/+1", type: "spell", rarity: "common", keywords: ["discover_option"] },
      { id: 21003, name: "Rush", manaCost: 0, description: "Give your golem Rush", type: "spell", rarity: "common", keywords: ["discover_option"] },
    ],
    5: [
      // 5-cost golem abilities
      { id: 21004, name: "Taunt", manaCost: 0, description: "Give your golem Taunt", type: "spell", rarity: "common", keywords: ["discover_option"] },
      { id: 21005, name: "+4/+4", manaCost: 0, description: "Give your golem +4/+4", type: "spell", rarity: "common", keywords: ["discover_option"] },
      { id: 21006, name: "Divine Shield", manaCost: 0, description: "Give your golem Divine Shield", type: "spell", rarity: "common", keywords: ["discover_option"] },
    ],
    10: [
      // 10-cost golem abilities
      { id: 21007, name: "Taunt", manaCost: 0, description: "Give your golem Taunt", type: "spell", rarity: "common", keywords: ["discover_option"] },
      { id: 21008, name: "+8/+8", manaCost: 0, description: "Give your golem +8/+8", type: "spell", rarity: "common", keywords: ["discover_option"] },
      { id: 21009, name: "Lifesteal", manaCost: 0, description: "Give your golem Lifesteal", type: "spell", rarity: "common", keywords: ["discover_option"] },
    ]
  };
  
  // Select random 3 abilities from the pool
  const availableAbilities = abilityPool[costChoice];
  const selectedOptions: CardData[] = [];
  const shuffledOptions = [...availableAbilities].sort(() => Math.random() - 0.5);
  
  // Take the first 3 options
  for (let i = 0; i < Math.min(3, shuffledOptions.length); i++) {
    selectedOptions.push(shuffledOptions[i]);
  }
  
  // Create discovery state for the selection
  const discoveryState: DiscoveryState = {
    active: true,
    options: selectedOptions,
    sourceCardId: "kazakus", // Marker for Kazakus
    // We'd track the golem abilities chosen so far in a real implementation
    // For now, we'll just log the choice
    callback: (selectedOption) => {
      // This would be called when player selects an option
      if (selectedOption) {
        // In a full implementation, we'd add the selected ability to the golem
        // and proceed to the next discovery phase or create the golem
      }
    }
  };
  
  newGameState.discovery = discoveryState;
  
  // Log the Kazakus discover
  newGameState = addGameLogEvent(newGameState, {
    id: uuidv4(),
    type: 'kazakus_discover',
    turn: newGameState.turnNumber,
    timestamp: Date.now(),
    player,
    cardId: "kazakus",
    text: `${player} is creating a ${costChoice}-cost golem with Kazakus`,
  });
  
  return newGameState;
};

/**
 * Filters discover options based on specified criteria.
 * @param options Array of possible card options 
 * @param criteria Filtering criteria object
 * @returns Filtered card options
 */
export const filterDiscoverOptions = (
  options: CardData[],
  criteria: {
    cardType?: CardType | CardType[];
    costRange?: [number, number];
    exactCost?: number;
    cardRarity?: CardRarity | CardRarity[];
    heroClass?: HeroClass | HeroClass[];
    keywords?: string | string[];
    excludeKeywords?: string | string[];
    onlyFromDeck?: boolean;
    onlyCollectible?: boolean;
  }
): CardData[] => {
  return options.filter(card => {
    // Filter by card type
    if (criteria.cardType) {
      const cardTypes = Array.isArray(criteria.cardType) ? criteria.cardType : [criteria.cardType];
      if (!cardTypes.includes(card.type as CardType)) {
        return false;
      }
    }
    
    // Filter by cost range
    if (criteria.costRange) {
      const [min, max] = criteria.costRange;
      const cardCost = card.manaCost ?? 0;
      if (cardCost < min || cardCost > max) {
        return false;
      }
    }
    
    // Filter by exact cost
    if (criteria.exactCost !== undefined && (card.manaCost ?? 0) !== criteria.exactCost) {
      return false;
    }
    
    // Filter by rarity
    if (criteria.cardRarity) {
      const rarities = Array.isArray(criteria.cardRarity) ? criteria.cardRarity : [criteria.cardRarity];
      const cardRarity = card.rarity ?? 'common';
      if (!rarities.includes(cardRarity)) {
        return false;
      }
    }
    
    // Filter by class
    if (criteria.heroClass) {
      // Class filtering will require heroClass property on cards
      // This would be implemented when adding that property
    }
    
    // Filter by keywords
    if (criteria.keywords) {
      const requiredKeywords = Array.isArray(criteria.keywords) ? criteria.keywords : [criteria.keywords];
      const cardKeywords = card.keywords ?? [];
      for (const keyword of requiredKeywords) {
        if (!cardKeywords.includes(keyword)) {
          return false;
        }
      }
    }
    
    // Filter out by excluded keywords
    if (criteria.excludeKeywords) {
      const excludedKeywords = Array.isArray(criteria.excludeKeywords) ? criteria.excludeKeywords : [criteria.excludeKeywords];
      const cardKeywords = card.keywords ?? [];
      for (const keyword of excludedKeywords) {
        if (cardKeywords.includes(keyword)) {
          return false;
        }
      }
    }
    
    // All filters passed
    return true;
  });
};

/**
 * Creates a targeted discover pool based on the source card.
 * @param gameState Current game state 
 * @param sourceCardId The card initiating discover
 * @returns Array of card options meeting source card's discovery requirements
 */
export const createDiscoverPool = (
  gameState: GameState,
  sourceCardId: string
): CardData[] => {
  // This would be a comprehensive implementation that maps specific card IDs
  // to their discovery pools based on game rules
  
  // In a real implementation, we would have a mapping of card IDs to discover logic
  // For now, we'll use placeholder logic based on the card ID
  
  // Get all available cards from which to discover
  const allCards: CardData[] = []; // This would be populated from all available cards
  
  switch (sourceCardId) {
    case "kazakus":
      // Handled separately in handleKazakusGolemDiscover
      return [];
      
    case "tracking":
      // Tracking draws from the player's deck
      // In a real implementation, we'd return the top 3 cards of the player's deck
      return [];
      
    case "zephrys":
      // Zephrys the Great offers "perfect" cards based on game state
      // This would be a very complex function in reality
      return filterDiscoverOptions(allCards, {
        cardRarity: ["common", "rare"]
      });
      
    default:
      // Generic discover based on card type and criteria
      return [];
  }
};

export default {
  handleDiscover,
  handleDiscoverSelection,
  handleTradeable,
  handleInspireEffects,
  isCardUsableByClass,
  handleChooseOneSelection,
  handleSecretTrigger,
  handleAdapt,
  applyAdaptation,
  handleRecruit,
  canBeCorrupted,
  handleCorruption,
  handleKazakusGolemDiscover,
  filterDiscoverOptions,
  createDiscoverPool
};