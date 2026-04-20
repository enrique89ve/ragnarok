import { GameState, CardInstance, Player, HeroClass, CardData } from '../types';
import { debug, isAISimulationMode } from '../config/debugConfig';
import { createStartingDeck, createClassDeck, drawCards, findCardInstance, createCardInstance } from './cards/cardUtils';
import { isMinion, getAttack, getHealth } from './cards/typeGuards';
import { getDefaultHeroPower, resetHeroPower, executeHeroPower } from './heroPowerUtils';
import { requiresBattlecryTarget, executeBattlecry } from './battlecryUtils';
import { equipWeapon } from './weaponUtils';
import { equipArtifact, canPlayArtifact, resetArtifactTurnState } from './artifactUtils';
import { equipArmorPiece, armorPieceFromCard } from './armorGearUtils';
import { processArtifactOnSpellCast, processArtifactOnMinionPlay, processArtifactEndOfTurn, processArtifactStartOfTurn, processArtifactOnEnemyMinionPlayed, getArtifactSpellCostReduction } from './artifactTriggerProcessor';
import { moveCard, drawCardFromDeck, destroyCard, removeDeadMinions } from './zoneUtils';
import { playSecret } from './secretUtils';
import { executeSpell, requiresSpellTarget } from './spells/spellUtils';
import { updateEnrageEffects } from './mechanics/enrageUtils';
import { executeComboEffect, shouldActivateCombo } from './comboUtils';
import { executeComboSpellEffect } from './spells/comboSpellUtils';
import { applyOverload, getOverloadAmount, hasOverload } from './overloadUtils';
import { processFrozenEffectsAtTurnEnd } from './mechanics/freezeUtils';
import { processWeaponsAtTurnEnd } from './weaponUtils';
import { processDormantEffects } from './dormantUtils';
import { processRushAtTurnEnd, isValidRushTarget, initializeRushEffect } from './mechanics/rushUtils';
import { processStartOfTurnEffects, processEndOfTurnEffects } from './effects/turnEffectsUtils';
// Import frenzy utilities but only use processFrenzyEffects to avoid circular dependency
import { processFrenzyEffects } from './mechanics/frenzyUtils';
import { summonColossalParts } from './mechanics/colossalUtils';
import { performTurnStartResets } from './resetUtils';
import { hasEcho, createEchoCopy, expireEchoCardsAtEndOfTurn } from './mechanics/echoUtils';
import { processAfterAttackEffects, processAfterHeroAttackEffects } from './mechanics/afterAttackUtils';
import { dealDamage, dealDamageToAllEnemyMinions, dealDamageToAllMinions, dealDamageToHero } from './effects/damageUtils';
import { MAX_BATTLEFIELD_SIZE } from '../constants/gameConstants';
import { removeKeyword, hasKeyword, getKeywords } from './cards/keywordUtils';
import { canMagnetize, applyMagnetization, isValidMagneticTarget } from './mechanics/magneticUtils';
import allCards, { getCardById } from '../data/allCards';
import { trackQuestProgress, activateQuest } from './quests/questProgress';
import { isQuestCard, extractQuestData } from './quests/questUtils';
import { 
  logCardPlay, 
  logAttack, 
  logHeroPower, 
  logTurnStart,
  logTurnEnd,
  logCardDeath,
  logDamage,
  logBuff
} from './gameLogUtils';
import { queueAIAttackAnimation } from '../stores/aiAttackAnimationStore';
import { 
  processAllEndOfTurnEffects,
  processAllStartOfTurnEffects,
  processAllOnMinionPlayEffects,
  processAllOnMinionDeathEffects,
  processHeroOnSpellCast,
  isNorseActive
} from './norseIntegration';
import { processOnAttackStatusEffect } from '../effects/handlers/onAttackStatusHandler';
import { isSuperMinion, shouldGetHeroBonus } from '../data/sets/superMinions/heroSuperMinions';
import { enrichDeckWithNFTLevels } from './cards/cardLevelScaling';
import { NORSE_TO_GAME_ELEMENT } from '../types/NorseTypes';
import { getElementAdvantage } from './elements/elementAdvantage';
import { getNorseHeroById } from './norseHeroPowerUtils';
import { checkPetEvolutionTrigger } from './petEvolutionTriggers';
import { applyLifestealHealing } from './mechanics/lifestealUtils';
import { recalculateAuras } from './mechanics/auraUtils';
import { processSpellburst } from './mechanics/spellburstUtils';
import { GameEventBus } from '@/core/events/GameEventBus';

function attemptPetEvolution(
  state: GameState,
  player: Player,
  card: CardInstance
): { evolved: boolean; newState: GameState } {
  const evolvesFromId = (card.card as any).evolvesFrom;
  const petFamily = (card.card as any).petFamily;
  const isMaster = (card.card as any).petStage === 'master';

  if (!evolvesFromId && !isMaster) return { evolved: false, newState: state };

  let basicIdx: number;
  if (isMaster && petFamily) {
    // Stage 3: accept ANY adept from same family with petEvolutionMet
    basicIdx = player.battlefield.findIndex(
      m => (m.card as any).petFamily === petFamily
        && (m.card as any).petStage === 'adept'
        && m.petEvolutionMet === true
    );
  } else {
    // Stage 2: match specific Stage 1 by evolvesFrom ID
    basicIdx = player.battlefield.findIndex(
      m => m.card.id === evolvesFromId && m.petEvolutionMet === true
    );
  }

  if (basicIdx === -1) return { evolved: false, newState: state };

  const basic = player.battlefield[basicIdx];
  let evolvedCard = { ...card.card } as any;

  // Stage 3 variant selection
  if (evolvedCard.stage3Variants && Array.isArray(evolvedCard.stage3Variants)) {
    const stage2Id = basic.card.id;
    const variant = evolvedCard.stage3Variants.find(
      (v: any) => v.fromStage2Id === stage2Id
    );
    if (variant) {
      evolvedCard = {
        ...evolvedCard,
        attack: variant.attack,
        health: variant.health,
        manaCost: variant.manaCost,
        keywords: variant.keywords,
        description: variant.description,
        battlecry: variant.battlecry || undefined,
        deathrattle: variant.deathrattle || undefined,
        passiveAbility: variant.passiveAbility || undefined,
        element: (basic.card as any).element || evolvedCard.element,
      };
      delete evolvedCard.stage3Variants;
    }
  }

  // Health carry-over
  const maxHp = evolvedCard.health || 0;
  const oldMaxHp = (basic.card as any).health || 0;
  const damageTaken = Math.max(0, oldMaxHp - (basic.currentHealth || oldMaxHp));
  const newHealth = Math.max(1, maxHp - damageTaken);

  // Keywords from evolved form
  const evoKeywords = evolvedCard.keywords || [];
  const hasCharge = evoKeywords.includes('charge');
  const hasRush = evoKeywords.includes('rush');

  // Transform: replace on battlefield
  player.battlefield[basicIdx] = {
    ...basic,
    card: evolvedCard,
    currentAttack: evolvedCard.attack || 0,
    currentHealth: newHealth,
    petEvolutionMet: false,
    evolutionLevel: (evolvedCard.petFamilyTier || 2) as 1 | 2 | 3,
    evolvedFromStage2Id: basic.card.id as number,
    canAttack: hasCharge || hasRush,
    isSummoningSick: !(hasCharge || hasRush),
    hasRush: hasRush,
  };

  // Evolution is free — Stage 2/3 cards have manaCost: 0

  const fromStage = isMaster ? 2 : 1;
  const toStage = isMaster ? 3 : 2;
  GameEventBus.emitPetEvolved({
    player: state.currentTurn as 'player' | 'opponent',
    instanceId: basic.instanceId,
    cardName: evolvedCard.name || 'Unknown',
    familyName: petFamily || evolvedCard.petFamily || '',
    fromStage: fromStage as 1 | 2,
    toStage: toStage as 2 | 3,
    element: evolvedCard.element,
  });

  return { evolved: true, newState: state };
}

/**
 * Initialize a new game state
 * @param selectedDeckId - The ID of the player's selected deck
 * @param selectedHeroClass - The hero class selected by the player
 * @param selectedHeroId - The specific Norse hero ID selected by the player
 */
export function initializeGame(selectedDeckId?: string, selectedHeroClass?: HeroClass, selectedHeroId?: string): GameState {
  // Get the selected deck if available or create a random deck
  let playerDeck: CardData[];
  let playerClass: HeroClass;
  
  if (selectedDeckId && selectedHeroClass) {
    const savedDecks = JSON.parse(localStorage.getItem('ragnarok_decks') || '[]');
    const selectedDeck = savedDecks.find((deck: any) => deck.id === selectedDeckId);
    
    if (selectedDeck) {
      // Convert deck format to array of CardData
      playerDeck = [];
      Object.entries(selectedDeck.cards).forEach(([cardId, count]) => {
        // Find the card in the full database
        const cardData = getCardById(parseInt(cardId));
        if (cardData) {
          // Convert count to a number if it isn't already
          const countNumber = typeof count === 'number' ? count : parseInt(count as string) || 0;
          
          // Add the card multiple times based on count
          for (let i = 0; i < countNumber; i++) {
            playerDeck.push(cardData);
          }
        }
      });
      
      playerClass = selectedHeroClass;
    } else {
      // Fallback to random deck if saved deck not found
      playerDeck = createStartingDeck(30);
      playerClass = selectedHeroClass;
      debug.warn(`Selected deck not found. Using random deck.`);
    }
  } else {
    // Fallback to random class deck with no test cards
    playerClass = 'mage';
    playerDeck = createClassDeck(playerClass, 30);
  }
  
  // Apply NFT card levels from collection (lower-level NFTs get weaker stats)
  // Access HiveDataLayer lazily to avoid circular chunk dependency (game-engine ↔ blockchain)
  try {
    const hiveStore = (globalThis as any).__ragnarokHiveDataStore;
    const hiveCollection = hiveStore?.getState?.()?.cardCollection;
    if (hiveCollection?.length) {
      playerDeck = enrichDeckWithNFTLevels(playerDeck, hiveCollection);
    }
  } catch { /* HiveDataLayer not loaded yet */ }

  // Create opponent deck (AI always gets max-level cards)
  const opponentClass: HeroClass = 'hunter';
  const opponentDeck = createClassDeck(opponentClass, 30);
  
  // Create players with initial cards
  const { drawnCards: playerInitialCards, remainingDeck: playerRemainingDeck } = 
    drawCards(playerDeck, 3);
  
  const { drawnCards: opponentInitialCards, remainingDeck: opponentRemainingDeck } = 
    drawCards(opponentDeck, 3);
  
  // Create player objects
  const player: Player = {
    id: 'player',
    name: 'Player',
    hand: playerInitialCards,
    battlefield: [],
    deck: playerRemainingDeck,
    graveyard: [], // Initialize empty graveyard
    secrets: [], // Initialize empty secrets
    weapon: undefined, // No weapon equipped initially
    mana: { 
      current: 1, 
      max: 1,
      overloaded: 0,
      pendingOverload: 0
    },
    health: 100,
    maxHealth: 100,
    heroHealth: 100,
    heroArmor: playerClass === 'warrior' ? 5 : 0, // Warriors start with armor
    armor: playerClass === 'warrior' ? 5 : 0, // Alternative property for armor
    heroClass: playerClass,
    hero: selectedHeroId ? { id: selectedHeroId } as any : undefined,
    heroPower: getDefaultHeroPower(playerClass),
    cardsPlayedThisTurn: 0, // Initialize cards played counter
    attacksPerformedThisTurn: 0 // Initialize attacks performed with weapon
  };

  const opponent: Player = {
    id: 'opponent',
    name: 'Opponent',
    hand: opponentInitialCards,
    battlefield: [],
    deck: opponentRemainingDeck,
    graveyard: [], // Initialize empty graveyard
    secrets: [], // Initialize empty secrets
    weapon: undefined, // No weapon equipped initially
    mana: {
      current: 1,
      max: 1,
      overloaded: 0,
      pendingOverload: 0
    },
    health: 100,
    maxHealth: 100,
    heroHealth: 100,
    heroArmor: (opponentClass as string) === 'warrior' ? 5 : 0, // Warriors start with armor
    armor: (opponentClass as string) === 'warrior' ? 5 : 0, // Alternative property for armor
    heroClass: opponentClass,
    heroPower: getDefaultHeroPower(opponentClass),
    cardsPlayedThisTurn: 0, // Initialize cards played counter
    attacksPerformedThisTurn: 0 // Initialize attacks performed with weapon
  };
  
  // Create initial game state with mulligan phase
  return {
    players: { player, opponent },
    currentTurn: 'player',
    turnNumber: 1,
    gamePhase: 'mulligan', // Start with mulligan phase instead of playing
    winner: undefined,
    mulligan: {
      active: true,
      playerSelections: {},
      playerReady: false,
      opponentReady: false
    },
    mulliganCompleted: false, // Mulligan happens once per game
    gameLog: []
  };
}

/**
 * Draw a card for the current player.
 * No fatigue damage — empty deck simply means no draw.
 */
export function drawCard(state: GameState): GameState {
  const currentPlayer = state.currentTurn;
  const player = state.players[currentPlayer];

  if (player.deck.length === 0) {
    return state;
  }

  return drawCardFromDeck(state, currentPlayer);
}

/**
 * Play a card from hand to battlefield
 */
