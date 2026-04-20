/**
 * RandomWeapon Battlecry Handler
 * 
 * Equips a random weapon (can affect both players).
 * Example card: Blingtron 3000 (ID: 20202)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeRandomWeapon(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing random_weapon battlecry for ${sourceCard.name}`);
    
    const forBothPlayers = effect.forBothPlayers ?? true;
    
    const weaponPool: Partial<Card>[] = [
      { id: 80001, name: 'Fiery War Axe', attack: 3, durability: 2, manaCost: 3, heroClass: 'warrior' },
      { id: 80002, name: 'Doomhammer', attack: 2, durability: 8, manaCost: 5, heroClass: 'shaman' },
      { id: 80003, name: 'Truesilver Champion', attack: 4, durability: 2, manaCost: 4, heroClass: 'paladin' },
      { id: 80004, name: 'Eaglehorn Bow', attack: 3, durability: 2, manaCost: 3, heroClass: 'hunter' },
      { id: 80005, name: 'Assassin\'s Blade', attack: 3, durability: 4, manaCost: 5, heroClass: 'rogue' },
      { id: 80006, name: 'Arcanite Reaper', attack: 5, durability: 2, manaCost: 5, heroClass: 'warrior' },
      { id: 80007, name: 'Gorehowl', attack: 7, durability: 1, manaCost: 7, heroClass: 'warrior' }
    ];
    
    const createRandomWeapon = (): CardInstance => {
      const randomWeapon = weaponPool[Math.floor(Math.random() * weaponPool.length)];
      return {
        instanceId: `random-weapon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        card: {
          id: randomWeapon.id || 80000,
          name: randomWeapon.name || 'Random Weapon',
          description: '',
          manaCost: randomWeapon.manaCost || 3,
          type: 'weapon',
          rarity: 'rare',
          heroClass: (randomWeapon.heroClass as any) || 'neutral',
          attack: randomWeapon.attack || 3,
          durability: randomWeapon.durability || 2
        } as Card,
        currentAttack: randomWeapon.attack || 3,
        canAttack: true,
        isPlayed: true,
        isSummoningSick: false,
        attacksPerformed: 0
      };
    };
    
    const playerWeapon = createRandomWeapon();
    (context.currentPlayer as any).weapon = playerWeapon;
    context.logGameEvent(`You equipped ${playerWeapon.card.name}.`);
    
    let opponentWeapon: CardInstance | undefined;
    if (forBothPlayers) {
      opponentWeapon = createRandomWeapon();
      (context.opponentPlayer as any).weapon = opponentWeapon;
      context.logGameEvent(`Opponent equipped ${opponentWeapon.card.name}.`);
    }
    
    return { 
      success: true, 
      additionalData: { playerWeapon, opponentWeapon, forBothPlayers }
    };
  } catch (error) {
    debug.error('Error executing random_weapon:', error);
    return { success: false, error: `Failed to execute random_weapon: ${error}` };
  }
}
