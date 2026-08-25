import { describe, expect, it } from 'vitest';
import { canPlayHandCard, getHandCardAriaLabel } from './handFanPlayability';

const playableInput = {
  isPlayerTurn: true,
  isInteractionDisabled: false,
  isPlayWindowOpen: true,
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

  it('never announces a card as playable outside Spellcraft', () => {
    expect(canPlayHandCard({ ...playableInput, isPlayWindowOpen: false })).toBe(false);
    expect(getHandCardAriaLabel({
      cardName: 'Shadowmaw',
      manaCost: 1,
      canPlay: false,
      isPlayWindowOpen: false,
    })).toBe('Shadowmaw, 1 mana. Enter for details. Play during Spellcraft.');
  });

  it('announces the Space action only when the card is actually playable', () => {
    expect(getHandCardAriaLabel({
      cardName: 'Shadowmaw',
      manaCost: 1,
      canPlay: true,
      isPlayWindowOpen: true,
    })).toContain('Space to play.');
    expect(getHandCardAriaLabel({
      cardName: 'Shadowmaw',
      manaCost: 1,
      canPlay: false,
      isPlayWindowOpen: true,
    })).not.toContain('Space to play.');
  });
});