export function playCard(state: GameState, cardInstanceId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number, payWithBlood?: boolean): GameState {
  // Deep clone the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state)) as GameState;

  const currentPlayer = newState.currentTurn;
  const player = newState.players[currentPlayer];

  // Find the card in the player's hand
  const cardResult = findCardInstance(player.hand, cardInstanceId);
  if (!cardResult) {
    debug.error(`Card with ID ${cardInstanceId} not found in player's hand`);
    return state;
  }

  const { card, index } = cardResult;

  // Outcast: check if the card is at the leftmost or rightmost position in hand
  const isOutcast = hasKeyword(card, 'outcast') &&
    (index === 0 || index === player.hand.length - 1);

  // Save the original card data for reference (before we remove it from hand)
  const originalCardData = JSON.parse(JSON.stringify(card.card));

  // Blood Price: pay health instead of mana
  const bloodCost = card.card.bloodPrice;
  const isBloodPayment = payWithBlood && bloodCost && bloodCost > 0;

  // Apply artifact spell cost reduction (Gungnir)
  let effectiveManaCost = card.card.manaCost || 0;
  if (card.card.type === 'spell') {
    effectiveManaCost = Math.max(0, effectiveManaCost - getArtifactSpellCostReduction(newState, currentPlayer));
  }

  // Outcast mana discount: reduce cost when played from edge of hand
  const outcastEff = (card.card as any).outcastEffect;
  if (isOutcast && outcastEff?.type === 'mana_discount') {
    effectiveManaCost = Math.max(0, effectiveManaCost - (outcastEff.manaDiscount || 0));
  }

  // Asgard realm: enemy spells cost (1) more
  if (newState.activeRealm && card.card.type === 'spell') {
    const realmOwner = newState.activeRealm.owner;
    const isEnemy = currentPlayer !== realmOwner;
    if (isEnemy) {
      for (const eff of newState.activeRealm.effects) {
        if (eff.type === 'cost_increase' && eff.target === 'enemy') {
          effectiveManaCost += eff.value;
        }
      }
    }
  }

  // Fateweave: if player has active Prophecy and a fateweave minion on board, spells cost (1) less
  if (card.card.type === 'spell' && newState.prophecies && newState.prophecies.length > 0) {
    const hasFateweave = newState.players[currentPlayer].battlefield.some(
      m => m.card?.keywords?.includes('fateweave')
    );
    if (hasFateweave) {
      effectiveManaCost = Math.max(0, effectiveManaCost - 1);
    }
  }

  if (isBloodPayment) {
    // Blood Price: check hero has enough health (must survive)
    const heroHealth = player.heroHealth ?? player.health ?? 100;
    if (heroHealth - bloodCost <= 0) {
      return state;
    }
    // Pay with health — deal damage to own hero
    player.heroHealth = (player.heroHealth ?? player.health ?? 100) - bloodCost;
    if (player.health !== undefined) player.health = player.heroHealth;
  } else {
    // Normal mana payment: check if player has enough mana
    if (effectiveManaCost > player.mana.current) {
      return state;
    }
  }

  // Sacrifice Cost: destroy N active friendly minions to play this card
  const sacrificeCost = card.card.sacrificeCost;
  if (sacrificeCost && sacrificeCost > 0) {
    const eligible = player.battlefield.filter(
      (m: CardInstance) => !m.isSummoningSick && m.canAttack !== false
    );
    if (eligible.length < sacrificeCost) {
      return state;
    }
    // Auto-sacrifice the weakest eligible minions (lowest attack first)
    const sorted = [...eligible].sort((a, b) => {
      const atkA = a.currentAttack ?? (a.card as any).attack ?? 0;
      const atkB = b.currentAttack ?? (b.card as any).attack ?? 0;
      return atkA - atkB;
    });
    for (let i = 0; i < sacrificeCost; i++) {
      newState = destroyCard(newState, sorted[i].instanceId, currentPlayer);
    }
  }

  // Update cards played this turn counter (for Combo)
  const updatedCardsPlayedThisTurn = player.cardsPlayedThisTurn + 1;
  const isComboActive = updatedCardsPlayedThisTurn > 1 && hasKeyword(card, 'combo');

  // Handle pending overload if card has overload keyword
  let pendingOverload = player.mana.pendingOverload || 0;
  if (hasKeyword(card, 'overload') && card.card.overload) {
    pendingOverload += card.card.overload.amount;
  }
  
  // Handle different card types
  // 1. Handle Secret cards
  if (card.card.type === 'secret') {
    // Update state with combo/overload before passing to playSecret
    player.cardsPlayedThisTurn = updatedCardsPlayedThisTurn;
    player.mana.pendingOverload = pendingOverload;

    return playSecret(newState, cardInstanceId, !!isBloodPayment);
  }
  
  // 2. Handle Weapon cards
  if (card.card.type === 'weapon') {

    // Remove card from hand
    player.hand.splice(index, 1);

    // Update player state
    player.cardsPlayedThisTurn = updatedCardsPlayedThisTurn;
    if (!isBloodPayment) player.mana.current -= (card.card.manaCost || 0);
    player.mana.pendingOverload = pendingOverload;

    // Create weapon card instance
    return equipWeapon(newState, currentPlayer, card);
  }

  // 2b. Handle Artifact cards
  if (card.card.type === 'artifact') {
    player.hand.splice(index, 1);
    player.cardsPlayedThisTurn = updatedCardsPlayedThisTurn;
    if (!isBloodPayment) player.mana.current -= (card.card.manaCost || 0);
    player.mana.pendingOverload = pendingOverload;
    return equipArtifact(newState, currentPlayer, card);
  }

  // 2c. Handle Armor cards
  if (card.card.type === 'armor') {
    const armorData = card.card as any;
    const slot = armorData.armorSlot;
    if (slot) {
      player.hand.splice(index, 1);
      player.cardsPlayedThisTurn = updatedCardsPlayedThisTurn;
      if (!isBloodPayment) player.mana.current -= (card.card.manaCost || 0);
      player.mana.pendingOverload = pendingOverload;
      const piece = armorPieceFromCard(armorData);
      if (piece) {
        return equipArmorPiece(newState, currentPlayer, piece, slot);
      }
    }
    return newState;
  }

  // 3. Handle Spell cards
  if (card.card.type === 'spell') {
    // Check if the spell requires a target
    if (requiresSpellTarget(card.card) && !targetId) {
      // Don't play the card yet, wait for target selection
      return state;
    }
    
    // Check if this is a quest card - activate the quest instead of normal spell effect
    if (isQuestCard(card.card)) {
      // Remove card from hand
      player.hand.splice(index, 1);

      // Update player state
      player.cardsPlayedThisTurn = updatedCardsPlayedThisTurn;
      if (!isBloodPayment) player.mana.current -= effectiveManaCost;
      player.mana.pendingOverload = pendingOverload;

      // Activate the quest via utility layer
      const questData = extractQuestData(card.card);
      if (questData) {
        const questOwner = currentPlayer === 'player' ? 'player' : 'opponent';
        activateQuest(questOwner, questData);
      }

      return newState;
    }

    // Remove card from hand
    player.hand.splice(index, 1);

    // Update player state
    player.cardsPlayedThisTurn = updatedCardsPlayedThisTurn;
    if (!isBloodPayment) player.mana.current -= effectiveManaCost;
    player.mana.pendingOverload = pendingOverload;

    // Track quest progress for spell casts
    const spellQuestOwner = currentPlayer === 'player' ? 'player' : 'opponent';
    trackQuestProgress(spellQuestOwner, 'cast_spell', card.card);

    // Execute the spell effect

    // Process Norse Hero on-spell-cast passives (Ragnarok Poker integration)
    if (isNorseActive()) {
      newState = processHeroOnSpellCast(newState, currentPlayer);
    }

    // Process artifact on-spell-cast triggers (Gungnir, Master Bolt)
    newState = processArtifactOnSpellCast(newState, currentPlayer);

    // Outcast bonus effects for spells (non-mana-discount)
    if (isOutcast && outcastEff && outcastEff.type !== 'mana_discount') {
      if (outcastEff.type === 'draw') {
        const drawCount = outcastEff.value || 1;
        for (let i = 0; i < drawCount; i++) {
          newState = drawCardFromDeck(newState, currentPlayer);
        }
      }
    }

    // If combo is active and the card has a combo effect, execute that instead
    if (isComboActive && card.card.comboEffect) {
      let comboResult = executeComboSpellEffect(newState, cardInstanceId, targetId, targetType);
      comboResult = processSpellburst(comboResult, card.card);
      return comboResult;
    }

    let spellResult = executeSpell(newState, card, targetId, targetType);
    spellResult = processSpellburst(spellResult, card.card);

    // Emit spell cast event for animations
    GameEventBus.emitSpellCast({
      cardId: String(card.card.id),
      cardName: card.card.name,
      player: currentPlayer,
      targetId,
      effectType: (card.card as any).spellEffect?.type || 'default',
    });

    return spellResult;
  }
  
  // 3. Handle Minion cards
  
  // Handle Magnetic mechanic - check if targeting a mech on battlefield
  const isMagnetic = hasKeyword(card, 'magnetic');
  if (isMagnetic && targetId && targetType === 'minion') {
    // Apply magnetic effect to target mech
    
    // Check if target is a valid mech minion
    let targetMech;
    let isFriendlyTarget = false;
    
    // Check player's battlefield for target
    const friendlyTargetInfo = findCardInstance(player.battlefield || [], targetId);
    if (friendlyTargetInfo) {
      targetMech = friendlyTargetInfo.card;
      isFriendlyTarget = true;
      
      // Check if target is an Automaton (accepts legacy 'mech' or 'automaton')
      const targetRace = (targetMech.card.race || '').toLowerCase();
      if (targetRace === 'mech' || targetRace === 'automaton') {
        // Apply magnetization
        return applyMagnetization(newState, currentPlayer, cardInstanceId, targetId);
      } else {
        debug.error('Magnetize target is not an Automaton');
        return state;
      }
    }
    
    // If target wasn't found or isn't a valid mech, continue with normal play
  }
  
  // Check if the card has a battlecry that requires a target
  if (requiresBattlecryTarget(card.card) && !targetId) {
    // Don't play the card yet, wait for target selection
    return state;
  }

  // Pet evolution: check BEFORE battlefield full check (evolution replaces, doesn't add)
  const evolvesFromId = (card.card as any).evolvesFrom;
  const isMasterPet = (card.card as any).petStage === 'master';
  if (evolvesFromId || isMasterPet) {
    player.hand.splice(index, 1);
    const evoResult = attemptPetEvolution(newState, player, card);
    if (evoResult.evolved) {
      // Execute the evolved form's battlecry if it has one
      const evolvedMinion = player.battlefield.find(
        m => m.evolvedFromStage2Id !== undefined
          && (m.card as any).petFamily === ((card.card as any).petFamily)
          && hasKeyword(m, 'battlecry')
          && (m.card as any).battlecry
      );
      if (evolvedMinion) {
        newState = executeBattlecry(newState, evolvedMinion.instanceId, targetId, targetType);
      }
      newState = checkPetEvolutionTrigger(newState, 'on_summon');
      return newState;
    }
    // No eligible target — return card to hand
    player.hand.splice(index, 0, card);
    return newState;
  }

  // Trio Pact: all pact members must be in hand — summons all, destroys hand + battlefield
  const trioPact = card.card.trioPact;
  if (trioPact && trioPact.length > 0) {
    const pactCards = trioPact.map((pactId: number) =>
      player.hand.find((c: CardInstance) => c.card.id === pactId)
    );
    if (pactCards.some((c: CardInstance | undefined) => !c)) {
      return state;
    }

    // Destroy all friendly minions on battlefield
    const toDestroy = [...player.battlefield];
    for (const m of toDestroy) {
      newState = destroyCard(newState, m.instanceId, currentPlayer);
    }
    const updatedPlayer = newState.players[currentPlayer];

    // Remove ALL cards from hand (trio pact devastation)
    updatedPlayer.hand = [];

    // Place all 3 pact minions on battlefield with summoning sickness
    for (const pactCard of pactCards) {
      if (!pactCard) continue;
      const placed: CardInstance = {
        ...pactCard,
        isPlayed: true,
        isSummoningSick: true,
        canAttack: false,
        attacksPerformed: 0
      };
      updatedPlayer.battlefield.push(placed);
      GameEventBus.emitCardPlayed({
        player: currentPlayer,
        cardId: String(placed.card.id),
        instanceId: placed.instanceId,
        cardName: placed.card.name,
        cardType: 'minion',
        manaCost: placed.card.manaCost || 0,
        rarity: placed.card.rarity
      });
    }

    updatedPlayer.cardsPlayedThisTurn = updatedCardsPlayedThisTurn;
    return newState;
  }

  // Check if battlefield is full before removing card from hand
  if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    debug.error(`Cannot play ${card.card.name}: Battlefield is full (${MAX_BATTLEFIELD_SIZE} minions maximum)`);
    return state;
  }

  // Remove card from hand - must be done BEFORE battlecry processing to ensure clean state
  player.hand.splice(index, 1);

  // Mark card as played and handle summoning sickness
  // Cards with the 'charge' keyword can attack immediately
  // Cards with the 'rush' keyword can attack minions immediately but not heroes
  
  const hasCharge = hasKeyword(card, 'charge');
  const hasRush = hasKeyword(card, 'rush');
  const canAttackImmediately = hasCharge || hasRush;
  
  let playedCard: CardInstance = {
    ...card,
    isPlayed: true,
    isSummoningSick: !canAttackImmediately, // No summoning sickness for Charge/Rush minions
    canAttack: canAttackImmediately, // Charge/Rush minions can attack immediately
    hasRush: hasRush, // Track if it has Rush to limit hero attacks
    isRush: hasRush, // Add isRush property
    attacksPerformed: 0  // Reset attacks performed counter
  };
  
  // If the card has Rush, use initializeRushEffect to ensure proper Rush handling
  if (hasRush) {
    playedCard = initializeRushEffect(playedCard);
  }
  
  // Apply Super Minion hero bonus (+2/+2 when played by linked hero)
  const cardId = typeof playedCard.card.id === 'number' ? playedCard.card.id : parseInt(playedCard.card.id as string);
  // Check heroId on player, or fallback to hero.id if available
  const currentHeroId = player.heroId || (player.hero as any)?.id || player.id;
  if (isSuperMinion(cardId) && currentHeroId && shouldGetHeroBonus(cardId, currentHeroId)) {
    const baseAttack = (playedCard.card as any).attack || 0;
    const baseHealth = (playedCard.card as any).health || 0;
    const bonusAttack = baseAttack + 2;
    const bonusHealth = baseHealth + 2;
    playedCard = {
      ...playedCard,
      currentAttack: bonusAttack,
      currentHealth: bonusHealth,
      hasSuperMinionBonus: true
    };
  }
  
  // Add the played card to the battlefield at the chosen position
  if (insertionIndex !== undefined && insertionIndex >= 0 && insertionIndex <= player.battlefield.length) {
    player.battlefield.splice(insertionIndex, 0, playedCard);
  } else {
    player.battlefield.push(playedCard);
  }
  
  // Svartalfheim realm: newly played minions get stealth
  if (newState.activeRealm?.effects?.some(e => e.type === 'stealth_on_play')) {
    (playedCard as any).hasStealth = true;
  }

  // Alfheim realm: newly played minions get elusive
  if (newState.activeRealm?.id === 'alfheim') {
    (playedCard as any).hasElusive = true;
  }

  // Fateweave: +3 Attack if player has active Prophecy
  if (hasKeyword(playedCard, 'fateweave') && newState.prophecies && newState.prophecies.length > 0) {
    playedCard.currentAttack = (playedCard.currentAttack || 0) + 3;
  }

  // Pet element synergy: +1 Health when pet element matches hero element
  const petElement = (playedCard.card as any).element;
  if (petElement && player.heroId) {
    const hero = getNorseHeroById(player.heroId);
    if (hero && hero.element === petElement) {
      playedCard.currentHealth = (playedCard.currentHealth || (playedCard.card as any).health || 0) + 1;
      newState = checkPetEvolutionTrigger(newState, 'on_gain_health');
    }
  }

  // Update player state
  player.cardsPlayedThisTurn = updatedCardsPlayedThisTurn;
  if (!isBloodPayment) player.mana.current -= effectiveManaCost;
  player.mana.pendingOverload = pendingOverload;
  
  // Track quest progress for minion plays
  const questOwner = currentPlayer === 'player' ? 'player' : 'opponent';
  trackQuestProgress(questOwner, 'play_minion', playedCard.card);
  
  // Process Norse King/Hero on-minion-play effects (Ragnarok Poker integration)
  if (isNorseActive()) {
    const minionElement = (playedCard.card as any).element;
    newState = processAllOnMinionPlayEffects(newState, currentPlayer, playedCard.instanceId, minionElement);
  }

  // Process artifact on-minion-play triggers (Brisingamen, Dagger of Deceit, Aegis)
  newState = processArtifactOnMinionPlay(newState, currentPlayer, playedCard.instanceId);

  // Process opponent's artifact reaction to this minion being played (Ran debuff, Hera destroy, Thrymr copy)
  newState = processArtifactOnEnemyMinionPlayed(newState, currentPlayer, playedCard.instanceId);

  // Ragnarok Chain: check if partner is already in play → apply onBothInPlay effects
  const chainPartner = (playedCard.card as any).chainPartner;
  if (chainPartner) {
    const bf = newState.players[currentPlayer].battlefield;
    const partner = bf.find((m: CardInstance) => m.card.id === chainPartner);
    if (partner) {
      playedCard.chainPartnerInstanceId = partner.instanceId;
      partner.chainPartnerInstanceId = playedCard.instanceId;
      const playedChainEff = (playedCard.card as any).chainEffect?.onBothInPlay;
      const partnerChainEff = (partner.card as any).chainEffect?.onBothInPlay;
      if (playedChainEff) {
        if (playedChainEff.type === 'buff_self') {
          playedCard.currentAttack = (playedCard.currentAttack ?? 0) + (playedChainEff.value || 0);
          playedCard.currentHealth = (playedCard.currentHealth ?? 0) + (playedChainEff.value || 0);
        } else if (playedChainEff.type === 'grant_divine_shield') {
          (playedCard as any).hasDivineShield = true;
        }
      }
      if (partnerChainEff) {
        if (partnerChainEff.type === 'buff_self') {
          partner.currentAttack = (partner.currentAttack ?? 0) + (partnerChainEff.value || 0);
          partner.currentHealth = (partner.currentHealth ?? 0) + (partnerChainEff.value || 0);
        } else if (partnerChainEff.type === 'grant_divine_shield') {
          (partner as any).hasDivineShield = true;
        }
      }
      newState = checkPetEvolutionTrigger(newState, 'on_buff');
    }
    // Nidhogg special: if partner is Ratatoskr already in play, buff Nidhogg attack
    const partnerPlayEff = (playedCard.card as any).chainEffect?.onPartnerPlay;
    if (partnerPlayEff && partner) {
      if (partnerPlayEff.type === 'buff_self') {
        playedCard.currentAttack = (playedCard.currentAttack ?? 0) + (partnerPlayEff.value || 0);
        newState = checkPetEvolutionTrigger(newState, 'on_buff');
      }
    }
  }

  // Pet evolution: on_summon when a minion enters the battlefield
  newState = checkPetEvolutionTrigger(newState, 'on_summon');

  // Handle colossal minions - summon additional parts
  const isColossalMinion = hasKeyword(playedCard, 'colossal');
  if (isColossalMinion) {
    // Get the instance ID of the just-played card
    const colossalMinionId = playedCard.instanceId;
    
    // Summon additional parts for the colossal minion
    // This needs to be done after the card is on the battlefield
    newState = summonColossalParts(newState, colossalMinionId, currentPlayer);
  }
  
  // Find the card we just added to battlefield
  if (player.battlefield.length === 0) {
    debug.error('Battlefield is empty after playing card');
    return newState;
  }
  const justPlayedCardInfo = findCardInstance(
    player.battlefield,
    player.battlefield[player.battlefield.length - 1].instanceId
  );

  if (!justPlayedCardInfo) {
    debug.error('Card just played not found on battlefield - this should never happen');
    return newState;
  }
  
  const justPlayedCard = justPlayedCardInfo.card;
  
  // Check if we should execute combo or battlecry
  const originalKeywords = originalCardData.keywords || [];
  const hasComboEffect = Array.isArray(originalKeywords) && originalKeywords.includes('combo') && (originalCardData as any).comboEffect;
  const hasBattlecryEffect = Array.isArray(originalKeywords) && originalKeywords.includes('battlecry') && (originalCardData as any).battlecry;
  // Check if combo should activate (updatedCardsPlayedThisTurn is already > 0 when playing any card)
  
  // Use the new ID from the battlefield for the effects
  const fieldCardId = justPlayedCard.instanceId;
  
  // Handle Combo effects (takes precedence over battlecry when active)
  if (hasComboEffect && shouldActivateCombo(newState, currentPlayer)) {
    return executeComboEffect(newState, currentPlayer, fieldCardId, targetId);
  }
  
  // Execute battlecry effect if the card has one and has the battlecry keyword
  if (hasBattlecryEffect) {
    // Execute the battlecry for this card on the battlefield
    
    // Apply the battlecry effect
    if ((originalCardData as any).battlecry.type === 'damage') {
      // Handle damage battlecry
      if (targetType === 'minion' && targetId) {
        // Find target minion
        let targetMinion;
        let targetIndex: number;
        let targetPlayer: 'player' | 'opponent';
        
        // Check opponent battlefield first
        const opponentPlayer: 'player' | 'opponent' = currentPlayer === 'player' ? 'opponent' : 'player';
        const targetInfo = findCardInstance(newState.players[opponentPlayer].battlefield, targetId);
        
        if (targetInfo) {
          targetMinion = targetInfo.card;
          targetIndex = targetInfo.index;
          targetPlayer = opponentPlayer;
          
          // Apply damage to the target
          const damage = (originalCardData as any).battlecry.value || 1;
          
          // Check for Divine Shield
          if (targetMinion.hasDivineShield) {
            newState.players[targetPlayer].battlefield[targetIndex].hasDivineShield = false;
          } else {
            // Ensure currentHealth exists
            if (!targetMinion.currentHealth) {
              targetMinion.currentHealth = (targetMinion.card as any).health || 1;
            }
            
            // Apply damage
            newState.players[targetPlayer].battlefield[targetIndex].currentHealth! -= damage;
            
            // Check if minion is destroyed
            if ((newState.players[targetPlayer].battlefield[targetIndex].currentHealth || 0) <= 0) {
              const deadMinionId = newState.players[targetPlayer].battlefield[targetIndex].instanceId;
              newState = destroyCard(newState, deadMinionId, targetPlayer);
            }
          }
        } else {
          // Check friendly battlefield (for self-targeting battlecries)
          const friendlyTargetInfo = findCardInstance(newState.players[currentPlayer].battlefield, targetId);
          
          if (friendlyTargetInfo) {
            targetMinion = friendlyTargetInfo.card;
            targetIndex = friendlyTargetInfo.index;
            
            // Apply damage to friendly target
            const damage = (originalCardData as any).battlecry.value || 1;
            
            // Check for Divine Shield
            if (targetMinion.hasDivineShield) {
              newState.players[currentPlayer].battlefield[targetIndex].hasDivineShield = false;
            } else {
              // Ensure currentHealth exists
              if (!targetMinion.currentHealth) {
                targetMinion.currentHealth = (targetMinion.card as any).health || 1;
              }
              
              // Apply damage
              newState.players[currentPlayer].battlefield[targetIndex].currentHealth! -= damage;
              
              // Check if minion is destroyed
              if ((newState.players[currentPlayer].battlefield[targetIndex].currentHealth || 0) <= 0) {
                const deadMinionId = newState.players[currentPlayer].battlefield[targetIndex].instanceId;
                newState = destroyCard(newState, deadMinionId, currentPlayer);
              }
            }
          } else {
            debug.error('Target minion not found for battlecry damage');
          }
        }
      } else if (targetType === 'hero') {
        // Handle damage to hero
        const damage = (originalCardData as any).battlecry.value || 1;
        
        if (targetId === 'opponent') {
          newState = dealDamage(newState, 'opponent', 'hero', damage, undefined, originalCardData.id as number | undefined, currentPlayer);
        } else {
          newState = dealDamage(newState, 'player', 'hero', damage, undefined, originalCardData.id as number | undefined, currentPlayer);
        }
      }
    } else if ((originalCardData as any).battlecry.type === 'aoe_damage') {
      // Handle AoE damage battlecry
      const damageAmount = (originalCardData as any).battlecry.value || 2;
      
      // Special case for Deathwing (destroy all other minions, discard hand)
      if (damageAmount >= 1000 && (originalCardData as any).battlecry.targetType === 'all_minions') {
        // Special battlecry: Destroy all other minions
        
        // Get the ID of the card we just played (Deathwing)
        const deathwingId = fieldCardId;
        
        // Clear all minions except Deathwing from player's battlefield
        newState.players[currentPlayer].battlefield = newState.players[currentPlayer].battlefield.filter(
          m => m.instanceId === deathwingId
        );
        
        // Clear all minions from opponent's battlefield
        newState.players[currentPlayer === 'player' ? 'opponent' : 'player'].battlefield = [];
        
        // If this card also discards your hand, do that
        if ((originalCardData as any).battlecry.discardCount !== undefined && 
            (originalCardData as any).battlecry.discardCount === -1) {
          // Special battlecry: Discard your hand
          newState.players[currentPlayer].hand = [];
        }
      } 
      // Regular AOE damage to all enemy minions
      else if ((originalCardData as any).battlecry.affectsAllEnemies) {
        // Execute AoE damage to all enemy minions
        
        // Determine the enemy player
        const enemyPlayer = currentPlayer === 'player' ? 'opponent' : 'player';
        const enemyMinions = newState.players[enemyPlayer].battlefield;
        
        // Track minions to remove (to avoid index shifting issues)
        const minionsToRemove: number[] = [];
        
        // Apply damage to all enemy minions
        for (let i = 0; i < enemyMinions.length; i++) {
          const minion = enemyMinions[i];
          
          // Check for Divine Shield
          if (minion.hasDivineShield) {
            // Divine Shield absorbs the AoE damage
            newState.players[enemyPlayer].battlefield[i].hasDivineShield = false;
          } else {
            // Ensure currentHealth exists
            if (!minion.currentHealth) {
              minion.currentHealth = (minion.card as any).health || 1;
            }
            
            // Apply damage
            newState.players[enemyPlayer].battlefield[i].currentHealth! -= damageAmount;
            // Apply AoE damage to the minion
            
            // Check if the minion is destroyed
            if ((newState.players[enemyPlayer].battlefield[i].currentHealth || 0) <= 0) {
              // Mark minion for removal when destroyed by AoE damage
              minionsToRemove.push(i);
            }
          }
        }
        
        // Remove destroyed minions using destroyCard to trigger graveyard and deathrattle effects
        const deadIds = minionsToRemove.map(idx => newState.players[enemyPlayer].battlefield[idx].instanceId);
        for (const id of deadIds) {
          newState = destroyCard(newState, id, enemyPlayer);
        }
      }
    } 
    // For any other battlecry types, call the executeBattlecry function from battlecryUtils.ts
    else {
      newState = executeBattlecry(newState, fieldCardId, targetId, targetType);
    }
  }
  
  // We've already handled combo effects earlier so this section is no longer needed
  // The effects are applied when the card is played

  // Outcast bonus effects for minions (non-mana-discount): draw, discover, etc.
  if (isOutcast && outcastEff && outcastEff.type !== 'mana_discount') {
    if (outcastEff.type === 'draw') {
      const drawCount = outcastEff.value || 1;
      for (let i = 0; i < drawCount; i++) {
        newState = drawCardFromDeck(newState, currentPlayer);
      }
    }
  }

  // Handle Echo mechanic - if the card has Echo, create a copy that can be played again this turn
  if (card && hasEcho(card)) {
    newState = createEchoCopy(newState, card, currentPlayer);
  }

  newState = recalculateAuras(newState);

  return newState;
}

