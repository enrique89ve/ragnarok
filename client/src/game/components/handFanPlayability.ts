export interface HandFanPlayabilityInput {
  readonly isPlayerTurn: boolean;
  readonly isInteractionDisabled: boolean;
  readonly boardFull: boolean;
  readonly meetsPetEvolution: boolean;
  readonly isBloodMode: boolean;
  readonly canAffordMana: boolean;
  readonly canAffordBlood: boolean;
}

export function canPlayHandCard(input: HandFanPlayabilityInput): boolean {
  if (!input.isPlayerTurn || input.isInteractionDisabled || input.boardFull || !input.meetsPetEvolution) {
    return false;
  }

  return input.isBloodMode ? input.canAffordBlood : input.canAffordMana;
}
