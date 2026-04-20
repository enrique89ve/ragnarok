/**
 * CombatDamageService - Centralized damage resolution system
 * 
 * This service is the SINGLE SOURCE OF TRUTH for all damage in the game.
 * All attack paths (manual, auto, AI, spells) must go through this service.
 * 
 * Benefits:
 * - Guaranteed synchronization between card game HP and poker combat HP
 * - Consistent animation timing (600ms impact point)
 * - Proper failure handling with user-friendly messages
 * - Extensible for future features (shields, damage reduction, etc.)
 * 
 * Architecture: Command pattern with event-driven notifications
 */

import { CombatEventBus, BlockReason, DamageSource } from './CombatEventBus';

export interface DamageCommand {
  attackerId: string;
  attackerType: 'minion' | 'hero' | 'spell' | 'effect';
  targetId: string;
  targetType: 'minion' | 'hero';
  damage: number;
  damageSource: DamageSource;
  attackerOwner: 'player' | 'opponent';
  defenderOwner: 'player' | 'opponent';
  counterDamage?: number;
}

export interface AttackValidation {
  valid: boolean;
  reason?: BlockReason;
  message?: string;
}

export interface DamageResult {
  success: boolean;
  actualDamage: number;
  targetHealthBefore: number;
  targetHealthAfter: number;
  targetDied: boolean;
  counterDamage?: number;
  counterTargetHealthBefore?: number;
  counterTargetHealthAfter?: number;
  counterTargetDied?: boolean;
  blockedReason?: BlockReason;
  blockedMessage?: string;
}

const IMPACT_DELAY_MS = 600;

class CombatDamageServiceImpl {
  private pendingAttacks: Map<string, {
    command: DamageCommand;
    resolve: (result: DamageResult) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  /**
   * Validate if an attack can proceed
   */
  validateAttack(
    attackerId: string,
    targetId: string | undefined,
    attackerCanAttack: boolean,
    hasAttackedThisTurn: boolean,
    hasSummoningSickness: boolean,
    attackValue: number,
    tauntMinions: string[]
  ): AttackValidation {
    if (!attackerCanAttack) {
      return {
        valid: false,
        reason: 'no_attack',
        message: 'This minion cannot attack'
      };
    }

    if (hasAttackedThisTurn) {
      return {
        valid: false,
        reason: 'already_attacked',
        message: 'This minion has already attacked this turn'
      };
    }

    if (hasSummoningSickness) {
      return {
        valid: false,
        reason: 'summoning_sickness',
        message: 'This minion has summoning sickness and cannot attack yet'
      };
    }

    if (attackValue <= 0) {
      return {
        valid: false,
        reason: 'no_attack',
        message: 'This minion has 0 attack and cannot attack'
      };
    }

    if (!targetId) {
      return {
        valid: false,
        reason: 'invalid_target',
        message: 'No target selected'
      };
    }

    if (tauntMinions.length > 0 && !tauntMinions.includes(targetId) && targetId.includes('hero')) {
      return {
        valid: false,
        reason: 'taunt',
        message: 'You must attack the minion with Taunt first'
      };
    }

    return { valid: true };
  }

  /**
   * Execute a damage command with proper timing and event emission
   * This is the main entry point for all damage in the game
   */
  async executeDamage(command: DamageCommand): Promise<DamageResult> {
    const attackId = CombatEventBus.generateEventId();
    
    CombatEventBus.emitAttackStarted({
      attackerId: command.attackerId,
      targetId: command.targetId
    });

    CombatEventBus.emitDamageIntent({
      sourceId: command.attackerId,
      sourceType: command.attackerType,
      targetId: command.targetId,
      targetType: command.targetType,
      intendedDamage: command.damage,
      damageSource: command.damageSource,
      attackerOwner: command.attackerOwner,
      defenderOwner: command.defenderOwner
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        const result = this.applyDamageAtImpact(command);
        this.pendingAttacks.delete(attackId);
        
        CombatEventBus.emitAttackCompleted({
          attackerId: command.attackerId,
          targetId: command.targetId,
          success: result.success
        });
        
        resolve(result);
      }, IMPACT_DELAY_MS);

      this.pendingAttacks.set(attackId, { command, resolve, timeout });
    });
  }

  /**
   * Execute damage immediately (for spells, effects, etc. that don't need animation delay)
   */
  executeImmediateDamage(command: DamageCommand): DamageResult {
    CombatEventBus.emitDamageIntent({
      sourceId: command.attackerId,
      sourceType: command.attackerType,
      targetId: command.targetId,
      targetType: command.targetType,
      intendedDamage: command.damage,
      damageSource: command.damageSource,
      attackerOwner: command.attackerOwner,
      defenderOwner: command.defenderOwner
    });

    return this.applyDamageAtImpact(command);
  }

  /**
   * Apply damage at the 600ms impact point
   * This is where all HP updates actually happen
   */
  private applyDamageAtImpact(command: DamageCommand): DamageResult {
    CombatEventBus.emitImpactPhase({
      attackerId: command.attackerId,
      targetId: command.targetId,
      damageToTarget: command.damage,
      damageToAttacker: command.counterDamage || 0
    });

    const result: DamageResult = {
      success: true,
      actualDamage: command.damage,
      targetHealthBefore: 0,
      targetHealthAfter: 0,
      targetDied: false
    };

    if (command.counterDamage !== undefined) {
      result.counterDamage = command.counterDamage;
      result.counterTargetHealthBefore = 0;
      result.counterTargetHealthAfter = 0;
      result.counterTargetDied = false;
    }

    CombatEventBus.emitDamageResolved({
      sourceId: command.attackerId,
      sourceType: command.attackerType,
      targetId: command.targetId,
      targetType: command.targetType,
      actualDamage: result.actualDamage,
      damageSource: command.damageSource,
      attackerOwner: command.attackerOwner,
      defenderOwner: command.defenderOwner,
      targetHealthBefore: result.targetHealthBefore,
      targetHealthAfter: result.targetHealthAfter,
      targetDied: result.targetDied,
      counterDamage: result.counterDamage,
      counterTargetHealthBefore: result.counterTargetHealthBefore,
      counterTargetHealthAfter: result.counterTargetHealthAfter,
      counterTargetDied: result.counterTargetDied
    });

    return result;
  }

  /**
   * Emit an attack blocked event with user-friendly message
   */
  emitAttackBlocked(
    attackerId: string,
    targetId: string | undefined,
    reason: BlockReason,
    message: string
  ): void {
    CombatEventBus.emitAttackBlocked({
      attackerId,
      targetId,
      reason,
      message
    });
  }

  /**
   * Cancel a pending attack (e.g., if the target dies before impact)
   */
  cancelPendingAttack(attackId: string): boolean {
    const pending = this.pendingAttacks.get(attackId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingAttacks.delete(attackId);
      return true;
    }
    return false;
  }

  /**
   * Get count of pending attacks (for debugging)
   */
  getPendingAttackCount(): number {
    return this.pendingAttacks.size;
  }
}

export const CombatDamageService = new CombatDamageServiceImpl();
export default CombatDamageService;