/**
 * End the current turn and prepare for the next turn
 * Implements turn rules:
 * 1. Change active player
 * 2. Increase max mana by 1 (up to 10) for the new active player
 * 3. Refresh current mana to full
 * 4. Draw a card for the new active player
 * 5. Reset summoning sickness and allow cards to attack
 */

/**
 * Apply the standard turn-start pipeline for a player
 * This ensures consistent ordering: start-of-turn effects → resets → draw
 * @param state Current game state (with currentTurn already set to the player)
 * @param player The player whose turn is starting
 * @returns Updated game state after turn-start processing
 */
function applyTurnStartPipeline(state: GameState, player: 'player' | 'opponent'): GameState {
  let newState = state;
  
  // Validation: ensure currentTurn matches the player we're processing
  if (newState.currentTurn !== player) {
    debug.warn(`[applyTurnStartPipeline] currentTurn mismatch: expected ${player}, got ${newState.currentTurn}`);
  }
  
  // 1. Log the turn start first (so logs show before effects)
  newState = logTurnStart(newState, player);
  
  // 2. Process start-of-turn effects for minions
  newState = processStartOfTurnEffects(newState);
  
  // 3. Process Norse King/Hero start-of-turn effects (Ragnarok Poker integration)
  if (isNorseActive()) {
    newState = processAllStartOfTurnEffects(newState, player);
  }

  // 3b. Process artifact start-of-turn triggers (Khepri armor, Gerd freeze, Idunn buff, etc.)
  newState = processArtifactStartOfTurn(newState, player);

  // 3c. Apply realm start-of-turn effects (e.g., Vanaheim healing)
  if (newState.activeRealm) {
    for (const eff of newState.activeRealm.effects) {
      if (eff.type === 'heal_all_start_turn') {
        for (const side of ['player', 'opponent'] as const) {
          for (const minion of newState.players[side].battlefield) {
            const maxHp = (minion.card as any).health ?? minion.currentHealth ?? 1;
            minion.currentHealth = Math.min((minion.currentHealth ?? 0) + eff.value, maxHp);
          }
        }
        newState = checkPetEvolutionTrigger(newState, 'on_heal');
      }
    }
  }

  // 4. Recalculate aura buffs (minions may have changed during start-of-turn effects)
  newState = recalculateAuras(newState);

  // 5. Reset minions for the turn (clears summoning sickness, attack counters, etc.)
  newState = performTurnStartResets(newState);

  // 6. Draw a card for the player
  newState = drawCard(newState);

  return newState;
}

function resolveProphecy(state: GameState, prophecy: import('../types').Prophecy): GameState {
  let newState = { ...state };
  const effect = prophecy.effect as any;
  const owner = prophecy.owner;
  const enemy = owner === 'player' ? 'opponent' : 'player';

  if (!newState.gameLog) newState.gameLog = [];
  newState.gameLog.push({
    id: `prophecy-${Date.now()}`,
    type: 'effect' as const,
    player: owner,
    text: `Prophecy fulfilled: ${prophecy.name} — ${prophecy.description}`,
    timestamp: Date.now(),
    turn: newState.turnNumber,
  });

  switch (effect.type) {
    case 'destroy_low_attack': {
      const threshold = effect.threshold || 3;
      for (const side of ['player', 'opponent'] as const) {
        const toDestroy = newState.players[side].battlefield
          .filter((m: CardInstance) => (m.currentAttack ?? (m.card as any).attack ?? 0) <= threshold)
          .map((m: CardInstance) => m.instanceId);
        for (const id of toDestroy) {
          newState = destroyCard(newState, id, side);
        }
      }
      break;
    }
    case 'damage_both_heroes': {
      const dmg = effect.value || 5;
      newState = dealDamageToHero(newState, 'player', dmg);
      newState = dealDamageToHero(newState, 'opponent', dmg);
      break;
    }
    case 'freeze_all_minions': {
      for (const side of ['player', 'opponent'] as const) {
        for (const minion of newState.players[side].battlefield) {
          (minion as any).isFrozen = true;
        }
      }
      newState = checkPetEvolutionTrigger(newState, 'on_freeze');
      break;
    }
    case 'destroy_all': {
      for (const side of ['player', 'opponent'] as const) {
        const ids = newState.players[side].battlefield.map((m: CardInstance) => m.instanceId);
        for (const id of ids) {
          newState = destroyCard(newState, id, side);
        }
        const player = newState.players[side];
        if ((player as any).weapon) {
          (player as any).weapon = null;
        }
      }
      break;
    }
    case 'heal': {
      const amount = effect.value || 8;
      const healTarget = effect.targetType === 'friendly_hero' ? owner : enemy;
      const p = newState.players[healTarget];
      p.heroHealth = Math.min((p.heroHealth ?? p.health ?? 100) + amount, p.maxHealth ?? 100);
      if (p.health !== undefined) p.health = p.heroHealth;
      break;
    }
    case 'summon': {
      const bf = newState.players[owner].battlefield;
      if (bf.length < MAX_BATTLEFIELD_SIZE) {
        const kw: string[] = effect.keywords || [];
        bf.push({
          instanceId: `prophecy-summon-${Date.now()}`,
          card: {
            id: 9999,
            name: effect.summonName || 'Summoned Minion',
            type: 'minion' as const,
            manaCost: 0,
            attack: effect.summonAttack || 1,
            health: effect.summonHealth || 1,
            description: `Summoned by ${prophecy.name}.`,
            rarity: 'token' as any,
            class: 'Neutral',
            keywords: kw,
            set: 'core',
            collectible: false,
          } as any,
          currentAttack: effect.summonAttack || 1,
          currentHealth: effect.summonHealth || 1,
          canAttack: kw.includes('charge'),
          isPlayed: true,
          isSummoningSick: !kw.includes('charge'),
          attacksPerformed: 0,
          isPlayerOwned: owner === 'player',
          isTaunt: kw.includes('taunt'),
          hasLifesteal: kw.includes('lifesteal'),
          hasDivineShield: kw.includes('divine_shield'),
          hasRush: kw.includes('rush'),
        } as any);
      }
      break;
    }
    case 'aoe_damage': {
      const dmg = effect.value || 3;
      if (effect.targetType === 'all_enemy_minions') {
        newState = dealDamageToAllEnemyMinions(newState, owner, dmg);
      } else {
        newState = dealDamageToAllMinions(newState, dmg);
      }
      break;
    }
  }

  return newState;
}

