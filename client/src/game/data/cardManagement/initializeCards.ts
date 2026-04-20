/**
 * Card Initialization Module
 * 
 * This module initializes the card database when the game starts.
 * It registers cards from all sets and makes them available through the card registry.
 */
import { getCardCount } from './cardRegistry';
import { debug } from '../../config/debugConfig';
import { registerBasicMageCards } from '../cardSets/basicMageCards';
import { registerMageCards } from '../cardSets/mageCards';
import { registerNorseMythologyCards } from '../cardSets/norseMythologyCards';
import { registerHunterCards } from '../cardSets/hunterCards';
import { registerPaladinCards } from '../cardSets/paladinCards';
import { registerRogueCards } from '../cardSets/rogueCards';
import { registerWarlockCards } from '../cardSets/warlockCards';
import { registerDruidCards } from '../cardSets/druidCards';
import { registerPriestCards } from '../cardSets/priestCards';
import { registerShamanCards } from '../cardSets/shamanCards';
import { registerWarriorCards } from '../cardSets/warriorCards';
import { registerDeathKnightCards } from '../cardSets/deathknightCards';
import { registerBerserkerCards } from '../cardSets/berserkerCards';
import { registerNecromancerCards } from '../cardSets/necromancerCards';
import { registerSuperMinionCards } from '../cardSets/superMinionCards';

// Import other card sets as they are created
// import { registerAllCardSets } from '../cardSets';

// Flag to track if database has been initialized
let isInitialized = false;

/**
 * Initialize the card database
 * 
 * This function should be called during game startup to register all cards.
 * It's safe to call multiple times - it will only initialize once.
 */
export function initializeCardDatabase(): void {
  // Skip if already initialized
  if (isInitialized) {
    debug.log('Card database already initialized.');
    return;
  }
  
  debug.log('Initializing card database...');
  
  // Register cards from individual sets
  registerBasicMageCards();
  registerMageCards();
  registerNorseMythologyCards();
  registerHunterCards();
  registerPaladinCards();
  registerRogueCards();
  registerWarlockCards();
  registerDruidCards();
  registerPriestCards();
  registerShamanCards();
  registerWarriorCards();
  registerDeathKnightCards();
  registerBerserkerCards();
  registerNecromancerCards();
  registerSuperMinionCards();
  
  // When the full card set index is available, use this instead:
  // registerAllCardSets();
  
  // Log the results
  const totalCards = getCardCount();
  debug.log(`Card database initialized with ${totalCards} cards.`);
  
  // Mark as initialized
  isInitialized = true;
}