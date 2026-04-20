/**
 * useKingDivineCommandDisplay Hook
 * 
 * React hook for accessing king Divine Command display information.
 * Provides memoized display data for use in UI components.
 * 
 * Architecture: Hook layer - bridges UI components with utils layer.
 * Pattern: TSX → Hook → Store → Utils
 */

import { useMemo } from 'react';
import { 
  getKingAbilityDisplayInfo, 
  isKingWithDivineCommand,
  KingAbilityDisplayInfo 
} from '../utils/chess/kingAbilityDisplayUtils';

interface UseKingDivineCommandDisplayResult {
  isKingWithAbility: boolean;
  abilityInfo: KingAbilityDisplayInfo | null;
}

/**
 * Hook to get Divine Command display info for a hero
 * Returns null if hero is not a primordial king with abilities
 */
export function useKingDivineCommandDisplay(heroId: string | null | undefined): UseKingDivineCommandDisplayResult {
  const result = useMemo(() => {
    if (!heroId) {
      return {
        isKingWithAbility: false,
        abilityInfo: null
      };
    }
    
    const hasAbility = isKingWithDivineCommand(heroId);
    
    if (!hasAbility) {
      return {
        isKingWithAbility: false,
        abilityInfo: null
      };
    }
    
    return {
      isKingWithAbility: true,
      abilityInfo: getKingAbilityDisplayInfo(heroId)
    };
  }, [heroId]);
  
  return result;
}
