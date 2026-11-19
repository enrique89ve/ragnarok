import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getHeroAnimationProfile, ELEMENT_COLORS } from '../data/heroAnimationProfiles';
import {
	resolveElementPalette,
	spawnRunePulse,
	spawnShowdownBlast,
} from '../../animations/PixiParticleCanvas';
import { proceduralAudio } from '../../audio/proceduralAudio';
import {
	ARENA_VFX_LAYERS,
	getArenaVfxHeroTarget,
	getArenaVfxLayer,
} from '../arenaVfxTargets';
import { useArenaVfxRoot } from '../arenaVfxContext';
import { triggerArenaShake } from '../vfx/arenaShake';
import { releaseHeroVisualHp } from '../vfx/visualVitalsHold';
import { requestCombatDamageFloater } from '../floaters/combatDamageFloater';
import {
	gameEffectCoordinator,
	type GameEffectHandle,
} from '@/game/effects/core/gameEffectCoordinator';
import '../styles/combat-animations.css';

interface PokerCombatAnimationProps {
	attackerHeroId: string;
	defenderHeroId: string;
	damage: number;
	resolutionType: 'fold' | 'showdown';
	winner: 'player' | 'opponent';
	onComplete: () => void;
}

type AnimationPhase = 'idle' | 'windup' | 'attack' | 'impact' | 'complete';

const WINDUP_MS = 320;
const TRAVEL_MS = 380;
const SETTLE_MS = 620;

/**
 * Single-authority Showdown strike choreography.
 *
 * Uses PixiJS v8 2D effects anchored to the real winner/loser hero DOM rects
 * (zero DOM icon particles, zero hardcoded 30%/70% viewport coordinates) and
 * releases the loser's visual HP latch + damage floater + shake + SFX on the
 * exact impact frame.
 */
