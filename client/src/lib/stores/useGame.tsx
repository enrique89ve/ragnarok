import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { HeroClass, DeckInfo } from "../../game/types";
import { getDefaultHeroPower } from "../../game/data/heroes";
import { debug } from "../../game/config/debugConfig";

export type GamePhase = "setup" | "ready" | "playing" | "ended";
export type SetupStage = "hero_selection" | "deck_building";

interface GameState {
  // Game state
  phase: GamePhase;
  setupStage: SetupStage;
  selectedHero: HeroClass | null;
  selectedHeroId: string | null;
  selectedDeck: string | null;
  savedDecks: DeckInfo[];
  
  // Actions
  setSelectedHero: (hero: HeroClass, heroId?: string) => void;
  setSelectedDeck: (deckId: string) => void;
  startGame: () => void;
  restartGame: () => void;
  endGame: () => void;
  saveDecks: (decks: DeckInfo[]) => void;
  saveDeck: (deck: DeckInfo) => void;
  resetToSetup: () => void;
}

const useGame = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    phase: "setup",
    setupStage: "hero_selection",
    selectedHero: null,
    selectedHeroId: null,
    selectedDeck: null,
    savedDecks: [],
    
    // Set the selected hero
    setSelectedHero: (hero: HeroClass, heroId?: string) => {
      set({
        selectedHero: hero,
        selectedHeroId: heroId || null,
        setupStage: "deck_building"
      });
    },
    
    // Set the selected deck
    setSelectedDeck: (deckId: string) => {
      set({
        selectedDeck: deckId
      });
    },
    
    // Start the game with selected hero and deck
    startGame: () => {
      const { selectedHero, selectedDeck } = get();
      
      // Validate we have everything needed to start
      if (!selectedHero) {
        debug.error("Cannot start game: No hero selected");
        return;
      }
      
      set({
        phase: "playing"
      });
      
      // Initialize the game state with the selected hero and deck
      // The actual game initialization happens in the GameBoard component
    },
    
    // Restart the game (back to setup)
    restartGame: () => {
      set({
        phase: "setup",
        setupStage: "hero_selection",
      });
    },
    
    // End the current game
    endGame: () => {
      set({
        phase: "ended"
      });
    },
    
    // Reset to setup phase
    resetToSetup: () => {
      set({
        phase: "setup",
        setupStage: "hero_selection",
        selectedHero: null,
        selectedDeck: null
      });
    },
    
    // Save all decks (replace)
    saveDecks: (decks: DeckInfo[]) => {
      set({
        savedDecks: decks
      });
      
      // In a real app, we'd save this to localStorage or a backend
      try {
        localStorage.setItem('ragnarok_decks', JSON.stringify(decks));
      } catch (e) {
        debug.error("Failed to save decks to localStorage", e);
      }
    },
    
    // Save a single deck (add or update)
    saveDeck: (deck: DeckInfo) => {
      const { savedDecks } = get();
      
      // Check if this deck already exists
      const existingIndex = savedDecks.findIndex(d => d.id === deck.id);
      
      let updatedDecks;
      if (existingIndex >= 0) {
        // Update existing deck
        updatedDecks = [...savedDecks];
        updatedDecks[existingIndex] = deck;
      } else {
        // Add new deck
        updatedDecks = [...savedDecks, deck];
      }
      
      set({
        savedDecks: updatedDecks
      });
      
      // Save to localStorage
      try {
        localStorage.setItem('ragnarok_decks', JSON.stringify(updatedDecks));
      } catch (e) {
        debug.error("Failed to save decks to localStorage", e);
      }
    }
  }))
);

// Initialize with saved decks from localStorage if available
try {
  const savedDecks = localStorage.getItem('ragnarok_decks');
  if (savedDecks) {
    // Parse the saved decks
    let decks: DeckInfo[] = [];
    try {
      const parsedDecks = JSON.parse(savedDecks);
      
      // Ensure we have an array
      if (Array.isArray(parsedDecks)) {
        // Validate each deck has the required properties
        decks = parsedDecks.filter(deck => {
          if (!deck || typeof deck !== 'object') {
            debug.warn('Invalid deck found, removing:', deck);
            return false;
          }
          
          // Validate required fields
          if (!deck.id || !deck.name || !deck.class || !deck.cards || typeof deck.cards !== 'object') {
            debug.warn('Deck missing required fields, removing:', deck);
            return false;
          }
          
          return true;
        });
      } else {
        debug.warn('Saved decks is not an array, resetting');
      }
    } catch (parseError) {
      debug.error("Failed to parse saved decks:", parseError);
    }
    
    // Save the validated decks
    useGame.getState().saveDecks(decks);
  }
} catch (e) {
  debug.error("Failed to load decks from localStorage", e);
  // Clear potentially corrupted data
  localStorage.removeItem('ragnarok_decks');
}

export default useGame;
