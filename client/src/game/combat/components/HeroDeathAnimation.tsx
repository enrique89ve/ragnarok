/**
 * HeroDeathAnimation - Forged Norse battle climax banner (Defeat / Victory)
 *
 * Plays when a hero reaches 0 HP at the end of poker combat.
 * Differentiates player defeat (crimson-iron forged plaque) from opponent
 * defeat / player victory (forged Norse gold plaque) with balanced centering
 * and enough hold time for the player to read the outcome cleanly.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Howl } from 'howler';
import { assetPath } from '../../utils/assetPath';
import { proceduralAudio } from '../../audio/proceduralAudio';
import '../styles/hero-death.css';

export const HERO_DEATH_DISPLAY_MS = 9400;
export const HERO_DEATH_DISMISS_UNLOCK_MS = 1500;

interface HeroDeathAnimationProps {
	heroName: string;
	heroPortrait?: string;
	isPlayer: boolean;
	onComplete: () => void;
}

const NorseOutcomeFrame: React.FC = () => (
	<svg
		className="hero-death-frame"
		viewBox="0 0 640 340"
		preserveAspectRatio="none"
		aria-hidden="true"
	>
		<path
			className="hero-death-frame-outer"
			d="M34 8h572l26 26v272l-26 26H34L8 306V34L34 8Z"
		/>
		<path
			className="hero-death-frame-inner"
			d="M42 18h556l20 20v264l-20 20H42l-20-20V38l20-20Z"
		/>
		<path
			className="hero-death-frame-knot"
			d="M320 8v12m-12 6 12-10 12 10m-12 294v12m-12-18 12 10 12-10"
		/>
		<path
			className="hero-death-frame-rune"
			d="M8 170h26l12-12M632 170h-26l-12 12M44 20l18 18M596 20l-18 18M44 320l18-18M596 320l-18-18"
		/>
	</svg>
);

const DefeatCrestIcon: React.FC = () => (
	<svg className="hero-death-crest-svg" viewBox="0 0 36 36" aria-hidden="true">
		<path
			d="M18 4 7 8.8v7.6c0 6.8 4.4 12.6 11 15.6 6.6-3 11-8.8 11-15.6V8.8L18 4Z"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="bevel"
		/>
		<path
			d="M19.5 9 15 16.5l5 2.5-3.5 7.5"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="square"
			strokeLinejoin="bevel"
		/>
	</svg>
);

const VictoryCrestIcon: React.FC = () => (
	<svg className="hero-death-crest-svg" viewBox="0 0 36 36" aria-hidden="true">
		<path
			d="M18 4 23 14h-3v15l-2 3-2-3V14h-3L18 4Z"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="bevel"
		/>
		<path
			d="M8 22 18 15l10 7"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="square"
		/>
	</svg>
);

export const HeroDeathAnimation: React.FC<HeroDeathAnimationProps> = ({
	heroName,
	heroPortrait,
	isPlayer,
	onComplete,
}) => {
	const onCompleteRef = useRef(onComplete);
	const hasCompletedRef = useRef(false);
	const [canDismiss, setCanDismiss] = useState(false);
	const isDefeat = isPlayer;
	const variant = isDefeat ? 'defeat' : 'victory';

	const completeOnce = useCallback(() => {
		if (hasCompletedRef.current) return;
		hasCompletedRef.current = true;
		onCompleteRef.current();
	}, []);

	useEffect(() => {
		onCompleteRef.current = onComplete;
	}, [onComplete]);

	useEffect(() => {
		const hitSound = new Howl({
			src: [assetPath('/sounds/hit.mp3')],
			volume: 0.72,
			rate: isDefeat ? 0.58 : 0.82,
		});

		hitSound.play();
		const stingerTimer = setTimeout(() => {
			proceduralAudio.play(isDefeat ? 'defeat' : 'victory');
		}, 240);

		const dismissUnlockTimer = setTimeout(() => {
			setCanDismiss(true);
		}, HERO_DEATH_DISMISS_UNLOCK_MS);

		const completeTimer = setTimeout(() => {
			completeOnce();
		}, HERO_DEATH_DISPLAY_MS);

		return () => {
			clearTimeout(stingerTimer);
			clearTimeout(dismissUnlockTimer);
			clearTimeout(completeTimer);
			hitSound.stop();
			hitSound.unload();
		};
	}, [isDefeat, completeOnce]);

	useEffect(() => {
		if (!canDismiss) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
				completeOnce();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [canDismiss, completeOnce]);

	const embers = useMemo(
		() =>
			Array.from({ length: 24 }, (_, idx) => {
				const spread = ((idx / 23) - 0.5) * 2;
				const offsetX = Math.round(spread * 290 + (((idx * 37) % 29) - 14));
				const driftX = Math.round((((idx * 53) % 41) - 20) * 1.8);
				const riseY = -(90 + ((idx * 29) % 130));
				const size = 3 + (idx % 4) * 1.4;
				const delay = (idx % 12) * 0.14;
				const duration = 2.0 + (idx % 5) * 0.32;
				return { id: idx, offsetX, driftX, riseY, size, delay, duration };
			}),
		[],
	);

	const kickerText = isDefeat ? 'FALLEN IN BATTLE' : 'FOE VANQUISHED';
	const titleText = isDefeat ? 'DEFEAT' : 'VICTORY';
	const captionText = isDefeat
		? `${heroName} falls on the field`
		: `${heroName} has been defeated`;
	const heroInitial = (heroName.trim().charAt(0) || '?').toUpperCase();

	return (
		<motion.div
			className={`hero-death-overlay hero-death-overlay--${variant}${canDismiss ? ' hero-death-overlay--dismissible' : ''}`}
			role="status"
			aria-live="assertive"
			onClick={canDismiss ? completeOnce : undefined}
			initial={{ opacity: 0 }}
			animate={{ opacity: [0, 1, 1, 0] }}
			exit={{ opacity: 0 }}
			transition={{
				duration: HERO_DEATH_DISPLAY_MS / 1000,
				times: [0, 0.05, 0.91, 1],
				ease: 'easeInOut',
			}}
		>
			<motion.div
				className={`hero-death-flash hero-death-flash--${variant}`}
				initial={{ opacity: 0 }}
				animate={{ opacity: [0, 0.65, 0] }}
				transition={{ duration: 0.55, times: [0, 0.14, 1], ease: 'easeOut' }}
			/>

			<div className="hero-death-embers" aria-hidden="true">
				{embers.map((ember) => (
					<span
						key={ember.id}
						className={`hero-death-ember hero-death-ember--${variant}`}
						style={{
							left: `calc(50% + ${ember.offsetX}px)`,
							width: `${ember.size}px`,
							height: `${ember.size}px`,
							['--ember-drift-x' as string]: `${ember.driftX}px`,
							['--ember-rise-y' as string]: `${ember.riseY}px`,
							animationDelay: `${ember.delay}s`,
							animationDuration: `${ember.duration}s`,
						}}
					/>
				))}
			</div>

			<motion.div
				className={`hero-death-plaque hero-death-plaque--${variant}`}
				initial={{ opacity: 0, scale: 0.88, y: 24 }}
				animate={{
					opacity: [0, 1, 1, 0],
					scale: [0.88, 1.015, 1, 0.96],
					y: [24, 0, 0, -10],
				}}
				transition={{
					duration: HERO_DEATH_DISPLAY_MS / 1000,
					times: [0, 0.055, 0.9, 1],
					ease: [0.22, 1, 0.36, 1],
				}}
			>
				<NorseOutcomeFrame />

				<div className="hero-death-content">
					<div className="hero-death-crest">
						{isDefeat ? <DefeatCrestIcon /> : <VictoryCrestIcon />}
					</div>

					<div className="hero-death-kicker">{kickerText}</div>

					<div className="hero-death-rule" aria-hidden="true" />

					<motion.div
						className="hero-death-title"
						initial={{ opacity: 0, scale: 1.18 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.14, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
					>
						{titleText}
					</motion.div>

					<div className="hero-death-portrait-row">
						<div className="hero-death-portrait-ring">
							{heroPortrait ? (
								<img
									src={heroPortrait}
									alt={heroName}
									className="hero-death-portrait-img"
								/>
							) : (
								<span className="hero-death-portrait-initial">{heroInitial}</span>
							)}
						</div>
					</div>

					<div className="hero-death-name">{heroName}</div>
					<div className="hero-death-caption">{captionText}</div>
					{canDismiss && (
						<div className="hero-death-dismiss-hint">Click anywhere to continue</div>
					)}
				</div>
			</motion.div>
		</motion.div>
	);
};

export default HeroDeathAnimation;
