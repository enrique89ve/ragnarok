/**
 * Local/Off-chain Data Types
 * 
 * These schemas define data that stays local (not on Hive blockchain).
 * Includes combat state, UI preferences, and temporary session data.
 */

export interface LocalCombatState {
  sessionId: string;
  phase: 'setup' | 'combat' | 'poker' | 'resolution' | 'ended';
  currentTurn: 'player' | 'opponent';
  turnNumber: number;
  playerHand: LocalCardInHand[];
  opponentHandSize: number;
  boardState: LocalBoardState;
  pokerState: LocalPokerState | null;
  animationQueue: string[];
  lastActionTimestamp: number;
}

export interface LocalCardInHand {
  instanceId: string;
  cardId: number;
  canPlay: boolean;
  isHighlighted: boolean;
}

export interface LocalBoardState {
  playerMinions: LocalMinionState[];
  opponentMinions: LocalMinionState[];
  playerHero: LocalHeroState;
  opponentHero: LocalHeroState;
}

export interface LocalMinionState {
  instanceId: string;
  cardId: number;
  attack: number;
  health: number;
  maxHealth: number;
  canAttack: boolean;
  statusEffects: string[];
  position: number;
}

export interface LocalHeroState {
  heroId: string;
  currentHp: number;
  maxHp: number;
  armor: number;
  attack: number;
  mana: number;
  maxMana: number;
  heroPowerUsed: boolean;
  weaponEquipped: boolean;
}

export interface LocalPokerState {
  phase: 'FAITH' | 'FORESIGHT' | 'DESTINY' | 'SHOWDOWN';
  pot: number;
  playerHoleCards: string[];
  communityCards: string[];
  playerBet: number;
  opponentBet: number;
  currentBetToMatch: number;
  isPlayerTurn: boolean;
}

export interface LocalUIPreferences {
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  animationSpeed: 'slow' | 'normal' | 'fast';
  autoEndTurn: boolean;
  showDamageNumbers: boolean;
  cardBackStyle: string;
  themePreference: 'norse' | 'greek' | 'egyptian' | 'japanese' | 'auto';
}

export interface LocalDeckDraft {
  draftId: string;
  heroId: string;
  heroClass: string;
  cardIds: number[];
  lastModified: number;
  isComplete: boolean;
}

export interface LocalSessionData {
  sessionId: string;
  startTime: number;
  currentScreen: string;
  combatState: LocalCombatState | null;
  deckDrafts: LocalDeckDraft[];
  uiPreferences: LocalUIPreferences;
}

export const DEFAULT_UI_PREFERENCES: LocalUIPreferences = {
  soundEnabled: true,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  animationSpeed: 'normal',
  autoEndTurn: false,
  showDamageNumbers: true,
  cardBackStyle: 'norse-runes',
  themePreference: 'auto',
};
