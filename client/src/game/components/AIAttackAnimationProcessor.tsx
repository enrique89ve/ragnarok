import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAIAttackAnimationStore, AIAttackEvent } from '../stores/aiAttackAnimationStore';
import {
  createAIAttackResolutionStoreDeps,
  resolveAIAttackEvent
} from '../combat/aiAttackResolution';
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

  // Debug: Log component render with store state on every render
  debug.animation(`[AI-ATTACK-ANIM-PROC] Component render - pendingAttacks: ${pendingAttacks.length}, isAnimating: ${isAnimating}`);
  
  // Debug: Track pendingAttacks changes
  useEffect(() => {
    debug.animation(`[AI-ATTACK-ANIM-PROC] pendingAttacks changed - count: ${pendingAttacks.length}`);
    if (pendingAttacks.length > 0) {
      debug.animation(`[AI-ATTACK-ANIM-PROC] Pending attack details:`, pendingAttacks.map(a => `${a.attackerName} -> ${a.targetName}`));
    }
  }, [pendingAttacks]);
  
  const [, setAnimState] = useState<AnimationState>({
    attackerPos: null,
    targetPos: null,
    phase: 'idle'
  });
  const [, setDisplayEvent] = useState<AIAttackEvent | null>(null);
  const resolvedAttackIdsRef = useRef<Set<string>>(new Set());

  const getCardElement = useCallback((instanceId: string): HTMLElement | null => {
    return document.querySelector(`[data-instance-id="${instanceId}"]`);
  }, []);

  const getHeroElement = useCallback((hero: 'player' | 'opponent'): HTMLElement | null => {
    return document.querySelector(`.${hero}-hero-zone, .battlefield-hero-square.${hero}`);
  }, []);

  const fxTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const fallbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearFallbackTimers = useCallback(() => {
    fallbackTimersRef.current.forEach(clearTimeout);
    fallbackTimersRef.current = [];
  }, []);

  const killActiveTimeline = useCallback(() => {
    if (fxTimelineRef.current) {
      fxTimelineRef.current.kill();
      fxTimelineRef.current = null;
    }
  }, []);

  const completeVisualAnimation = useCallback(() => {
    clearFallbackTimers();
    setAnimState({ attackerPos: null, targetPos: null, phase: 'idle' });
    setDisplayEvent(null);
    fxTimelineRef.current = null;
    completeAnimation();
  }, [clearFallbackTimers, completeAnimation]);

  const resolveStartedAttack = useCallback((event: AIAttackEvent) => {
    resolveAIAttackEvent(
      event,
      createAIAttackResolutionStoreDeps({
        hasDamageBeenApplied: (attackEvent) => resolvedAttackIdsRef.current.has(attackEvent.id),
        onDamageApplied: (attackEvent) => {
          resolvedAttackIdsRef.current.add(attackEvent.id);
        }
      })
    );
  }, []);

  useEffect(() => {
    return () => {
      clearFallbackTimers();
      killActiveTimeline();
    };
  }, [clearFallbackTimers, killActiveTimeline]);

  useEffect(() => {
    debug.animation(`[AI-ATTACK-ANIM-PROC] useEffect triggered: pendingAttacks=${pendingAttacks.length}, isAnimating=${isAnimating}`);
    if (pendingAttacks.length > 0 && !isAnimating) {
      const event = startAnimation();
      debug.animation(`[AI-ATTACK-ANIM-PROC] Starting animation event:`, event?.attackerName, '->', event?.targetName);
      if (event) {
        clearFallbackTimers();
        killActiveTimeline();
        setDisplayEvent(event);
        resolveStartedAttack(event);

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
            },
            onComplete: () => {
              completeVisualAnimation();
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
            })
            .to(minionAttackerEl, { duration: 0.08 })
            .to(minionAttackerEl, { x: 0, y: 0, scale: 1, duration: 0.22, ease: 'power2.inOut' })
            .call(() => {
              completeVisualAnimation();
            });
          fxTimelineRef.current = tl;
        } else {
          const t1 = setTimeout(() => {
            setAnimState(prev => ({ ...prev, phase: 'impact' }));
          }, 300);
          const t2 = setTimeout(() => {
            completeVisualAnimation();
          }, 1500);
          fallbackTimersRef.current.push(t1, t2);
        }
      }
    }
  }, [
    pendingAttacks.length,
    isAnimating,
    startAnimation,
    getCardElement,
    getHeroElement,
    clearFallbackTimers,
    killActiveTimeline,
    completeVisualAnimation,
    resolveStartedAttack
  ]);

  // GSAP handles all animations via direct DOM manipulation — no visual overlay needed
  return null;
};

export default AIAttackAnimationProcessor;
