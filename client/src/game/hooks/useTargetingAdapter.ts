/**
 * Targeting Adapter Hook
 * 
 * Bridges legacy targetingStore with new unifiedUIStore.
 * Components import this instead of directly using either store.
 */

import { useTargetingStore } from '../stores/targetingStore';
import { useUnifiedUIStore } from '../stores/unifiedUIStore';

export interface TargetingAdapter {
  isTargeting: boolean;
  attackerId: string | null;
  validTargets: string[];
  hoveredTargetId: string | null;
  startTargeting: (sourceId: string, validTargets: string[]) => void;
  updateHoveredTarget: (targetId: string | null) => void;
  cancelTargeting: () => void;
  confirmTarget: () => { attackerId: string; targetId: string } | null;
}

export function useTargetingAdapter(): TargetingAdapter {
  const legacy = useTargetingStore();
  const unified = useUnifiedUIStore();

  return {
    isTargeting: unified.targeting.isTargeting,
    attackerId: unified.targeting.sourceId,
    validTargets: unified.targeting.validTargets,
    hoveredTargetId: unified.targeting.hoveredTargetId || null,
    startTargeting: (sourceId: string, validTargets: string[]) => {
      unified.startTargeting(sourceId, 'minion', validTargets, 'enemy');
      legacy.startTargeting(sourceId, validTargets);
    },
    updateHoveredTarget: (targetId: string | null) => {
      unified.setHoveredTarget(targetId);
      legacy.updateHoveredTarget(targetId);
    },
    cancelTargeting: () => {
      unified.cancelTargeting();
      legacy.cancelTargeting();
    },
    confirmTarget: () => {
      const sourceId = unified.targeting.sourceId;
      const targetId = unified.targeting.hoveredTargetId;
      if (!sourceId || !targetId) return null;
      
      const result = { attackerId: sourceId, targetId };
      unified.cancelTargeting();
      legacy.cancelTargeting();
      return result;
    },
  };
}
