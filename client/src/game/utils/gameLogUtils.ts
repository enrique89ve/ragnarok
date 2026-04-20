import { 
  GameState, 
  GameLogEvent, 
  GameLogEventType, 
  CardInstance 
} from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new game log event
 */
export function createGameLogEvent(
  state: GameState,
  type: GameLogEventType,
  player: 'player' | 'opponent',
  text: string,
  options?: {
    cardId?: string;
    targetId?: string;
    value?: number;
  }
): GameLogEvent {
  return {
    id: uuidv4(),
    type,
    turn: state.turnNumber,
    timestamp: Date.now(),
    player,
    text,
    cardId: options?.cardId,
    targetId: options?.targetId,
    value: options?.value
  };
}

/**
 * Add a new event to the game log
 */
export function addGameLogEvent(
  state: GameState,
  event: GameLogEvent
): GameState {
  return {
    ...state,
    gameLog: [...(state.gameLog || []), event]
  };
}

/**
 * Log a card play event
 */
export function logCardPlay(
  state: GameState,
  player: 'player' | 'opponent',
  card: CardInstance,
  targetId?: string
): GameState {
  const playerName = player === 'player' ? 'You' : 'Opponent';
  let text = `${playerName} played ${card.card.name}`;
  
  if (targetId) {
    // Try to find the target card or hero
    let targetName = "unknown target";
    
    // Check if it's a hero target
    if (targetId === 'player' || targetId === 'opponent') {
      targetName = targetId === 'player' ? 'your hero' : 'the opponent\'s hero';
    } else {
      // Check player battlefield
      const playerTarget = state.players.player.battlefield.find(c => c.instanceId === targetId);
      if (playerTarget) {
        targetName = playerTarget.card.name;
      } else {
        // Check opponent battlefield
        const opponentTarget = state.players.opponent.battlefield.find(c => c.instanceId === targetId);
        if (opponentTarget) {
          targetName = opponentTarget.card.name;
        }
      }
    }
    
    text += ` targeting ${targetName}`;
  }
  
  const event = createGameLogEvent(
    state,
    'play_card',
    player,
    text,
    {
      cardId: card.instanceId,
      targetId
    }
  );
  
  return addGameLogEvent(state, event);
}

/**
 * Log an attack event
 */
export function logAttack(
  state: GameState,
  player: 'player' | 'opponent',
  attackerCard: CardInstance,
  defenderId?: string,
  damage?: number
): GameState {
  const playerName = player === 'player' ? 'Your' : 'Opponent\'s';
  let defenderName = "unknown target";
  let text = "";
  
  // Check if it's a hero target
  if (defenderId === 'player' || defenderId === 'opponent') {
    defenderName = defenderId === 'player' ? 'your hero' : 'the opponent\'s hero';
  } else if (defenderId) {
    // Check player battlefield
    const playerTarget = state.players.player.battlefield.find(c => c.instanceId === defenderId);
    if (playerTarget) {
      defenderName = playerTarget.card.name;
    } else {
      // Check opponent battlefield
      const opponentTarget = state.players.opponent.battlefield.find(c => c.instanceId === defenderId);
      if (opponentTarget) {
        defenderName = opponentTarget.card.name;
      }
    }
  } else {
    // No specific target, assume face
    defenderName = player === 'player' ? 'the opponent\'s hero' : 'your hero';
  }
  
  text = `${playerName} ${attackerCard.card.name} attacked ${defenderName}`;
  
  if (damage !== undefined) {
    text += ` for ${damage} damage`;
  }
  
  const event = createGameLogEvent(
    state,
    'attack',
    player,
    text,
    {
      cardId: attackerCard.instanceId,
      targetId: defenderId,
      value: damage
    }
  );
  
  return addGameLogEvent(state, event);
}

/**
 * Log a hero power use event
 */
