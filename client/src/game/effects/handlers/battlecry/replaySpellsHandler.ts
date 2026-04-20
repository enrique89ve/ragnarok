/**
 * ReplaySpells Battlecry Handler
 * 
 * Implements the "replay_spells" battlecry effect.
 * Replays spells cast this game (Utgarda-Loki style).
 * Example card: Lynessa Sunsorrow (ID: 20800), Utgarda-Loki (60102)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeReplaySpells(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:replay_spells for ${sourceCard.name}`);
    
    const targetSelf = effect.targetSelf || false;
    const condition = effect.condition;
    const maxSpells = effect.maxSpells || 30;
    const isRandom = effect.isRandom !== false;
    
    const spellsCast = (context as any).spellsCastThisGame || [];
    
    let filteredSpells = [...spellsCast];
    
    if (condition === 'targeted_friendly_minions') {
      filteredSpells = filteredSpells.filter((spell: any) => 
        spell.targetType === 'friendly_minion' || spell.targetedFriendlyMinion
      );
    }
    
    if (filteredSpells.length === 0) {
      context.logGameEvent(`No spells to replay`);
      return { success: true, additionalData: { spellsReplayed: 0 } };
    }
    
    if (isRandom) {
      for (let i = filteredSpells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filteredSpells[i], filteredSpells[j]] = [filteredSpells[j], filteredSpells[i]];
      }
    }
    
    filteredSpells = filteredSpells.slice(0, maxSpells);
    
    const replayedSpells: string[] = [];
    const sourceMinion = context.getFriendlyMinions().find(m => m.card.id === sourceCard.id);
    
    for (const spell of filteredSpells) {
      if (!sourceMinion || (sourceMinion.currentHealth !== undefined && sourceMinion.currentHealth <= 0)) {
        context.logGameEvent(`${sourceCard.name} died, stopping spell replay`);
        break;
      }
      
      try {
        const spellName = spell.name || 'Unknown Spell';
        const spellEffect = spell.effect || spell.spellEffect;
        
        context.logGameEvent(`Replaying ${spellName}`);
        replayedSpells.push(spellName);
        
        if (spellEffect) {
          let targets: CardInstance[] = [];
          
          if (targetSelf && sourceMinion) {
            targets = [sourceMinion];
          } else if (isRandom) {
            const allTargets = context.getAllMinions();
            if (allTargets.length > 0) {
              targets = [allTargets[Math.floor(Math.random() * allTargets.length)]];
            }
          }
          
          switch (spellEffect.type) {
            case 'damage':
              if (targets.length > 0) {
                context.dealDamage(targets[0], spellEffect.value || 1);
              } else {
                const enemyTargets = context.getEnemyMinions();
                if (enemyTargets.length > 0) {
                  const randomEnemy = enemyTargets[Math.floor(Math.random() * enemyTargets.length)];
                  context.dealDamage(randomEnemy, spellEffect.value || 1);
                }
              }
              break;
              
            case 'heal':
              if (targets.length > 0) {
                context.healTarget(targets[0], spellEffect.value || 1);
              }
              break;
              
            case 'buff':
              if (targets.length > 0) {
                const target = targets[0];
                target.currentAttack = (target.currentAttack || target.card.attack || 0) + (spellEffect.buffAttack || 0);
                target.currentHealth = (target.currentHealth || target.card.health || 0) + (spellEffect.buffHealth || 0);
                
                if (spellEffect.grantDivineShield) {
                  target.hasDivineShield = true;
                }
                if (spellEffect.grantTaunt) {
                  (target as any).hasTaunt = true;
                }
              }
              break;
              
            case 'draw':
              context.drawCards(spellEffect.value || 1);
              break;
              
            case 'aoe_damage':
              const aoeTargets = isRandom ? context.getEnemyMinions() : context.getAllMinions();
              for (const target of aoeTargets) {
                context.dealDamage(target, spellEffect.value || 1);
              }
              break;
              
            default:
              context.logGameEvent(`Unknown spell effect type: ${spellEffect.type}`);
          }
        }
      } catch (err) {
        debug.error(`Error replaying spell:`, err);
      }
    }
    
    context.logGameEvent(`${sourceCard.name} replayed ${replayedSpells.length} spells`);
    
    return { 
      success: true, 
      additionalData: { 
        spellsReplayed: replayedSpells.length,
        spells: replayedSpells
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:replay_spells:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:replay_spells: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
