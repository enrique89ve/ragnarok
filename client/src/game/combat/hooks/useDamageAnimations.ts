import { useState, useCallback, useRef, useEffect } from 'react';
import { playSound } from '../../utils/soundUtils';
import { CombatEventBus, type DamageResolvedEvent, type HealResolvedEvent, type ImpactPhaseEvent } from '../../services/CombatEventBus';
import {
	presentationTargetForCombatant,
} from '@/game/effects/presentation/CombatPresentation';
import { targetEntityId } from '@/game/effects/presentation/EffectTargetResolver';
import { useSettingsStore } from '../../stores/settingsStore';
import {
	subscribeCombatDamageFloater,
	type CombatDamageFloaterRequest,
} from '../floaters/combatDamageFloater';
import { damageFloaterPositionForEntity } from '../floaters/damageFloaterPosition';

export interface DamageAnimation {
	id: string;
	damage: number;
	targetId: string;
	x: number;
	y: number;
	timestamp: number;
	isHeal?: boolean;
	variant?: 'combat' | 'showdown' | 'stake';
	coordinateSpace?: 'arena' | 'viewport';
}

const CANONICAL_DAMAGE_CLAIM_TTL_MS = 2_200;

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

export interface HealthSnapshot {
	playerHeroHealth: number;
	playerHeroArmor: number;
	opponentHeroHealth: number;
	opponentHeroArmor: number;
	playerMinions: Map<string, number>;
	opponentMinions: Map<string, number>;
}

function normalizeDamageTargetId(targetId: string, targetType: 'minion' | 'hero'): string {
	if (targetType === 'hero') {
		if (targetId === 'player' || targetId === 'opponent') {
			return `${targetId}-hero`;
		}
		return targetId;
	}
	return targetId;
}

export function useDamageAnimations() {
	const [damageAnimations, setDamageAnimations] = useState<DamageAnimation[]>([]);
	const [shakingTargets, setShakingTargets] = useState<Set<string>>(new Set());
	const shakeTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
	const prevHealthRef = useRef<HealthSnapshot | null>(null);
	const canonicalDamageClaimsRef = useRef<Map<string, CanonicalDamageClaim[]>>(new Map());
	const floaterTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
	const triggerDamageAnimationRef = useRef<(
		targetId: string,
		damage: number,
		x: number,
		y: number,
		isHeal?: boolean,
		showNumber?: boolean,
		animationId?: string,
		variant?: 'combat' | 'showdown' | 'stake',
		coordinateSpace?: 'arena' | 'viewport',
	) => void>(() => {});

	const triggerDamageAnimation = useCallback((
		targetId: string,
		damage: number,
		x: number,
		y: number,
		isHeal = false,
		showNumber = true,
		animationId?: string,
		variant: 'combat' | 'showdown' | 'stake' = 'combat',
		coordinateSpace: 'arena' | 'viewport' = 'arena',
	) => {
		if (showNumber) {
			const animId = animationId ?? `dmg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			setDamageAnimations(prev => [...prev, {
				id: animId,
				damage,
				targetId,
				x,
				y,
				timestamp: Date.now(),
				isHeal,
				variant,
				coordinateSpace,
			}]);
		}
		const isHeroTarget = targetId === 'player-hero' || targetId === 'opponent-hero';
		if (!isHeal) {
			if (variant === 'stake') {
				// Stake commits are economic, not combat hits — number only.
			} else if (isHeroTarget) {
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
				// Combat attacks and Showdown play their own impact SFX inside their
				// DAG nodes; only non-attack spell/effect DAMAGE_RESOLVED floaters
				// trigger fallback damage audio here.
				if (showNumber && animationId?.startsWith('damage-resolved:')) {
					playSound('damage');
				}
			}
		} else if (isHeroTarget) {
			playSound('heal');
		}
	}, []);

	triggerDamageAnimationRef.current = triggerDamageAnimation;

	const presentFloaterRequest = useCallback((request: CombatDamageFloaterRequest) => {
		const run = () => {
			const pos = request.x != null && request.y != null
				? { x: request.x, y: request.y }
				: damageFloaterPositionForEntity(request.targetId);
			if (!pos) return;
			const showNumber = useSettingsStore.getState().showDamageNumbers;
			triggerDamageAnimationRef.current(
				request.targetId,
				request.amount,
				pos.x,
				pos.y,
				request.isHeal,
				showNumber,
				request.id,
				request.variant ?? 'combat',
				request.coordinateSpace ?? (request.x != null ? 'viewport' : 'arena'),
			);
		};
		const delay = request.delayMs ?? 0;
		if (delay > 0) {
			const timer = setTimeout(run, delay);
			floaterTimersRef.current.add(timer);
			return;
		}
		run();
	}, []);

	useEffect(() => {
		const claims = canonicalDamageClaimsRef.current;
		const addClaim = (targetId: string, amount: number) => {
			if (amount <= 0) return;
			const now = Date.now();
			const pending = (claims.get(targetId) ?? []).filter(claim => claim.expiresAt > now);
			pending.push({ amount, expiresAt: now + CANONICAL_DAMAGE_CLAIM_TTL_MS });
			claims.set(targetId, pending);
		};

		const unsubImpact = CombatEventBus.subscribe<ImpactPhaseEvent>('IMPACT_PHASE', (event) => {
			const resolved = event.resolvedAttack;
			if (!resolved) return;
			const targetId = canonicalTargetIdForImpact(event);
			if (targetId) addClaim(targetId, resolved.healthDamageToTarget);
			if (resolved.counterAttackOccurred) {
				addClaim(event.attackerId, resolved.healthDamageToAttacker);
			}
		});

		const unsubFloater = subscribeCombatDamageFloater((request) => {
			if (!request.isHeal && request.amount > 0 && request.variant !== 'stake') {
				addClaim(request.targetId, request.amount);
			}
			presentFloaterRequest(request);
		});
		const unsubDamage = CombatEventBus.subscribe<DamageResolvedEvent>('DAMAGE_RESOLVED', (event) => {
			if (event.shieldConsumed || event.actualDamage <= 0) return;
			if (event.damageSource === 'minion_attack') return;
			presentFloaterRequest({
				id: `damage-resolved:${event.id}`,
				targetId: normalizeDamageTargetId(event.targetId, event.targetType),
				amount: event.actualDamage,
			});
		});
		const unsubHeal = CombatEventBus.subscribe<HealResolvedEvent>('HEAL_RESOLVED', (event) => {
			if (event.actualHeal <= 0) return;
			presentFloaterRequest({
				id: `heal-resolved:${event.id}`,
				targetId: event.targetId,
				amount: event.actualHeal,
				isHeal: true,
			});
		});

		return () => {
			unsubImpact();
			unsubFloater();
			unsubDamage();
			unsubHeal();
			claims.clear();
		};
	}, [presentFloaterRequest]);

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

	useEffect(() => {
		const timers = shakeTimersRef.current;
		const floaterTimers = floaterTimersRef.current;
		return () => {
			timers.forEach(t => clearTimeout(t));
			timers.clear();
			floaterTimers.forEach(t => clearTimeout(t));
			floaterTimers.clear();
		};
	}, []);

	const removeDamageAnimation = useCallback((id: string) => {
		setDamageAnimations(prev => prev.filter(a => a.id !== id));
	}, []);

	const addShakingTarget = useCallback((targetId: string, duration = 500) => {
		setShakingTargets(prev => new Set(prev).add(targetId));
		const t = setTimeout(() => {
			shakeTimersRef.current.delete(t);
			setShakingTargets(prev => {
				const n = new Set(prev);
				n.delete(targetId);
				return n;
			});
		}, duration);
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