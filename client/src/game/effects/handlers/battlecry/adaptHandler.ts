/**
 * Adapt Battlecry Handler
 * 
 * Implements the "adapt" battlecry effect.
 * Presents 3 random adaptations from a pool of 10, player picks one.
 * Example card: Gentle Megasaur (ID: 30016)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

const ADAPTATION_OPTIONS = [
  { id: 'crackling_shield', name: 'Crackling Shield', description: 'Divine Shield', apply: (target: CardInstance) => { target.hasDivineShield = true; } },
  { id: 'flaming_claws', name: 'Flaming Claws', description: '+3 Attack', apply: (target: CardInstance) => { target.currentAttack = (target.currentAttack || target.card.attack || 0) + 3; } },
  { id: 'living_spores', name: 'Living Spores', description: 'Deathrattle: Summon two 1/1 Plants', apply: (target: CardInstance) => { (target as any).hasLivingSpores = true; } },
  { id: 'lightning_speed', name: 'Lightning Speed', description: 'Windfury', apply: (target: CardInstance) => { (target as any).hasWindfury = true; target.card.attacksPerTurn = 2; } },
  { id: 'massive', name: 'Massive', description: 'Taunt', apply: (target: CardInstance) => { (target as any).hasTaunt = true; } },
  { id: 'poison_spit', name: 'Poison Spit', description: 'Poisonous', apply: (target: CardInstance) => { target.isPoisonous = true; } },
  { id: 'rocky_carapace', name: 'Rocky Carapace', description: '+3 Health', apply: (target: CardInstance) => { target.currentHealth = (target.currentHealth || target.card.health || 0) + 3; } },
  { id: 'shrouding_mist', name: 'Shrouding Mist', description: 'Stealth until your next turn', apply: (target: CardInstance) => { (target as any).hasStealth = true; (target as any).temporaryStealth = true; } },
  { id: 'volcanic_might', name: 'Volcanic Might', description: '+1/+1', apply: (target: CardInstance) => { target.currentAttack = (target.currentAttack || target.card.attack || 0) + 1; target.currentHealth = (target.currentHealth || target.card.health || 0) + 1; } },
  { id: 'liquid_membrane', name: 'Liquid Membrane', description: "Can't be targeted by spells or Hero Powers", apply: (target: CardInstance) => { (target as any).isElusive = true; } }
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function executeAdapt(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  const sourceCardInstance: CardInstance = {
    instanceId: 'temp-' + Date.now(),
    card: sourceCard,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: false,
    attacksPerformed: 0
  };

  try {
    context.logGameEvent(`Executing battlecry:adapt for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'self';
    const adaptCount = effect.adaptCount || 1;
    
    let targets: CardInstance[];
    if (targetType === 'self') {
      const friendlyMinions = context.getFriendlyMinions();
      const selfMinion = friendlyMinions.find(m => m.card.id === sourceCard.id);
      targets = selfMinion ? [selfMinion] : [sourceCardInstance];
    } else {
      targets = context.getTargets(targetType, sourceCardInstance);
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for adapt`);
      return { success: false, error: 'No valid targets for adapt' };
    }
    
    const target = targets[0];
    const appliedAdaptations: string[] = [];
    
    for (let i = 0; i < adaptCount; i++) {
      const availableOptions = ADAPTATION_OPTIONS.filter(o => !appliedAdaptations.includes(o.id));
      const shuffledOptions = shuffleArray(availableOptions);
      const presentedOptions = shuffledOptions.slice(0, 3);
      
      if (presentedOptions.length === 0) {
        context.logGameEvent(`No more adaptations available`);
        break;
      }
      
      const selectedOption = presentedOptions[Math.floor(Math.random() * presentedOptions.length)];
      
      if (selectedOption && typeof selectedOption.apply === 'function') {
        selectedOption.apply(target);
        appliedAdaptations.push(selectedOption.id);
        context.logGameEvent(`${sourceCard.name} adapted ${target.card.name} with ${selectedOption.name}: ${selectedOption.description}`);
      }
    }
    
    return { 
      success: true, 
      additionalData: { 
        appliedAdaptations,
        target: target.card.name
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:adapt:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:adapt: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