export function logHeroPower(
  state: GameState,
  player: 'player' | 'opponent',
  targetId?: string,
  value?: number
): GameState {
  const playerName = player === 'player' ? 'You' : 'Opponent';
  const heroClass = state.players[player].heroClass;
  const heroPowerName = state.players[player].heroPower.name;
  
  let text = `${playerName} used hero power (${heroPowerName})`;
  
  if (targetId) {
    let targetName = "unknown target";
    
    // Check if it's a hero target
    if (targetId === 'player' || targetId === 'opponent') {
      targetName = targetId === 'player' ? 'your hero' : 'the opponent\'s hero';
    } else {
      // Check player battlefield
      const playerTarget = state.players.player.battlefield.find(c => c.instanceId === targetId);
      if (playerTarget) {
        targetName = playerTarget.card.name;
      } else {
        // Check opponent battlefield
        const opponentTarget = state.players.opponent.battlefield.find(c => c.instanceId === targetId);
        if (opponentTarget) {
          targetName = opponentTarget.card.name;
        }
      }
    }
    
    text += ` targeting ${targetName}`;
  }
  
  if (value !== undefined) {
    if (heroClass === 'mage') {
      text += ` for ${value} damage`;
    } else if (heroClass === 'warrior') {
      text += ` gaining ${value} armor`;
    } else if (heroClass === 'hunter') {
      text += ` dealing ${value} damage`;
    } else if (heroClass === 'paladin') {
      text += ` summoning a recruit`;
    }
  }
  
  const event = createGameLogEvent(
    state,
    'hero_power',
    player,
    text,
    {
      targetId,
      value
    }
  );
  
  return addGameLogEvent(state, event);
}

/**
 * Log a turn start event
 */
export function logTurnStart(
  state: GameState,
  player: 'player' | 'opponent'
): GameState {
  const playerName = player === 'player' ? 'Your' : 'Opponent\'s';
  const text = `${playerName} turn ${state.turnNumber} started`;
  
  const event = createGameLogEvent(
    state,
    'turn_start',
    player,
    text
  );
  
  return addGameLogEvent(state, event);
}

/**
 * Log a turn end event
 */
export function logTurnEnd(
  state: GameState,
  player: 'player' | 'opponent'
): GameState {
  const playerName = player === 'player' ? 'Your' : 'Opponent\'s';
  const text = `${playerName} turn ${state.turnNumber} ended`;
  
  const event = createGameLogEvent(
    state,
    'turn_end',
    player,
    text
  );
  
  return addGameLogEvent(state, event);
}

/**
 * Log a card draw event
 */
export function logCardDraw(
  state: GameState,
  player: 'player' | 'opponent',
  cardId?: string,
  isBurned: boolean = false,
): GameState {
  const playerName = player === 'player' ? 'You' : 'Opponent';

  let text = "";
  let eventType: GameLogEventType = 'draw';

  if (isBurned) {
    // Card was drawn but burned because hand was full (10 cards)
    text = `${playerName} burned a card (hand full)`;
    eventType = 'burn';
    
    // Show the burned card name for the player
    if (player === 'player' && cardId) {
      const card = state.players.player.graveyard?.find(c => c.instanceId === cardId);
      if (card) {
        text += `: ${card.card.name}`;
      }
    }
  } else {
    text = `${playerName} drew a card`;
    if (player === 'player' && cardId) {
      // Only show card name for player draws
      const card = state.players.player.hand.find(c => c.instanceId === cardId);
      if (card) {
        text += `: ${card.card.name}`;
      }
    }
  }
  
  const event = createGameLogEvent(
    state,
    eventType,
    player,
    text,
    {
      cardId
    }
  );
  
  return addGameLogEvent(state, event);
}

/**
 * Log a mulligan action
 */
export function logMulligan(
  state: GameState,
  player: 'player' | 'opponent',
  replacedCount: number
): GameState {
  const playerName = player === 'player' ? 'You' : 'Opponent';
  const text = `${playerName} replaced ${replacedCount} ${replacedCount === 1 ? 'card' : 'cards'} in mulligan`;
  
  const event = createGameLogEvent(
    state,
    'mulligan',
    player,
    text,
    {
      value: replacedCount
    }
  );
  
  return addGameLogEvent(state, event);
}