export function endTurn(state: GameState, skipAISimulation = false): GameState {
  // Begin turn transition
  const currentPlayer = state.currentTurn;
  const nextPlayer = currentPlayer === 'player' ? 'opponent' : 'player';
  
  // NOTE: Player minion attacks are now MANUAL
  // Auto-attack was removed as it caused opponent minions to die unexpectedly
  // Players must click on their minions and select targets during their turn
  
  // Process various end-of-turn mechanics
  state = processFrozenEffectsAtTurnEnd(state);
  state = processWeaponsAtTurnEnd(state);
  state = processDormantEffects(state);
  state = processRushAtTurnEnd(state);
  
  // Process Norse King/Hero end-of-turn effects (Ragnarok Poker integration)
  if (isNorseActive()) {
    state = processAllEndOfTurnEffects(state, currentPlayer);
  }
  
  // Process artifact end-of-turn triggers (Oathblade armor)
  state = processArtifactEndOfTurn(state, currentPlayer);

  // Process Echo cards - mark them as expired at the end of turn
  state = expireEchoCardsAtEndOfTurn(state);
  
  // Update enrage effects for minions that may have been damaged
  state = updateEnrageEffects(state);

  // Tick prophecies — decrement counters, resolve any that hit 0
  if (state.prophecies && state.prophecies.length > 0) {
    const resolved: typeof state.prophecies = [];
    state.prophecies = state.prophecies.map(prophecy => {
      const updated = { ...prophecy, turnsRemaining: prophecy.turnsRemaining - 1 };
      if (updated.turnsRemaining <= 0) {
        resolved.push(updated);
      }
      return updated;
    });
    for (const prophecy of resolved) {
      state = resolveProphecy(state, prophecy);
    }
    state.prophecies = (state.prophecies || []).filter(p => !resolved.includes(p));
  }

  // Tick submerge countdowns — surface minions whose timer hits 0
  state = processSubmergeCountdowns(state, currentPlayer);

  // Apply realm end-of-turn effects (e.g., Muspelheim damage)
  if (state.activeRealm) {
    for (const eff of state.activeRealm.effects) {
      if (eff.type === 'damage_all_end_turn') {
        state = dealDamageToAllMinions(state, eff.value);
      }
    }
  }

  // Pet evolution: on_survive_turn for pets that survived this turn
  state = checkPetEvolutionTrigger(state, 'on_survive_turn');

  // Increment turn number when a full round is completed (both players have played)
  const newTurnNumber = nextPlayer === 'player' ? state.turnNumber + 1 : state.turnNumber;
  
  // Calculate new max mana for the next player (capped at 10)
  // Max mana increases at the start of EACH player's turn
  const newMaxMana = Math.min(state.players[nextPlayer].mana.max + 1, 10);
  
  // Track turn change between players
  // Update max mana for next player
  
  // Ensure nextPlayer is properly typed
  const typedNextPlayer = nextPlayer as 'player' | 'opponent';
  
  // Process overload for the current player before switching
  const currentPlayerState = state.players[currentPlayer];
  const pendingOverload = currentPlayerState.mana.pendingOverload || 0;
  
  // First update the current player's overload values (setting what will be locked next turn)
  let updatedState = {
    ...state,
    players: {
      ...state.players,
      [currentPlayer]: {
        ...currentPlayerState,
        mana: {
          ...currentPlayerState.mana,
          overloaded: pendingOverload, // Apply pending overload for next turn
          pendingOverload: 0, // Reset pending overload
        }
      }
    }
  };
  
  // Get updated overloaded value for the next player (if any)
  const nextPlayerOverloaded = updatedState.players[typedNextPlayer].mana.overloaded || 0;
  // Calculate available mana after overload
  const availableMana = Math.max(0, newMaxMana - nextPlayerOverloaded);
  
  // Handle overload mechanic - track locked mana crystals and adjust available mana
  
  // Create new state with updated player turn and mana
  let newState: GameState = {
    ...updatedState,
    currentTurn: typedNextPlayer,
    turnNumber: newTurnNumber,
    players: {
      ...updatedState.players,
      [typedNextPlayer]: {
        ...updatedState.players[typedNextPlayer],
        // Refresh mana for the next player, accounting for overloaded crystals
        mana: {
          current: availableMana, // Reduced by overloaded amount
          max: newMaxMana,
          overloaded: nextPlayerOverloaded,
          pendingOverload: 0 // Reset pending overload
        },
        // We won't reset summoning sickness, attack status, and attacksPerformed here
        // because it's now handled by performTurnStartResets which is called later
        // This avoids duplicate/conflicting resets that can cause bugs
        battlefield: updatedState.players[typedNextPlayer].battlefield,
        // Reset hero power for the next turn
        heroPower: {
          ...updatedState.players[typedNextPlayer].heroPower,
          used: false
        },
        // Reset cards played counter for combo mechanics
        cardsPlayedThisTurn: 0
      }
    }
  };
  
  // Handle return of temporary mind-controlled minions
  for (const pid of ['player', 'opponent'] as const) {
    const p = newState.players[pid];
    const otherPid = pid === 'player' ? 'opponent' : 'player';
    const minionsToReturn = p.battlefield.filter(m => m.returnToOwnerAtEndOfTurn && m.originalOwner === otherPid);
    
    if (minionsToReturn.length > 0) {
      // Update state to remove them from current battlefield
      newState = {
        ...newState,
        players: {
          ...newState.players,
          [pid]: {
            ...p,
            battlefield: p.battlefield.filter(m => !m.returnToOwnerAtEndOfTurn || m.originalOwner !== otherPid)
          }
        }
      };
      
      // Add to original owner's battlefield
      const targetPlayer = newState.players[otherPid];
      const returnedMinions = minionsToReturn.map(m => ({
        ...m,
        returnToOwnerAtEndOfTurn: false,
        originalOwner: undefined,
        isSummoningSick: true,
        canAttack: false,
        isPlayerOwned: otherPid === 'player'
      })).filter((_, i) => (targetPlayer.battlefield.length + i) < MAX_BATTLEFIELD_SIZE);

      newState = {
        ...newState,
        players: {
          ...newState.players,
          [otherPid]: {
            ...targetPlayer,
            battlefield: [...targetPlayer.battlefield, ...returnedMinions]
          }
        }
      };
    }
  }

  // Apply standard turn-start pipeline for the next player
  newState = applyTurnStartPipeline(newState, typedNextPlayer);

  // Emit turn started event for animations
  GameEventBus.emitTurnStarted(typedNextPlayer, newState.turnNumber);
  
  // If next player is AI (opponent), simulate their turn
  if (typedNextPlayer === 'opponent' && !skipAISimulation) {
    try {
      // AI logic: Play cards if they have enough mana, prioritizing high cost cards
      // AI behavior for playing cards and attacking
      newState = simulateOpponentTurn(newState);
      
      // Process end of turn effects for the opponent
      newState = processEndOfTurnEffects(newState);
      
      // End AI turn immediately and return to player
      
      // Set up player's next turn - prepare base state, then apply standard pipeline
      const playerState = newState.players.player;
      const newTurnNumber = newState.turnNumber + 1;
      const newPlayerMaxMana = Math.min(playerState.mana.max + 1, 10);
      const playerOverloaded = playerState.mana.overloaded || 0;
      const availableMana = Math.max(0, newPlayerMaxMana - playerOverloaded);
      
      // Set up base state for player's turn
      newState = {
        ...newState,
        currentTurn: 'player',
        turnNumber: newTurnNumber,
        players: {
          ...newState.players,
          player: {
            ...playerState,
            mana: {
              current: availableMana,
              max: newPlayerMaxMana,
              overloaded: playerOverloaded,
              pendingOverload: 0
            },
            heroPower: {
              ...playerState.heroPower,
              used: false
            },
            cardsPlayedThisTurn: 0
          }
        }
      };
      
      // Apply standard turn-start pipeline for player (effects → resets → draw → log)
      newState = applyTurnStartPipeline(newState, 'player');
      
    } catch (error) {
      debug.error("Error during opponent's turn:", error);
      
      // Error recovery - set up base state and use standard pipeline
      const playerState = newState.players.player;
      const newTurnNumber = newState.turnNumber + 1;
      const newPlayerMaxMana = Math.min(playerState.mana.max + 1, 10);
      
      try {
        // Set up base state for player's turn
        newState = {
          ...newState,
          currentTurn: 'player',
          turnNumber: newTurnNumber,
          players: {
            ...newState.players,
            player: {
              ...playerState,
              mana: {
                current: newPlayerMaxMana,
                max: newPlayerMaxMana,
                overloaded: 0,
                pendingOverload: 0
              },
              heroPower: {
                ...playerState.heroPower,
                used: false
              },
              cardsPlayedThisTurn: 0
            }
          }
        };
        
        // Apply standard turn-start pipeline for error recovery
        newState = applyTurnStartPipeline(newState, 'player');
      } catch (recoveryError) {
        // Minimal recovery as last resort - just reset minions
        debug.error("Error in recovery path:", recoveryError);
        newState = performTurnStartResets(newState);
      }
    }
  }
  
  // Check for game over conditions
  newState = checkGameOver(newState);
  
  return newState;
}

/**
 * Process AI turn separately (used for delayed AI execution).
 * Takes a state where currentTurn === 'opponent' and turn-start pipeline is already applied.
 * Simulates AI play, processes end-of-turn, then switches back to player.
 */
export function processAITurn(state: GameState): GameState {
  let newState = state;
  try {
    newState = simulateOpponentTurn(newState);
    newState = processEndOfTurnEffects(newState);

    const playerState = newState.players.player;
    const newTurnNumber = newState.turnNumber + 1;
    const newPlayerMaxMana = Math.min(playerState.mana.max + 1, 10);
    const playerOverloaded = playerState.mana.overloaded || 0;
    const availableMana = Math.max(0, newPlayerMaxMana - playerOverloaded);

    newState = {
      ...newState,
      currentTurn: 'player',
      turnNumber: newTurnNumber,
      players: {
        ...newState.players,
        player: {
          ...playerState,
          mana: {
            current: availableMana,
            max: newPlayerMaxMana,
            overloaded: playerOverloaded,
            pendingOverload: 0
          },
          heroPower: {
            ...playerState.heroPower,
            used: false
          },
          cardsPlayedThisTurn: 0
        }
      }
    };

    newState = applyTurnStartPipeline(newState, 'player');
  } catch (error) {
    debug.error("Error during AI turn processing:", error);
    const playerState = newState.players.player;
    const newTurnNumber = newState.turnNumber + 1;
    const newPlayerMaxMana = Math.min(playerState.mana.max + 1, 10);

    try {
      newState = {
        ...newState,
        currentTurn: 'player',
        turnNumber: newTurnNumber,
        players: {
          ...newState.players,
          player: {
            ...playerState,
            mana: {
              current: newPlayerMaxMana,
              max: newPlayerMaxMana,
              overloaded: 0,
              pendingOverload: 0
            },
            heroPower: {
              ...playerState.heroPower,
              used: false
            },
            cardsPlayedThisTurn: 0
          }
        }
      };
      newState = applyTurnStartPipeline(newState, 'player');
    } catch (recoveryError) {
      debug.error("Error in AI turn recovery:", recoveryError);
      newState = performTurnStartResets(newState);
    }
  }

  newState = checkGameOver(newState);
  return newState;
}

function aiGetAtk(c: CardInstance): number {
	return (c.card as any).attack || 0;
}

function aiGetHp(c: CardInstance): number {
	return c.currentHealth || 0;
}

function aiGetMaxHp(c: CardInstance): number {
	return (c.card as any).health || 0;
}

function aiIsAoeSpell(card: CardInstance): boolean {
	const se = (card.card as any).spellEffect;
	if (!se) return false;
	const tt = se.targetType as string || '';
	return tt.includes('all_enem') || tt.includes('all_minion');
}

function aiIsRemovalSpell(card: CardInstance): boolean {
	const se = (card.card as any).spellEffect;
	if (!se) return false;
	return card.card.type === 'spell' && (se.type === 'damage' || se.type === 'destroy');
}

function aiFindBestDamageTarget(
	minions: CardInstance[],
	dmg: number
): CardInstance | undefined {
	const killable = minions.filter(m => aiGetHp(m) <= dmg);
	if (killable.length > 0) {
		return killable.sort((a, b) => aiGetAtk(b) - aiGetAtk(a))[0];
	}
	return minions.sort((a, b) => aiGetAtk(b) - aiGetAtk(a))[0];
}

function aiFindBestHealTarget(
	minions: CardInstance[]
): CardInstance | undefined {
	const damaged = minions.filter(m => aiGetHp(m) < aiGetMaxHp(m));
	if (damaged.length === 0) return undefined;
	return damaged.sort((a, b) =>
		(aiGetMaxHp(b) - aiGetHp(b)) - (aiGetMaxHp(a) - aiGetHp(a))
	)[0];
}

function aiFindBestBuffTarget(
	minions: CardInstance[]
): CardInstance | undefined {
	if (minions.length === 0) return undefined;
	return [...minions].sort((a, b) => aiGetAtk(b) - aiGetAtk(a))[0];
}

function aiKnapsackManaFill(
	hand: CardInstance[],
	mana: number,
	maxBoard: number,
	boardSize: number
): CardInstance[] {
	const playable = hand.filter(c => {
		const cost = c.card.manaCost || 0;
		if (cost > mana) return false;
		if (c.card.type === 'minion' && boardSize >= maxBoard) return false;
		return true;
	});
	if (playable.length === 0) return [];
	if (playable.length <= 15) {
		let bestCombo: CardInstance[] = [];
		let bestMana = 0;
		const n = playable.length;
		const limit = 1 << n;
		for (let mask = 1; mask < limit; mask++) {
			let totalMana = 0;
			let minionCount = 0;
			const combo: CardInstance[] = [];
			for (let i = 0; i < n; i++) {
				if (!(mask & (1 << i))) continue;
				const c = playable[i];
				totalMana += c.card.manaCost || 0;
				if (c.card.type === 'minion') minionCount++;
				combo.push(c);
			}
			if (totalMana > mana) continue;
			if (boardSize + minionCount > maxBoard) continue;
			if (totalMana > bestMana) {
				bestMana = totalMana;
				bestCombo = combo;
			}
		}
		return bestCombo;
	}
	const sorted = [...playable].sort(
		(a, b) => (b.card.manaCost || 0) - (a.card.manaCost || 0)
	);
	const result: CardInstance[] = [];
	let remaining = mana;
	let slots = maxBoard - boardSize;
	for (const c of sorted) {
		const cost = c.card.manaCost || 0;
		if (cost > remaining) continue;
		if (c.card.type === 'minion' && slots <= 0) continue;
		result.push(c);
		remaining -= cost;
		if (c.card.type === 'minion') slots--;
	}
	return result;
}

function aiPrioritizePlayOrder(
	cards: CardInstance[],
	playerMinions: CardInstance[]
): CardInstance[] {
	const hasTaunts = playerMinions.some(m => hasKeyword(m, 'taunt'));
	const enemyCount = playerMinions.length;
	return [...cards].sort((a, b) => {
		let aScore = 0;
		let bScore = 0;
		if (hasTaunts && aiIsRemovalSpell(a)) aScore += 100;
		if (hasTaunts && aiIsRemovalSpell(b)) bScore += 100;
		if (enemyCount >= 3 && aiIsAoeSpell(a)) aScore += 90;
		if (enemyCount >= 3 && aiIsAoeSpell(b)) bScore += 90;
		if (a.card.type === 'spell') aScore += 50;
		if (b.card.type === 'spell') bScore += 50;
		if (hasKeyword(a, 'taunt') && a.card.type === 'minion') aScore += 30;
		if (hasKeyword(b, 'taunt') && b.card.type === 'minion') bScore += 30;
		return bScore - aScore;
	});
}

function aiResolveSpellTarget(
	card: CardInstance,
	currentState: GameState
): string | undefined {
	const se = (card.card as any).spellEffect;
	if (!se) return undefined;
	const playerMinions = currentState.players.player.battlefield;
	const aiMinions = currentState.players.opponent.battlefield;
	const dmg = se.value || se.damage || 0;

	if (se.type === 'damage') {
		if (playerMinions.length > 0) {
			const best = aiFindBestDamageTarget(playerMinions, dmg);
			return best?.instanceId;
		}
		return 'player-hero';
	}
	if (se.type === 'heal') {
		const best = aiFindBestHealTarget(aiMinions);
		if (best) return best.instanceId;
		const aiHeroHp = currentState.players.opponent.heroHealth ?? currentState.players.opponent.health;
		if (aiHeroHp < 30) return 'opponent-hero';
		return undefined;
	}
	if (se.type === 'buff') {
		const best = aiFindBestBuffTarget(aiMinions);
		return best?.instanceId;
	}
	if (playerMinions.length > 0) {
		return playerMinions.sort((a, b) => aiGetAtk(b) - aiGetAtk(a))[0].instanceId;
	}
	return 'player-hero';
}

function aiResolveBattlecryTarget(
	card: CardInstance,
	currentState: GameState
): string | undefined {
	const bc = (card.card as any).battlecry;
	if (!bc) return undefined;
	const playerMinions = currentState.players.player.battlefield;
	const aiMinions = currentState.players.opponent.battlefield;

	if (bc.targetType === 'enemy' || bc.targetType === 'any') {
		const isDmg = bc.type === 'deal_damage' || bc.type === 'damage';
		if (isDmg && playerMinions.length > 0) {
			const dmg = bc.value || 0;
			const best = aiFindBestDamageTarget(playerMinions, dmg);
			return best?.instanceId;
		}
		if (playerMinions.length > 0) {
			return playerMinions.sort((a, b) => aiGetAtk(b) - aiGetAtk(a))[0].instanceId;
		}
		if (bc.canTargetHeroes) return 'player-hero';
		return undefined;
	}
	if (bc.targetType === 'friendly') {
		const isBuff = bc.type === 'buff' || bc.type === 'give_stats';
		if (isBuff) {
			const best = aiFindBestBuffTarget(aiMinions);
			return best?.instanceId;
		}
		const isHeal = bc.type === 'heal' || bc.type === 'restore_health';
		if (isHeal) {
			const best = aiFindBestHealTarget(aiMinions);
			return best?.instanceId;
		}
		if (aiMinions.length > 0) {
			return aiMinions.sort((a, b) => aiGetAtk(b) - aiGetAtk(a))[0].instanceId;
		}
		return undefined;
	}
	return undefined;
}

