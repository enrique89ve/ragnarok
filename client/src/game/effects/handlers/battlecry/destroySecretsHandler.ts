/**
 * DestroySecrets Battlecry Handler
 * 
 * Implements the "destroy_secrets" battlecry effect.
 * Destroys all enemy secrets and optionally buffs the source minion.
 * Example card: Eater of Secrets (ID: 31009)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a destroy_secrets battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDestroySecrets(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:destroy_secrets for ${sourceCard.name}`);
    
    const opponentSecrets = (context.opponentPlayer as any).secrets || [];
    const secretCount = opponentSecrets.length;
    
    if (secretCount === 0) {
      context.logGameEvent(`No enemy secrets to destroy`);
      return { success: true, additionalData: { secretsDestroyed: 0 } };
    }
    
    const destroyedSecrets = [...opponentSecrets];
    
    (context.opponentPlayer as any).secrets = [];
    
    destroyedSecrets.forEach((secret: any) => {
      context.logGameEvent(`${sourceCard.name} destroyed ${secret.card?.name || 'a secret'}`);
    });
    
    if (effect.buffPerSecret || (effect.attack !== undefined && effect.health !== undefined)) {
      const sourceInstance = context.getFriendlyMinions().find(m => m.card.id === sourceCard.id);
      if (sourceInstance) {
        const attackBuff = (effect.attack || 0) * secretCount;
        const healthBuff = (effect.health || 0) * secretCount;
        
        if (sourceInstance.currentAttack !== undefined) {
          sourceInstance.currentAttack += attackBuff;
        }
        if (sourceInstance.currentHealth !== undefined) {
          sourceInstance.currentHealth += healthBuff;
        }
        
        context.logGameEvent(`${sourceCard.name} gained +${attackBuff}/+${healthBuff} from destroying ${secretCount} secret(s)`);
      }
    }
    
    context.logGameEvent(`Destroyed ${secretCount} enemy secret(s)`);
    
    return { 
      success: true, 
      additionalData: { 
        secretsDestroyed: secretCount,
        destroyedSecrets: destroyedSecrets.map((s: any) => s.card?.name)
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:destroy_secrets:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:destroy_secrets: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
