import { describe, expect, it } from 'vitest';
import { canPlayHandCard } from './handFanPlayability';

const playableInput = {
  isPlayerTurn: true,
  isInteractionDisabled: false,
  boardFull: false,
  meetsPetEvolution: true,
  isBloodMode: false,
  canAffordMana: true,
  canAffordBlood: false,
};

describe('canPlayHandCard', () => {
  it('does not mark a card playable from blood affordability unless blood mode is active', () => {
    expect(canPlayHandCard({
      ...playableInput,
      canAffordMana: false,
      canAffordBlood: true,
      isBloodMode: false,
    })).toBe(false);
  });

  it('allows blood payment when blood mode is active and health can pay the price', () => {
    expect(canPlayHandCard({
      ...playableInput,
      canAffordMana: false,
      canAffordBlood: true,
      isBloodMode: true,
    })).toBe(true);
  });

  it('allows normal mana payment when the card is affordable by mana', () => {
    expect(canPlayHandCard(playableInput)).toBe(true);
  });
});