function simulateOpponentTurn(state: GameState): GameState {
	try {
		if (!state || !state.players || !state.players.opponent) {
			debug.error("Invalid state passed to simulateOpponentTurn", state);
			return state;
		}

		let currentState = JSON.parse(JSON.stringify(state)) as GameState;
		const opponent = currentState.players.opponent;

		debug.ai('[AI Turn] simulateOpponentTurn called:', {
			handSize: opponent.hand.length,
			mana: opponent.mana.current,
			maxMana: opponent.mana.max,
			battlefieldSize: opponent.battlefield.length,
			currentTurn: currentState.currentTurn
		});

		const maxBoard = MAX_BATTLEFIELD_SIZE;
		const playerMinions = currentState.players.player.battlefield;
		const cardsToPlay = aiKnapsackManaFill(
			opponent.hand,
			opponent.mana.current,
			maxBoard,
			opponent.battlefield.length
		);
		const orderedCards = aiPrioritizePlayOrder(cardsToPlay, playerMinions);

		for (const card of orderedCards) {
			if (!currentState.players.opponent.hand.find(c => c.instanceId === card.instanceId)) continue;
			if ((card.card.manaCost || 0) > currentState.players.opponent.mana.current) continue;

			// Board full guard: skip minions if battlefield is at capacity
			if (card.card.type === 'minion' && currentState.players.opponent.battlefield.length >= maxBoard) continue;

			const needsTarget = (card.card.type === 'spell' && card.card.spellEffect?.requiresTarget) ||
				(card.card.type === 'minion' && card.card.battlecry?.requiresTarget);

			if (needsTarget) {
				let targetId: string | undefined;

				if (card.card.type === 'spell') {
					const isAoe = aiIsAoeSpell(card);
					// Only skip AoE if enemy has fewer than 2 minions (don't waste board clears on 1 target)
					if (isAoe && currentState.players.player.battlefield.length < 2) continue;
					targetId = aiResolveSpellTarget(card, currentState);
				} else if (card.card.type === 'minion' && card.card.battlecry) {
					targetId = aiResolveBattlecryTarget(card, currentState);
				}

				// If targeting failed but card doesn't strictly require a target, play without target
				if (!targetId && needsTarget) {
					// Skip cards that truly need a target (damage spells, targeted battlecries)
					continue;
				}

				try {
					debug.ai(`[AI Turn] Playing targeted card: ${card.card.name} (cost: ${card.card.manaCost}) → target: ${targetId || 'none'}`);
					if (targetId) {
						const tType = targetId === 'player-hero' || targetId === 'opponent-hero' ? 'hero' : 'minion';
						currentState = playCard(currentState, card.instanceId, targetId, tType);
					} else {
						currentState = playCard(currentState, card.instanceId);
					}
				} catch (error) {
					debug.error(`Error playing targeted card ${card.card.name}:`, error);
				}
			} else {
				const isAoe = card.card.type === 'spell' && aiIsAoeSpell(card);
				if (isAoe && currentState.players.player.battlefield.length < 2) continue;

				try {
					debug.ai(`[AI Turn] Playing card: ${card.card.name} (cost: ${card.card.manaCost}, type: ${card.card.type})`);
					currentState = playCard(currentState, card.instanceId);
				} catch (error) {
					debug.error(`Error playing card ${card.card.name}:`, error);
				}
			}
		}

		debug.ai('[AI Turn] After card play phase:', {
			battlefieldSize: currentState.players.opponent.battlefield.length,
			handSize: currentState.players.opponent.hand.length,
			manaLeft: currentState.players.opponent.mana.current,
			minionsOnBoard: currentState.players.opponent.battlefield.map(m => m.card.name)
		});

		// Phase 1.5: Use hero power if available
		const oppHP = currentState.players.opponent;
		if (!oppHP.heroPower.used && oppHP.mana.current >= oppHP.heroPower.cost) {
			try {
				const effectStr = typeof oppHP.heroPower.effect === 'string' ? oppHP.heroPower.effect : (oppHP.heroPower.effect as Record<string, unknown>)?.type as string || '';
				const isDamage = /damage|deal|burn|shot|arrow|blast/i.test(effectStr);
				const isHeal = /heal|restore/i.test(effectStr);
				const isBuff = /buff|armor|shield/i.test(effectStr);
				const isSummon = /summon|totem|recruit/i.test(effectStr);
				const isDraw = /draw|card/i.test(effectStr);

				let hpTargetId: string | undefined;
				let hpTargetType: 'card' | 'hero' | undefined;

				if (isDamage) {
					const pField = currentState.players.player.battlefield;
					const hpDmg = typeof oppHP.heroPower.effect === 'object' ? ((oppHP.heroPower.effect as Record<string, unknown>)?.value as number || 1) : 1;
					const killable = pField.find(m => aiGetHp(m) <= hpDmg);
					if (killable) {
						hpTargetId = killable.instanceId;
						hpTargetType = 'card';
					} else {
						hpTargetId = 'hero';
						hpTargetType = 'hero';
					}
				} else if (isHeal) {
					const damaged = currentState.players.opponent.battlefield
						.filter(m => aiGetHp(m) < (isMinion(m.card) ? (m.card.health ?? 0) : 0))
						.sort((a, b) => aiGetHp(a) - aiGetHp(b));
					if (damaged.length > 0) {
						hpTargetId = damaged[0].instanceId;
						hpTargetType = 'card';
					} else {
						hpTargetId = 'hero';
						hpTargetType = 'hero';
					}
				} else if (isSummon && currentState.players.opponent.battlefield.length >= maxBoard) {
					// Skip summon if board full
				} else {
					// Buff, draw, armor, summon with space — use without target
				}

				if (!(isSummon && currentState.players.opponent.battlefield.length >= maxBoard)) {
					debug.ai(`[AI Turn] Using hero power: ${effectStr}`, { hpTargetId, hpTargetType });
					currentState = executeHeroPower(currentState, 'opponent', hpTargetId, hpTargetType);
				}
			} catch (error) {
				debug.error('AI hero power error:', error);
			}
		}

		// Phase 1.75: Attack with weapon if equipped
		const oppWeapon = currentState.players.opponent.weapon;
		const wpnAtk = oppWeapon ? getAttack(oppWeapon.card) : 0;
		const wpnDur = oppWeapon?.currentHealth ?? 0;
		if (oppWeapon && wpnAtk > 0 && wpnDur > 0) {
			try {
				const cloned = JSON.parse(JSON.stringify(currentState)) as GameState;
				const wpn = cloned.players.opponent.weapon!;
				const pField = cloned.players.player.battlefield;
				const pTaunts = getTauntMinions(pField);
				let weaponTarget: CardInstance | null = null;

				if (pTaunts.length > 0) {
					weaponTarget = pTaunts.sort((a, b) => aiGetHp(a) - aiGetHp(b))[0];
				} else {
					weaponTarget = pField.find(m => aiGetHp(m) <= wpnAtk) || null;
				}

				if (weaponTarget) {
					const tgt = pField.find(m => m.instanceId === weaponTarget!.instanceId);
					if (tgt) tgt.currentHealth = (tgt.currentHealth ?? (isMinion(tgt.card) ? (tgt.card.health ?? 0) : 0)) - wpnAtk;
				} else {
					const plr = cloned.players.player;
					plr.heroHealth = (plr.heroHealth ?? plr.health ?? 100) - wpnAtk;
				}
				wpn.currentHealth = (wpn.currentHealth ?? 1) - 1;
				if (wpn.currentHealth <= 0) cloned.players.opponent.weapon = undefined;
				debug.ai(`[AI Turn] Weapon attack (${wpnAtk} dmg), durability now: ${wpn.currentHealth}`);
				currentState = cloned;
			} catch (error) {
				debug.error('AI weapon attack error:', error);
			}
		}

		// Phase 2: Attack with minions
		const attackers = currentState.players.opponent.battlefield
			.filter(card => !card.isSummoningSick && card.canAttack);
		const playerHp = currentState.players.player.heroHealth ?? currentState.players.player.health;
		const playerArmor = currentState.players.player.heroArmor || 0;
		const effectiveHp = playerHp + playerArmor;
		const playerField = currentState.players.player.battlefield;
		const playerHasTaunts = hasTauntMinions(playerField);

		const totalAtk = attackers.reduce((sum, c) => sum + aiGetAtk(c), 0);
		const isLethal = !playerHasTaunts && totalAtk >= effectiveHp;

		if (isLethal) {
			debug.ai('[AI Turn] Lethal detected! Going face with everything.');
			for (const attacker of attackers) {
				try {
					currentState = processAttackForOpponent(currentState, attacker.instanceId);
				} catch (error) {
					debug.error('AI lethal attack error:', error);
				}
			}
			return currentState;
		}

		const sortedAttackers = [...attackers].sort((a, b) => aiGetAtk(a) - aiGetAtk(b));

		for (const attacker of sortedAttackers) {
			try {
				const pField = currentState.players.player.battlefield;
				const hasTaunts = hasTauntMinions(pField);
				const atkPower = aiGetAtk(attacker);
				const atkHp = aiGetHp(attacker);

				if (hasTaunts) {
					const taunts = getTauntMinions(pField);
					let bestTarget: CardInstance | null = null;
					let bestScore = -1;

					for (const t of taunts) {
						let score = 0;
						const canKill = atkPower >= aiGetHp(t);
						const survives = aiGetAtk(t) < atkHp;
						if (canKill && survives) score = 300 + aiGetAtk(t) * 10;
						else if (canKill) score = 200 + aiGetAtk(t) * 5;
						else if (survives) score = 50;
						else score = 10;
						const overkill = atkPower - aiGetHp(t);
						if (canKill) score -= Math.max(0, overkill) * 3;
						if (score > bestScore) { bestScore = score; bestTarget = t; }
					}

					if (bestTarget) {
						currentState = processAttackForOpponent(
							currentState, attacker.instanceId, (bestTarget as CardInstance).instanceId
						);
					}
					continue;
				}

				let bestTarget: CardInstance | null = null;
				let bestScore = -1;

				for (const defender of pField) {
					const canKill = atkPower >= aiGetHp(defender);
					const survives = aiGetAtk(defender) < atkHp;
					let score = 0;

					if (canKill && survives) {
						score = 500 + aiGetAtk(defender) * 10 + (defender.card.manaCost || 0) * 5;
						const overkill = atkPower - aiGetHp(defender);
						score -= overkill * 5;
					} else if (canKill) {
						score = 200 + aiGetAtk(defender) * 5;
						score -= atkPower * 2;
					}

					if (score > bestScore) { bestScore = score; bestTarget = defender; }
				}

				if (bestTarget && bestScore > 0) {
					currentState = processAttackForOpponent(
						currentState, attacker.instanceId, (bestTarget as CardInstance).instanceId
					);
				} else if (pField.length === 0) {
					currentState = processAttackForOpponent(currentState, attacker.instanceId);
				}
			} catch (error) {
				debug.error('AI attack error:', error);
			}
		}

		return currentState;
	} catch (error) {
		debug.error('AI simulation error:', error);
		return state;
	}
}

/**
 * Process attack from opponent's perspective 
 * This is a modified version of processAttack that works when the attacker is the opponent
 * When deferDamage is true, damage is NOT applied to state - it will be applied by the animation processor
 */
function processAttackForOpponent(
  state: GameState,
  attackerInstanceId: string,
  defenderInstanceId?: string, // If undefined, attack is directed at the player's hero
  deferDamage: boolean = false // Apply damage immediately for reliable AI attacks
): GameState {
  // Deep clone state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  try {
    // Only process during opponent's turn
    if (newState.currentTurn !== 'opponent') {
      return state;
    }
    
    // Find the attacker card
    const opponentField = newState.players.opponent.battlefield;
    const attackerIndex = opponentField.findIndex(card => card.instanceId === attackerInstanceId);
    
    if (attackerIndex === -1) {
      debug.error('AI: Attacker card not found');
      return state;
    }
    
    const attacker = opponentField[attackerIndex];
    
    // Check if minion can act (Frozen/Paralysis check)
    if (attacker.isFrozen) {
      return state;
    }
    if (attacker.isParalyzed && Math.random() < 0.5) {
      return state;
    }
    
    // Check if the card can attack
    if (attacker.isSummoningSick || !attacker.canAttack) {
      debug.error('AI: Card cannot attack - summoning sick or already attacked');
      return state;
    }
    
    // If no defender is specified, attack the player's hero directly
    if (!defenderInstanceId) {
      // Check for Rush restriction - cards with Rush can only attack minions on the turn they're played
      // Use the more robust isValidRushTarget function for consistency
      if (!isValidRushTarget(attacker, 'hero')) {
        debug.error('AI: Minions with Rush cannot attack the player hero on the turn they are played');
        return state;
      }
      
      // Calculate attack with status effects using type guard
      let attackDamage = attacker.currentAttack ?? getAttack(attacker.card);
      if (attacker.isWeakened) attackDamage = Math.max(0, attackDamage - 3);
      if (attacker.isBurning) attackDamage += 3;
      
      debug.combat(`[AI Attack] ${attacker.card.name} attacks Player Hero for ${attackDamage} damage (deferDamage=${deferDamage})`);
      
      // Queue animation with full combat data
      queueAIAttackAnimation(
        attacker.card.name,
        attacker.instanceId,
        'Player Hero',
        null,
        'hero',
        attackDamage,
        0, // counterDamage
        attacker.hasDivineShield || false,
        false, // defender (hero) has no divine shield
        'opponent',
        !deferDamage // mark as already applied when not deferring
      );
      
      // Apply damage immediately when NOT deferring
      if (!deferDamage) {
        const hpBefore = newState.players.player.heroHealth ?? newState.players.player.health;
        newState = dealDamage(newState, 'player', 'hero', attackDamage, undefined, undefined, 'opponent');
        const hpAfter = newState.players.player.heroHealth ?? newState.players.player.health;
        debug.combat(`[AI Attack] Player HP: ${hpBefore} → ${hpAfter}`);
      }

      // Apply Burn self-damage if attacker is burning
      if (attacker.isBurning) {
        const burnDamage = 3;
        const attackerIdx = newState.players.opponent.battlefield.findIndex(m => m.instanceId === attacker.instanceId);
        if (attackerIdx !== -1) {
          const currentHealth = newState.players.opponent.battlefield[attackerIdx].currentHealth ?? 0;
          newState.players.opponent.battlefield[attackerIdx].currentHealth = currentHealth - burnDamage;
        }
      }

      // Store the original attacker ID
      const attackerId = attacker.instanceId;

      // Find attacker to ensure we have the right index (in case state has changed)
      const updatedAttackerIndex = newState.players.opponent.battlefield.findIndex(
        card => card.instanceId === attackerId
      );

      if (updatedAttackerIndex !== -1) {
        // Track attacks performed for Windfury
        newState.players.opponent.battlefield[updatedAttackerIndex].attacksPerformed = (newState.players.opponent.battlefield[updatedAttackerIndex].attacksPerformed || 0) + 1;

        // For non-Windfury cards, or Windfury cards that have performed their maximum attacks (2), disable attacking
        const hasWindfury = hasKeyword(attacker, 'windfury');
        const maxAttacksAllowed = hasWindfury ? 2 : 1;

        if ((newState.players.opponent.battlefield[updatedAttackerIndex].attacksPerformed || 0) >= maxAttacksAllowed) {
          // Mark the attacker as having used all its attacks this turn
          newState.players.opponent.battlefield[updatedAttackerIndex].canAttack = false;
        }

        // Remove stealth after attacking
        if (hasKeyword(newState.players.opponent.battlefield[updatedAttackerIndex], 'stealth')) {
          newState = checkPetEvolutionTrigger(newState, 'on_attack_from_stealth', newState.players.opponent.battlefield[updatedAttackerIndex].instanceId);
          removeKeyword(newState.players.opponent.battlefield[updatedAttackerIndex], 'stealth');
        }
      }

      // Game over is handled by dealDamage above
      return newState;
    }
    
    // Find the defender card
    const playerField = newState.players.player.battlefield;
    const defenderIndex = playerField.findIndex(card => card.instanceId === defenderInstanceId);
    
    if (defenderIndex === -1) {
      debug.error('AI: Defender card not found');
      return state;
    }
    
    const defender = playerField[defenderIndex];
    
    // Calculate attack with status effects using type guard
    let attackDamage = attacker.currentAttack ?? getAttack(attacker.card);
    if (attacker.isWeakened) attackDamage = Math.max(0, attackDamage - 3);
    if (attacker.isBurning) attackDamage += 3;
    
    // Check for Divine Shield on attacker and defender
    const attackerHasDivineShield = attacker.hasDivineShield || false;
    const defenderHasDivineShield = defender.hasDivineShield || false;
    
    debug.combat(`[AI Attack] ${attacker.card.name} (${attackDamage} atk) attacks ${defender.card.name} (deferDamage=${deferDamage})`);
    
    // Queue animation with full combat data
    queueAIAttackAnimation(
      attacker.card.name,
      attacker.instanceId,
      defender.card.name,
      defender.instanceId,
      'minion',
      attackDamage,
      (defender.card as any).attack || 0, // counterDamage
      attackerHasDivineShield,
      defenderHasDivineShield,
      'opponent',
      !deferDamage // mark as already applied when not deferring
    );
    
    // If deferring damage, skip damage application - animation processor will handle it
    if (deferDamage) {
      // Just mark the attacker as having attacked (canAttack = false)
      const attackerId = attacker.instanceId;
      const updatedAttackerIndex = newState.players.opponent.battlefield.findIndex(
        card => card.instanceId === attackerId
      );
      
      if (updatedAttackerIndex !== -1) {
        const hasWindfury = hasKeyword(attacker, 'windfury');
        const maxAttacksAllowed = hasWindfury ? 2 : 1;

        newState.players.opponent.battlefield[updatedAttackerIndex].attacksPerformed = (newState.players.opponent.battlefield[updatedAttackerIndex].attacksPerformed || 0) + 1;

        if ((newState.players.opponent.battlefield[updatedAttackerIndex].attacksPerformed || 0) >= maxAttacksAllowed) {
          newState.players.opponent.battlefield[updatedAttackerIndex].canAttack = false;
        }

        // Remove stealth after attacking
        if (hasKeyword(newState.players.opponent.battlefield[updatedAttackerIndex], 'stealth')) {
          newState = checkPetEvolutionTrigger(newState, 'on_attack_from_stealth', newState.players.opponent.battlefield[updatedAttackerIndex].instanceId);
          removeKeyword(newState.players.opponent.battlefield[updatedAttackerIndex], 'stealth');
        }
      }

      return newState;
    }

    // Non-deferred damage application (legacy path)
    // Track minions that take damage for Frenzy mechanic
    const damagedMinionIds: string[] = [];
    
    // Apply combat damage with Divine Shield consideration
    if (defenderHasDivineShield) {
      // Divine Shield blocks the damage once
      newState.players.player.battlefield[defenderIndex].hasDivineShield = false;
    } else {
      // Normal damage application - use modified attack for status effects
      if (attackDamage && attackDamage > 0) {
        newState.players.player.battlefield[defenderIndex].currentHealth = (newState.players.player.battlefield[defenderIndex].currentHealth || 0) - attackDamage;
        
        // Track this minion as damaged for Frenzy effect
        damagedMinionIds.push(defender.instanceId);
      }
      
      // Check and apply enrage effect after damage
      newState = updateEnrageEffects(newState);
    }
    
    if (attackerHasDivineShield) {
      // Divine Shield blocks the damage once
      newState.players.opponent.battlefield[attackerIndex].hasDivineShield = false;
    } else {
      // Normal damage application
      const defenderAttack = (defender.card as any).attack || 0;
      if (defenderAttack > 0) {
        newState.players.opponent.battlefield[attackerIndex].currentHealth = (newState.players.opponent.battlefield[attackerIndex].currentHealth || 0) - defenderAttack;
        
        // Track this minion as damaged for Frenzy effect
        damagedMinionIds.push(attacker.instanceId);
      }
      
      // Check and apply enrage effect after damage
      newState = updateEnrageEffects(newState);
    }
    
    // Store the original attacker and defender IDs before manipulating the state
    const attackerId = attacker.instanceId;
    const defenderId = defender.instanceId;

    // Overkill: if attacker has overkill keyword and kills defender with excess damage, trigger effect
    const opDefenderHP = newState.players.player.battlefield[defenderIndex]?.currentHealth || 0;
    if (opDefenderHP <= 0 && hasKeyword(attacker, 'overkill')) {
      const excessDamage = Math.abs(opDefenderHP);
      if (excessDamage > 0) {
        const desc = (attacker.card as any)?.description?.toLowerCase() || '';
        if (desc.includes('excess damage to the enemy hero')) {
          newState.players.player.heroHealth = Math.max(0, (newState.players.player.heroHealth ?? 0) - excessDamage);
        } else if (desc.includes('gain +2/+2')) {
          const atkIdx = newState.players.opponent.battlefield.findIndex(c => c.instanceId === attackerId);
          if (atkIdx !== -1) {
            newState.players.opponent.battlefield[atkIdx].currentAttack = (newState.players.opponent.battlefield[atkIdx].currentAttack || 0) + 2;
            newState.players.opponent.battlefield[atkIdx].currentHealth = (newState.players.opponent.battlefield[atkIdx].currentHealth || 0) + 2;
          }
        } else if (desc.includes('summon a 5/5')) {
          if (newState.players.opponent.battlefield.length < MAX_BATTLEFIELD_SIZE) {
            const tokenCard = { id: 9071, name: 'Fire Elemental', type: 'minion', manaCost: 5, attack: 5, health: 5, rarity: 'common', race: 'Elemental', keywords: [], collectible: false };
            const token = createCardInstance(tokenCard as any);
            token.isSummoningSick = true;
            token.canAttack = false;
            newState.players.opponent.battlefield.push(token);
          }
        } else if (desc.includes('draw a card')) {
          newState = drawCardFromDeck(newState, 'opponent');
        } else if (desc.includes('gain 3 armor')) {
          newState.players.opponent.heroArmor = (newState.players.opponent.heroArmor || 0) + 3;
        } else if (desc.includes('summon a copy')) {
          if (newState.players.opponent.battlefield.length < MAX_BATTLEFIELD_SIZE) {
            const copyInstance = createCardInstance(attacker.card);
            copyInstance.isSummoningSick = true;
            copyInstance.canAttack = false;
            newState.players.opponent.battlefield.push(copyInstance);
          }
        }
      }
    }

    // Check for defeated defender minion (0 or less health)
    if ((newState.players.player.battlefield[defenderIndex].currentHealth || 0) <= 0) {
      // Move the defender from the battlefield to the graveyard
      newState = destroyCard(newState, defenderId, 'player');
    }

    // We need to find the attacker again as the indexes might have changed after destroying a minion
    const updatedAttackerIndex = newState.players.opponent.battlefield.findIndex(
      card => card.instanceId === attackerId
    );

    // Only check attacker health if it's still on the battlefield
    if (updatedAttackerIndex !== -1 &&
        (newState.players.opponent.battlefield[updatedAttackerIndex].currentHealth || 0) <= 0) {
      // Move the attacker from the battlefield to the graveyard
      newState = destroyCard(newState, attackerId, 'opponent');
    } else if (updatedAttackerIndex !== -1) {
      // Attacker is still alive, mark it as having performed an attack
      // We need to do this here because the index might have changed
      const hasWindfury = hasKeyword(attacker, 'windfury');
      const maxAttacksAllowed = hasWindfury ? 2 : 1;

      newState.players.opponent.battlefield[updatedAttackerIndex].attacksPerformed = (newState.players.opponent.battlefield[updatedAttackerIndex].attacksPerformed || 0) + 1;

      if ((newState.players.opponent.battlefield[updatedAttackerIndex].attacksPerformed || 0) >= maxAttacksAllowed) {
        // Mark the attacker as having used all its attacks this turn
        newState.players.opponent.battlefield[updatedAttackerIndex].canAttack = false;
      }

      // Remove stealth after attacking
      if (hasKeyword(newState.players.opponent.battlefield[updatedAttackerIndex], 'stealth')) {
        newState = checkPetEvolutionTrigger(newState, 'on_attack_from_stealth', newState.players.opponent.battlefield[updatedAttackerIndex].instanceId);
        removeKeyword(newState.players.opponent.battlefield[updatedAttackerIndex], 'stealth');
      }
    }

    // Process frenzy effects for any damaged minions that survived
    if (damagedMinionIds.length > 0) {
      // Process frenzy effects using the imported function
      newState = processFrenzyEffects(newState, damagedMinionIds.map(id => ({ id, playerId: 'opponent' })));
    }
    
    // Process any "after attack" effects 
    if (attacker.card.type === 'minion') {
      // For minion attacks
      newState = processAfterAttackEffects(newState, 'minion', attacker.instanceId, 'opponent');
    }
    
    // After damage application, apply onAttack status effects
    const updatedAttacker = newState.players.opponent.battlefield.find(m => m.instanceId === attackerId);
    if (updatedAttacker && (updatedAttacker.card as any)?.onAttack?.type === 'apply_status') {
      const targetMinion = newState.players.player.battlefield.find(m => m.instanceId === defenderId);
      if (targetMinion) {
        const statusType = (updatedAttacker.card as any)?.onAttack?.statusEffect;
        const updatedTarget = processOnAttackStatusEffect(updatedAttacker as any, targetMinion as any);
        const targetIndex = newState.players.player.battlefield.findIndex(m => m.instanceId === defenderId);
        if (targetIndex !== -1) {
          newState.players.player.battlefield[targetIndex] = updatedTarget as any;
        }
        if (statusType === 'burn') newState = checkPetEvolutionTrigger(newState, 'on_apply_burn');
        if (statusType === 'poison') newState = checkPetEvolutionTrigger(newState, 'on_apply_poison');
      }
    }

    // Apply Burn self-damage if attacker is burning
    if (attacker.isBurning) {
      const burnDamage = 3;
      const burnAttackerIdx = newState.players.opponent.battlefield.findIndex(m => m.instanceId === attackerId);
      if (burnAttackerIdx !== -1) {
        const currentHealth = newState.players.opponent.battlefield[burnAttackerIdx].currentHealth ?? 0;
        newState.players.opponent.battlefield[burnAttackerIdx].currentHealth = currentHealth - burnDamage;
      }
    }
    
    return checkGameOver(newState);
  } catch (error) {
    debug.error('AI attack processing error:', error);
    return state;
  }
}

