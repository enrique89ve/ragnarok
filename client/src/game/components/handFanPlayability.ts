export interface HandFanPlayabilityInput {
  readonly isPlayerTurn: boolean;
  readonly isInteractionDisabled: boolean;
  readonly isPlayWindowOpen: boolean;
  readonly boardFull: boolean;
  readonly meetsPetEvolution: boolean;
  readonly isBloodMode: boolean;
  readonly canAffordMana: boolean;
  readonly canAffordBlood: boolean;
}

export function canPlayHandCard(input: HandFanPlayabilityInput): boolean {
  if (
    !input.isPlayWindowOpen
    || !input.isPlayerTurn
    || input.isInteractionDisabled
    || input.boardFull
    || !input.meetsPetEvolution
  ) {
    return false;
  }

  return input.isBloodMode ? input.canAffordBlood : input.canAffordMana;
}

export function getHandCardAriaLabel(input: {
  readonly cardName: string;
  readonly manaCost: number;
  readonly canPlay: boolean;
  readonly isPlayWindowOpen: boolean;
}): string {
  const details = `${input.cardName}, ${input.manaCost} mana. Enter for details.`;
  if (input.canPlay) {
    return `${details} Space to play.`;
  }
  if (!input.isPlayWindowOpen) {
    return `${details} Play during your poker decision.`;
  }
  return `${details} Not currently playable.`;
}
