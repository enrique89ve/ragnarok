import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getHeroAnimationProfile, ELEMENT_COLORS } from '../data/heroAnimationProfiles';
import type { AnimationArchetype } from '../data/heroAnimationProfiles';
import { proceduralAudio } from '../../audio/proceduralAudio';
import { ARENA_VFX_LAYERS, getArenaVfxLayer } from '../arenaVfxTargets';
import { GameIcon } from '../../utils/ui/GameIcon';
import type { IconName } from '../../utils/ui/iconMap';
import '../styles/combat-animations.css';

interface PokerCombatAnimationProps {
	attackerHeroId: string;
	defenderHeroId: string;
	damage: number;
	resolutionType: 'fold' | 'showdown';
	winner: 'player' | 'opponent';
	onComplete: () => void;
}

type AnimationPhase = 'idle' | 'windup' | 'attack' | 'impact' | 'particles' | 'complete';

interface ParticleData {
	id: number;
	iconName: IconName;
	left: string;
	top: string;
	color: string;
	duration: number;
	delay: number;
	tx: number;
	ty: number;
}

function getDamageTier(damage: number): { tier: 'none' | 'light' | 'medium' | 'heavy'; duration: number; particleCount: number; shakeClass: string } {
	if (damage <= 0) return { tier: 'none', duration: 1500, particleCount: 0, shakeClass: '' };
	if (damage < 15) return { tier: 'light', duration: 2000, particleCount: 8, shakeClass: 'screen-shake-mild' };
	if (damage < 30) return { tier: 'medium', duration: 2500, particleCount: 16, shakeClass: 'screen-shake-moderate' };
	return { tier: 'heavy', duration: 3000, particleCount: 24, shakeClass: 'screen-shake-heavy' };
}

function getAttackDuration(archetype: AnimationArchetype): number {
	switch (archetype) {
		case 'melee_strike': return 300;
		case 'ranged_shot': return 500;
		case 'magic_blast': return 500;
		case 'divine_radiance': return 600;
		case 'nature_surge': return 500;
		case 'shadow_strike': return 400;
		default: return 400;
	}
}

