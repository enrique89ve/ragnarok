import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { assetPath } from '../../utils/assetPath';

interface TreasureChestProps {
	state: 'closed' | 'open';
	size?: number;
	className?: string;
	style?: React.CSSProperties;
}

const SPRITE_URL = assetPath('/assets/packs/norse-pack-chest-sheet-v2.webp');
const CLOSED_SHADOW = 'drop-shadow(0 18px 18px rgba(0, 0, 0, 0.45))';
const OPEN_SHADOW = 'drop-shadow(0 22px 24px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 26px rgba(221, 184, 74, 0.28))';

function backgroundPositionForFrame(frame: 0 | 1 | 2): string {
	return `${frame * 50}% 50%`;
}

/**
 * Raster pack chest artifact.
 *
 * Kept under the historic TreasureChestSVG export so existing ceremonies do
 * not need to know whether the artifact is code-native SVG or a PNG sprite.
 */
const TreasureChestSVG: React.FC<TreasureChestProps> = ({
	state,
	size = 280,
	className,
	style,
}) => {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const glowRef = useRef<HTMLDivElement | null>(null);
	const spriteRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const image = new Image();
		image.decoding = 'async';
		image.src = SPRITE_URL;
	}, []);

	useEffect(() => {
		const root = rootRef.current;
		const glow = glowRef.current;
		const sprite = spriteRef.current;
		if (!root || !glow || !sprite) return undefined;

		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const setFrame = (frame: 0 | 1 | 2) => {
			sprite.style.backgroundPosition = backgroundPositionForFrame(frame);
		};

		const ctx = gsap.context(() => {
			gsap.killTweensOf([root, glow, sprite]);

			if (state === 'closed' || prefersReducedMotion) {
				setFrame(state === 'open' ? 2 : 0);
				gsap.set(root, { scale: 1, y: 0, filter: state === 'open' ? OPEN_SHADOW : CLOSED_SHADOW });
				gsap.set(glow, { opacity: state === 'open' ? 0.42 : 0.2, scale: 1 });
				gsap.set(sprite, { y: 0 });
				return;
			}

			setFrame(0);
			gsap.set(root, {
				scale: 0.985,
				y: 0,
				filter: CLOSED_SHADOW,
			});
			gsap.set(glow, { opacity: 0.18, scale: 0.94 });
			gsap.set(sprite, { y: 0 });

			gsap.timeline({ defaults: { ease: 'power2.out' } })
				.to(root, {
					scale: 0.975,
					y: 3,
					duration: 0.12,
					ease: 'power1.in',
				})
				.to(root, {
					scale: 1.018,
					y: -3,
					duration: 0.24,
				})
				.call(() => setFrame(1), [], '<0.06')
				.to(glow, {
					opacity: 0.52,
					scale: 1.06,
					duration: 0.28,
					ease: 'sine.out',
				}, '<')
				.to(sprite, {
					y: -2,
					duration: 0.24,
				}, '<')
				.call(() => setFrame(2), [], '+=0.14')
				.to(root, {
					scale: 1.006,
					y: -1,
					duration: 0.18,
					ease: 'sine.out',
				}, '<')
				.to(glow, {
					opacity: 0.68,
					scale: 1.14,
					duration: 0.18,
					ease: 'sine.out',
				}, '<')
				.to(root, {
					scale: 1,
					y: 0,
					filter: OPEN_SHADOW,
					duration: 0.36,
					ease: 'power3.out',
				})
				.to(sprite, {
					y: 0,
					duration: 0.3,
				}, '<')
				.to(glow, {
					opacity: 0.42,
					scale: 1,
					duration: 0.42,
					ease: 'sine.out',
				}, '<');
		}, root);

		return () => ctx.revert();
	}, [state]);

	return (
		<div
			ref={rootRef}
			className={className}
			aria-hidden="true"
			style={{
				position: 'relative',
				width: size,
				height: size,
				contain: 'layout paint',
				willChange: 'transform, filter',
				...style,
			}}
		>
			<div
				ref={glowRef}
				aria-hidden="true"
				style={{
					position: 'absolute',
					inset: '8% 4% 2%',
					borderRadius: '50%',
					background:
						state === 'open'
							? 'radial-gradient(ellipse at center, rgba(221, 184, 74, 0.22) 0%, rgba(122, 169, 255, 0.12) 34%, transparent 68%)'
							: 'radial-gradient(ellipse at center, rgba(221, 184, 74, 0.13) 0%, rgba(122, 169, 255, 0.06) 34%, transparent 70%)',
					filter: 'blur(8px)',
					transform: 'translateY(4%)',
					willChange: 'opacity, transform',
				}}
			/>
			<div
				ref={spriteRef}
				aria-hidden="true"
				style={{
					position: 'absolute',
					inset: 0,
					backgroundImage: `url("${SPRITE_URL}")`,
					backgroundRepeat: 'no-repeat',
					backgroundSize: '300% 100%',
					backgroundPosition: backgroundPositionForFrame(state === 'open' ? 2 : 0),
					willChange: 'transform',
				}}
			/>
		</div>
	);
};

export default TreasureChestSVG;
