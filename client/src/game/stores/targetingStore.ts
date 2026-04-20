import { create } from 'zustand';
import { debug } from '../config/debugConfig';

export interface CardPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface DamagePreview {
  targetId: string;
  damageToTarget: number;
  damageToAttacker: number;
  isLethalToTarget: boolean;
  isLethalToAttacker: boolean;
  targetCurrentHealth: number;
  attackerCurrentHealth: number;
}

interface TargetingState {
  isTargeting: boolean;
  attackerId: string | null;
  attackerPosition: CardPosition | null;
  hoveredTargetId: string | null;
  hoveredPosition: { x: number; y: number } | null;
  cardPositions: Map<string, CardPosition>;
  damagePreview: DamagePreview | null;
  validTargets: string[];
  
  startTargeting: (attackerId: string, validTargets: string[]) => void;
  updateHoveredTarget: (targetId: string | null, mousePos?: { x: number; y: number }) => void;
  setDamagePreview: (preview: DamagePreview | null) => void;
  registerCardPosition: (id: string, rect: DOMRect) => void;
  unregisterCardPosition: (id: string) => void;
  cancelTargeting: () => void;
  confirmTarget: () => { attackerId: string; targetId: string } | null;
  clearAllPositions: () => void;
}

export const useTargetingStore = create<TargetingState>((set, get) => ({
  isTargeting: false,
  attackerId: null,
  attackerPosition: null,
  hoveredTargetId: null,
  hoveredPosition: null,
  cardPositions: new Map(),
  damagePreview: null,
  validTargets: [],
  
  startTargeting: (attackerId, validTargets) => {
    const positions = get().cardPositions;
    const attackerPos = positions.get(attackerId) || null;
    
    debug.log(`[Targeting] Started targeting with attacker: ${attackerId}, valid targets:`, validTargets);
    
    set({
      isTargeting: true,
      attackerId,
      attackerPosition: attackerPos,
      validTargets,
      hoveredTargetId: null,
      damagePreview: null
    });
  },
  
  updateHoveredTarget: (targetId, mousePos) => {
    const { validTargets, cardPositions } = get();
    
    if (targetId && !validTargets.includes(targetId)) {
      return;
    }
    
    const targetPos = targetId ? cardPositions.get(targetId) : null;
    
    set({
      hoveredTargetId: targetId,
      hoveredPosition: mousePos || (targetPos ? { x: targetPos.centerX, y: targetPos.centerY } : null)
    });
  },
  
  setDamagePreview: (preview) => {
    set({ damagePreview: preview });
  },
  
  registerCardPosition: (id, rect) => {
    const positions = new Map(get().cardPositions);
    positions.set(id, {
      id,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2
    });
    
    set({ cardPositions: positions });
    
    const { attackerId } = get();
    if (attackerId === id) {
      set({ attackerPosition: positions.get(id) || null });
    }
  },
  
  unregisterCardPosition: (id) => {
    const positions = new Map(get().cardPositions);
    positions.delete(id);
    set({ cardPositions: positions });
  },
  
  cancelTargeting: () => {
    debug.log('[Targeting] Cancelled');
    set({
      isTargeting: false,
      attackerId: null,
      attackerPosition: null,
      hoveredTargetId: null,
      hoveredPosition: null,
      damagePreview: null,
      validTargets: []
    });
  },
  
  confirmTarget: () => {
    const { attackerId, hoveredTargetId } = get();
    
    if (!attackerId || !hoveredTargetId) {
      return null;
    }
    
    const result = { attackerId, targetId: hoveredTargetId };
    
    set({
      isTargeting: false,
      attackerId: null,
      attackerPosition: null,
      hoveredTargetId: null,
      hoveredPosition: null,
      damagePreview: null,
      validTargets: []
    });
    
    debug.log(`[Targeting] Confirmed attack: ${result.attackerId} -> ${result.targetId}`);
    return result;
  },
  
  clearAllPositions: () => {
    set({ cardPositions: new Map() });
  }
}));