export const PokerCombatAnimation: React.FC<PokerCombatAnimationProps> = ({
	attackerHeroId,
	damage,
	resolutionType,
	winner,
	onComplete,
}) => {
	const [phase, setPhase] = useState<AnimationPhase>('idle');
	const [particles, setParticles] = useState<ParticleData[]>([]);
	const onCompleteRef = useRef(onComplete);
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	useEffect(() => {
		onCompleteRef.current = onComplete;
	}, [onComplete]);

	const reducedMotion = useRef(
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);

	const attackerProfile = useMemo(() => getHeroAnimationProfile(attackerHeroId), [attackerHeroId]);
	const attackerColors = ELEMENT_COLORS[attackerProfile.element];

	const isFold = resolutionType === 'fold';
	const tier = useMemo(() => {
		const rawTier = getDamageTier(damage);
		if (isFold) {
			return { ...rawTier, tier: 'light' as const, shakeClass: 'screen-shake-mild', particleCount: 8 };
		}
		if (reducedMotion.current) {
			return { ...rawTier, tier: 'light' as const, particleCount: 0, shakeClass: 'screen-shake-mild' };
		}
		return rawTier;
	}, [damage, isFold]);

	const attackDuration = getAttackDuration(attackerProfile.archetype);

	const spawnParticles = useCallback((count: number, iconName: IconName, colors: { primary: string; secondary: string }) => {
		if (reducedMotion.current) return;
		const next: ParticleData[] = [];
		for (let i = 0; i < count; i++) {
			const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
			const distance = 60 + Math.random() * 120;
			const tx = Math.cos(angle) * distance;
			const ty = Math.sin(angle) * distance;
			next.push({
				id: i,
				iconName,
				left: '50%',
				top: winner === 'player' ? '30%' : '70%',
				color: Math.random() > 0.5 ? colors.primary : colors.secondary,
				duration: 0.5 + Math.random() * 1,
				delay: Math.random() * 0.2,
				tx,
				ty,
			});
		}
		setParticles(next);
	}, [winner]);

	useEffect(() => {
		if (isFold && damage <= 0) {
			onCompleteRef.current();
			return;
		}

		const addTimer = (fn: () => void, delay: number) => {
			const id = setTimeout(fn, delay);
			timersRef.current.push(id);
			return id;
		};

		let elapsed = 0;

		addTimer(() => {
			setPhase('windup');
			proceduralAudio.play(isFold ? 'combat_brace' : 'attack_prepare');
		}, 100);
		elapsed = 100;

		const windupEnd = elapsed + 400;
		addTimer(() => {
			setPhase('attack');
			proceduralAudio.playCombatSound(
				attackerProfile.archetype,
				attackerProfile.element,
				tier.tier === 'heavy' ? 1.0 : tier.tier === 'medium' ? 0.8 : 0.6
			);
		}, windupEnd);
		elapsed = windupEnd;

		const attackEnd = elapsed + attackDuration;
		addTimer(() => {
			setPhase('impact');
			proceduralAudio.play(damage >= 30 ? 'damage_hero' : 'damage');
			if (!isFold && tier.tier === 'heavy') {
				addTimer(() => proceduralAudio.play('norse_horn'), 100);
			}
		}, attackEnd);
		elapsed = attackEnd;

		const impactEnd = elapsed + 200;
		addTimer(() => {
			setPhase('particles');
			spawnParticles(
				tier.particleCount,
				attackerProfile.particleIconName,
				attackerColors
			);
		}, impactEnd);
		elapsed = impactEnd;

		const particleDuration = tier.tier === 'heavy' ? 1500 : tier.tier === 'medium' ? 1000 : 500;
		const particlesEnd = elapsed + particleDuration;
		addTimer(() => {
			setPhase('complete');
			setParticles([]);
			onCompleteRef.current();
		}, particlesEnd);

		return () => {
			timersRef.current.forEach(clearTimeout);
			timersRef.current = [];
		};
	}, [
		attackDuration,
		attackerColors,
		attackerProfile.archetype,
		attackerProfile.element,
		attackerProfile.particleIconName,
		damage,
		isFold,
		spawnParticles,
		tier.particleCount,
		tier.tier,
	]);

	if (phase === 'complete') return null;

	const attackNameText = isFold ? 'BRACE' : attackerProfile.attackName;
	const elementColor = attackerColors.primary;

	const renderArchetypeEffect = (archetype: AnimationArchetype) => {
		switch (archetype) {
			case 'melee_strike':
				return (
					<div
						className="melee-slash-trail"
						style={{
							left: '50%',
							top: '50%',
							transform: 'translate(-50%, -50%)',
							['--element-color' as string]: elementColor,
						}}
					/>
				);
			case 'ranged_shot':
				return (
					<div
						className="ranged-projectile"
						style={{
							left: '50%',
							[winner === 'opponent' ? 'top' : 'bottom']: '10%',
							['--start-x' as string]: '0px',
							['--start-y' as string]: '0px',
							['--end-x' as string]: '0px',
							['--end-y' as string]: winner === 'opponent' ? '650px' : '-650px',
						}}
					>
						<GameIcon name={attackerProfile.particleIconName} size={20} color="#fff" />
					</div>
				);
			case 'magic_blast':
				return (
					<div
						className="magic-blast-ring"
						style={{
							left: '50%',
							top: '50%',
							transform: 'translate(-50%, -50%)',
							['--element-color' as string]: elementColor,
						}}
					/>
				);
			case 'divine_radiance':
				return (
					<div
						className="divine-rays"
						style={{
							left: '50%',
							top: winner === 'player' ? '55%' : '25%',
							transform: 'translate(-50%, -50%)',
							['--element-color' as string]: elementColor,
						}}
					/>
				);
			case 'nature_surge':
				return (
					<div
						className="nature-wave"
						style={{
							left: 0,
							top: '50%',
							transform: 'translateY(-50%)',
							['--element-color' as string]: elementColor,
						}}
					/>
				);
			case 'shadow_strike':
				return (
					<div
						className="shadow-tendril"
						style={{
							left: 0,
							top: winner === 'player' ? '60%' : '40%',
							['--element-color' as string]: elementColor,
						}}
					/>
				);
			default:
				return null;
		}
	};

	const content = (
		<div
			className={`poker-combat-animation ${phase === 'impact' ? tier.shakeClass : ''}`}
			style={{ ['--element-color' as string]: elementColor }}
		>
			{phase === 'windup' && !isFold && (
				<>
					<div className="attack-name-text">{attackNameText}</div>
					<div
						className="combat-attacker-glow"
						style={{
							left: '50%',
							top: winner === 'player' ? '70%' : '30%',
							transform: 'translate(-50%, -50%)',
							width: 100,
							height: 100,
						}}
					/>
				</>
			)}

			{phase === 'attack' && renderArchetypeEffect(attackerProfile.archetype)}

			{phase === 'impact' && (
				<>
					<div className="impact-flash" style={{ ['--element-color' as string]: elementColor }} />
					{!isFold && tier.tier === 'heavy' && <div className="super-move-flash" />}
					<div
						className="combat-damage-number"
						style={{
							left: '50%',
							top: winner === 'player' ? '30%' : '65%',
							transform: 'translateX(-50%)',
						}}
					>
						-{damage}
					</div>
				</>
			)}

			{phase === 'particles' && damage > 0 && (
				<>
					<div
						className="combat-damage-number"
						style={{
							left: '50%',
							top: winner === 'player' ? '25%' : '60%',
							transform: 'translateX(-50%)',
							opacity: 0.6,
						}}
					>
						-{damage}
					</div>
					{particles.map(p => (
						<div
							key={p.id}
							className="combat-particle"
							style={{
								left: p.left,
								top: p.top,
								color: p.color,
								animation: `particle-burst ${p.duration}s ease-out forwards`,
								animationDelay: `${p.delay}s`,
								['--tx' as string]: `${p.tx}px`,
								['--ty' as string]: `${p.ty}px`,
							}}
						>
							<GameIcon name={p.iconName} size={14} />
						</div>
					))}
				</>
			)}
		</div>
	);

	const portalTarget =
		typeof document !== 'undefined'
			? getArenaVfxLayer(ARENA_VFX_LAYERS.vfx)
			: null;

	return portalTarget ? createPortal(content, portalTarget) : content;
};

export default PokerCombatAnimation;
