import { useMemo, useCallback } from 'react';
import { useUnifiedCombatStore } from '../../stores/unifiedCombatStore';
import { getElementColor, getElementIcon, type ElementType } from '../../utils/elements';
import type { ElementalBuffNotification } from '../../stores/combat/types';

export interface ElementalBuffState {
  playerHasAdvantage: boolean;
  opponentHasAdvantage: boolean;
  playerBuff: {
    attackBonus: number;
    healthBonus: number;
    armorBonus: number;
    element: ElementType;
    color: string;
    icon: string;
  } | null;
  opponentBuff: {
    attackBonus: number;
    healthBonus: number;
    armorBonus: number;
    element: ElementType;
    color: string;
    icon: string;
  } | null;
  pendingMinionBuff: ElementalBuffNotification | null;
  clearMinionBuffNotification: () => void;
}

export const useElementalBuff = (): ElementalBuffState => {
  const pokerCombatState = useUnifiedCombatStore((state) => state.pokerCombatState);
  const pendingMinionBuff = useUnifiedCombatStore((state) => state.pendingElementalBuffNotification);
  const clearNotification = useUnifiedCombatStore((state) => state.clearElementalBuffNotification);
  const player = pokerCombatState?.player;
  const opponent = pokerCombatState?.opponent;

  const clearMinionBuffNotification = useCallback(() => {
    clearNotification();
  }, [clearNotification]);

  const buffState = useMemo(() => {
    const playerElement = (player?.pet?.stats?.element || 'neutral') as ElementType;
    const opponentElement = (opponent?.pet?.stats?.element || 'neutral') as ElementType;
    
    const playerHasAdvantage = player?.elementBuff?.hasAdvantage ?? false;
    const opponentHasAdvantage = opponent?.elementBuff?.hasAdvantage ?? false;

    return {
      playerHasAdvantage,
      opponentHasAdvantage,
      playerBuff: playerHasAdvantage ? {
        attackBonus: player?.elementBuff?.attackBonus ?? 0,
        healthBonus: player?.elementBuff?.healthBonus ?? 0,
        armorBonus: player?.elementBuff?.armorBonus ?? 0,
        element: playerElement,
        color: getElementColor(playerElement),
        icon: getElementIcon(playerElement)
      } : null,
      opponentBuff: opponentHasAdvantage ? {
        attackBonus: opponent?.elementBuff?.attackBonus ?? 0,
        healthBonus: opponent?.elementBuff?.healthBonus ?? 0,
        armorBonus: opponent?.elementBuff?.armorBonus ?? 0,
        element: opponentElement,
        color: getElementColor(opponentElement),
        icon: getElementIcon(opponentElement)
      } : null
    };
  }, [player, opponent]);

  return {
    ...buffState,
    pendingMinionBuff,
    clearMinionBuffNotification
  };
};