export const PokerCombatAnimation: React.FC<PokerCombatAnimationProps> = ({
	attackerHeroId,
	damage,
	resolutionType,
	winner,
	onComplete,
}) => {
	const arenaRoot = useArenaVfxRoot();
	const [phase, setPhase] = useState<AnimationPhase>('idle');
	const onCompleteRef = useRef(onComplete);
	const handlesRef = useRef<GameEffectHandle[]>([]);
	const impactCommittedRef = useRef(false);

	useEffect(() => {
		onCompleteRef.current = onComplete;
	}, [onComplete]);

	const attackerProfile = useMemo(() => getHeroAnimationProfile(attackerHeroId), [attackerHeroId]);
	const attackerColors = ELEMENT_COLORS[attackerProfile.element];
	const palette = useMemo(
		() => resolveElementPalette(attackerProfile.element),
		[attackerProfile.element],
	);

	const isFold = resolutionType === 'fold';
	const loserSide: 'player' | 'opponent' = winner === 'player' ? 'opponent' : 'player';

	useEffect(() => {
		if (isFold && damage <= 0) {
			releaseHeroVisualHp(loserSide, 'showdown-impact');
			onCompleteRef.current();
			return;
		}

		impactCommittedRef.current = false;
		const sequenceId = `showdown-strike:${winner}:${damage}:${Date.now()}`;

		const commitImpact = () => {
			if (impactCommittedRef.current) return;
			impactCommittedRef.current = true;
			setPhase('impact');

			// 1. Release visual HP latch so the HP bar drops + gold ghost trail drains NOW.
			releaseHeroVisualHp(loserSide, 'showdown-impact');

			// 2. Spawn showdown damage floater on the exact impact frame.
			if (damage > 0) {
				requestCombatDamageFloater({
					id: sequenceId,
					targetId: `${loserSide}-hero`,
					amount: damage,
					variant: 'showdown',
				});
			}

			// 3. Single-channel CSS shake + loser recoil.
			triggerArenaShake(damage >= 25 ? 'lethal' : damage >= 12 ? 'heavy' : 'mild');
			const loserEl = getArenaVfxHeroTarget(loserSide, arenaRoot);
			if (loserEl) {
				loserEl.classList.remove('vfx-hero-hit-recoil');
				void loserEl.offsetWidth;
				loserEl.classList.add('vfx-hero-hit-recoil');
				handlesRef.current.push(gameEffectCoordinator.schedule({
					owner: 'showdown-strike',
					lane: 'recoil',
					key: `${sequenceId}:recoil`,
					priority: 'high',
					delayMs: 340,
					run: () => loserEl.classList.remove('vfx-hero-hit-recoil'),
				}));
			}

			// 4. Impact audio synced to contact frame.
			try {
				proceduralAudio.play(damage >= 25 ? 'damage_hero' : 'damage');
				if (!isFold && damage >= 25) {
					handlesRef.current.push(gameEffectCoordinator.schedule({
						owner: 'showdown-strike',
						lane: 'audio',
						key: `${sequenceId}:horn`,
						priority: 'normal',
						delayMs: 90,
						run: () => proceduralAudio.play('norse_horn'),
					}));
				}
			} catch {
				// Audio unavailable in headless environments
			}

			// 5. Settle beat before winner badge slides in.
			handlesRef.current.push(gameEffectCoordinator.schedule({
				owner: 'showdown-strike',
				lane: 'settle',
				key: `${sequenceId}:complete`,
				priority: 'high',
				delayMs: SETTLE_MS,
				run: () => {
					setPhase('complete');
					onCompleteRef.current();
				},
			}));
		};

		// Beat 1: Anticipation windup on winner hero
		setPhase('windup');
		try {
			proceduralAudio.play(isFold ? 'combat_brace' : 'attack_prepare');
		} catch {
			// Audio unavailable
		}

		const winnerEl = getArenaVfxHeroTarget(winner, arenaRoot);
		if (winnerEl) {
			const wRect = winnerEl.getBoundingClientRect();
			spawnRunePulse(
				wRect.left + wRect.width / 2,
				wRect.top + wRect.height / 2,
				palette,
				WINDUP_MS + 80,
				1.5,
			);
		}

		// Beat 2: Curved PixiJS 2D elemental blast from winner → loser
		handlesRef.current.push(gameEffectCoordinator.schedule({
			owner: 'showdown-strike',
			lane: 'travel',
			key: `${sequenceId}:launch`,
			priority: 'high',
			delayMs: WINDUP_MS,
			run: () => {
				setPhase('attack');
				try {
					proceduralAudio.playCombatSound(
						attackerProfile.archetype,
						attackerProfile.element,
						damage >= 25 ? 1.0 : damage >= 12 ? 0.8 : 0.6,
					);
				} catch {
					// Audio unavailable
				}

				const srcEl = getArenaVfxHeroTarget(winner, arenaRoot);
				const dstEl = getArenaVfxHeroTarget(loserSide, arenaRoot);
				if (srcEl && dstEl) {
					const sRect = srcEl.getBoundingClientRect();
					const dRect = dstEl.getBoundingClientRect();
					spawnShowdownBlast(
						sRect.left + sRect.width / 2,
						sRect.top + sRect.height / 2,
						dRect.left + dRect.width / 2,
						dRect.top + dRect.height / 2,
						palette,
						{
							travelMs: TRAVEL_MS,
							heavy: !isFold && damage >= 18,
							onImpact: commitImpact,
						},
					);
				} else {
					commitImpact();
				}

				// Safety guarantee: ensure impact commits even if canvas is disabled/unmounted.
				handlesRef.current.push(gameEffectCoordinator.schedule({
					owner: 'showdown-strike',
					lane: 'safety',
					key: `${sequenceId}:safety`,
					priority: 'high',
					delayMs: TRAVEL_MS + 60,
					run: commitImpact,
				}));
			},
		}));

		return () => {
			handlesRef.current.forEach(handle => handle.cancel());
			handlesRef.current = [];
			releaseHeroVisualHp(loserSide, 'showdown-impact');
		};
	}, [
		arenaRoot,
		attackerProfile.archetype,
		attackerProfile.element,
		damage,
		isFold,
		loserSide,
		palette,
		winner,
	]);

	if (phase === 'complete' || phase === 'idle') return null;

	const attackNameText = isFold ? 'BRACE' : attackerProfile.attackName;

	const content = (
		<div
			className="poker-combat-animation"
			style={{ ['--element-color' as string]: attackerColors.primary }}
		>
			{phase === 'windup' && !isFold && (
				<div className="attack-name-text">{attackNameText}</div>
			)}
		</div>
	);

	const portalTarget = getArenaVfxLayer(ARENA_VFX_LAYERS.vfx, arenaRoot);
	return portalTarget ? createPortal(content, portalTarget) : content;
};

export default PokerCombatAnimation;
