/**
 * ReplaceHeroPower Battlecry Handler
 * 
 * Implements the "replace_hero_power" battlecry effect.
 * Replaces the hero power permanently with an upgraded version.
 * Example card: Justicar Trueheart (ID: 20209)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

const UPGRADED_HERO_POWERS: Record<string, any> = {
  'Fireblast': { name: 'Fireblast Rank 2', description: 'Deal 2 damage.', value: 2 },
  'Armor Up!': { name: 'Tank Up!', description: 'Gain 4 Armor.', value: 4 },
  'Lesser Heal': { name: 'Heal', description: 'Restore 4 Health.', value: 4 },
  'Reinforce': { name: 'The Silver Hand', description: 'Summon two 1/1 Silver Hand Recruits.', summonCount: 2 },
  'Steady Shot': { name: "Ballista Shot", description: 'Deal 3 damage to the enemy hero.', value: 3 },
  'Shapeshift': { name: 'Dire Shapeshift', description: '+2 Attack this turn. +2 Armor.', attackBuff: 2, armorGain: 2 },
  'Life Tap': { name: 'Soul Tap', description: 'Draw a card.', drawCards: 1, selfDamage: 0 },
  'Totemic Call': { name: 'Totemic Slam', description: 'Summon a Totem of your choice.', isDiscover: true },
  'Dagger Mastery': { name: 'Poisoned Daggers', description: 'Equip a 2/2 Weapon with Poisonous.', weaponAttack: 2, weaponDurability: 2, isPoisonous: true },
  'Berserker Claws': { name: 'Berserker Fury', description: '+2 Attack this turn.', attackBuff: 2 }
};

export default function executeReplaceHeroPower(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:replace_hero_power for ${sourceCard.name}`);
    
    const currentHeroPower = context.currentPlayer.heroPower;
    
    if (!currentHeroPower) {
      context.logGameEvent(`No hero power to replace`);
      return { success: false, error: 'No hero power found' };
    }
    
    const currentPowerName = currentHeroPower.card?.name || 'Unknown';
    
    let upgradedPower = effect.newHeroPower || UPGRADED_HERO_POWERS[currentPowerName];
    
    if (!upgradedPower) {
      upgradedPower = {
        name: `Upgraded ${currentPowerName}`,
        description: `An upgraded version of ${currentPowerName}`,
        value: (currentHeroPower.card?.spellEffect?.value || 1) * 2
      };
    }
    
    const newHeroPower: CardInstance = {
      instanceId: 'upgraded-hero-power-' + Date.now(),
      card: {
        id: 99997,
        name: upgradedPower.name,
        description: upgradedPower.description,
        manaCost: 2,
        type: 'hero_power',
        rarity: 'basic',
        heroClass: currentHeroPower.card?.heroClass || 'neutral',
        spellEffect: {
          type: currentHeroPower.card?.spellEffect?.type || 'damage',
          ...upgradedPower
        }
      },
      canAttack: false,
      isPlayed: false,
      isSummoningSick: false,
      attacksPerformed: 0
    };
    
    context.currentPlayer.heroPower = newHeroPower;
    
    context.logGameEvent(`${sourceCard.name} upgraded ${currentPowerName} to ${newHeroPower.card.name}`);
    
    return { 
      success: true, 
      additionalData: { 
        oldHeroPower: currentPowerName,
        newHeroPower: newHeroPower.card.name
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:replace_hero_power:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:replace_hero_power: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
