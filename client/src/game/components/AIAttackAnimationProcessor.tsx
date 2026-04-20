import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAIAttackAnimationStore, AIAttackEvent } from '../stores/aiAttackAnimationStore';
import { useGameStore } from '../stores/gameStore';
import { applyDamageToState, CombatStep } from '../services/AttackResolutionService';
import { CombatEventBus } from '../services/CombatEventBus';
import { playHeroAttackFX } from '../animations/HeroAttackFX';
import gsap from 'gsap';
import { debug } from '../config/debugConfig';
import './AIAttackAnimation.css';

interface AnimationState {
  attackerPos: { x: number; y: number } | null;
  targetPos: { x: number; y: number } | null;
  phase: 'idle' | 'charging' | 'impact' | 'returning';
}

const AIAttackAnimationProcessor: React.FC = () => {
  const pendingAttacks = useAIAttackAnimationStore(state => state.pendingAttacks);
  const isAnimating = useAIAttackAnimationStore(state => state.isAnimating);
  const startAnimation = useAIAttackAnimationStore(state => state.startAnimation);
  const completeAnimation = useAIAttackAnimationStore(state => state.completeAnimation);
  const markDamageApplied = useAIAttackAnimationStore(state => state.markDamageApplied);
  const deferDamage = useAIAttackAnimationStore(state => state.deferDamage);
  
  // Debug: Log component render with store state on every render
  debug.animation(`[AI-ATTACK-ANIM-PROC] Component render - pendingAttacks: ${pendingAttacks.length}, isAnimating: ${isAnimating}`);
  
  // Debug: Track pendingAttacks changes
  useEffect(() => {
    debug.animation(`[AI-ATTACK-ANIM-PROC] pendingAttacks changed - count: ${pendingAttacks.length}`);
    if (pendingAttacks.length > 0) {
      debug.animation(`[AI-ATTACK-ANIM-PROC] Pending attack details:`, pendingAttacks.map(a => `${a.attackerName} -> ${a.targetName}`));
    }
  }, [pendingAttacks]);
  
  const [animState, setAnimState] = useState<AnimationState>({
    attackerPos: null,
    targetPos: null,
    phase: 'idle'
  });
  const [displayEvent, setDisplayEvent] = useState<AIAttackEvent | null>(null);
  
  const applyDamageFromEvent = useCallback((event: AIAttackEvent) => {
    const currentDeferDamage = useAIAttackAnimationStore.getState().deferDamage;
    debug.animation(`[AI-ATTACK-ANIM] applyDamageFromEvent called: deferDamage=${currentDeferDamage}, damageApplied=${event.damageApplied}`);
    
    if (!currentDeferDamage) {
      debug.animation(`[AI-ATTACK-ANIM] Skipping - damage not deferred (legacy mode)`);
      markDamageApplied();
      return;
    }
    
    if (event.damageApplied) {
      debug.animation(`[AI-ATTACK-ANIM] Skipping - damage already applied for: ${event.attackerName}`);
      markDamageApplied();
      return;
    }
    
    debug.animation(`[AI-ATTACK-ANIM] Applying real-time damage: ${event.attackerName} -> ${event.targetName} (${event.damage} dmg)`);
    
    // PROFESSIONAL EVENT-DRIVEN DAMAGE: Emit IMPACT_PHASE event for AI attacks
    // This ensures poker HP syncs for AI attacks just like player attacks
    // Hero targetId uses consistent format: 'player-hero' or 'opponent-hero'
    // Minion targetId uses the actual instanceId from the event
    const isHeroTarget = event.targetType === 'hero';
    let targetId: string | null = null;
    
    if (isHeroTarget) {
      // AI-initiated attacks (attackerSide='opponent') target the player hero
      // Player-initiated attacks (attackerSide='player') target the opponent hero
      targetId = event.attackerSide === 'opponent' ? 'player-hero' : 'opponent-hero';
    } else if (event.targetId) {
      // For minion attacks, use the actual instanceId
      targetId = event.targetId;
    }
    
    // Emit event only if we have a valid targetId
    if (targetId) {
      CombatEventBus.emitImpactPhase({
        attackerId: event.attackerId,
        targetId: targetId,
        damageToTarget: event.damage,
        damageToAttacker: event.counterDamage
      });
      debug.animation(`[AI-ATTACK-ANIM] Emitted IMPACT_PHASE: ${event.attackerId} -> ${targetId} (${event.damage} dmg)`);
    } else {
      debug.warn(`[AI-ATTACK-ANIM] Skipping IMPACT_PHASE: missing targetId for minion attack (damage still applied)`);
    }
    
    const step: CombatStep = {
      id: event.combatStepId,
      attackerId: event.attackerId,
      attackerName: event.attackerName,
      attackerAttack: event.damage,
      targetId: event.targetId,
      targetName: event.targetName,
      targetType: event.targetType,
      targetAttack: event.counterDamage,
      damage: event.damage,
      counterDamage: event.counterDamage,
      attackerHasDivineShield: event.attackerHasDivineShield,
      defenderHasDivineShield: event.defenderHasDivineShield,
      resolved: false,
      timestamp: event.timestamp,
      attackerSide: event.attackerSide
    };
    
    const currentGameState = useGameStore.getState().gameState;
    const newState = applyDamageToState(currentGameState, step);
    useGameStore.getState().setGameState(newState);
    markDamageApplied();
  }, [markDamageApplied]);

  const getCardElement = useCallback((instanceId: string): HTMLElement | null => {
    return document.querySelector(`[data-instance-id="${instanceId}"]`);
  }, []);

  const getHeroElement = (hero: 'player' | 'opponent'): HTMLElement | null => {
    return document.querySelector(`.${hero}-hero-zone, .battlefield-hero-square.${hero}`);
  };

  const fxTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const fallbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    debug.animation(`[AI-ATTACK-ANIM-PROC] useEffect triggered: pendingAttacks=${pendingAttacks.length}, isAnimating=${isAnimating}`);
    if (pendingAttacks.length > 0 && !isAnimating) {
      const event = startAnimation();
      debug.animation(`[AI-ATTACK-ANIM-PROC] Starting animation event:`, event?.attackerName, '->', event?.targetName);
      if (event) {
        setDisplayEvent(event);

        // Use GSAP+Pixi FX for hero attacks
        const attackerEl = getCardElement(event.attackerId);
        const targetHero = event.targetType === 'hero'
          ? (event.attackerSide === 'opponent' ? 'player' : 'opponent')
          : null;
        const targetEl = targetHero ? getHeroElement(targetHero) : null;

        if (attackerEl && targetEl && event.targetType === 'hero') {
          setAnimState({ attackerPos: null, targetPos: null, phase: 'charging' });
          fxTimelineRef.current = playHeroAttackFX({
            attackerEl,
            targetEl,
            damage: event.damage,
            element: 'neutral',
            onImpact: () => {
              setAnimState(prev => ({ ...prev, phase: 'impact' }));
              applyDamageFromEvent(event);
            },
            onComplete: () => {
              setAnimState({ attackerPos: null, targetPos: null, phase: 'idle' });
              setDisplayEvent(null);
              fxTimelineRef.current = null;
              completeAnimation();
            }
          });
          return;
        }

        // GSAP directional lunge for minion-to-minion (or fallback hero) attacks
        const minionAttackerEl = getCardElement(event.attackerId);
        let minionTargetEl: HTMLElement | null = null;
        if (event.targetType === 'hero') {
          minionTargetEl = getHeroElement(event.attackerSide === 'opponent' ? 'player' : 'opponent');
        } else if (event.targetId) {
          minionTargetEl = getCardElement(event.targetId);
        }

        if (minionAttackerEl && minionTargetEl) {
          const aRect = minionAttackerEl.getBoundingClientRect();
          const tRect = minionTargetEl.getBoundingClientRect();
          const dx = (tRect.left + tRect.width / 2) - (aRect.left + aRect.width / 2);
          const dy = (tRect.top + tRect.height / 2) - (aRect.top + aRect.height / 2);
          const lungePercent = event.targetType === 'hero' ? 0.3 : 0.55;

          setAnimState({ attackerPos: null, targetPos: null, phase: 'charging' });

          const tl = gsap.timeline();
          tl.to(minionAttackerEl, { y: dy > 0 ? 6 : -6, scale: 1.08, duration: 0.12, ease: 'power2.in' })
            .to(minionAttackerEl, { x: dx * lungePercent, y: dy * lungePercent, scale: 1.05, duration: 0.18, ease: 'power2.out' })
            .call(() => {
              setAnimState(prev => ({ ...prev, phase: 'impact' }));
              applyDamageFromEvent(event);
            })
            .to(minionAttackerEl, { duration: 0.08 })
            .to(minionAttackerEl, { x: 0, y: 0, scale: 1, duration: 0.22, ease: 'power2.inOut' })
            .call(() => {
              setAnimState({ attackerPos: null, targetPos: null, phase: 'idle' });
              setDisplayEvent(null);
              completeAnimation();
            });
          fxTimelineRef.current = tl;
        } else {
          const t1 = setTimeout(() => {
            applyDamageFromEvent(event);
          }, 300);
          const t2 = setTimeout(() => {
            setDisplayEvent(null);
            completeAnimation();
          }, 1500);
          fallbackTimersRef.current.push(t1, t2);
        }
      }
    }

    return () => {
      fallbackTimersRef.current.forEach(clearTimeout);
      fallbackTimersRef.current = [];
      if (fxTimelineRef.current) {
        fxTimelineRef.current.kill();
        fxTimelineRef.current = null;
      }
    };
  }, [pendingAttacks.length, isAnimating, startAnimation, completeAnimation, getCardElement, applyDamageFromEvent]);

  // GSAP handles all animations via direct DOM manipulation — no visual overlay needed
  return null;
};

export default AIAttackAnimationProcessor;
