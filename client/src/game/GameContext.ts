/**
 * Game Context
 * 
 * Provides the game state for effect handlers to use when executing effects.
 */
import { CardInstance } from './types/CardTypes';
import { ActiveEffect } from './types';
import { debug } from './config/debugConfig';
import { MAX_HAND_SIZE } from './constants/gameConstants';

export interface Player {
  id: string;
  health: number;
  maxHealth: number;
  armor: number;
  mana: {
    current: number;
    max: number;
    overloaded: number;
    pendingOverload: number;
  };
  hand: CardInstance[];
  deck: CardInstance[];
  board: CardInstance[];
  graveyard: CardInstance[];
  hero: CardInstance;
  heroPower: CardInstance;
  cardsPlayedThisTurn: number;
  cardsDrawnThisTurn: number;
  minionsPlayedThisTurn: number;
  damageDealtThisTurn: number;
  healingDoneThisTurn: number;
}

export class GameContext {
  currentPlayer: Player;
  opponentPlayer: Player;
  turnCount: number;
  activeEffects: ActiveEffect[];
  gameLog: string[];
  
  constructor(currentPlayer: Player, opponentPlayer: Player) {
    this.currentPlayer = currentPlayer;
    this.opponentPlayer = opponentPlayer;
    this.turnCount = 1;
    this.activeEffects = [];
    this.gameLog = [];
  }
  
  /**
   * Get all minions on both sides of the board
   */
  getAllMinions(): CardInstance[] {
    return [...this.currentPlayer.board, ...this.opponentPlayer.board];
  }
  
  /**
   * Get all friendly minions
   */
  getFriendlyMinions(): CardInstance[] {
    return [...this.currentPlayer.board];
  }
  
  /**
   * Get all enemy minions
   */
  getEnemyMinions(): CardInstance[] {
    return [...this.opponentPlayer.board];
  }
  
  /**
   * Get adjacent minions to a specific minion
   */
  getAdjacentMinions(minionInstance: CardInstance): CardInstance[] {
    const board = this.currentPlayer.board.includes(minionInstance)
      ? this.currentPlayer.board
      : this.opponentPlayer.board;
    
    const index = board.indexOf(minionInstance);
    
    if (index === -1) return [];
    
    const adjacentMinions: CardInstance[] = [];
    
    if (index > 0) {
      adjacentMinions.push(board[index - 1]);
    }
    
    if (index < board.length - 1) {
      adjacentMinions.push(board[index + 1]);
    }
    
    return adjacentMinions;
  }
  
  /**
   * Find a target based on target type
   */
  getTargets(targetType: string, sourceCard: CardInstance): CardInstance[] {
    switch (targetType) {
      case 'none':
        return [];
      case 'any':
        return [
          this.currentPlayer.hero,
          this.opponentPlayer.hero,
          ...this.currentPlayer.board,
          ...this.opponentPlayer.board
        ];
      case 'friendly_character':
        return [this.currentPlayer.hero, ...this.currentPlayer.board];
      case 'enemy_character':
        return [this.opponentPlayer.hero, ...this.opponentPlayer.board];
      case 'friendly_minion':
        return [...this.currentPlayer.board];
      case 'enemy_minion':
        return [...this.opponentPlayer.board];
      case 'any_minion':
        return [...this.currentPlayer.board, ...this.opponentPlayer.board];
      case 'friendly_hero':
        return [this.currentPlayer.hero];
      case 'enemy_hero':
        return [this.opponentPlayer.hero];
      case 'any_hero':
        return [this.currentPlayer.hero, this.opponentPlayer.hero];
      case 'random_minion':
        const allMinions = this.getAllMinions();
        return allMinions.length > 0 ? [allMinions[Math.floor(Math.random() * allMinions.length)]] : [];
      case 'random_enemy_minion':
        const enemyMinions = this.getEnemyMinions();
        return enemyMinions.length > 0 ? [enemyMinions[Math.floor(Math.random() * enemyMinions.length)]] : [];
      case 'random_friendly_minion':
        const friendlyMinions = this.getFriendlyMinions();
        return friendlyMinions.length > 0 ? [friendlyMinions[Math.floor(Math.random() * friendlyMinions.length)]] : [];
      case 'adjacent_minions':
        return this.getAdjacentMinions(sourceCard);
      case 'self':
        return [sourceCard];
      default:
        debug.error(`Unknown target type: ${targetType}`);
        return [];
    }
  }
  
