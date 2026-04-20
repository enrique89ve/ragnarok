import { hasElementAdvantage, type ElementType } from '../elements/elementAdvantage';

export type MatchupGlow = 'advantage' | 'disadvantage' | 'mutual' | null;

export interface MatchupGlowMap {
  [pieceId: string]: MatchupGlow;
}

export function computeMatchupGlows(
  selectedElement: ElementType | undefined,
  pieces: Array<{ id: string; element: ElementType; owner: string }>,
  selectedOwner: string
): MatchupGlowMap {
  const map: MatchupGlowMap = {};

  if (!selectedElement || selectedElement === 'neutral') {
    return map;
  }

  for (const piece of pieces) {
    if (piece.owner === selectedOwner) continue;
    if (!piece.element || piece.element === 'neutral') continue;

    const weAreStrong = hasElementAdvantage(selectedElement, piece.element);
    const theyAreStrong = hasElementAdvantage(piece.element, selectedElement);

    if (weAreStrong && theyAreStrong) {
      map[piece.id] = 'mutual';
    } else if (weAreStrong) {
      map[piece.id] = 'advantage';
    } else if (theyAreStrong) {
      map[piece.id] = 'disadvantage';
    }
  }

  return map;
}
