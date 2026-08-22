import type { CSSProperties } from 'react';
import {
	createCenteredStageVariables,
	createResponsiveCornerVariables,
	IDENTITY_ORNAMENT_ASSETS,
	POKER_HERO_BOARD_COMPOSITION,
	type HeroSide,
	type IdentityOrnamentTransforms,
	type PokerHeroFusionComposition,
} from '../../utils/pokerHeroComposition';
import '../styles/poker-hero-frame-composition.css';

type PokerHeroFrameLayersProps = {
	readonly side: HeroSide;
	readonly composition?: PokerHeroFusionComposition;
	readonly identityTransforms?: IdentityOrnamentTransforms;
};

/**
 * Runtime version of the approved fusion-lab composition. The art stays in
 * independent absolute layers so the live portrait, HP console, and input
 * affordances remain owned by BattlefieldHero.
 */
export function PokerHeroFrameLayers({
	side,
	composition = POKER_HERO_BOARD_COMPOSITION,
	identityTransforms,
}: PokerHeroFrameLayersProps) {
	const identity = composition.identity[side];
	const cornerStyle = {
		...createResponsiveCornerVariables(
			composition.corners.left.transform,
			composition.corners.right.transform,
			composition.baseFrame,
		),
	} as CSSProperties;
	const layers = identityTransforms
		? IDENTITY_ORNAMENT_ASSETS[side].map((asset) => ({
			id: asset.id,
			src: asset.src,
			enabled: identityTransforms[asset.id].enabled,
			transform: identityTransforms[asset.id],
		}))
		: identity.layers;

	return (
		<div className="poker-hero-frame-layers" data-side={side} style={cornerStyle} aria-hidden="true">
			<img
				className="poker-hero-frame-layers__base"
				src={composition.baseFrame.src}
				alt=""
				width={composition.baseFrame.width}
				height={composition.baseFrame.height}
				fetchPriority={side === 'player' ? 'high' : undefined}
				loading={side === 'player' ? 'eager' : 'lazy'}
				decoding="async"
			/>
			{composition.corners.left.enabled && (
				<img
					className="poker-hero-frame-layers__corner poker-hero-frame-layers__corner--left"
					src={composition.corners.left.asset}
					alt=""
					width={446}
					height={477}
					loading="lazy"
					decoding="async"
				/>
			)}
			{composition.corners.right.enabled && (
				<img
					className="poker-hero-frame-layers__corner poker-hero-frame-layers__corner--right"
					src={composition.corners.right.asset}
					alt=""
					width={447}
					height={461}
					loading="lazy"
					decoding="async"
				/>
			)}
			{layers.filter((layer) => layer.enabled).map((layer) => {
				const asset = IDENTITY_ORNAMENT_ASSETS[side].find((candidate) => candidate.id === layer.id);
				if (!asset) return null;
				return (
					<img
						key={layer.id}
						className="poker-hero-frame-layers__identity"
						src={layer.src}
						alt=""
						width={asset.width}
						height={asset.height}
						loading="lazy"
						decoding="async"
						style={createCenteredStageVariables(layer.transform) as CSSProperties}
					/>
				);
			})}
		</div>
	);
}

export default PokerHeroFrameLayers;