/**
 * Process player minion attacks during end turn (auto-attack phase)
 * Similar to AI attacks but for player minions attacking opponent
 */
function processAttackForPlayer(
  state: GameState,
  attackerInstanceId: string,
  defenderInstanceId?: string, // If undefined, attack is directed at the opponent's hero
  deferDamage: boolean = true // When true, damage is applied by animation processor
): GameState {
  // Deep clone state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  try {
    // Find the attacker card
    const playerField = newState.players.player.battlefield;
    const attackerIndex = playerField.findIndex(card => card.instanceId === attackerInstanceId);
    
    if (attackerIndex === -1) {
      debug.error('Player Auto-Attack: Attacker card not found');
      return state;
    }
    
    const attacker = playerField[attackerIndex];
    
    // Check if minion can act (Frozen/Paralysis check)
    if (attacker.isFrozen) {
      return state;
    }
    if (attacker.isParalyzed && Math.random() < 0.5) {
      return state;
    }
    
    // Check if the card can attack
    if (attacker.isSummoningSick || !attacker.canAttack) {
      debug.error('Player Auto-Attack: Card cannot attack - summoning sick or already attacked');
      return state;
    }
    
    // If no defender is specified, attack the opponent's hero directly
    if (!defenderInstanceId) {
      // Check for Rush restriction
      if (!isValidRushTarget(attacker, 'hero')) {
        debug.error('Player Auto-Attack: Minions with Rush cannot attack the hero on the turn they are played');
        return state;
      }
      
      // Calculate attack with status effects using type guard
      let attackDamage = attacker.currentAttack ?? getAttack(attacker.card);
      if (attacker.isWeakened) attackDamage = Math.max(0, attackDamage - 3);
      if (attacker.isBurning) attackDamage += 3;
      
      // Queue animation with full combat data for deferred damage
      queueAIAttackAnimation(
        attacker.card.name,
        attacker.instanceId,
        'Opponent Hero',
        null,
        'hero',
        attackDamage,
        0, // counterDamage
        attacker.hasDivineShield || false,
        false, // defender (hero) has no divine shield
        'player' // attackerSide - this is a player minion attacking
      );
      
      // Only apply damage immediately if NOT deferring
      if (!deferDamage) {
        newState = dealDamage(newState, 'opponent', 'hero', attackDamage, undefined, undefined, 'player');
      }

      // Apply Burn self-damage if attacker is burning
      if (attacker.isBurning) {
        const burnDamage = 3;
        const attackerIdx = newState.players.player.battlefield.findIndex(m => m.instanceId === attacker.instanceId);
        if (attackerIdx !== -1) {
          const currentHealth = newState.players.player.battlefield[attackerIdx].currentHealth ?? 0;
          newState.players.player.battlefield[attackerIdx].currentHealth = currentHealth - burnDamage;
        }
      }

      // Store the original attacker ID
      const attackerId = attacker.instanceId;

      // Find attacker to ensure we have the right index
      const updatedAttackerIndex = newState.players.player.battlefield.findIndex(
        card => card.instanceId === attackerId
      );

      if (updatedAttackerIndex !== -1) {
        // Track attacks performed for Windfury
        const currentCard = newState.players.player.battlefield[updatedAttackerIndex];
        const currentAttacks = currentCard.attacksPerformed ?? 0;
        currentCard.attacksPerformed = currentAttacks + 1;

        const hasWindfury = hasKeyword(attacker, 'windfury');
        const maxAttacksAllowed = hasWindfury ? 2 : 1;

        if ((currentCard.attacksPerformed ?? 0) >= maxAttacksAllowed) {
          currentCard.canAttack = false;
        }
      }

      return newState;
    }

    // Find the defender card on opponent's battlefield
    const opponentField = newState.players.opponent.battlefield;
    const defenderIndex = opponentField.findIndex(card => card.instanceId === defenderInstanceId);
    
    if (defenderIndex === -1) {
      debug.error('Player Auto-Attack: Defender card not found');
      return state;
    }
    
    const defender = opponentField[defenderIndex];
    
    // Calculate attack with status effects using type guard
    let attackDamage = attacker.currentAttack ?? getAttack(attacker.card);
    if (attacker.isWeakened) attackDamage = Math.max(0, attackDamage - 3);
    if (attacker.isBurning) attackDamage += 3;
    
    // Check for Divine Shield
    const attackerHasDivineShield = attacker.hasDivineShield || false;
    const defenderHasDivineShield = defender.hasDivineShield || false;
    
    // Queue animation with full combat data for deferred damage
    queueAIAttackAnimation(
      attacker.card.name,
      attacker.instanceId,
      defender.card.name,
      defender.instanceId,
      'minion',
      attackDamage,
      (defender.card as any).attack || 0, // counterDamage
      attackerHasDivineShield,
      defenderHasDivineShield,
      'player' // attackerSide - this is a player minion attacking
    );
    
    // If deferring damage, skip damage application - animation processor will handle it
    if (deferDamage) {
      const attackerId = attacker.instanceId;
      const updatedAttackerIndex = newState.players.player.battlefield.findIndex(
        card => card.instanceId === attackerId
      );
      
      if (updatedAttackerIndex !== -1) {
        const hasWindfury = hasKeyword(attacker, 'windfury');
        const maxAttacksAllowed = hasWindfury ? 2 : 1;

        newState.players.player.battlefield[updatedAttackerIndex].attacksPerformed = (newState.players.player.battlefield[updatedAttackerIndex].attacksPerformed || 0) + 1;

        if ((newState.players.player.battlefield[updatedAttackerIndex].attacksPerformed || 0) >= maxAttacksAllowed) {
          newState.players.player.battlefield[updatedAttackerIndex].canAttack = false;
        }

        // Remove stealth after attacking
        if (hasKeyword(newState.players.player.battlefield[updatedAttackerIndex], 'stealth')) {
          newState = checkPetEvolutionTrigger(newState, 'on_attack_from_stealth', newState.players.player.battlefield[updatedAttackerIndex].instanceId);
          removeKeyword(newState.players.player.battlefield[updatedAttackerIndex], 'stealth');
        }
      }

      return newState;
    }

    // Non-deferred damage application (legacy path)
    const damagedMinionIds: string[] = [];
    
    if (defenderHasDivineShield) {
      newState.players.opponent.battlefield[defenderIndex].hasDivineShield = false;
    } else {
      // Normal damage application - use modified attack for status effects
      if (attackDamage && attackDamage > 0) {
        newState.players.opponent.battlefield[defenderIndex].currentHealth = (newState.players.opponent.battlefield[defenderIndex].currentHealth || 0) - attackDamage;
        damagedMinionIds.push(defender.instanceId);
      }
      newState = updateEnrageEffects(newState);
    }
    
    if (attackerHasDivineShield) {
      newState.players.player.battlefield[attackerIndex].hasDivineShield = false;
    } else {
      const defenderAttack = (defender.card as any).attack || 0;
      if (defenderAttack > 0) {
        newState.players.player.battlefield[attackerIndex].currentHealth = (newState.players.player.battlefield[attackerIndex].currentHealth || 0) - defenderAttack;
        damagedMinionIds.push(attacker.instanceId);
      }
      newState = updateEnrageEffects(newState);
    }
    
    const attackerId = attacker.instanceId;
    const defenderId = defender.instanceId;
    
    if ((newState.players.opponent.battlefield[defenderIndex]?.currentHealth || 0) <= 0) {
      newState = destroyCard(newState, defenderId, 'opponent');
    }
    
    const updatedAttackerIndex = newState.players.player.battlefield.findIndex(
      card => card.instanceId === attackerId
    );
    
    if (updatedAttackerIndex !== -1 && 
        (newState.players.player.battlefield[updatedAttackerIndex].currentHealth || 0) <= 0) {
      newState = destroyCard(newState, attackerId, 'player');
    } else if (updatedAttackerIndex !== -1) {
      const hasWindfury = hasKeyword(attacker, 'windfury');
      const maxAttacksAllowed = hasWindfury ? 2 : 1;

      newState.players.player.battlefield[updatedAttackerIndex].attacksPerformed = (newState.players.player.battlefield[updatedAttackerIndex].attacksPerformed || 0) + 1;

      if ((newState.players.player.battlefield[updatedAttackerIndex].attacksPerformed || 0) >= maxAttacksAllowed) {
        newState.players.player.battlefield[updatedAttackerIndex].canAttack = false;
      }

      // Remove stealth after attacking
      if (hasKeyword(newState.players.player.battlefield[updatedAttackerIndex], 'stealth')) {
        newState = checkPetEvolutionTrigger(newState, 'on_attack_from_stealth', newState.players.player.battlefield[updatedAttackerIndex].instanceId);
        removeKeyword(newState.players.player.battlefield[updatedAttackerIndex], 'stealth');
      }
    }

    if (damagedMinionIds.length > 0) {
      newState = processFrenzyEffects(newState, damagedMinionIds.map(id => ({ id, playerId: 'player' })));
    }

    if (attacker.card.type === 'minion') {
      newState = processAfterAttackEffects(newState, 'minion', attacker.instanceId, 'player');
    }
    
    // After damage application, apply onAttack status effects
    const updatedAttacker = newState.players.player.battlefield.find(m => m.instanceId === attackerId);
    if (updatedAttacker && (updatedAttacker.card as any)?.onAttack?.type === 'apply_status') {
      const targetMinion = newState.players.opponent.battlefield.find(m => m.instanceId === defenderId);
      if (targetMinion) {
        const statusType = (updatedAttacker.card as any)?.onAttack?.statusEffect;
        const updatedTarget = processOnAttackStatusEffect(updatedAttacker as any, targetMinion as any);
        const targetIndex = newState.players.opponent.battlefield.findIndex(m => m.instanceId === defenderId);
        if (targetIndex !== -1) {
          newState.players.opponent.battlefield[targetIndex] = updatedTarget as any;
        }
        if (statusType === 'burn') newState = checkPetEvolutionTrigger(newState, 'on_apply_burn');
        if (statusType === 'poison') newState = checkPetEvolutionTrigger(newState, 'on_apply_poison');
      }
    }

    // Apply Burn self-damage if attacker is burning
    if (attacker.isBurning) {
      const burnDamage = 3;
      const burnAttackerIdx = newState.players.player.battlefield.findIndex(m => m.instanceId === attackerId);
      if (burnAttackerIdx !== -1) {
        const currentHealth = newState.players.player.battlefield[burnAttackerIdx].currentHealth ?? 0;
        newState.players.player.battlefield[burnAttackerIdx].currentHealth = currentHealth - burnDamage;
      }
    }
    
    return checkGameOver(newState);
  } catch (error) {
    debug.error('Player auto-attack processing error:', error);
    return state;
  }
}

/**
 * Execute player minion attacks during end turn phase
 * Player minions auto-attack based on HP (highest HP attacks first)
 */
