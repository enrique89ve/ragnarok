/**
 * Super Minion Cards Registration
 * 
 * Registers all 76 hero-linked super minions in the card registry.
 * These legendary minions gain +2/+2 when played by their linked hero.
 */
import { debug } from '../../config/debugConfig';
import { registerCard } from '../cardManagement/cardRegistry';
import { heroSuperMinions } from '../sets/superMinions/heroSuperMinions';

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Register all super minion cards with the card registry
 */
export function registerSuperMinionCards(): void {
  heroSuperMinions.forEach(card => {
    try {
      registerCard(card, ['super_minion', 'hero_linked']);
    } catch (error) {
      debug.error(`Failed to register super minion: ${card.name}`, error);
    }
  });
  
  if (IS_DEV) debug.card(`Registered ${heroSuperMinions.length} super minion cards.`);
}
