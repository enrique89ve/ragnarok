import { useState, useCallback, useRef, useEffect } from 'react';
import { playSound } from '../../utils/soundUtils';
import { CombatEventBus, type ImpactPhaseEvent } from '../../services/CombatEventBus';
import {
	presentationTargetForCombatant,
} from '@/game/effects/presentation/CombatPresentation';
import { targetEntityId } from '@/game/effects/presentation/EffectTargetResolver';

const CANONICAL_DAMAGE_CLAIM_TTL_MS = 2_000;

type CanonicalDamageClaim = {
	readonly amount: number;
	readonly expiresAt: number;
};

function canonicalTargetIdForImpact(event: ImpactPhaseEvent): string | null {
	const resolved = event.resolvedAttack;
	if (!resolved) return event.targetId;

	return targetEntityId(presentationTargetForCombatant(
		resolved.targetType,
		resolved.targetId,
		resolved.attackerSide === 'player' ? 'opponent' : 'player',
	));
}

export interface DamageAnimation {
	id: string;
	damage: number;
	targetId: string;
	x: number;
	y: number;
	timestamp: number;
	isHeal?: boolean;
}

export interface HealthSnapshot {
	playerHeroHealth: number;
	playerHeroArmor: number;
	opponentHeroHealth: number;
	opponentHeroArmor: number;
	playerMinions: Map<string, number>;
	opponentMinions: Map<string, number>;
}

export function useDamageAnimations() {
	const [damageAnimations, setDamageAnimations] = useState<DamageAnimation[]>([]);
	const [shakingTargets, setShakingTargets] = useState<Set<string>>(new Set());
	const shakeTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
	const prevHealthRef = useRef<HealthSnapshot | null>(null);
	const canonicalDamageClaimsRef = useRef<Map<string, CanonicalDamageClaim[]>>(new Map());

	useEffect(() => {
		const claims = canonicalDamageClaimsRef.current;
		const addClaim = (targetId: string, amount: number) => {
			if (amount <= 0) return;
			const now = Date.now();
			const pending = (claims.get(targetId) ?? []).filter(claim => claim.expiresAt > now);
			pending.push({ amount, expiresAt: now + CANONICAL_DAMAGE_CLAIM_TTL_MS });
			claims.set(targetId, pending);
		};

		const unsubscribe = CombatEventBus.subscribe<ImpactPhaseEvent>('IMPACT_PHASE', event => {
			const resolved = event.resolvedAttack;
			if (!resolved) return;
			const targetId = canonicalTargetIdForImpact(event);
			if (targetId) addClaim(targetId, resolved.healthDamageToTarget);
			if (resolved.counterAttackOccurred) {
				addClaim(event.attackerId, resolved.healthDamageToAttacker);
			}
		});

		return () => {
			unsubscribe();
			claims.clear();
		};
	}, []);

	useEffect(() => {
		const timers = shakeTimersRef.current;
		return () => {
			timers.forEach(t => clearTimeout(t));
			timers.clear();
		};
	}, []);

	const triggerDamageAnimation = useCallback((targetId: string, damage: number, x: number, y: number, isHeal = false, showNumber = true) => {
		if (showNumber) {
			const animId = `dmg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			setDamageAnimations(prev => [...prev, { id: animId, damage, targetId, x, y, timestamp: Date.now(), isHeal }]);
		}
		const isHeroTarget = targetId === 'player-hero' || targetId === 'opponent-hero';
		if (!isHeal) {
			if (isHeroTarget && showNumber) {
				setShakingTargets(prev => new Set(prev).add(targetId));
				const t = setTimeout(() => {
					shakeTimersRef.current.delete(t);
					setShakingTargets(prev => {
						const next = new Set(prev);
						next.delete(targetId);
						return next;
					});
				}, 300);
				shakeTimersRef.current.add(t);
				playSound('damage');
			}
		} else if (isHeroTarget) {
			playSound('heal');
		}
	}, []);

	const consumeCanonicalDamageClaim = useCallback((targetId: string, amount: number): boolean => {
		const now = Date.now();
		const pending = (canonicalDamageClaimsRef.current.get(targetId) ?? [])
			.filter(claim => claim.expiresAt > now);
		const claimIndex = pending.findIndex(claim => claim.amount === amount);
		if (claimIndex < 0) {
			if (pending.length > 0) canonicalDamageClaimsRef.current.set(targetId, pending);
			else canonicalDamageClaimsRef.current.delete(targetId);
			return false;
		}
		pending.splice(claimIndex, 1);
		if (pending.length > 0) canonicalDamageClaimsRef.current.set(targetId, pending);
		else canonicalDamageClaimsRef.current.delete(targetId);
		return true;
	}, []);

	const removeDamageAnimation = useCallback((id: string) => {
		setDamageAnimations(prev => prev.filter(a => a.id !== id));
	}, []);

	const addShakingTarget = useCallback((targetId: string, duration = 500) => {
		setShakingTargets(prev => new Set(prev).add(targetId));
		const t = setTimeout(() => { shakeTimersRef.current.delete(t); setShakingTargets(prev => { const n = new Set(prev); n.delete(targetId); return n; }); }, duration);
		shakeTimersRef.current.add(t);
	}, []);

	return {
		damageAnimations,
		shakingTargets,
		prevHealthRef,
		triggerDamageAnimation,
		consumeCanonicalDamageClaim,
		removeDamageAnimation,
		addShakingTarget,
	};
}