function simulatePlayerMinionAttacks(state: GameState): GameState {
  
  let currentState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Log minion states before filtering
  currentState.players.player.battlefield.forEach(card => {
  });
  
  // Get all cards that can attack
  // Sort by HP (currentHealth) - highest HP attacks first per game rules
  const attackableCards = currentState.players.player.battlefield
    .filter(card => !card.isSummoningSick && card.canAttack)
    .sort((a, b) => (b.currentHealth || 0) - (a.currentHealth || 0)); // Sort by HP (highest first)
  
  
  if (attackableCards.length > 0) {
    attackableCards.forEach(attackerCard => {
      try {
        const opponentField = currentState.players.opponent.battlefield;
        const opponentHealth = currentState.players.opponent.health;
        const opponentHasTaunts = hasTauntMinions(opponentField);
        
        // If we can kill opponent, do it! (But only if there are no Taunts)
        if (!opponentHasTaunts && ((attackerCard.card as any).attack || 0) >= opponentHealth) {
          currentState = processAttackForPlayer(
            currentState, 
            attackerCard.instanceId
          );
          return;
        }
        
        let bestTarget: CardInstance | null = null;
        let bestTargetScore = -1;
        
        if (opponentHasTaunts) {
          const tauntMinions = getTauntMinions(opponentField);
          
          tauntMinions.forEach(defenderCard => {
            let score = 0;
            
            if (((attackerCard.card as any).attack || 0) >= (defenderCard.currentHealth || 0)) {
              score += 150;
              if (((defenderCard.card as any).attack || 0) < (attackerCard.currentHealth || 0)) {
                score += 100;
              }
              score += ((defenderCard.card as any).attack || 0) * 5;
              score += (defenderCard.card.manaCost || 0) * 3;
              
              if (score > bestTargetScore) {
                bestTarget = defenderCard;
                bestTargetScore = score;
              }
            } else {
              score += 50;
              if (((defenderCard.card as any).attack || 0) < (attackerCard.currentHealth || 0)) {
                score += 30;
              }
              if (score > bestTargetScore) {
                bestTarget = defenderCard;
                bestTargetScore = score;
              }
            }
          });
          
          if (bestTarget) {
            const target = bestTarget as CardInstance;
            currentState = processAttackForPlayer(
              currentState, 
              attackerCard.instanceId, 
              target.instanceId
            );
            return;
          }
        }
        
        // If no Taunts, target the LOWEST HP enemy minion first
        bestTarget = null;
        let lowestHP = Infinity;
        
        opponentField.forEach(defenderCard => {
          if (hasKeyword(defenderCard, 'taunt')) {
            return;
          }

          if ((defenderCard.currentHealth || 0) < lowestHP) {
            lowestHP = defenderCard.currentHealth || 0;
            bestTarget = defenderCard;
          }
        });

        if (bestTarget) {
          const target = bestTarget as CardInstance;
          currentState = processAttackForPlayer(
            currentState,
            attackerCard.instanceId,
            target.instanceId
          );
        } else {
          // No enemy minions, attack the opponent's hero
          currentState = processAttackForPlayer(
            currentState,
            attackerCard.instanceId
          );
        }
      } catch (error) {
        debug.error(`Error during player auto-attack with ${attackerCard.card.name}:`, error);
      }
    });
  }
  
  return currentState;
}

/**
 * Check if the game is over and determine winner
 */
function checkGameOver(state: GameState): GameState {
  const { player, opponent } = state.players;
  
  // Use heroHealth if available, otherwise fall back to health
  const playerHealth = player.heroHealth !== undefined ? player.heroHealth : player.health;
  const opponentHealth = opponent.heroHealth !== undefined ? opponent.heroHealth : opponent.health;
  
  const playerDead = playerHealth <= 0;
  const opponentDead = opponentHealth <= 0;

  if (playerDead && opponentDead) {
    return {
      ...state,
      gamePhase: 'game_over',
      winner: 'draw'
    };
  }
  if (playerDead) {
    return {
      ...state,
      gamePhase: 'game_over',
      winner: 'opponent'
    };
  }
  if (opponentDead) {
    return {
      ...state,
      gamePhase: 'game_over',
      winner: 'player'
    };
  }
  
  return state;
}

/**
 * Process an attack between two cards or a card and a hero
 */
export function processAttack(
  state: GameState,
  attackerInstanceId: string,
  defenderInstanceId?: string // If undefined, attack is directed at the opponent's hero
): GameState {
  // Add comprehensive logging
  
  // Deep clone the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Only allow attacks during player's turn, except for AI simulation
  if (state.currentTurn !== 'player' && !isAISimulationMode()) {
    debug.error('[ATTACK ERROR] Cannot attack during opponent\'s turn');
    return state;
  }
  
  // Find the attacker card
  const playerField = newState.players.player.battlefield;
  const attackerIndex = playerField.findIndex(card => card.instanceId === attackerInstanceId);
  
  if (attackerIndex === -1) {
    debug.error(`[ATTACK ERROR] Attacker card with ID ${attackerInstanceId} not found on the battlefield`);
    // Additional diagnostic info
    return state;
  }
  
  const attacker = playerField[attackerIndex];
  
    
  // Check if the card can attack
  if (attacker.isSummoningSick) {
    debug.error(`[ATTACK ERROR] Card ${attacker.card.name} cannot attack due to summoning sickness`);
    return state;
  }
  
  if (!attacker.canAttack) {
    debug.error(`[ATTACK ERROR] Card ${attacker.card.name} cannot attack (already attacked this turn)`);
    return state;
  }
  
  // Ensure attacksPerformed exists
  if (attacker.attacksPerformed === undefined) {
    attacker.attacksPerformed = 0;
  }
  
  const opponentHasTaunt = hasTauntMinions(newState.players.opponent.battlefield);

  if (!defenderInstanceId || defenderInstanceId === 'opponent-hero') {
    if (opponentHasTaunt) {
      debug.error('Cannot attack hero directly when opponent has Taunt minions');
      return state;
    }
    if (!isValidRushTarget(attacker, 'hero')) {
      debug.error('Minions with Rush cannot attack the enemy hero on the turn they are played');
      return state;
    }
  } else {
    if (!isValidRushTarget(attacker, 'minion')) {
      debug.error('Invalid target for minion with Rush');
      return state;
    }
  }
  
  if (!defenderInstanceId || defenderInstanceId === 'opponent-hero') {
    // Deal damage to opponent's hero using the dealDamage function instead of direct modification
    // This ensures armor is properly handled
    const attackerAttackVal = (attacker.card as any).attack;
    if (attackerAttackVal !== undefined && attackerAttackVal > 0) {
      newState = dealDamage(newState, 'opponent', 'hero', attackerAttackVal, undefined, attacker.card.id as number | undefined, 'player');
      newState = applyLifestealHealing(newState, attacker, attackerAttackVal, 'player');
    }

    // Store the original attacker ID
    const attackerId = attacker.instanceId;
    
    // Find attacker to ensure we have the right index (in case state has changed)
    const updatedAttackerIndex = newState.players.player.battlefield.findIndex(
      card => card.instanceId === attackerId
    );
    
    if (updatedAttackerIndex !== -1) {
      // Track attacks performed for Windfury
      newState.players.player.battlefield[updatedAttackerIndex].attacksPerformed = (newState.players.player.battlefield[updatedAttackerIndex].attacksPerformed || 0) + 1;
      
      // For non-Windfury cards, or Windfury cards that have performed their maximum attacks, disable attacking
      const hasMegaWindfury = hasKeyword(attacker, 'mega_windfury');
      const hasWindfury = hasKeyword(attacker, 'windfury');
      const maxAttacksAllowed = hasMegaWindfury ? 4 : hasWindfury ? 2 : 1;

      if ((newState.players.player.battlefield[updatedAttackerIndex].attacksPerformed || 0) >= maxAttacksAllowed) {
        // Mark the attacker as having used all its attacks this turn
        newState.players.player.battlefield[updatedAttackerIndex].canAttack = false;
      }

      // Remove stealth after attacking
      if (hasKeyword(newState.players.player.battlefield[updatedAttackerIndex], 'stealth')) {
        newState = checkPetEvolutionTrigger(newState, 'on_attack_from_stealth', newState.players.player.battlefield[updatedAttackerIndex].instanceId);
        removeKeyword(newState.players.player.battlefield[updatedAttackerIndex], 'stealth');
      }
    }

    newState = removeDeadMinions(newState);
    newState = checkGameOver(newState);
    return newState;
  }

  // Find the defender card
  const opponentField = newState.players.opponent.battlefield;
  const defenderIndex = opponentField.findIndex(card => card.instanceId === defenderInstanceId);

  if (defenderIndex === -1) {
    debug.error('Defender card not found');
    return state;
  }

  const defender = opponentField[defenderIndex];

  // If there are Taunt minions, we can only attack those
  if (opponentHasTaunt && !hasKeyword(defender, 'taunt')) {
    debug.error('Must attack Taunt minions first');
    return state;
  }
  
  // Check for Divine Shield on attacker and defender
  const attackerHasDivineShield = attacker.hasDivineShield;
  const defenderHasDivineShield = defender.hasDivineShield;
  
  // Track minions that take damage for Frenzy mechanic
  const damagedMinionIds: string[] = [];
  
  // Apply combat damage with Divine Shield consideration
  if (defenderHasDivineShield) {
    // Divine Shield blocks the damage once
    newState.players.opponent.battlefield[defenderIndex].hasDivineShield = false;
  } else {
    // Normal damage application
    const attackerAtk = (attacker.card as any).attack || 0;
    if (attackerAtk > 0) {
      newState.players.opponent.battlefield[defenderIndex].currentHealth = (newState.players.opponent.battlefield[defenderIndex].currentHealth || 0) - attackerAtk;
      
      // Track this minion as damaged for Frenzy effect
      damagedMinionIds.push(defender.instanceId);
    }
    
    // Check and apply enrage effect after damage
    newState = updateEnrageEffects(newState);
  }
  
  if (attackerHasDivineShield) {
    // Divine Shield blocks the damage once
    newState.players.player.battlefield[attackerIndex].hasDivineShield = false;
  } else {
    // Normal damage application
    const defenderAtk = (defender.card as any).attack || 0;
    if (defenderAtk > 0) {
      newState.players.player.battlefield[attackerIndex].currentHealth = (newState.players.player.battlefield[attackerIndex].currentHealth || 0) - defenderAtk;
      
      // Track this minion as damaged for Frenzy effect
      damagedMinionIds.push(attacker.instanceId);
    }
    
    // Check and apply enrage effect after damage
    newState = updateEnrageEffects(newState);
  }
  
  // Pet element advantage: bonus damage when elemental minion attacks another
  const attackerElement = (attacker.card as any).element;
  const defenderElement = (defender.card as any).element;
  if (attackerElement && defenderElement) {
    const atkGameEl = NORSE_TO_GAME_ELEMENT[attackerElement as keyof typeof NORSE_TO_GAME_ELEMENT];
    const defGameEl = NORSE_TO_GAME_ELEMENT[defenderElement as keyof typeof NORSE_TO_GAME_ELEMENT];
    if (atkGameEl && defGameEl) {
      const advantage = getElementAdvantage(atkGameEl, defGameEl);
      if (advantage.hasAdvantage) {
        const bonusDmg = (attacker.card as any).weakness?.bonusDamage ?? 2;
        const defIdx = newState.players.opponent.battlefield.findIndex(c => c.instanceId === defender.instanceId);
        if (defIdx !== -1 && !defenderHasDivineShield) {
          newState.players.opponent.battlefield[defIdx].currentHealth = (newState.players.opponent.battlefield[defIdx].currentHealth || 0) - bonusDmg;
        }
      }
      const reverseAdvantage = getElementAdvantage(defGameEl, atkGameEl);
      if (reverseAdvantage.hasAdvantage) {
        const bonusDmg = (defender.card as any).weakness?.bonusDamage ?? 2;
        const atkIdx = newState.players.player.battlefield.findIndex(c => c.instanceId === attacker.instanceId);
        if (atkIdx !== -1 && !attackerHasDivineShield) {
          newState.players.player.battlefield[atkIdx].currentHealth = (newState.players.player.battlefield[atkIdx].currentHealth || 0) - bonusDmg;
        }
      }
    }
  }

  // Apply lifesteal healing for minion-vs-minion combat
  if (!defenderHasDivineShield) {
    const attackerAtk2 = (attacker.card as any).attack || 0;
    if (attackerAtk2 > 0) {
      newState = applyLifestealHealing(newState, attacker, attackerAtk2, 'player');
    }
  }
  if (!attackerHasDivineShield) {
    const defenderAtk2 = (defender.card as any).attack || 0;
    if (defenderAtk2 > 0) {
      newState = applyLifestealHealing(newState, defender, defenderAtk2, 'opponent');
    }
  }

  // Store the original attacker and defender IDs before manipulating the state
  const attackerId = attacker.instanceId;
  const defenderId = defender.instanceId;

  // Overkill: if attacker has overkill keyword and kills defender with excess damage, trigger effect
  const defenderHP = newState.players.opponent.battlefield[defenderIndex]?.currentHealth || 0;
  if (defenderHP <= 0 && hasKeyword(attacker, 'overkill')) {
    const excessDamage = Math.abs(defenderHP);
    if (excessDamage > 0) {
      const desc = (attacker.card as any)?.description?.toLowerCase() || '';
      if (desc.includes('excess damage to the enemy hero')) {
        newState.players.opponent.heroHealth = Math.max(0, (newState.players.opponent.heroHealth ?? 0) - excessDamage);
      } else if (desc.includes('gain +2/+2')) {
        const atkIdx = newState.players.player.battlefield.findIndex(c => c.instanceId === attackerId);
        if (atkIdx !== -1) {
          newState.players.player.battlefield[atkIdx].currentAttack = (newState.players.player.battlefield[atkIdx].currentAttack || 0) + 2;
          newState.players.player.battlefield[atkIdx].currentHealth = (newState.players.player.battlefield[atkIdx].currentHealth || 0) + 2;
        }
      } else if (desc.includes('summon a 5/5')) {
        if (newState.players.player.battlefield.length < MAX_BATTLEFIELD_SIZE) {
          const tokenCard = { id: 9071, name: 'Fire Elemental', type: 'minion', manaCost: 5, attack: 5, health: 5, rarity: 'common', race: 'Elemental', keywords: [], collectible: false };
          const token = createCardInstance(tokenCard as any);
          token.isSummoningSick = true;
          token.canAttack = false;
          newState.players.player.battlefield.push(token);
        }
      } else if (desc.includes('draw a card')) {
        newState = drawCardFromDeck(newState, 'player');
      } else if (desc.includes('gain 3 armor')) {
        newState.players.player.heroArmor = (newState.players.player.heroArmor || 0) + 3;
      } else if (desc.includes('summon a copy')) {
        if (newState.players.player.battlefield.length < MAX_BATTLEFIELD_SIZE) {
          const copyInstance = createCardInstance(attacker.card);
          copyInstance.isSummoningSick = true;
          copyInstance.canAttack = false;
          newState.players.player.battlefield.push(copyInstance);
        }
      }
    }
  }

  // Check for defeated defender minion (0 or less health)
  if ((newState.players.opponent.battlefield[defenderIndex]?.currentHealth || 0) <= 0) {
    // Move the defender from the battlefield to the graveyard
    newState = destroyCard(newState, defenderId, 'opponent');
  }

  // We need to find the attacker again as the indexes might have changed after destroying a minion
  const updatedAttackerIndex = newState.players.player.battlefield.findIndex(
    card => card.instanceId === attackerId
  );

  // Only check attacker health if it's still on the battlefield
  if (updatedAttackerIndex !== -1 && 
      (newState.players.player.battlefield[updatedAttackerIndex].currentHealth || 0) <= 0) {
    // Move the attacker from the battlefield to the graveyard
    newState = destroyCard(newState, attackerId, 'player');
  } else if (updatedAttackerIndex !== -1) {
    // Attacker is still alive, mark it as having performed an attack
    // We need to do this here because the index might have changed
    const hasMegaWindfury = hasKeyword(attacker, 'mega_windfury');
    const hasWindfury = hasKeyword(attacker, 'windfury');
    const maxAttacksAllowed = hasMegaWindfury ? 4 : hasWindfury ? 2 : 1;

    newState.players.player.battlefield[updatedAttackerIndex].attacksPerformed = (newState.players.player.battlefield[updatedAttackerIndex].attacksPerformed || 0) + 1;

    if ((newState.players.player.battlefield[updatedAttackerIndex].attacksPerformed || 0) >= maxAttacksAllowed) {
      // Mark the attacker as having used all its attacks this turn
      newState.players.player.battlefield[updatedAttackerIndex].canAttack = false;
    }

    // Remove stealth after attacking
    if (hasKeyword(newState.players.player.battlefield[updatedAttackerIndex], 'stealth')) {
      newState = checkPetEvolutionTrigger(newState, 'on_attack_from_stealth', newState.players.player.battlefield[updatedAttackerIndex].instanceId);
      removeKeyword(newState.players.player.battlefield[updatedAttackerIndex], 'stealth');
    }
  }

  // Process frenzy effects for any damaged minions that survived
  if (damagedMinionIds.length > 0) {
    // Process frenzy effects using the imported function
    // Create array of minions with playerIds for both attacker and defender
    const damagedMinionsWithPlayer: { id: string; playerId: 'player' | 'opponent' }[] = [];
    // Map defender minions to opponent
    damagedMinionIds.forEach(id => {
      if (id === attacker.instanceId) {
        damagedMinionsWithPlayer.push({ id, playerId: 'player' });
      } else {
        damagedMinionsWithPlayer.push({ id, playerId: 'opponent' });
      }
    });
    newState = processFrenzyEffects(newState, damagedMinionsWithPlayer);
  }
  
  // Process any "after attack" effects from the imported function
  if (attacker.card.type === 'minion') {
    // For minion attacks
    newState = processAfterAttackEffects(newState, 'minion', attacker.instanceId, 'player');
  }
  
  // CRITICAL: Clean up any dead minions that weren't caught by explicit death checks
  // This ensures consistent state and prevents minions from lingering at 0 health
  newState = removeDeadMinions(newState);

  // Pet evolution: attacker dealt damage
  newState = checkPetEvolutionTrigger(newState, 'on_deal_damage', attackerId);
  // Pet evolution: if defender died and attacker survived, trigger on_destroy
  const attackerSurvived = newState.players.player.battlefield.some(m => m.instanceId === attackerId);
  const defenderDied = !newState.players.opponent.battlefield.some(m => m.instanceId === defenderId);
  if (attackerSurvived && defenderDied) {
    newState = checkPetEvolutionTrigger(newState, 'on_destroy', attackerId);
  }

  return checkGameOver(newState);
}

