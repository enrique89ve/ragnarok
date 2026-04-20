/**
 * MinionBattleResolver - Pure TypeScript Combat Logic
 * 
 * Handles minion-to-minion and minion-to-hero combat resolution.
 * No React dependencies - can be used for AI, testing, and server validation.
 */

export interface MinionState {
  instanceId: string;
  cardId: number;
  name: string;
  attack: number;
  health: number;
  maxHealth: number;
  position: number;
  canAttack: boolean;
  hasTaunt: boolean;
  hasDivineShield: boolean;
  hasStealth: boolean;
  hasWindfury: boolean;
  hasPoison: boolean;
  hasLifesteal: boolean;
  attacksRemaining: number;
  statusEffects: StatusEffect[];
  ownerId: 'player' | 'opponent';
}

export interface HeroState {
  heroId: string;
  name: string;
  health: number;
  maxHealth: number;
  armor: number;
  attack: number;
  ownerId: 'player' | 'opponent';
}

export interface StatusEffect {
  type: 'poison' | 'bleed' | 'burn' | 'freeze' | 'paralysis' | 'weakness' | 'vulnerable' | 'marked';
  stacks: number;
  duration: number;
}

export interface CombatResult {
  attackerId: string;
  defenderId: string;
  attackerDamage: number;
  defenderDamage: number;
  attackerDied: boolean;
  defenderDied: boolean;
  attackerNewHealth: number;
  defenderNewHealth: number;
  divineShieldPopped: boolean;
  poisonTriggered: boolean;
  lifestealAmount: number;
  overkillDamage: number;
}

export interface BattlefieldState {
  playerMinions: MinionState[];
  opponentMinions: MinionState[];
  playerHero: HeroState;
  opponentHero: HeroState;
}

export class MinionBattleResolver {
  canAttack(attacker: MinionState, battlefield: BattlefieldState): boolean {
    if (!attacker.canAttack) return false;
    if (attacker.attacksRemaining <= 0) return false;
    if (attacker.attack <= 0) return false;
    
    const isFrozen = attacker.statusEffects.some((e) => e.type === 'freeze');
    if (isFrozen) return false;

    return true;
  }

  getValidTargets(
    attacker: MinionState,
    battlefield: BattlefieldState
  ): (MinionState | HeroState)[] {
    const enemyMinions = attacker.ownerId === 'player'
      ? battlefield.opponentMinions
      : battlefield.playerMinions;

    const enemyHero = attacker.ownerId === 'player'
      ? battlefield.opponentHero
      : battlefield.playerHero;

    const tauntMinions = enemyMinions.filter((m) => m.hasTaunt && m.health > 0);
    
    if (tauntMinions.length > 0) {
      return tauntMinions;
    }

    const validMinions = enemyMinions.filter((m) => !m.hasStealth && m.health > 0);
    return [...validMinions, enemyHero];
  }

  resolveMinionVsMinion(
    attackerInput: MinionState,
    defenderInput: MinionState
  ): { result: CombatResult; updatedAttacker: MinionState; updatedDefender: MinionState } {
    const attacker = { ...attackerInput };
    const defender = { ...defenderInput };
    
    let attackerDamage = 0;
    let defenderDamage = 0;
    let divineShieldPopped = false;
    let poisonTriggered = false;
    let lifestealAmount = 0;

    if (defender.hasDivineShield) {
      defender.hasDivineShield = false;
      divineShieldPopped = true;
    } else {
      defenderDamage = attacker.attack;
      defender.health -= defenderDamage;

      if (attacker.hasPoison && defender.health > 0) {
        defender.health = 0;
        poisonTriggered = true;
      }

      if (attacker.hasLifesteal) {
        lifestealAmount = Math.min(defenderDamage, defender.health + defenderDamage);
      }
    }

    if (attacker.hasDivineShield) {
      attacker.hasDivineShield = false;
    } else {
      attackerDamage = defender.attack;
      attacker.health -= attackerDamage;

      if (defender.hasPoison && attacker.health > 0) {
        attacker.health = 0;
      }
    }

    const attackerDied = attacker.health <= 0;
    const defenderDied = defender.health <= 0;

    attacker.attacksRemaining--;
    if (!attacker.hasWindfury || attacker.attacksRemaining <= 0) {
      attacker.canAttack = false;
    }

    if (attacker.hasStealth) {
      attacker.hasStealth = false;
    }

    const overkillDamage = defenderDied ? Math.abs(Math.min(0, defender.health)) : 0;

    return {
      result: {
        attackerId: attacker.instanceId,
        defenderId: defender.instanceId,
        attackerDamage,
        defenderDamage,
        attackerDied,
        defenderDied,
        attackerNewHealth: attacker.health,
        defenderNewHealth: defender.health,
        divineShieldPopped,
        poisonTriggered,
        lifestealAmount,
        overkillDamage,
      },
      updatedAttacker: attacker,
      updatedDefender: defender,
    };
  }

  resolveMinionVsHero(
    attackerInput: MinionState,
    defenderInput: HeroState
  ): { result: CombatResult; updatedAttacker: MinionState; updatedDefender: HeroState } {
    const attacker = { ...attackerInput };
    const defender = { ...defenderInput };
    
    let defenderDamage = attacker.attack;
    let lifestealAmount = 0;

    if (defender.armor > 0) {
      const armorAbsorbed = Math.min(defender.armor, defenderDamage);
      defender.armor -= armorAbsorbed;
      defenderDamage -= armorAbsorbed;
    }

    defender.health -= defenderDamage;

    if (attacker.hasLifesteal) {
      lifestealAmount = defenderDamage;
    }

    attacker.attacksRemaining--;
    if (!attacker.hasWindfury || attacker.attacksRemaining <= 0) {
      attacker.canAttack = false;
    }

    if (attacker.hasStealth) {
      attacker.hasStealth = false;
    }

    return {
      result: {
        attackerId: attacker.instanceId,
        defenderId: defender.heroId,
        attackerDamage: 0,
        defenderDamage,
        attackerDied: false,
        defenderDied: defender.health <= 0,
        attackerNewHealth: attacker.health,
        defenderNewHealth: defender.health,
        divineShieldPopped: false,
        poisonTriggered: false,
        lifestealAmount,
        overkillDamage: defender.health < 0 ? Math.abs(defender.health) : 0,
      },
      updatedAttacker: attacker,
      updatedDefender: defender,
    };
  }

  processStartOfTurn(minions: MinionState[]): MinionState[] {
    return minions.map((minion) => {
      const updatedMinion = { ...minion };
      
      updatedMinion.canAttack = true;
      updatedMinion.attacksRemaining = updatedMinion.hasWindfury ? 2 : 1;

      updatedMinion.statusEffects = updatedMinion.statusEffects
        .map((effect) => {
          if (effect.type === 'poison' || effect.type === 'bleed' || effect.type === 'burn') {
            updatedMinion.health -= effect.stacks;
          }
          return { ...effect, duration: effect.duration - 1 };
        })
        .filter((effect) => effect.duration > 0);

      return updatedMinion;
    });
  }

  processEndOfTurn(minions: MinionState[]): MinionState[] {
    return minions.filter((minion) => minion.health > 0);
  }

  refreshAttacks(minions: MinionState[]): MinionState[] {
    return minions.map((minion) => ({
      ...minion,
      canAttack: true,
      attacksRemaining: minion.hasWindfury ? 2 : 1,
    }));
  }
}

export const minionBattleResolver = new MinionBattleResolver();