/**
 * Log a card death event
 */
export function logCardDeath(
  state: GameState,
  player: 'player' | 'opponent',
  card: CardInstance
): GameState {
  const playerName = player === 'player' ? 'Your' : 'Opponent\'s';
  const text = `${playerName} ${card.card.name} died`;
  
  const event = createGameLogEvent(
    state,
    'death',
    player,
    text,
    {
      cardId: card.instanceId
    }
  );
  
  return addGameLogEvent(state, event);
}

/**
 * Log a minion summon event
 */
export function logSummon(
  state: GameState,
  player: 'player' | 'opponent',
  card: CardInstance
): GameState {
  const playerName = player === 'player' ? 'You' : 'Opponent';
  const text = `${playerName} summoned ${card.card.name}`;
  
  const event = createGameLogEvent(
    state,
    'summon',
    player,
    text,
    {
      cardId: card.instanceId
    }
  );
  
  return addGameLogEvent(state, event);
}

/**
 * Log a heal event
 */
export function logHeal(
  state: GameState,
  player: 'player' | 'opponent',
  targetId: string,
  amount: number,
  sourceCardId?: string
): GameState {
  const playerName = player === 'player' ? 'You' : 'Opponent';
  let targetName = "unknown target";
  
  // Check if it's a hero target
  if (targetId === 'player' || targetId === 'opponent') {
    targetName = targetId === 'player' ? 'your hero' : 'the opponent\'s hero';
  } else {
    // Check player battlefield
    const playerTarget = state.players.player.battlefield.find(c => c.instanceId === targetId);
    if (playerTarget) {
      targetName = playerTarget.card.name;
    } else {
      // Check opponent battlefield
      const opponentTarget = state.players.opponent.battlefield.find(c => c.instanceId === targetId);
      if (opponentTarget) {
        targetName = opponentTarget.card.name;
      }
    }
  }
  
  let text = `${playerName} healed ${targetName} for ${amount}`;
  
  // Add source info if available
  if (sourceCardId) {
    let sourceName = "unknown source";
    
    // Check player hand and battlefield
    const playerSource = [...state.players.player.hand, ...state.players.player.battlefield].find(c => c.instanceId === sourceCardId);
    if (playerSource) {
      sourceName = playerSource.card.name;
    } else {
      // Check opponent hand and battlefield
      const opponentSource = [...state.players.opponent.hand, ...state.players.opponent.battlefield].find(c => c.instanceId === sourceCardId);
      if (opponentSource) {
        sourceName = opponentSource.card.name;
      }
    }
    
    text += ` with ${sourceName}`;
  }
  
  const event = createGameLogEvent(
    state,
    'heal',
    player,
    text,
    {
      targetId,
      cardId: sourceCardId,
      value: amount
    }
  );
  
  return addGameLogEvent(state, event);
}

/**
 * Log a damage event
 */
export function logDamage(
  state: GameState,
  player: 'player' | 'opponent',
  targetId: string,
  amount: number,
  sourceCardId?: string
): GameState {
  const playerName = player === 'player' ? 'You' : 'Opponent';
  let targetName = "unknown target";
  
  // Check if it's a hero target
  if (targetId === 'player' || targetId === 'opponent') {
    targetName = targetId === 'player' ? 'your hero' : 'the opponent\'s hero';
  } else {
    // Check player battlefield
    const playerTarget = state.players.player.battlefield.find(c => c.instanceId === targetId);
    if (playerTarget) {
      targetName = playerTarget.card.name;
    } else {
      // Check opponent battlefield
      const opponentTarget = state.players.opponent.battlefield.find(c => c.instanceId === targetId);
      if (opponentTarget) {
        targetName = opponentTarget.card.name;
      }
    }
  }
  
  let text = `${playerName} dealt ${amount} damage to ${targetName}`;
  
  // Add source info if available
  if (sourceCardId) {
    let sourceName = "unknown source";
    
    // Check player hand and battlefield
    const playerSource = [...state.players.player.hand, ...state.players.player.battlefield].find(c => c.instanceId === sourceCardId);
    if (playerSource) {
      sourceName = playerSource.card.name;
    } else {
      // Check opponent hand and battlefield
      const opponentSource = [...state.players.opponent.hand, ...state.players.opponent.battlefield].find(c => c.instanceId === sourceCardId);
      if (opponentSource) {
        sourceName = opponentSource.card.name;
      }
    }
    
    text += ` with ${sourceName}`;
  }
  
  const event = createGameLogEvent(
    state,
    'damage',
    player,
    text,
    {
      targetId,
      cardId: sourceCardId,
      value: amount
    }
  );
  
  return addGameLogEvent(state, event);
}