/**
 * Check if there are any Taunt minions on the battlefield
 * You must attack minions with Taunt before any other target
 */
function hasTauntMinions(battlefield: CardInstance[]): boolean {
  return battlefield.some(card => {
    return hasKeyword(card, 'taunt') && !card.isSilenced && !(card as any).hasElusive;
  });
}

/**
 * Get all Taunt minions from the battlefield
 */
function getTauntMinions(battlefield: CardInstance[]): CardInstance[] {
  return battlefield.filter(card => {
    return hasKeyword(card, 'taunt') && !card.isSilenced && !(card as any).hasElusive;
  });
}

/**
 * Finds optimal attack targets for a card following standard CCG strategies
 * and respecting the Taunt mechanic (must attack Taunt minions first)
 * Returns an array of optimal targets in priority order
 */
export function findOptimalAttackTargets(
  state: GameState,
  attackerInstanceId: string
): { defenderId: string, type: 'minion' | 'hero' }[] {
  // Only allow attacks during player's turn, except for AI simulation
  if (state.currentTurn !== 'player' && !isAISimulationMode()) {
    return [];
  }
  
  // Find the attacker card
  const playerField = state.players.player.battlefield;
  const attackerIndex = playerField.findIndex(card => card.instanceId === attackerInstanceId);
  
  if (attackerIndex === -1) {
    debug.error('Attacker card not found');
    return [];
  }
  
  const attacker = playerField[attackerIndex];
  
  // Check if the card can attack
  if (attacker.isSummoningSick || !attacker.canAttack) {
    return []; // Card can't attack
  }
  
  const attackerAttack = (attacker.card as any).attack || 0;
  const opponentField = state.players.opponent.battlefield;
  const opponentHeroHealth = state.players.opponent.health;
  
  // Check for Taunt minions - they must be attacked first
  const opponentHasTaunts = hasTauntMinions(opponentField);
  
  const targets: { defenderId: string, type: 'minion' | 'hero', priority: number }[] = [];
  
  // If opponent has Taunt minions, we must attack them first
  if (opponentHasTaunts) {
    // Get just the Taunt minions
    const tauntMinions = getTauntMinions(opponentField);
    
    // Strategy 1 with Taunts: Value trades against Taunt minions
    tauntMinions.forEach(defenderCard => {
      // Can kill without dying
      const defAtk = (defenderCard.card as any).attack || 0;
      if (attackerAttack >= (defenderCard.currentHealth || 0) && defAtk < (attacker.currentHealth || 0)) {
        targets.push({ 
          defenderId: defenderCard.instanceId, 
          type: 'minion', 
          priority: 500 + defAtk // High priority - we must deal with Taunts
        });
      }
    });
    
    // Strategy 2 with Taunts: Equal trades against Taunt minions
    tauntMinions.forEach(defenderCard => {
      const defAtk = (defenderCard.card as any).attack || 0;
      // Equal value trade (we both die or high value target)
      if (attackerAttack >= (defenderCard.currentHealth || 0) && 
          (defAtk >= (attacker.currentHealth || 0) || 
           defAtk > attackerAttack)) {
        targets.push({ 
          defenderId: defenderCard.instanceId, 
          type: 'minion', 
          priority: 400 + defAtk 
        });
      }
    });
    
    // Strategy 3 with Taunts: Attack any Taunt minion (if no good trades found)
    if (targets.length === 0) {
      tauntMinions.forEach(defenderCard => {
        const defAtk = (defenderCard.card as any).attack || 0;
        targets.push({ 
          defenderId: defenderCard.instanceId, 
          type: 'minion', 
          priority: 300 + defAtk // Priority on higher attack Taunts
        });
      });
    }
    
    // Return only Taunt targets if we found any - we MUST attack Taunts first
    if (targets.length > 0) {
      return targets
        .sort((a, b) => b.priority - a.priority)
        .map(({ defenderId, type }) => ({ defenderId, type }));
    }
  }
  
  // If no Taunts (or somehow all Taunts have been processed), normal targeting logic:
  
  // Strategy 1: Lethal - attack hero if we can win (only if no Taunts)
  // Cards with Rush can't attack heroes on the turn they're played
  const canAttackHero = isValidRushTarget(attacker, 'hero');
  if (!opponentHasTaunts && canAttackHero && attackerAttack >= opponentHeroHealth) {
    targets.push({ 
      defenderId: 'hero', 
      type: 'hero', 
      priority: 1000 // Highest priority - go for the win!
    });
  }
  
  // Strategy 2: Value trades - kill minions that our attacker can kill without dying
  opponentField.forEach(defenderCard => {
    // Skip Taunt minions as they were handled above
    if (hasKeyword(defenderCard, 'taunt')) {
      return;
    }

    const defAtk = (defenderCard.card as any).attack || 0;
    // Can kill without dying
    if (attackerAttack >= (defenderCard.currentHealth || 0) && defAtk < (attacker.currentHealth || 0)) {
      targets.push({
        defenderId: defenderCard.instanceId,
        type: 'minion',
        priority: 100 + defAtk // Prioritize killing higher attack minions
      });
    }
  });

  // Strategy 3: Equal trades - kill minions of equal or higher value
  opponentField.forEach(defenderCard => {
    // Skip Taunt minions as they were handled above
    if (hasKeyword(defenderCard, 'taunt')) {
      return;
    }

    const defAtk = (defenderCard.card as any).attack || 0;
    // Equal value trade (we both die or high value target)
    if (attackerAttack >= (defenderCard.currentHealth || 0) &&
        (defAtk >= (attacker.currentHealth || 0) ||
         defAtk > attackerAttack)) {
      targets.push({
        defenderId: defenderCard.instanceId,
        type: 'minion',
        priority: 50 + defAtk
      });
    }
  });

  // Strategy 4: Attack any non-Taunt minion if we can't find good trades
  if (targets.length === 0 && opponentField.some(card => !hasKeyword(card, 'taunt'))) {
    opponentField.forEach(defenderCard => {
      // Skip Taunt minions as they were handled above
      if (hasKeyword(defenderCard, 'taunt')) {
        return;
      }

      const defAtk = (defenderCard.card as any).attack || 0;
      targets.push({
        defenderId: defenderCard.instanceId,
        type: 'minion',
        priority: defAtk // Prioritize attacking high attack threats
      });
    });
  }
  
  // Strategy 5: Attack hero if no good minion trades (only if no Taunts and not Rush)
  if (!opponentHasTaunts && isValidRushTarget(attacker, 'hero') && (targets.length === 0 || opponentField.length === 0)) {
    targets.push({ 
      defenderId: 'hero', 
      type: 'hero', 
      priority: 10 
    });
  }
  
  // Sort by priority (highest first) and return without the priority field
  return targets
    .sort((a, b) => b.priority - a.priority)
    .map(({ defenderId, type }) => ({ defenderId, type }));
}

/**
 * Execute auto-attack with a specific card using optimal targeting
 * @deprecated Use manual attack system (attackStore.ts + AttackSystem.tsx) instead.
 * This auto-attack function is kept for backwards compatibility only.
 */
export function autoAttackWithCard(
  state: GameState,
  attackerInstanceId: string
): GameState {
  try {
    // Find optimal targets
    const optimalTargets = findOptimalAttackTargets(state, attackerInstanceId);
    
    if (optimalTargets.length === 0) {
      return state; // No valid targets
    }
    
    // Use the highest priority target
    const bestTarget = optimalTargets[0];
    
    // Execute the attack
    if (bestTarget.type === 'hero') {
      // Attack hero
      return processAttack(state, attackerInstanceId);
    } else {
      // Attack minion
      return processAttack(state, attackerInstanceId, bestTarget.defenderId);
    }
  } catch (error) {
    debug.error('Auto-attack error:', error);
    return state; // Return unchanged state if there's an error
  }
}

/**
 * Auto-attack with a newly placed minion that has CHARGE - targets lowest health enemy minion or hero
 * This is ONLY called for minions with the Charge keyword (not Rush, which requires player targeting)
 * The function bypasses summoning sickness since Charge minions can attack immediately
 * @deprecated Use manual attack system (attackStore.ts + AttackSystem.tsx) instead.
 * This auto-attack function is kept for backwards compatibility only.
 * @param state Current game state
 * @param attackerInstanceId ID of the minion that was just placed
 * @param attackerOwner 'player' or 'opponent' - who owns the attacker
 * @returns Updated game state after attack
 */
export function autoAttackOnPlace(
  state: GameState,
  attackerInstanceId: string,
  attackerOwner: 'player' | 'opponent' = 'player'
): GameState {
  try {
    const defenderOwner = attackerOwner === 'player' ? 'opponent' : 'player';
    const attackerField = state.players[attackerOwner].battlefield;
    const defenderField = state.players[defenderOwner].battlefield;
    
    // Find the attacker
    const attackerIndex = attackerField.findIndex(c => c.instanceId === attackerInstanceId);
    if (attackerIndex === -1) {
      return state;
    }
    
    const attacker = attackerField[attackerIndex];
    
    // Check if attacker can attack (bypass summoning sickness for auto-attack)
    const attackerAtkVal = (attacker.card as any).attack || 0;
    if (attackerAtkVal <= 0) {
      return state;
    }
    
    // Check for Taunt minions first - must attack them if present
    const tauntMinions = defenderField.filter(m =>
      hasKeyword(m, 'taunt') && !m.silenced
    );
    
    let targetId: string | undefined;
    let targetName: string = 'hero';
    
    if (tauntMinions.length > 0) {
      // Must attack lowest health taunt
      const lowestHealthTaunt = tauntMinions.reduce((lowest, current) => 
        (current.currentHealth || (current.card as any).health || 999) < (lowest.currentHealth || (lowest.card as any).health || 999) 
          ? current : lowest
      );
      targetId = lowestHealthTaunt.instanceId;
      targetName = lowestHealthTaunt.card.name;
    } else if (defenderField.length > 0) {
      // Attack lowest health minion
      const lowestHealthMinion = defenderField.reduce((lowest, current) => 
        (current.currentHealth || (current.card as any).health || 999) < (lowest.currentHealth || (lowest.card as any).health || 999) 
          ? current : lowest
      );
      targetId = lowestHealthMinion.instanceId;
      targetName = lowestHealthMinion.card.name;
    } else {
      // No minions - attack hero directly
      targetId = undefined;
    }
    
    // Temporarily enable attack by removing summoning sickness
    let newState = JSON.parse(JSON.stringify(state)) as GameState;
    const attackerInNewState = newState.players[attackerOwner].battlefield[attackerIndex];
    attackerInNewState.isSummoningSick = false;
    attackerInNewState.canAttack = true;
    
    // Execute the attack
    newState = processAttack(newState, attackerInstanceId, targetId);
    
    
    return newState;
  } catch (error) {
    debug.error('[AutoAttackOnPlace] Error:', error);
    return state;
  }
}

/**
 * Apply damage to a card or hero
 * @param state Current game state
 * @param playerId ID of the player who owns the target ('player' or 'opponent')
 * @param targetId ID of the target to damage, or 'hero' for the player's hero
 * @param damageAmount Amount of damage to apply
 * @returns Updated game state
 */
export function applyDamage(
  state: GameState,
  playerId: 'player' | 'opponent',
  targetId: string,
  damageAmount: number
): GameState {
  // Create a copy of the state to modify
  const updatedState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // If the target is the hero, apply damage using the specialized dealDamage function
  if (targetId === 'hero') {
    // Use the dealDamage function to handle armor properly with source info
    const sourcePlayerID = playerId === 'player' ? 'opponent' : 'player';
    return dealDamage(updatedState, playerId, 'hero', damageAmount, undefined, undefined, sourcePlayerID);
  }
  
  // Find the target minion
  const battlefield = updatedState.players[playerId].battlefield;
  const targetIndex = battlefield.findIndex(card => card.instanceId === targetId);
  
  if (targetIndex === -1) {
    return state; // Return unchanged state if target not found
  }
  
  const targetMinion = battlefield[targetIndex];
  
  // Check for Divine Shield
  if (targetMinion.hasDivineShield) {
    // Divine Shield absorbs all damage, but is consumed
    updatedState.players[playerId].battlefield[targetIndex].hasDivineShield = false;
    return updatedState;
  }
  
  // Apply damage to the minion
  if (targetMinion.currentHealth !== undefined) {
    const newHealth = targetMinion.currentHealth - damageAmount;
    updatedState.players[playerId].battlefield[targetIndex].currentHealth = newHealth;
    
    // Check if the minion is defeated
    if (newHealth <= 0) {
      // Move minion from battlefield to graveyard
      return destroyCard(updatedState, targetId, playerId);
    }
  }
  
  return updatedState;
}

/**
 * @deprecated Use manual attack system (attackStore.ts + AttackSystem.tsx) instead.
 * This auto-attack function is kept for backwards compatibility only.
 */
export function autoAttackWithAllCards(state: GameState, mode: 'minion' | 'hero' = 'minion'): GameState {
  try {
    if (state.currentTurn !== 'player') {
      return state;
    }

    const attackableCards = state.players.player.battlefield
      .filter(card => !card.isSummoningSick && card.canAttack)
      .sort((a, b) => getAttack(a.card) - getAttack(b.card)); // Lowest attack first (save big hitters)

    if (attackableCards.length === 0) {
      return state;
    }

    let newState = JSON.parse(JSON.stringify(state)) as GameState;

    for (const card of attackableCards) {
      const attacker = newState.players.player.battlefield.find(c => c.instanceId === card.instanceId);
      if (!attacker || !attacker.canAttack) continue;

      const opponentField = newState.players.opponent.battlefield;
      const tauntMinions = getTauntMinions(opponentField);

      if (tauntMinions.length > 0) {
        // Must attack taunt — pick lowest HP taunt
        const target = tauntMinions.reduce((low, cur) =>
          (cur.currentHealth || 999) < (low.currentHealth || 999) ? cur : low
        );
        newState = processAttack(newState, card.instanceId, target.instanceId);
      } else if (mode === 'hero' || opponentField.length === 0) {
        // Hero mode or no minions — go face
        if (isValidRushTarget(attacker, 'hero')) {
          newState = processAttack(newState, card.instanceId);
        }
      } else {
        // Minion mode — attack lowest HP enemy minion
        const target = opponentField.reduce((low, cur) =>
          (cur.currentHealth || 999) < (low.currentHealth || 999) ? cur : low
        );
        newState = processAttack(newState, card.instanceId, target.instanceId);
      }
    }

    return newState;
  } catch (error) {
    debug.error('Auto-attack all error:', error);
    return state;
  }
}

function processSubmergeCountdowns(
  state: GameState,
  currentPlayer: 'player' | 'opponent'
): GameState {
  const bf = state.players[currentPlayer].battlefield;
  const surfaced: CardInstance[] = [];

  for (const minion of bf) {
    if (!minion.isSubmerged) continue;
    minion.submergeTurnsLeft = (minion.submergeTurnsLeft ?? 1) - 1;
    if (minion.submergeTurnsLeft <= 0) {
      minion.isSubmerged = false;
      minion.submergeTurnsLeft = undefined;
      minion.isSummoningSick = false;
      minion.canAttack = true;
      if (minion.submergeBuff) {
        minion.currentAttack = (minion.currentAttack ?? 0) + minion.submergeBuff.attack;
        minion.currentHealth = (minion.currentHealth ?? 0) + minion.submergeBuff.health;
        minion.submergeBuff = undefined;
      }
      surfaced.push(minion);
    }
  }

  for (const minion of surfaced) {
    const sfx = minion.surfaceEffect;
    const dmg = minion.surfaceDamage || 0;
    minion.surfaceEffect = undefined;
    minion.surfaceDamage = undefined;

    if (sfx === 'damage_all_enemies' && dmg > 0) {
      const opponent = currentPlayer === 'player' ? 'opponent' : 'player';
      state = dealDamageToAllEnemyMinions(state, currentPlayer, dmg);
      state = dealDamage(state, opponent, 'hero', dmg);
    } else if (sfx === 'buff_self') {
      minion.currentAttack = (minion.currentAttack ?? 0) + 2;
      minion.currentHealth = (minion.currentHealth ?? 0) + 2;
    }
  }

  return state;
}