  /**
   * Deal damage to a target
   */
  dealDamage(target: CardInstance, amount: number): void {
    if (!target) return;
    
    debug.log(`Dealing ${amount} damage to ${target.card.name}`);
    
    // Check for divine shield
    if (target.hasDivineShield) {
      target.hasDivineShield = false;
      this.logGameEvent(`${target.card.name}'s divine shield absorbed the damage.`);
      return;
    }
    
    // Deal damage
    if (target.card.type === 'minion' && target.currentHealth !== undefined) {
      target.currentHealth -= amount;
      this.logGameEvent(`${target.card.name} took ${amount} damage. Health: ${target.currentHealth}`);
      
      // Check for death
      if (target.currentHealth <= 0) {
        this.logGameEvent(`${target.card.name} died.`);
        // Handle death here or trigger a separate death handler
      }
    } else if (target.card.type === 'hero') {
      // First reduce armor if any
      if (target === this.currentPlayer.hero) {
        if (this.currentPlayer.armor > 0) {
          const armorAbsorbed = Math.min(this.currentPlayer.armor, amount);
          this.currentPlayer.armor -= armorAbsorbed;
          amount -= armorAbsorbed;
        }
        
        this.currentPlayer.health -= amount;
        this.logGameEvent(`${this.currentPlayer.hero.card.name} took ${amount} damage. Health: ${this.currentPlayer.health}`);
      } else {
        if (this.opponentPlayer.armor > 0) {
          const armorAbsorbed = Math.min(this.opponentPlayer.armor, amount);
          this.opponentPlayer.armor -= armorAbsorbed;
          amount -= armorAbsorbed;
        }
        
        this.opponentPlayer.health -= amount;
        this.logGameEvent(`${this.opponentPlayer.hero.card.name} took ${amount} damage. Health: ${this.opponentPlayer.health}`);
      }
    }
  }
  
  /**
   * Heal a target
   */
  healTarget(target: CardInstance, amount: number): void {
    if (!target) return;
    
    if (target.card.type === 'minion' && target.currentHealth !== undefined) {
      const maxHealth = target.card.health || 0;
      const startingHealth = target.currentHealth;
      target.currentHealth = Math.min(maxHealth, target.currentHealth + amount);
      const actualHeal = target.currentHealth - startingHealth;
      
      this.logGameEvent(`${target.card.name} was healed for ${actualHeal}. Health: ${target.currentHealth}/${maxHealth}`);
    } else if (target.card.type === 'hero') {
      if (target === this.currentPlayer.hero) {
        const startingHealth = this.currentPlayer.health;
        this.currentPlayer.health = Math.min(this.currentPlayer.maxHealth, this.currentPlayer.health + amount);
        const actualHeal = this.currentPlayer.health - startingHealth;
        
        this.logGameEvent(`${this.currentPlayer.hero.card.name} was healed for ${actualHeal}. Health: ${this.currentPlayer.health}/${this.currentPlayer.maxHealth}`);
      } else {
        const startingHealth = this.opponentPlayer.health;
        this.opponentPlayer.health = Math.min(this.opponentPlayer.maxHealth, this.opponentPlayer.health + amount);
        const actualHeal = this.opponentPlayer.health - startingHealth;
        
        this.logGameEvent(`${this.opponentPlayer.hero.card.name} was healed for ${actualHeal}. Health: ${this.opponentPlayer.health}/${this.opponentPlayer.maxHealth}`);
      }
    }
  }
  
  /**
   * Draw cards for the current player
   */
  drawCards(count: number): CardInstance[] {
    const drawnCards: CardInstance[] = [];
    
    for (let i = 0; i < count; i++) {
      if (this.currentPlayer.deck.length === 0) {
        // Empty deck — no fatigue damage by design; player simply cannot draw
        this.logGameEvent(`${this.currentPlayer.hero.card.name} draws from an empty deck.`);
        continue;
      }
      
      const card = this.currentPlayer.deck.shift();
      if (card) {
        if (this.currentPlayer.hand.length < MAX_HAND_SIZE) {
          this.currentPlayer.hand.push(card);
          drawnCards.push(card);
          this.logGameEvent(`${this.currentPlayer.hero.card.name} drew ${card.card.name}.`);
        } else {
          this.logGameEvent(`${this.currentPlayer.hero.card.name}'s hand is full. ${card.card.name} was burned.`);
        }
      }
    }
    
    return drawnCards;
  }
  
  /**
   * Add a new log entry
   */
  logGameEvent(message: string): void {
    this.gameLog.push(`[Turn ${this.turnCount}] ${message}`);
    debug.log(`[GAME] ${message}`);
  }
}

export default GameContext;