/**
 * Log a buff event
 */
export function logBuff(
  state: GameState,
  player: 'player' | 'opponent',
  targetId: string,
  attackBuff: number,
  healthBuff: number,
  sourceCardId?: string
): GameState {
  const playerName = player === 'player' ? 'You' : 'Opponent';
  let targetName = "unknown target";
  
  // Find target card
  const playerTarget = state.players.player.battlefield.find(c => c.instanceId === targetId);
  if (playerTarget) {
    targetName = playerTarget.card.name;
  } else {
    const opponentTarget = state.players.opponent.battlefield.find(c => c.instanceId === targetId);
    if (opponentTarget) {
      targetName = opponentTarget.card.name;
    }
  }
  
  let buffText = "";
  if (attackBuff > 0 && healthBuff > 0) {
    buffText = `+${attackBuff}/+${healthBuff}`;
  } else if (attackBuff > 0) {
    buffText = `+${attackBuff} attack`;
  } else if (healthBuff > 0) {
    buffText = `+${healthBuff} health`;
  } else if (attackBuff < 0 && healthBuff < 0) {
    buffText = `${attackBuff}/${healthBuff}`;
  } else if (attackBuff < 0) {
    buffText = `${attackBuff} attack`;
  } else if (healthBuff < 0) {
    buffText = `${healthBuff} health`;
  }
  
  let text = `${playerName} gave ${targetName} ${buffText}`;
  
  // Add source info if available
  if (sourceCardId) {
    let sourceName = "unknown source";
    
    // Check player hand and battlefield
    const playerSource = [...state.players.player.hand, ...state.players.player.battlefield].find(c => c.instanceId === sourceCardId);
    if (playerSource) {
      sourceName = playerSource.card.name;
    } else {
      // Check opponent hand and battlefield
      const opponentSource = [...state.players.opponent.hand, ...state.players.opponent.battlefield].find(c => c.instanceId === sourceCardId);
      if (opponentSource) {
        sourceName = opponentSource.card.name;
      }
    }
    
    text += ` with ${sourceName}`;
  }
  
  const event = createGameLogEvent(
    state,
    'buff',
    player,
    text,
    {
      targetId,
      cardId: sourceCardId,
      value: attackBuff // Just track attack buff for value
    }
  );
  
  return addGameLogEvent(state, event);
}

/**
 * Log a discover event
 */
export function logDiscover(
  state: GameState,
  player: 'player' | 'opponent',
  sourceCardId?: string,
  chosenCardId?: string
): GameState {
  const playerName = player === 'player' ? 'You' : 'Opponent';
  
  let text = `${playerName} started a discovery`;
  
  if (sourceCardId) {
    let sourceName = "unknown source";
    
    // Check player hand
    const playerSource = state.players.player.hand.find(c => c.instanceId === sourceCardId);
    if (playerSource) {
      sourceName = playerSource.card.name;
    } else {
      // Check opponent hand
      const opponentSource = state.players.opponent.hand.find(c => c.instanceId === sourceCardId);
      if (opponentSource) {
        sourceName = opponentSource.card.name;
      }
    }
    
    text += ` from ${sourceName}`;
  }
  
  if (chosenCardId) {
    text += ` and chose ${chosenCardId}`;
  }
  
  const event = createGameLogEvent(
    state,
    'discover',
    player,
    text,
    {
      cardId: sourceCardId
    }
  );
  
  return addGameLogEvent(state, event);
}